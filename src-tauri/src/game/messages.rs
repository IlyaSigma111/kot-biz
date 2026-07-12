use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════
// CLIENT → SERVER MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "msg_type")]
pub enum ClientMessage {
    // === Game lifecycle ===
    #[serde(rename = "join")]
    Join { player_name: String, pin: String },

    #[serde(rename = "endturn_flag")]
    EndTurnFlag,

    // === Cats ===
    #[serde(rename = "feed_cat")]
    FeedCat { cat_id: Uuid },

    #[serde(rename = "cat_treatment")]
    CatTreatment { cat_id: Uuid },

    #[serde(rename = "move_cat")]
    MoveCat { cat_id: Uuid, house_id: Uuid },

    #[serde(rename = "cats_mating")]
    CatsMating { female_cat_id: Uuid },

    #[serde(rename = "examine_cat")]
    ExamineCat { cat_id: Uuid },

    // === Trading ===
    #[serde(rename = "trading_request")]
    TradingRequest { cat_ids: Vec<Uuid>, price: i64 },

    #[serde(rename = "trading_confirm")]
    TradingConfirm { offer_id: Uuid },

    #[serde(rename = "trading_cancel")]
    TradingCancel { offer_id: Uuid },

    // === Housing ===
    #[serde(rename = "buying_house")]
    BuyingHouse,

    #[serde(rename = "house_insurance")]
    HouseInsurance { house_id: Uuid },

    // === City trade ===
    #[serde(rename = "city_trade")]
    CityTrade { cat_ids: Vec<Uuid>, trade_type: String },

    // === Credits ===
    #[serde(rename = "get_possible_credit_request")]
    GetPossibleCreditRequest,

    #[serde(rename = "credit_update")]
    CreditUpdate { amount: i64, rate_type: String },

    #[serde(rename = "credit_repay")]
    CreditRepay { amount: i64 },

    // === Budget (CEO) ===
    #[serde(rename = "budget_allocation")]
    BudgetAllocation { player_id: Uuid, amount: i64 },

    // === Misc ===
    #[serde(rename = "change_preset_price")]
    ChangePresetPrice { color: String, gender: String, price: i64 },

    #[serde(rename = "get_team_history")]
    GetTeamHistory,
}

// ═══════════════════════════════════════════════════════════════
// SERVER → CLIENT MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "msg_type")]
pub enum ServerMessage {
    // === Synchronization ===
    #[serde(rename = "synchronize")]
    Synchronize { game_state: serde_json::Value },

    #[serde(rename = "balance")]
    Balance { balance: i64 },

    #[serde(rename = "start_turn")]
    StartTurn { season: String, turn: u32, turn_duration_sec: u64 },

    #[serde(rename = "wait_end_turn")]
    WaitEndTurn { waiting_for: Vec<String> },

    #[serde(rename = "game_over")]
    GameOver { winner_id: Option<Uuid>, reason: String },

    // === Cats ===
    #[serde(rename = "player_cats_event")]
    PlayerCatsEvent { event_type: String, cat: serde_json::Value },

    #[serde(rename = "house_cats_update_event")]
    HouseCatsUpdate { house_id: Uuid, cat_ids: Vec<Uuid> },

    // === Trading ===
    #[serde(rename = "trading_lot_update")]
    TradingLotUpdate { offer: serde_json::Value },

    // === Credits ===
    #[serde(rename = "credit_update_event")]
    CreditUpdateEvent { credit: Option<serde_json::Value> },

    #[serde(rename = "get_possible_credit_response")]
    GetPossibleCreditResponse { max_amount: i64, rates: serde_json::Value },

    // === City ===
    #[serde(rename = "city_quota_update")]
    CityQuotaUpdate { quota: Vec<serde_json::Value> },

    // === Notifications ===
    #[serde(rename = "task_update")]
    TaskUpdate { task: serde_json::Value },

    // === Errors ===
    #[serde(rename = "error")]
    Error { message: String },

    // === Join response ===
    #[serde(rename = "join_success")]
    JoinSuccess { player_id: Uuid, role: String, game_state: serde_json::Value },

    #[serde(rename = "join_error")]
    JoinError { message: String },
}

impl ServerMessage {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}
