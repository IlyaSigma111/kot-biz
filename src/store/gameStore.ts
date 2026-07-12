import { makeAutoObservable } from 'mobx';
import { GameSocket } from '../common/ws';
import {
  GameState, Player, Cat, House, TradeOffer,
  CityQuotaCat, ServerMessage, ClientMessage,
  CatColor, CatGender, BUY_PRICES, BUY_PRICES_FEMALE,
  SELL_TO_CITY_PRICE, HOUSE_COST, FOOD_COST, SICKNESS_COSTS,
} from '../common/types';

class GameStore {
  // Connection
  socket: GameSocket | null = null;
  isConnected = false;
  isHost = false;

  // Player
  playerId: string | null = null;
  playerName = '';
  playerRole: string = '';

  // Game state
  game: GameState | null = null;

  // UI state
  selectedCatId: string | null = null;
  showTradeModal = false;
  showBuyModal = false;
  showHouseModal = false;
  showCreditModal = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // === Connection ===

  connect(url: string) {
    this.socket = new GameSocket(url);

    this.socket.onMessage((msg) => this.handleMessage(msg));
    this.socket.connect();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  send(msg: ClientMessage) {
    this.socket?.send(msg);
  }

  // === Message handling ===

  handleMessage(msg: ServerMessage) {
    switch (msg.msg_type) {
      case 'synchronize':
        this.game = msg.game_state;
        this.isConnected = true;
        break;

      case 'balance':
        if (this.game) {
          const player = this.game.players.find(p => p.id === this.playerId);
          if (player) player.balance = msg.balance;
        }
        break;

      case 'start_turn':
        if (this.game) {
          this.game.current_season = msg.season;
          this.game.current_turn = msg.turn;
          this.game.turn_duration_sec = msg.turn_duration_sec;
        }
        break;

      case 'join_success':
        this.playerId = msg.player_id;
        this.playerRole = msg.role;
        this.game = msg.game_state;
        this.isConnected = true;
        this.error = null;
        break;

      case 'join_error':
        this.error = msg.message;
        break;

      case 'error':
        this.error = msg.message;
        setTimeout(() => this.error = null, 3000);
        break;

      case 'trading_lot_update':
        if (this.game) {
          const existing = this.game.cats; // We'll handle this properly
        }
        break;
    }
  }

  // === Actions ===

  joinGame(playerName: string, pin: string) {
    this.playerName = playerName;
    this.send({ msg_type: 'join', player_name: playerName, pin });
  }

  endTurn() {
    this.send({ msg_type: 'endturn_flag' });
  }

  buyCat(color: CatColor, gender: CatGender) {
    // For nursery players — cats appear in their inventory
    // For shop — buy from city
    if (this.playerRole === 'Питомник') {
      // Auto-buy via city trade
      this.send({ msg_type: 'city_trade', cat_ids: [], trade_type: 'buy' });
    }
  }

  feedCat(catId: string) {
    this.send({ msg_type: 'feed_cat', cat_id: catId });
  }

  treatCat(catId: string) {
    this.send({ msg_type: 'cat_treatment', cat_id: catId });
  }

  buyHouse() {
    this.send({ msg_type: 'buying_house' });
  }

  sellCatToCity(catId: string) {
    this.send({ msg_type: 'city_trade', cat_ids: [catId], trade_type: 'sell' });
  }

  createTradeOffer(catIds: string[], price: number) {
    this.send({ msg_type: 'trading_request', cat_ids: catIds, price });
  }

  confirmTrade(offerId: string) {
    this.send({ msg_type: 'trading_confirm', offer_id: offerId });
  }

  cancelTrade(offerId: string) {
    this.send({ msg_type: 'trading_cancel', offer_id: offerId });
  }

  // === Computed ===

  get myPlayer(): Player | undefined {
    return this.game?.players.find(p => p.id === this.playerId);
  }

  get myCats(): Cat[] {
    return this.game?.cats.filter(c => c.owner_id === this.playerId) || [];
  }

  get myHouses(): House[] {
    return this.game?.houses.filter(h => h.owner_id === this.playerId) || [];
  }

  get allPlayers(): Player[] {
    return this.game?.players || [];
  }

  get allCats(): Cat[] {
    return this.game?.cats || [];
  }

  get activeTradeOffers(): TradeOffer[] {
    return this.game ? [] : []; // Will be populated from game state
  }

  get canAffordHouse(): boolean {
    return (this.myPlayer?.balance || 0) >= HOUSE_COST;
  }

  getCatBuyPrice(color: CatColor, gender: CatGender): number {
    return gender === 'female' ? BUY_PRICES_FEMALE[color] : BUY_PRICES[color];
  }

  getCatSellPrice(): number {
    return SELL_TO_CITY_PRICE;
  }

  getFoodCost(): number {
    return FOOD_COST;
  }

  getSicknessCost(sickness: string): number {
    return SICKNESS_COSTS[sickness as keyof typeof SICKNESS_COSTS] || 0;
  }
}

export const gameStore = new GameStore();
