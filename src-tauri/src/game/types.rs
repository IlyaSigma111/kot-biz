use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ═══════════════════════════════════════════════════════════════
// CAT TYPES
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CatColor {
    #[serde(rename = "black")]
    Black,
    #[serde(rename = "gray")]
    Gray,
    #[serde(rename = "white")]
    White,
    #[serde(rename = "ginger")]
    Ginger,
}

impl CatColor {
    pub fn all() -> &'static [CatColor] {
        &[CatColor::Black, CatColor::Gray, CatColor::White, CatColor::Ginger]
    }

    pub fn buy_price(&self) -> i64 {
        match self {
            CatColor::Black => 6,
            CatColor::Gray => 8,
            CatColor::White => 10,
            CatColor::Ginger => 7,
        }
    }

    pub fn female_buy_price(&self) -> i64 {
        match self {
            CatColor::Black => 7,
            CatColor::Gray => 10,
            CatColor::White => 11,
            CatColor::Ginger => 8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CatGender {
    #[serde(rename = "male")]
    Male,
    #[serde(rename = "female")]
    Female,
}

impl CatGender {
    pub fn all() -> &'static [CatGender] {
        &[CatGender::Male, CatGender::Female]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Sickness {
    #[serde(rename = "fleas")]
    Fleas,
    #[serde(rename = "poisoning")]
    Poisoning,
    #[serde(rename = "ringworm")]
    Ringworm,
    #[serde(rename = "fracture")]
    Fracture,
}

impl Sickness {
    pub fn treatment_cost(&self) -> i64 {
        match self {
            Sickness::Fleas => 2,
            Sickness::Poisoning => 5,
            Sickness::Ringworm => 4,
            Sickness::Fracture => 8,
        }
    }
}

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
    pub is_pregnant: bool,
}

impl Cat {
    pub fn new(color: CatColor, gender: CatGender, price: i64, owner_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            color,
            gender,
            age_months: 0,
            price,
            owner_id,
            house_id: None,
            sickness: None,
            is_hungry: false,
            is_pregnant: false,
        }
    }

    pub fn display_name(&self) -> String {
        let color = match self.color {
            CatColor::Black => "Чёрный",
            CatColor::Gray => "Серый",
            CatColor::White => "Белый",
            CatColor::Ginger => "Рыжий",
        };
        let gender = match self.gender {
            CatGender::Male => "♂",
            CatGender::Female => "♀",
        };
        format!("{} {}", color, gender)
    }
}

// ═══════════════════════════════════════════════════════════════
// HOUSE
// ═══════════════════════════════════════════════════════════════

pub const HOUSE_COST: i64 = 15;
pub const HOUSE_CAPACITY: u32 = 4;
pub const HOUSE_INSURANCE_COST: i64 = 5;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct House {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub cat_ids: Vec<Uuid>,
    pub is_insured: bool,
}

impl House {
    pub fn new(owner_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            owner_id,
            cat_ids: Vec::new(),
            is_insured: false,
        }
    }

    pub fn is_full(&self) -> bool {
        self.cat_ids.len() >= HOUSE_CAPACITY as usize
    }
}

// ═══════════════════════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PlayerRole {
    #[serde(rename = "nursery")]
    Nursery,
    #[serde(rename = "shop")]
    Shop,
}

impl PlayerRole {
    pub fn display_name(&self) -> &str {
        match self {
            PlayerRole::Nursery => "Питомник",
            PlayerRole::Shop => "Зоомагазин",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: Uuid,
    pub name: String,
    pub role: PlayerRole,
    pub balance: i64,
    pub pin: String,
    pub is_connected: bool,
    pub houses: Vec<House>,
    pub credit: Option<Credit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credit {
    pub amount: i64,
    pub rate_percent: i64,
    pub turns_remaining: u32,
}

// ═══════════════════════════════════════════════════════════════
// SEASONS
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Season {
    #[serde(rename = "summer")]
    Summer,
    #[serde(rename = "fall")]
    Fall,
    #[serde(rename = "winter")]
    Winter,
    #[serde(rename = "spring")]
    Spring,
}

impl Season {
    pub fn all() -> &'static [Season] {
        &[Season::Summer, Season::Fall, Season::Winter, Season::Spring]
    }

    pub fn display_name(&self) -> &str {
        match self {
            Season::Summer => "Лето",
            Season::Fall => "Осень",
            Season::Winter => "Зима",
            Season::Spring => "Весна",
        }
    }
}

pub const SEASONS_COUNT: usize = 4;

// Turn durations in seconds: 13 turns per season
pub const TURN_DURATIONS: [u64; 13] = [
    600, 300, 300, 300, 900, 300, 300, 300, 900, 300, 900, 600, 900,
];

pub const MONTH_DURATION_SEC: u64 = 180; // 3 minutes per month
pub const ABSENCE_TIMEOUT_SEC: u64 = 600; // 10 minutes

// ═══════════════════════════════════════════════════════════════
// ECONOMY CONSTANTS
// ═══════════════════════════════════════════════════════════════

pub const INITIAL_MONEY_SHOP: i64 = 70;
pub const INITIAL_MONEY_NURSERY: i64 = 70;
pub const HOUSEHOLD_COST_SHOP: i64 = 1;
pub const HOUSEHOLD_COST_NURSERY: i64 = 3;
pub const FOOD_COST: i64 = 1;
pub const SELL_TO_CITY_PRICE: i64 = 22;

pub const CITY_QUOTA_MIN: u32 = 120;
pub const CITY_QUOTA_MAX: u32 = 200;

pub const CREDIT_CONSUMER_RATE: i64 = 5;
pub const CREDIT_INVESTMENT_RATE: i64 = 10;
pub const CREDIT_SPECIAL_RATE: i64 = 15;
pub const MAX_CREDIT: i64 = 80;
pub const BANK_GUARANTEE: i64 = 100;
pub const MAX_FINE: i64 = 120;

// ═══════════════════════════════════════════════════════════════
// TRADE
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeOffer {
    pub id: Uuid,
    pub seller_id: Uuid,
    pub cat_ids: Vec<Uuid>,
    pub price: i64,
    pub buyer_id: Option<Uuid>,
    pub status: TradeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TradeStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "cancelled")]
    Cancelled,
}

// ═══════════════════════════════════════════════════════════════
// CITY QUOTA
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityQuotaCat {
    pub color: CatColor,
    pub gender: CatGender,
    pub sell_price: i64,
}
