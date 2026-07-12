use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use parking_lot::RwLock;
use uuid::Uuid;
use std::collections::HashMap;

use crate::game::state::{SharedGameState, GameState, GameConfig, GamePhase, PlayerRole};
use crate::game::messages::{ClientMessage, ServerMessage};
use crate::game::types::*;

pub struct WsServer {
    pub addr: SocketAddr,
    pub game: SharedGameState,
    pub connections: Arc<RwLock<HashMap<Uuid, tokio::sync::mpsc::UnboundedSender<String>>>>,
}

impl WsServer {
    pub fn new(port: u16, game: SharedGameState) -> Self {
        Self {
            addr: SocketAddr::from(([0, 0, 0, 0], port)),
            game,
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(self.addr).await?;
        log::info!("WebSocket server listening on ws://{}", self.addr);

        let game = self.game.clone();
        let connections = self.connections.clone();

        loop {
            let (stream, peer) = listener.accept().await?;
            log::info!("New connection from {}", peer);

            let game = game.clone();
            let connections = connections.clone();

            tokio::spawn(async move {
                if let Err(e) = handle_connection(stream, peer, game, connections).await {
                    log::error!("Error handling {}: {}", peer, e);
                }
            });
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    peer: SocketAddr,
    game: SharedGameState,
    connections: Arc<RwLock<HashMap<Uuid, tokio::sync::mpsc::UnboundedSender<String>>>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let ws_stream = accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    let mut player_id: Option<Uuid> = None;

    // Forward messages from channel to WebSocket
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg.into()).await.is_err() {
                break;
            }
        }
    });

    while let Some(msg) = ws_receiver.next().await {
        let msg = msg?;
        if msg.is_text() || msg.is_binary() {
            let text = msg.to_text()?;
            match serde_json::from_str::<ClientMessage>(text) {
                Ok(client_msg) => {
                    let response = handle_message(client_msg, &game, &connections, &mut player_id).await;
                    if let Some(resp) = response {
                        tx.send(resp.to_json()).ok();
                    }
                }
                Err(e) => {
                    log::warn!("Invalid message from {}: {}", peer, e);
                    let err = ServerMessage::Error {
                        message: format!("Invalid message: {}", e),
                    };
                    tx.send(err.to_json()).ok();
                }
            }
        }
    }

    // Disconnect player
    if let Some(pid) = player_id {
        connections.write().remove(&pid);
        let mut game = game.write();
        if let Some(player) = game.players.get_mut(&pid) {
            player.is_connected = false;
        }
        log::info!("Player {} disconnected", pid);
    }

    Ok(())
}

async fn handle_message(
    msg: ClientMessage,
    game: &SharedGameState,
    connections: &Arc<RwLock<HashMap<Uuid, tokio::sync::mpsc::UnboundedSender<String>>>>,
    player_id: &mut Option<Uuid>,
) -> Option<ServerMessage> {
    match msg {
        ClientMessage::Join { player_name, pin } => {
            let mut game = game.write();
            let found = game.find_player_by_pin(&pin).cloned();

            match found {
                Some(player) => {
                    let pid = player.id;
                    player_id.replace(pid);

                    game.players.get_mut(&pid).map(|p| p.is_connected = true);

                    let game_state = game.to_sync_json();

                    Some(ServerMessage::JoinSuccess {
                        player_id: pid,
                        role: player.role.display_name().to_string(),
                        game_state,
                    })
                }
                None => Some(ServerMessage::JoinError {
                    message: "Неверный PIN-код".into(),
                }),
            }
        }

        ClientMessage::EndTurnFlag => {
            let mut game = game.write();
            game.end_turn();

            let sync = game.to_sync_json();
            broadcast_to_all(game, connections, &sync);

            None
        }

        ClientMessage::FeedCat { cat_id } => {
            let pid = player_id?;
            let mut game = game.write();
            match game.feed_cat(pid, cat_id) {
                Ok(()) => Some(ServerMessage::Balance {
                    balance: game.players.get(&pid)?.balance,
                }),
                Err(e) => Some(ServerMessage::Error { message: e }),
            }
        }

        ClientMessage::CatTreatment { cat_id } => {
            let pid = player_id?;
            let mut game = game.write();
            match game.treat_cat(pid, cat_id) {
                Ok(()) => Some(ServerMessage::Balance {
                    balance: game.players.get(&pid)?.balance,
                }),
                Err(e) => Some(ServerMessage::Error { message: e }),
            }
        }

        ClientMessage::BuyingHouse => {
            let pid = player_id?;
            let mut game = game.write();
            match game.buy_house(pid) {
                Ok(_house) => Some(ServerMessage::Balance {
                    balance: game.players.get(&pid)?.balance,
                }),
                Err(e) => Some(ServerMessage::Error { message: e }),
            }
        }

        ClientMessage::TradingRequest { cat_ids, price } => {
            let pid = player_id?;
            let mut game = game.write();
            match game.create_trade_offer(pid, cat_ids, price) {
                Ok(offer) => {
                    let offer_json = serde_json::json!({
                        "id": offer.id,
                        "seller_id": offer.seller_id,
                        "cat_ids": offer.cat_ids,
                        "price": offer.price,
                        "status": offer.status,
                    });
                    Some(ServerMessage::TradingLotUpdate { offer: offer_json })
                }
                Err(e) => Some(ServerMessage::Error { message: e }),
            }
        }

        ClientMessage::TradingConfirm { offer_id } => {
            let pid = player_id?;
            let mut game = game.write();
            match game.confirm_trade(pid, offer_id) {
                Ok(()) => {
                    let sync = game.to_sync_json();
                    broadcast_to_all(game, connections, &sync);
                    None
                }
                Err(e) => Some(ServerMessage::Error { message: e }),
            }
        }

        ClientMessage::TradingCancel { offer_id } => {
            let mut game = game.write();
            if let Some(offer) = game.trade_offers.get_mut(&offer_id) {
                offer.status = TradeStatus::Cancelled;
            }
            None
        }

        ClientMessage::CityTrade { cat_ids, trade_type } => {
            let pid = player_id?;
            let mut game = game.write();
            let mut total_earned = 0;

            for cat_id in &cat_ids {
                match game.sell_cat_to_city(pid, *cat_id) {
                    Ok(price) => total_earned += price,
                    Err(_) => {}
                }
            }

            if total_earned > 0 {
                Some(ServerMessage::Balance {
                    balance: game.players.get(&pid)?.balance,
                })
            } else {
                Some(ServerMessage::Error {
                    message: "Не удалось продать котов".into(),
                })
            }
        }

        _ => {
            log::warn!("Unhandled message type");
            None
        }
    }
}

fn broadcast_to_all(
    game: &GameState,
    connections: &Arc<RwLock<HashMap<Uuid, tokio::sync::mpsc::UnboundedSender<String>>>>,
    sync: &serde_json::Value,
) {
    let msg = ServerMessage::Synchronize {
        game_state: sync.clone(),
    };
    let json = msg.to_json();
    let conns = connections.read();
    for sender in conns.values() {
        sender.send(json.clone()).ok();
    }
}

pub fn get_local_ip() -> Option<String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}
