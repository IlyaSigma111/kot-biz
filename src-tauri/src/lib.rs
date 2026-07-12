mod game;
mod server;
mod embedded;

use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let state = Arc::new(server::AppState::new());
            let state_clone = state.clone();

            // Store state in Tauri managed state
            app.manage(state.clone());

            // Start Axum server
            tauri::async_runtime::spawn(async move {
                server::start_server(state_clone, 9001).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_game,
            get_game_state,
            get_server_url,
            add_player,
            start_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ═══════════════════════════════════════════════════════════════
// TAURI COMMANDS
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
async fn create_game(
    state: tauri::State<'_, Arc<server::AppState>>,
) -> Result<String, String> {
    let pin = game::generate_pin();
    let session = game::GameSession::new(pin.clone());
    state.sessions.write().await.insert(pin.clone(), session);
    Ok(pin)
}

#[tauri::command]
async fn get_game_state(
    state: tauri::State<'_, Arc<server::AppState>>,
    pin: String,
) -> Result<serde_json::Value, String> {
    let sessions = state.sessions.read().await;
    match sessions.get(&pin) {
        Some(s) => Ok(serde_json::to_value(&*s).unwrap()),
        None => Err("Game not found".into()),
    }
}

#[tauri::command]
async fn get_server_url(
    state: tauri::State<'_, Arc<server::AppState>>,
) -> Result<String, String> {
    let port = *state.server_port.read().await;
    let local_ip = get_local_ip();
    Ok(format!("ws://{}:{}", local_ip, port))
}

#[tauri::command]
async fn add_player(
    state: tauri::State<'_, Arc<server::AppState>>,
    pin: String,
    name: String,
) -> Result<String, String> {
    let mut sessions = state.sessions.write().await;
    let session = sessions.get_mut(&pin).ok_or("Game not found")?;
    let id = session.add_player(&name);
    Ok(id.to_string())
}

#[tauri::command]
async fn start_game(
    state: tauri::State<'_, Arc<server::AppState>>,
    pin: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.write().await;
    let session = sessions.get_mut(&pin).ok_or("Game not found")?;
    session.start();
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

fn get_local_ip() -> String {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").ok();
    if let Some(s) = socket {
        let _ = s.connect("8.8.8.8:80");
        if let Ok(addr) = s.local_addr() {
            return addr.ip().to_string();
        }
    }
    "127.0.0.1".to_string()
}
