use rusqlite::{Connection, Result, params};
use std::sync::Mutex;
use uuid::Uuid;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self { conn: Mutex::new(conn) };
        db.init_schema()?;
        Ok(db)
    }

    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self { conn: Mutex::new(conn) };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                pin TEXT NOT NULL,
                phase TEXT NOT NULL DEFAULT 'lobby',
                config_json TEXT,
                current_season INTEGER DEFAULT 0,
                current_turn INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                balance INTEGER NOT NULL DEFAULT 0,
                pin TEXT NOT NULL,
                is_connected INTEGER DEFAULT 0,
                credit_json TEXT,
                FOREIGN KEY (game_id) REFERENCES games(id)
            );

            CREATE TABLE IF NOT EXISTS cats (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                color TEXT NOT NULL,
                gender TEXT NOT NULL,
                age_months INTEGER DEFAULT 0,
                price INTEGER NOT NULL,
                house_id TEXT,
                sickness TEXT,
                is_hungry INTEGER DEFAULT 0,
                is_pregnant INTEGER DEFAULT 0,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (owner_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS houses (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                is_insured INTEGER DEFAULT 0,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (owner_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS house_cats (
                house_id TEXT NOT NULL,
                cat_id TEXT NOT NULL,
                PRIMARY KEY (house_id, cat_id),
                FOREIGN KEY (house_id) REFERENCES houses(id),
                FOREIGN KEY (cat_id) REFERENCES cats(id)
            );

            CREATE TABLE IF NOT EXISTS trade_offers (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                price INTEGER NOT NULL,
                buyer_id TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (seller_id) REFERENCES players(id)
            );

            CREATE TABLE IF NOT EXISTS trade_offer_cats (
                offer_id TEXT NOT NULL,
                cat_id TEXT NOT NULL,
                PRIMARY KEY (offer_id, cat_id),
                FOREIGN KEY (offer_id) REFERENCES trade_offers(id),
                FOREIGN KEY (cat_id) REFERENCES cats(id)
            );

            CREATE TABLE IF NOT EXISTS city_quota (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT NOT NULL,
                color TEXT NOT NULL,
                gender TEXT NOT NULL,
                sell_price INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id)
            );
        ")?;
        Ok(())
    }

    // === Games ===

    pub fn save_game(&self, game: &game::state::GameState) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO games (id, pin, phase, config_json, current_season, current_turn)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                game.id.to_string(),
                game.pin,
                format!("{:?}", game.phase),
                serde_json::to_string(&game.config).unwrap_or_default(),
                game.current_season as i32,
                game.current_turn as i32,
            ],
        )?;
        Ok(())
    }

    pub fn load_game(&self, game_id: &str) -> Result<Option<game::state::GameState>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, pin, phase, config_json, current_season, current_turn FROM games WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![game_id], |row| {
            let id: String = row.get(0)?;
            let pin: String = row.get(1)?;
            let _phase: String = row.get(2)?;
            let config_json: String = row.get(3)?;
            let current_season: i32 = row.get(4)?;
            let current_turn: i32 = row.get(5)?;
            Ok((id, pin, config_json, current_season, current_turn))
        }).optional()?;

        match result {
            Some((id, pin, config_json, current_season, current_turn)) => {
                let config: game::state::GameConfig = serde_json::from_str(&config_json).unwrap_or_default();
                let mut game = game::state::GameState::new(config);
                game.id = Uuid::parse_str(&id).unwrap_or_default();
                game.pin = pin;
                game.current_season = current_season as usize;
                game.current_turn = current_turn as u32;
                Ok(Some(game))
            }
            None => Ok(None),
        }
    }
}

use crate::game;
use rusqlite::OptionalExtension;
