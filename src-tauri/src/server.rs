use axum::{
    extract::{State, WebSocketUpgrade, Query},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use axum::extract::ws::{WebSocket, Message};
use axum::serve;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;

use crate::game::*;

// ═══════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════

pub struct AppState {
    pub sessions: RwLock<HashMap<String, GameSession>>,
    pub ws_senders: RwLock<HashMap<String, Vec<mpsc::UnboundedSender<String>>>>,
    pub host_senders: RwLock<HashMap<String, Vec<mpsc::UnboundedSender<String>>>>,
    pub server_port: RwLock<u16>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            ws_senders: RwLock::new(HashMap::new()),
            host_senders: RwLock::new(HashMap::new()),
            server_port: RwLock::new(0),
        }
    }
}

pub type SharedState = Arc<AppState>;

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

pub async fn start_server(state: SharedState, preferred_port: u16) {
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/player", get(player_page))
        .route("/api/state/{pin}", get(get_state))
        .with_state(state.clone());

    // Try preferred port, then fallback
    let mut port = preferred_port;
    loop {
        let addr = format!("0.0.0.0:{}", port);
        match TcpListener::bind(&addr).await {
            Ok(listener) => {
                *state.server_port.write().await = port;
                log::info!("Server running on port {}", port);
                serve(listener, app.into_make_service()).await.unwrap();
                break;
            }
            Err(e) => {
                log::warn!("Port {} busy: {}, trying {}", port, e, port + 1);
                port += 1;
                if port > preferred_port + 100 {
                    log::error!("No available ports");
                    break;
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

#[derive(Deserialize)]
pub struct WsQuery {
    pub pin: Option<String>,
    pub host: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, query, state))
}

async fn handle_socket(socket: WebSocket, query: WsQuery, state: SharedState) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let is_host = query.host.unwrap_or_default() == "1";
    let pin = query.pin.unwrap_or_default();

    // Register sender
    if is_host {
        state.host_senders.write().await
            .entry(pin.clone()).or_default().push(tx);
    } else {
        state.ws_senders.write().await
            .entry(pin.clone()).or_default().push(tx);
    }

    // Send task
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() { break; }
        }
    });

    // Receive task
    let state2 = state.clone();
    let pin2 = pin.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if let Ok(msg) = serde_json::from_str::<ClientMessage>(&text) {
                handle_message(msg, &pin2, is_host, &state2).await;
            }
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Cleanup
    if is_host {
        if let Some(_senders) = state.host_senders.write().await.get_mut(&pin) {
            // senders will be dropped when empty
        }
    } else {
        if let Some(_senders) = state.ws_senders.write().await.get_mut(&pin) {
            // Notify host
            if let Some(hosts) = state.host_senders.read().await.get(&pin) {
                for host_tx in hosts {
                    let _ = host_tx.send(serde_json::to_string(&ServerMessage::PlayerLeft {
                        player_id: Uuid::nil(),
                    }).unwrap());
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

async fn handle_message(msg: ClientMessage, pin: &str, is_host: bool, state: &SharedState) {
    match msg {
        ClientMessage::Join { name } => {
            let mut sessions = state.sessions.write().await;
            let session = sessions.get_mut(pin);
            if let Some(session) = session {
                let id = session.add_player(&name);
                let role = format!("{:?}", session.players[&id].role).to_lowercase();
                // Reply to player
                if let Some(senders) = state.ws_senders.read().await.get(pin) {
                    for tx in senders {
                        let _ = tx.send(ServerMessage::Joined { player_id: id, role: role.clone() }.to_json());
                        let _ = tx.send(ServerMessage::GameState { session: serde_json::to_value(&*session).unwrap() }.to_json());
                    }
                }
                // Notify host
                if let Some(hosts) = state.host_senders.read().await.get(pin) {
                    for tx in hosts {
                        let _ = tx.send(ServerMessage::PlayerJoined { name: name.clone() }.to_json());
                    }
                }
            }
        }

        ClientMessage::HostJoin => {
            let sessions = state.sessions.read().await;
            if let Some(session) = sessions.get(pin) {
                if let Some(hosts) = state.host_senders.read().await.get(pin) {
                    for tx in hosts {
                        let _ = tx.send(ServerMessage::HostJoined {}.to_json());
                        let _ = tx.send(ServerMessage::GameState { session: serde_json::to_value(&*session).unwrap() }.to_json());
                    }
                }
            }
        }

        ClientMessage::StartGame => {
            if !is_host { return; }
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                session.start();
                broadcast_to_all(state, pin, &ServerMessage::GameStarted {}).await;
                broadcast_to_all(state, pin, &ServerMessage::TurnStarted {
                    season: session.season_name().to_string(),
                    turn: session.current_turn,
                    duration: session.turn_duration(),
                }).await;
                broadcast_state(state, pin).await;
            }
        }

        ClientMessage::Feed { cat_id } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                // Find player by ws connection
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.feed_cat(player_id, cat_id) {
                        Ok(()) => { send_balance(state, pin, player_id).await; }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::Treat { cat_id } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.treat_cat(player_id, cat_id) {
                        Ok(()) => { send_balance(state, pin, player_id).await; }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::BuyCat { color, gender } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.buy_cat(player_id, &color, &gender) {
                        Ok(cat) => {
                            let _ = send_to_ws(state, pin, &ServerMessage::CatBought {
                                cat: serde_json::to_value(&cat).unwrap(),
                            }).await;
                            send_balance(state, pin, player_id).await;
                        }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::SellToCity { cat_id } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.sell_to_city(player_id, cat_id) {
                        Ok(()) => {
                            let _ = send_to_ws(state, pin, &ServerMessage::CatSold { cat_id }).await;
                            send_balance(state, pin, player_id).await;
                        }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::BuyHouse => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.buy_house(player_id) {
                        Ok(house) => {
                            let _ = send_to_ws(state, pin, &ServerMessage::HouseBought {
                                house: serde_json::to_value(&house).unwrap(),
                            }).await;
                            send_balance(state, pin, player_id).await;
                        }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::CreateTrade { cat_ids, price } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.create_trade(player_id, cat_ids, price) {
                        Ok(offer) => {
                            broadcast_to_all(state, pin, &ServerMessage::NewTrade {
                                offer: serde_json::to_value(&offer).unwrap(),
                            }).await;
                        }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::AcceptTrade { offer_id } => {
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                if let Some(player_id) = find_player_by_ws(state, pin).await {
                    match session.accept_trade(player_id, offer_id) {
                        Ok(()) => {
                            broadcast_to_all(state, pin, &ServerMessage::TradeAccepted { offer_id }).await;
                        }
                        Err(e) => { send_error(state, pin, &e).await; }
                    }
                }
            }
        }

        ClientMessage::EndTurn => {
            if !is_host { return; }
            let mut sessions = state.sessions.write().await;
            if let Some(session) = sessions.get_mut(pin) {
                session.end_turn();
                broadcast_to_all(state, pin, &ServerMessage::TurnStarted {
                    season: session.season_name().to_string(),
                    turn: session.current_turn,
                    duration: session.turn_duration(),
                }).await;
                broadcast_state(state, pin).await;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async fn find_player_by_ws(state: &SharedState, pin: &str) -> Option<Uuid> {
    let sessions = state.sessions.read().await;
    let session = sessions.get(pin)?;
    // First connected player in this session (simplified)
    session.players.keys().next().copied()
}

async fn broadcast_to_all(state: &SharedState, pin: &str, msg: &ServerMessage) {
    let json = msg.to_json();
    if let Some(senders) = state.ws_senders.read().await.get(pin) {
        for tx in senders { let _ = tx.send(json.clone()); }
    }
    if let Some(hosts) = state.host_senders.read().await.get(pin) {
        for tx in hosts { let _ = tx.send(json.clone()); }
    }
}

async fn send_to_ws(state: &SharedState, pin: &str, msg: &ServerMessage) -> Result<(), ()> {
    let json = msg.to_json();
    if let Some(senders) = state.ws_senders.read().await.get(pin) {
        if let Some(tx) = senders.first() { let _ = tx.send(json); }
    }
    Ok(())
}

async fn broadcast_state(state: &SharedState, pin: &str) {
    let sessions = state.sessions.read().await;
    if let Some(session) = sessions.get(pin) {
        let msg = ServerMessage::GameState {
            session: serde_json::to_value(&*session).unwrap(),
        };
        broadcast_to_all(state, pin, &msg).await;
    }
}

async fn send_balance(state: &SharedState, pin: &str, player_id: Uuid) {
    let sessions = state.sessions.read().await;
    if let Some(session) = sessions.get(pin) {
        if let Some(player) = session.players.get(&player_id) {
            let _ = send_to_ws(state, pin, &ServerMessage::Balance { balance: player.balance }).await;
        }
    }
}

async fn send_error(state: &SharedState, pin: &str, msg: &str) {
    let _ = send_to_ws(state, pin, &ServerMessage::Error { message: msg.to_string() }).await;
}

// ═══════════════════════════════════════════════════════════════
// HTTP ROUTES
// ═══════════════════════════════════════════════════════════════

async fn player_page() -> impl IntoResponse {
    axum::response::Html(crate::embedded::PLAYER_HTML)
}

async fn get_state(
    axum::extract::Path(pin): axum::extract::Path<String>,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    let sessions = state.sessions.read().await;
    match sessions.get(&pin) {
        Some(session) => Json(serde_json::to_value(&*session).unwrap()),
        None => Json(serde_json::json!({ "error": "Game not found" })),
    }
}
