use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

pub const INITIAL_MONEY: i64 = 70;
pub const FOOD_COST: i64 = 1;
pub const HOUSE_COST: i64 = 15;
pub const HOUSE_CAPACITY: usize = 4;
pub const SELL_TO_CITY: i64 = 22;
pub const HOUSEHOLD_NURSERY: i64 = 3;
pub const HOUSEHOLD_SHOP: i64 = 1;
pub const SEASONS: usize = 4;

pub const TURN_DURATIONS: [u64; 13] = [
    600, 300, 300, 300, 900, 300, 300, 300, 900, 300, 900, 600, 900,
];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum CatColor { Black, Gray, White, Ginger }

impl CatColor {
    pub fn all() -> &'static [CatColor] {
        &[Self::Black, Self::Gray, Self::White, Self::Ginger]
    }
    pub fn male_price(&self) -> i64 {
        match self { Self::Black => 6, Self::Gray => 8, Self::White => 10, Self::Ginger => 7 }
    }
    pub fn female_price(&self) -> i64 {
        match self { Self::Black => 7, Self::Gray => 10, Self::White => 11, Self::Ginger => 8 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum CatGender { Male, Female }

impl CatGender {
    pub fn all() -> &'static [CatGender] { &[Self::Male, Self::Female] }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Sickness { Fleas, Poisoning, Ringworm, Fracture }

impl Sickness {
    pub fn cost(&self) -> i64 {
        match self { Self::Fleas => 2, Self::Poisoning => 5, Self::Ringworm => 4, Self::Fracture => 8 }
    }
    pub fn random() -> Self {
        match rand::random::<u8>() % 4 { 0 => Self::Fleas, 1 => Self::Poisoning, 2 => Self::Ringworm, _ => Self::Fracture }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PlayerRole { Nursery, Shop }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Season { Summer, Fall, Winter, Spring }

impl Season {
    pub fn all() -> &'static [Season] { &[Self::Summer, Self::Fall, Self::Winter, Self::Spring] }
    pub fn name(&self) -> &str {
        match self { Self::Summer => "Лето", Self::Fall => "Осень", Self::Winter => "Зима", Self::Spring => "Весна" }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GamePhase { Lobby, Playing, Ended }

// ═══════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cat {
    pub id: Uuid,
    pub color: CatColor,
    pub gender: CatGender,
    pub age_months: u32,
    pub price: i64,
    pub owner_id: Uuid,
    pub house_id: Option<Uuid>,
    pub sickness: Option<Sickness>,
    pub is_hungry: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct House {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub cat_ids: Vec<Uuid>,
    pub is_insured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: Uuid,
    pub name: String,
    pub role: PlayerRole,
    pub balance: i64,
    pub is_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeOffer {
    pub id: Uuid,
    pub seller_id: Uuid,
    pub cat_ids: Vec<Uuid>,
    pub price: i64,
    pub buyer_id: Option<Uuid>,
}

// ═══════════════════════════════════════════════════════════════
// GAME SESSION
// ═══════════════════════════════════════════════════════════════

pub fn generate_pin() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:04}", rng.gen_range(0..10000u32))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSession {
    pub pin: String,
    pub phase: GamePhase,
    pub players: HashMap<Uuid, Player>,
    pub cats: HashMap<Uuid, Cat>,
    pub houses: HashMap<Uuid, House>,
    pub trade_offers: HashMap<Uuid, TradeOffer>,
    pub current_season: usize,
    pub current_turn: u32,
    pub created_at: DateTime<Utc>,
}

impl GameSession {
    pub fn new(pin: String) -> Self {
        Self {
            pin,
            phase: GamePhase::Lobby,
            players: HashMap::new(),
            cats: HashMap::new(),
            houses: HashMap::new(),
            trade_offers: HashMap::new(),
            current_season: 0,
            current_turn: 0,
            created_at: Utc::now(),
        }
    }

    pub fn add_player(&mut self, name: &str) -> Uuid {
        let role = if self.players.values().filter(|p| matches!(p.role, PlayerRole::Nursery)).count()
            < self.players.values().filter(|p| matches!(p.role, PlayerRole::Shop)).count()
        { PlayerRole::Nursery } else { PlayerRole::Shop };

        let id = Uuid::new_v4();
        self.players.insert(id, Player {
            id, name: name.to_string(), role, balance: INITIAL_MONEY, is_connected: false,
        });
        id
    }

    pub fn find_by_pin(&self, pin: &str) -> Option<&Player> {
        self.players.values().find(|p| p.id.to_string().replace("-", "").starts_with(pin))
    }

    pub fn start(&mut self) {
        self.phase = GamePhase::Playing;
        // Give starting cats to nurseries
        let nursery_ids: Vec<Uuid> = self.players.iter()
            .filter(|(_, p)| matches!(p.role, PlayerRole::Nursery))
            .map(|(id, _)| *id).collect();
        for pid in &nursery_ids {
            for color in CatColor::all() {
                for gender in CatGender::all() {
                    let price = match gender { CatGender::Male => color.male_price(), CatGender::Female => color.female_price() };
                    let id = Uuid::new_v4();
                    self.cats.insert(id, Cat {
                        id, color: color.clone(), gender: gender.clone(), age_months: 0,
                        price, owner_id: *pid, house_id: None, sickness: None, is_hungry: false,
                    });
                }
            }
        }
    }

    pub fn buy_cat(&mut self, player_id: Uuid, color: &CatColor, gender: &CatGender) -> Result<Cat, String> {
        let price = match gender { CatGender::Male => color.male_price(), CatGender::Female => color.female_price() };
        let p = self.players.get(&player_id).ok_or("Player not found")?;
        if p.balance < price { return Err("Not enough balance".into()); }
        self.players.get_mut(&player_id).unwrap().balance -= price;
        let id = Uuid::new_v4();
        let cat = Cat { id, color: color.clone(), gender: gender.clone(), age_months: 0, price, owner_id: player_id, house_id: None, sickness: None, is_hungry: false };
        self.cats.insert(id, cat.clone());
        Ok(cat)
    }

    pub fn sell_to_city(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<(), String> {
        let cat = self.cats.get(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id { return Err("Not your cat".into()); }
        if cat.sickness.is_some() { return Err("Sick cat".into()); }
        if let Some(hid) = cat.house_id {
            if let Some(h) = self.houses.get_mut(&hid) { h.cat_ids.retain(|x| *x != cat_id); }
        }
        self.cats.remove(&cat_id);
        self.players.get_mut(&player_id).unwrap().balance += SELL_TO_CITY;
        Ok(())
    }

    pub fn feed_cat(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<(), String> {
        let cat = self.cats.get_mut(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id { return Err("Not your cat".into()); }
        if !cat.is_hungry { return Err("Not hungry".into()); }
        if self.players[&player_id].balance < FOOD_COST { return Err("No money".into()); }
        cat.is_hungry = false;
        self.players.get_mut(&player_id).unwrap().balance -= FOOD_COST;
        Ok(())
    }

    pub fn treat_cat(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<(), String> {
        let cat = self.cats.get_mut(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id { return Err("Not your cat".into()); }
        let cost = cat.sickness.as_ref().ok_or("Not sick")?.cost();
        if self.players[&player_id].balance < cost { return Err("No money".into()); }
        cat.sickness = None;
        self.players.get_mut(&player_id).unwrap().balance -= cost;
        Ok(())
    }

    pub fn buy_house(&mut self, player_id: Uuid) -> Result<House, String> {
        if self.players[&player_id].balance < HOUSE_COST { return Err("No money".into()); }
        self.players.get_mut(&player_id).unwrap().balance -= HOUSE_COST;
        let id = Uuid::new_v4();
        let house = House { id, owner_id: player_id, cat_ids: vec![], is_insured: false };
        self.houses.insert(id, house.clone());
        Ok(house)
    }

    pub fn create_trade(&mut self, seller_id: Uuid, cat_ids: Vec<Uuid>, price: i64) -> Result<TradeOffer, String> {
        for cid in &cat_ids {
            let cat = self.cats.get(cid).ok_or("Cat not found")?;
            if cat.owner_id != seller_id { return Err("Not your cat".into()); }
        }
        let id = Uuid::new_v4();
        let offer = TradeOffer { id, seller_id, cat_ids, price, buyer_id: None };
        self.trade_offers.insert(id, offer.clone());
        Ok(offer)
    }

    pub fn accept_trade(&mut self, buyer_id: Uuid, offer_id: Uuid) -> Result<(), String> {
        let offer = self.trade_offers.get(&offer_id).ok_or("Not found")?;
        if offer.seller_id == buyer_id { return Err("Can't buy own".into()); }
        if self.players[&buyer_id].balance < offer.price { return Err("No money".into()); }
        let seller_id = offer.seller_id;
        let price = offer.price;
        let cat_ids = offer.cat_ids.clone();
        self.players.get_mut(&buyer_id).unwrap().balance -= price;
        self.players.get_mut(&seller_id).unwrap().balance += price;
        for cid in &cat_ids {
            if let Some(cat) = self.cats.get_mut(cid) { cat.owner_id = buyer_id; cat.house_id = None; }
        }
        self.trade_offers.get_mut(&offer_id).unwrap().buyer_id = Some(buyer_id);
        Ok(())
    }

    pub fn end_turn(&mut self) {
        self.current_turn += 1;
        if self.current_turn >= TURN_DURATIONS.len() as u32 {
            self.current_turn = 0;
            self.current_season = (self.current_season + 1) % SEASONS;
        }
        // Household costs
        let ids: Vec<Uuid> = self.players.keys().cloned().collect();
        for pid in &ids {
            let cost = match self.players[pid].role { PlayerRole::Nursery => HOUSEHOLD_NURSERY, PlayerRole::Shop => HOUSEHOLD_SHOP };
            self.players.get_mut(pid).unwrap().balance -= cost;
        }
        // Random hunger
        for cat in self.cats.values_mut() {
            if rand::random::<f64>() < 0.1 { cat.is_hungry = true; }
            else if cat.is_hungry && rand::random::<f64>() < 0.3 { cat.sickness = Some(Sickness::random()); }
        }
    }

    pub fn turn_duration(&self) -> u64 {
        TURN_DURATIONS.get(self.current_turn as usize).copied().unwrap_or(300)
    }

    pub fn season_name(&self) -> &str {
        Season::all()[self.current_season % SEASONS].name()
    }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "join")]
    Join { name: String },
    #[serde(rename = "host_join")]
    HostJoin,
    #[serde(rename = "start_game")]
    StartGame,
    #[serde(rename = "feed")]
    Feed { cat_id: Uuid },
    #[serde(rename = "treat")]
    Treat { cat_id: Uuid },
    #[serde(rename = "buy_cat")]
    BuyCat { color: CatColor, gender: CatGender },
    #[serde(rename = "sell_to_city")]
    SellToCity { cat_id: Uuid },
    #[serde(rename = "buy_house")]
    BuyHouse,
    #[serde(rename = "create_trade")]
    CreateTrade { cat_ids: Vec<Uuid>, price: i64 },
    #[serde(rename = "accept_trade")]
    AcceptTrade { offer_id: Uuid },
    #[serde(rename = "end_turn")]
    EndTurn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "joined")]
    Joined { player_id: Uuid, role: String },
    #[serde(rename = "host_joined")]
    HostJoined,
    #[serde(rename = "game_state")]
    GameState { session: serde_json::Value },
    #[serde(rename = "player_joined")]
    PlayerJoined { name: String },
    #[serde(rename = "player_left")]
    PlayerLeft { player_id: Uuid },
    #[serde(rename = "game_started")]
    GameStarted,
    #[serde(rename = "turn_started")]
    TurnStarted { season: String, turn: u32, duration: u64 },
    #[serde(rename = "cat_bought")]
    CatBought { cat: serde_json::Value },
    #[serde(rename = "cat_sold")]
    CatSold { cat_id: Uuid },
    #[serde(rename = "balance")]
    Balance { balance: i64 },
    #[serde(rename = "new_trade")]
    NewTrade { offer: serde_json::Value },
    #[serde(rename = "trade_accepted")]
    TradeAccepted { offer_id: Uuid },
    #[serde(rename = "house_bought")]
    HouseBought { house: serde_json::Value },
    #[serde(rename = "error")]
    Error { message: String },
}

impl ServerMessage {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}
