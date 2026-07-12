mod game;
mod db;
mod ws;

use game::state::{GameState, GameConfig, SharedGameState, create_game};
use ws::server::{WsServer, get_local_ip};
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let config = GameConfig::default();
    let game = create_game(config);

    // Start WebSocket server in background
    let ws_game = game.clone();
    let ws_port: u16 = 9001;

    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let server = WsServer::new(ws_port, ws_game);
            if let Err(e) = server.run().await {
                log::error!("WS server error: {}", e);
            }
        });
    });

    // Get local IP for QR code
    let local_ip = get_local_ip().unwrap_or_else(|| "127.0.0.1".into());
    log::info!("Local IP: {}", local_ip);
    log::info!("QR code URL: ws://{}:{}", local_ip, ws_port);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(game)
        .invoke_handler(tauri::generate_handler![
            create_new_game,
            get_game_state,
            get_game_pin,
            get_ws_url,
            add_player,
            start_game,
            get_local_ip_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn create_new_game(
    state: tauri::State<'_, SharedGameState>,
    nursery_count: u32,
    shop_count: u32,
    with_credit: bool,
) -> String {
    let config = GameConfig {
        nursery_count,
        shop_count,
        with_credit,
        ..Default::default()
    };
    let new_game = GameState::new(config);
    let game_id = new_game.id.to_string();
    let pin = new_game.pin.clone();

    *state.write() = new_game;

    log::info!("Created game {} with pin {}", game_id, pin);
    serde_json::json!({
        "game_id": game_id,
        "pin": pin,
    }).to_string()
}

#[tauri::command]
fn get_game_state(state: tauri::State<'_, SharedGameState>) -> String {
    let game = state.read();
    game.to_sync_json().to_string()
}

#[tauri::command]
fn get_game_pin(state: tauri::State<'_, SharedGameState>) -> String {
    let game = state.read();
    game.pin.clone()
}

#[tauri::command]
fn get_ws_url(state: tauri::State<'_, SharedGameState>) -> String {
    let ip = get_local_ip().unwrap_or_else(|| "127.0.0.1".into());
    let game = state.read();
    format!("ws://{}:9001", ip)
}

#[tauri::command]
fn add_player(
    state: tauri::State<'_, SharedGameState>,
    name: String,
    role: String,
) -> String {
    let mut game = state.write();
    let player_role = match role.as_str() {
        "shop" => game::types::PlayerRole::Shop,
        _ => game::types::PlayerRole::Nursery,
    };

    let player_id = game.add_player(name, player_role);
    let player = game.players.get(&player_id).unwrap();
    let pin = player.pin.clone();

    log::info!("Added player {} with pin {}", player_id, pin);

    serde_json::json!({
        "player_id": player_id,
        "pin": pin,
    }).to_string()
}

#[tauri::command]
fn start_game(state: tauri::State<'_, SharedGameState>) -> String {
    let mut game = state.write();
    game.start_game();
    log::info!("Game started! Season: {:?}, Turn: {}", game.current_season, game.current_turn);
    game.to_sync_json().to_string()
}

#[tauri::command]
fn get_local_ip_cmd() -> String {
    get_local_ip().unwrap_or_else(|| "127.0.0.1".into())
}
