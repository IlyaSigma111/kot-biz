pub mod messages;
pub mod types;

use types::*;
use messages::*;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════════
// GAME CONFIG (from bundle defaults)
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone)]
pub struct GameConfig {
    pub nursery_count: u32,
    pub shop_count: u32,
    pub with_credit: bool,
    pub with_bots: bool,
    pub city_quota_min: u32,
    pub city_quota_max: u32,
    pub turn_durations: Vec<u64>,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            nursery_count: 2,
            shop_count: 2,
            with_credit: true,
            with_bots: false,
            city_quota_min: CITY_QUOTA_MIN,
            city_quota_max: CITY_QUOTA_MAX,
            turn_durations: TURN_DURATIONS.to_vec(),
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone)]
pub enum GamePhase {
    Lobby,
    Playing,
    Ended,
}

#[derive(Debug, Clone)]
pub struct GameState {
    pub id: Uuid,
    pub pin: String,
    pub phase: GamePhase,
    pub config: GameConfig,
    pub players: HashMap<Uuid, Player>,
    pub cats: HashMap<Uuid, Cat>,
    pub houses: HashMap<Uuid, House>,
    pub trade_offers: HashMap<Uuid, TradeOffer>,
    pub city_quota: Vec<CityQuotaCat>,
    pub current_season: usize,
    pub current_turn: u32,
    pub total_turns: u32,
    pub turn_started_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl GameState {
    pub fn new(config: GameConfig) -> Self {
        let mut total_turns = 0;
        for _ in 0..SEASONS_COUNT {
            total_turns += config.turn_durations.len() as u32;
        }

        Self {
            id: Uuid::new_v4(),
            pin: generate_pin(),
            phase: GamePhase::Lobby,
            config,
            players: HashMap::new(),
            cats: HashMap::new(),
            houses: HashMap::new(),
            trade_offers: HashMap::new(),
            city_quota: Vec::new(),
            current_season: 0,
            current_turn: 0,
            total_turns,
            turn_started_at: None,
            created_at: Utc::now(),
        }
    }

    pub fn add_player(&mut self, name: String, role: PlayerRole) -> Uuid {
        let initial_money = match role {
            PlayerRole::Nursery => INITIAL_MONEY_NURSERY,
            PlayerRole::Shop => INITIAL_MONEY_SHOP,
        };

        let pin = generate_pin();
        let player = Player {
            id: Uuid::new_v4(),
            name,
            role,
            balance: initial_money,
            pin: pin.clone(),
            is_connected: false,
            houses: Vec::new(),
            credit: None,
        };

        let id = player.id;
        self.players.insert(id, player);
        id
    }

    pub fn find_player_by_pin(&self, pin: &str) -> Option<&Player> {
        self.players.values().find(|p| p.pin == pin)
    }

    pub fn start_game(&mut self) {
        self.phase = GamePhase::Playing;
        self.current_season = 0;
        self.current_turn = 0;
        self.turn_started_at = Some(Utc::now());

        // Give starting cats to nurseries
        let nursery_ids: Vec<Uuid> = self.players.iter()
            .filter(|(_, p)| p.role == PlayerRole::Nursery)
            .map(|(id, _)| *id)
            .collect();

        for player_id in &nursery_ids {
            // 2 black cats per nursery
            for color in [CatColor::Black, CatColor::Gray] {
                for gender in CatGender::all() {
                    let price = match gender {
                        CatGender::Male => color.buy_price(),
                        CatGender::Female => color.female_buy_price(),
                    };
                    let cat = Cat::new(color.clone(), gender.clone(), price, *player_id);
                    self.cats.insert(cat.id, cat);
                }
            }
        }

        // Generate city quota
        self.regenerate_city_quota();
    }

    pub fn buy_cat(&mut self, player_id: Uuid, color: &CatColor, gender: &CatGender) -> Result<Cat, String> {
        let player = self.players.get(&player_id).ok_or("Player not found")?;
        let price = match gender {
            CatGender::Male => color.buy_price(),
            CatGender::Female => color.female_buy_price(),
        };

        if player.balance < price {
            return Err("Not enough balance".into());
        }

        let mut cat = Cat::new(color.clone(), gender.clone(), price, player_id);
        self.cats.insert(cat.id, cat.clone());

        // Deduct money
        let player = self.players.get_mut(&player_id).unwrap();
        player.balance -= price;

        Ok(cat)
    }

    pub fn sell_cat_to_city(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<i64, String> {
        let cat = self.cats.get(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id {
            return Err("Not your cat".into());
        }
        if cat.sickness.is_some() {
            return Err("Can't sell sick cat".into());
        }

        let price = SELL_TO_CITY_PRICE;
        self.cats.remove(&cat_id);

        let player = self.players.get_mut(&player_id).unwrap();
        player.balance += price;

        // Remove from house
        if let Some(house_id) = cat.house_id {
            if let Some(house) = self.houses.get_mut(&house_id) {
                house.cat_ids.retain(|id| *id != cat_id);
            }
        }

        Ok(price)
    }

    pub fn feed_cat(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<(), String> {
        let cat = self.cats.get_mut(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id {
            return Err("Not your cat".into());
        }
        if !cat.is_hungry {
            return Err("Cat is not hungry".into());
        }

        let player = self.players.get(&player_id).unwrap();
        if player.balance < FOOD_COST {
            return Err("Not enough balance for food".into());
        }

        cat.is_hungry = false;

        let player = self.players.get_mut(&player_id).unwrap();
        player.balance -= FOOD_COST;

        Ok(())
    }

    pub fn treat_cat(&mut self, player_id: Uuid, cat_id: Uuid) -> Result<(), String> {
        let cat = self.cats.get_mut(&cat_id).ok_or("Cat not found")?;
        if cat.owner_id != player_id {
            return Err("Not your cat".into());
        }
        let sickness = cat.sickness.as_ref().ok_or("Cat is not sick")?;
        let cost = sickness.treatment_cost();

        let player = self.players.get(&player_id).unwrap();
        if player.balance < cost {
            return Err("Not enough balance for treatment".into());
        }

        cat.sickness = None;

        let player = self.players.get_mut(&player_id).unwrap();
        player.balance -= cost;

        Ok(())
    }

    pub fn buy_house(&mut self, player_id: Uuid) -> Result<House, String> {
        let player = self.players.get(&player_id).ok_or("Player not found")?;

        if player.balance < HOUSE_COST {
            return Err("Not enough balance".into());
        }

        let house = House::new(player_id);

        let player = self.players.get_mut(&player_id).unwrap();
        player.balance -= HOUSE_COST;
        player.houses.push(house.clone());
        self.houses.insert(house.id, house.clone());

        Ok(house)
    }

    pub fn create_trade_offer(&mut self, seller_id: Uuid, cat_ids: Vec<Uuid>, price: i64) -> Result<TradeOffer, String> {
        // Verify all cats belong to seller and are not in trades
        for cat_id in &cat_ids {
            let cat = self.cats.get(cat_id).ok_or("Cat not found")?;
            if cat.owner_id != seller_id {
                return Err("Not your cat".into());
            }
        }

        let offer = TradeOffer {
            id: Uuid::new_v4(),
            seller_id,
            cat_ids,
            price,
            buyer_id: None,
            status: TradeStatus::Pending,
        };

        self.trade_offers.insert(offer.id, offer.clone());
        Ok(offer)
    }

    pub fn confirm_trade(&mut self, buyer_id: Uuid, offer_id: Uuid) -> Result<(), String> {
        let offer = self.trade_offers.get_mut(&offer_id).ok_or("Offer not found")?;
        if offer.status != TradeStatus::Pending {
            return Err("Offer is not pending".into());
        }
        if offer.seller_id == buyer_id {
            return Err("Can't buy your own offer".into());
        }

        let buyer = self.players.get(&buyer_id).ok_or("Buyer not found")?;
        if buyer.balance < offer.price {
            return Err("Not enough balance".into());
        }

        // Transfer money
        let seller_id = offer.seller_id;
        let price = offer.price;

        self.players.get_mut(&buyer_id).unwrap().balance -= price;
        self.players.get_mut(&seller_id).unwrap().balance += price;

        // Transfer cats
        for cat_id in &offer.cat_ids {
            if let Some(cat) = self.cats.get_mut(cat_id) {
                cat.owner_id = buyer_id;
                cat.house_id = None;
            }
        }

        // Update offer
        let offer = self.trade_offers.get_mut(&offer_id).unwrap();
        offer.buyer_id = Some(buyer_id);
        offer.status = TradeStatus::Confirmed;

        Ok(())
    }

    pub fn end_turn(&mut self) {
        self.current_turn += 1;

        if self.current_turn >= self.config.turn_durations.len() as u32 {
            self.current_turn = 0;
            self.current_season = (self.current_season + 1) % SEASONS_COUNT;
        }

        // Apply household costs
        let player_ids: Vec<Uuid> = self.players.keys().cloned().collect();
        for player_id in &player_ids {
            let cost = if let Some(player) = self.players.get(player_id) {
                match player.role {
                    PlayerRole::Nursery => HOUSEHOLD_COST_NURSERY,
                    PlayerRole::Shop => HOUSEHOLD_COST_SHOP,
                }
            } else {
                0
            };

            if let Some(player) = self.players.get_mut(player_id) {
                player.balance -= cost;
            }
        }

        // Random sickness chance (10% per hungry cat per turn)
        let cat_ids: Vec<Uuid> = self.cats.keys().cloned().collect();
        for cat_id in &cat_ids {
            let rng = rand::random::<f64>();
            if rng < 0.1 {
                if let Some(cat) = self.cats.get_mut(cat_id) {
                    if !cat.is_hungry {
                        cat.is_hungry = true;
                    } else {
                        // Already hungry — chance to get sick
                        if rand::random::<f64>() < 0.3 {
                            cat.sickness = Some(match rand::random::<u8>() % 4 {
                                0 => Sickness::Fleas,
                                1 => Sickness::Poisoning,
                                2 => Sickness::Ringworm,
                                _ => Sickness::Fracture,
                            });
                        }
                    }
                }
            }
        }

        self.turn_started_at = Some(Utc::now());
    }

    fn regenerate_city_quota(&mut self) {
        self.city_quota.clear();
        for color in CatColor::all() {
            for gender in CatGender::all() {
                let base_price = match gender {
                    CatGender::Male => color.buy_price(),
                    CatGender::Female => color.female_buy_price(),
                };
                self.city_quota.push(CityQuotaCat {
                    color: color.clone(),
                    gender: gender.clone(),
                    sell_price: base_price + 2,
                });
            }
        }
    }

    pub fn current_turn_duration(&self) -> u64 {
        self.config.turn_durations
            .get(self.current_turn as usize)
            .copied()
            .unwrap_or(300)
    }

    pub fn current_season_type(&self) -> Season {
        Season::all()[self.current_season].clone()
    }

    pub fn to_sync_json(&self) -> serde_json::Value {
        let players: Vec<serde_json::Value> = self.players.values().map(|p| {
            serde_json::json!({
                "id": p.id,
                "name": p.name,
                "role": p.role,
                "balance": p.balance,
                "is_connected": p.is_connected,
            })
        }).collect();

        let cats: Vec<serde_json::Value> = self.cats.values().map(|c| {
            serde_json::json!({
                "id": c.id,
                "color": c.color,
                "gender": c.gender,
                "age_months": c.age_months,
                "price": c.price,
                "owner_id": c.owner_id,
                "house_id": c.house_id,
                "sickness": c.sickness,
                "is_hungry": c.is_hungry,
            })
        }).collect();

        let houses: Vec<serde_json::Value> = self.houses.values().map(|h| {
            serde_json::json!({
                "id": h.id,
                "owner_id": h.owner_id,
                "cat_ids": h.cat_ids,
                "is_insured": h.is_insured,
            })
        }).collect();

        serde_json::json!({
            "id": self.id,
            "phase": self.phase,
            "current_season": self.current_season_type().display_name(),
            "current_turn": self.current_turn,
            "total_turns": self.total_turns,
            "turn_duration_sec": self.current_turn_duration(),
            "players": players,
            "cats": cats,
            "houses": houses,
            "city_quota": self.city_quota,
        })
    }
}

fn generate_pin() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..999999))
}

// ═══════════════════════════════════════════════════════════════
// GAME MANAGER (thread-safe wrapper)
// ═══════════════════════════════════════════════════════════════

pub type SharedGameState = Arc<RwLock<GameState>>;

pub fn create_game(config: GameConfig) -> SharedGameState {
    Arc::new(RwLock::new(GameState::new(config)))
}
