// ═══════════════════════════════════════════════════════════════
// GAME TYPES
// ═══════════════════════════════════════════════════════════════

export type CatColor = 'black' | 'gray' | 'white' | 'ginger';
export type CatGender = 'male' | 'female';
export type SicknessType = 'fleas' | 'poisoning' | 'ringworm' | 'fracture';
export type PlayerRole = 'nursery' | 'shop';
export type GamePhase = 'lobby' | 'playing' | 'ended';
export type TradeStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Cat {
  id: string;
  color: CatColor;
  gender: CatGender;
  age_months: number;
  price: number;
  owner_id: string;
  house_id: string | null;
  sickness: SicknessType | null;
  is_hungry: boolean;
  is_pregnant: boolean;
}

export interface House {
  id: string;
  owner_id: string;
  cat_ids: string[];
  is_insured: boolean;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  balance: number;
  is_connected: boolean;
}

export interface TradeOffer {
  id: string;
  seller_id: string;
  cat_ids: string[];
  price: number;
  buyer_id: string | null;
  status: TradeStatus;
}

export interface CityQuotaCat {
  color: CatColor;
  gender: CatGender;
  sell_price: number;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  current_season: string;
  current_turn: number;
  total_turns: number;
  turn_duration_sec: number;
  players: Player[];
  cats: Cat[];
  houses: House[];
  city_quota: CityQuotaCat[];
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════

export type ClientMessage =
  | { msg_type: 'join'; player_name: string; pin: string }
  | { msg_type: 'endturn_flag' }
  | { msg_type: 'feed_cat'; cat_id: string }
  | { msg_type: 'cat_treatment'; cat_id: string }
  | { msg_type: 'move_cat'; cat_id: string; house_id: string }
  | { msg_type: 'cats_mating'; female_cat_id: string }
  | { msg_type: 'trading_request'; cat_ids: string[]; price: number }
  | { msg_type: 'trading_confirm'; offer_id: string }
  | { msg_type: 'trading_cancel'; offer_id: string }
  | { msg_type: 'buying_house' }
  | { msg_type: 'house_insurance'; house_id: string }
  | { msg_type: 'city_trade'; cat_ids: string[]; trade_type: string }
  | { msg_type: 'credit_update'; amount: number; rate_type: string }
  | { msg_type: 'credit_repay'; amount: number };

export type ServerMessage =
  | { msg_type: 'synchronize'; game_state: GameState }
  | { msg_type: 'balance'; balance: number }
  | { msg_type: 'start_turn'; season: string; turn: number; turn_duration_sec: number }
  | { msg_type: 'wait_end_turn'; waiting_for: string[] }
  | { msg_type: 'game_over'; winner_id: string | null; reason: string }
  | { msg_type: 'player_cats_event'; event_type: string; cat: Cat }
  | { msg_type: 'trading_lot_update'; offer: TradeOffer }
  | { msg_type: 'credit_update_event'; credit: any }
  | { msg_type: 'city_quota_update'; quota: CityQuotaCat[] }
  | { msg_type: 'join_success'; player_id: string; role: string; game_state: GameState }
  | { msg_type: 'join_error'; message: string }
  | { msg_type: 'error'; message: string };

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CAT_COLORS: CatColor[] = ['black', 'gray', 'white', 'ginger'];
export const CAT_GENDERS: CatGender[] = ['male', 'female'];

export const COLOR_NAMES: Record<CatColor, string> = {
  black: 'Чёрный',
  gray: 'Серый',
  white: 'Белый',
  ginger: 'Рыжий',
};

export const GENDER_NAMES: Record<CatGender, string> = {
  male: '♂ Самец',
  female: '♀ Самка',
};

export const SICKNESS_NAMES: Record<SicknessType, string> = {
  fleas: 'Блохи',
  poisoning: 'Отравление',
  ringworm: 'Лишай',
  fracture: 'Перелом',
};

export const SEASON_NAMES: Record<string, string> = {
  summer: 'Лето',
  fall: 'Осень',
  winter: 'Зима',
  spring: 'Весна',
};

export const SEASON_COLORS: Record<string, string> = {
  summer: '#4CAF50',
  fall: '#FF9800',
  winter: '#2196F3',
  spring: '#E91E63',
};

export const BUY_PRICES: Record<CatColor, number> = {
  black: 6,
  gray: 8,
  white: 10,
  ginger: 7,
};

export const BUY_PRICES_FEMALE: Record<CatColor, number> = {
  black: 7,
  gray: 10,
  white: 11,
  ginger: 8,
};

export const SELL_TO_CITY_PRICE = 22;
export const HOUSE_COST = 15;
export const HOUSE_CAPACITY = 4;
export const FOOD_COST = 1;
export const INITIAL_MONEY = 70;

export const SICKNESS_COSTS: Record<SicknessType, number> = {
  fleas: 2,
  poisoning: 5,
  ringworm: 4,
  fracture: 8,
};
