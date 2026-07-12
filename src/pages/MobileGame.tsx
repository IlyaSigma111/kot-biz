import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import {
  SEASON_NAMES, SEASON_COLORS, COLOR_NAMES, GENDER_NAMES,
  SICKNESS_NAMES, BUY_PRICES, BUY_PRICES_FEMALE,
  SELL_TO_CITY_PRICE, HOUSE_COST, FOOD_COST, SICKNESS_COSTS,
  CatColor, CatGender, CAT_COLORS, CAT_GENDERS,
} from '../common/types';
import CatCard from '../components/CatCard';

interface Props {
  onDisconnect: () => void;
}

const MobileGame = observer(({ onDisconnect }: Props) => {
  const [tab, setTab] = useState<'cats' | 'houses' | 'trade' | 'shop'>('cats');
  const game = gameStore.game;
  const myPlayer = gameStore.myPlayer;
  const myCats = gameStore.myCats;
  const myHouses = gameStore.myHouses;

  if (!game || !myPlayer) {
    return (
      <div style={styles.center}>
        <p>Загрузка...</p>
      </div>
    );
  }

  const seasonName = SEASON_NAMES[game.current_season] || game.current_season;
  const seasonColor = SEASON_COLORS[game.current_season] || '#888';

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.playerInfo}>
          <span style={styles.playerName}>{myPlayer.name}</span>
          <span style={{
            ...styles.roleBadge,
            background: myPlayer.role === 'nursery' ? '#4CAF50' : '#FF9800',
          }}>
            {myPlayer.role === 'nursery' ? '🏠 Питомник' : '🛒 Магазин'}
          </span>
        </div>
        <div style={styles.balance}>💰 {myPlayer.balance}</div>
        <div style={{ ...styles.seasonBadge, background: seasonColor }}>
          {seasonName} #{game.current_turn}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'cats' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Мои коты ({myCats.length})</h3>
            {myCats.length === 0 && (
              <div style={styles.empty}>Пока нет котов</div>
            )}
            <div style={styles.catsGrid}>
              {myCats.map(cat => (
                <CatCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        )}

        {tab === 'houses' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Мои дома ({myHouses.length})</h3>
            <button
              style={{
                ...styles.actionBtn,
                background: myPlayer.balance >= HOUSE_COST
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#333',
              }}
              onClick={() => gameStore.buyHouse()}
              disabled={myPlayer.balance < HOUSE_COST}
            >
              Купить дом (💰 {HOUSE_COST})
            </button>
            {myHouses.map(house => (
              <div key={house.id} style={styles.houseCard}>
                <div style={styles.houseHeader}>
                  Дом {house.id.slice(0, 8)}
                  {house.is_insured && ' 🔒'}
                  <span style={styles.houseCapacity}>
                    {house.cat_ids.length}/4
                  </span>
                </div>
                <div style={styles.houseCats}>
                  {house.cat_ids.map(catId => {
                    const cat = game.cats.find(c => c.id === catId);
                    return cat ? <CatCard key={cat.id} cat={cat} compact /> : null;
                  })}
                </div>
                {house.cat_ids.length === 0 && (
                  <div style={styles.empty}>Пусто</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'shop' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Магазин</h3>

            <div style={styles.shopSection}>
              <h4 style={styles.shopSubTitle}>Купить кота</h4>
              <div style={styles.shopGrid}>
                {CAT_COLORS.map(color => (
                  CAT_GENDERS.map(gender => {
                    const price = gender === 'female' ? BUY_PRICES_FEMALE[color] : BUY_PRICES[color];
                    return (
                      <button
                        key={`${color}-${gender}`}
                        style={styles.shopItem}
                        onClick={() => gameStore.buyCat(color, gender)}
                      >
                        <span style={styles.shopCatIcon}>
                          {gender === 'male' ? '♂' : '♀'}
                        </span>
                        <span>{COLOR_NAMES[color]}</span>
                        <span style={styles.shopPrice}>💰 {price}</span>
                      </button>
                    );
                  })
                ))}
              </div>
            </div>

            <div style={styles.shopSection}>
              <h4 style={styles.shopSubTitle}>Продать кота в город</h4>
              <p style={styles.shopHint}>Цена: 💰 {SELL_TO_CITY_PRICE} за кота</p>
              <div style={styles.sellGrid}>
                {myCats.map(cat => (
                  <button
                    key={cat.id}
                    style={styles.sellItem}
                    onClick={() => gameStore.sellCatToCity(cat.id)}
                  >
                    {COLOR_NAMES[cat.color]} {GENDER_NAMES[cat.gender]}
                    <span style={styles.sellPrice}>💰 {SELL_TO_CITY_PRICE}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.shopSection}>
              <h4 style={styles.shopSubTitle}>Еда</h4>
              <p style={styles.shopHint}>Стоимость: 💰 {FOOD_COST}</p>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Торговля</h3>
            <div style={styles.tradeInfo}>
              <p>Обмен котами между игроками</p>
              <p style={styles.tradeHint}>Предложения появятся здесь</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom tabs */}
      <div style={styles.tabBar}>
        {([
          { key: 'cats', label: '🐱 Коты', count: myCats.length },
          { key: 'houses', label: '🏠 Дома', count: myHouses.length },
          { key: 'shop', label: '🛒 Магазин' },
          { key: 'trade', label: '🔄 Торговля' },
        ] as { readonly key: string; readonly label: string; readonly count?: number }[]).map(item => (
          <button
            key={item.key}
            style={{
              ...styles.tab,
              ...(tab === item.key ? styles.tabActive : {}),
            }}
            onClick={() => setTab(item.key as typeof tab)}
          >
            {item.label}
            {item.count !== undefined && <span style={styles.tabCount}>{item.count}</span>}
          </button>
        ))}
      </div>

      <button style={styles.disconnectBtn} onClick={onDisconnect}>
        Отключиться
      </button>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a1a',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#888',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid #222',
    background: '#111',
    flexWrap: 'wrap',
    gap: '8px',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  playerName: {
    fontWeight: 700,
    fontSize: '14px',
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white',
  },
  balance: {
    fontFamily: 'monospace',
    fontWeight: 700,
    fontSize: '14px',
    color: '#4CAF50',
  },
  seasonBadge: {
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#eee',
  },
  empty: {
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
    fontSize: '13px',
  },
  catsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  actionBtn: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: 700,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  houseCard: {
    background: '#16213e',
    borderRadius: '10px',
    padding: '12px',
  },
  houseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '8px',
  },
  houseCapacity: {
    marginLeft: 'auto',
    fontFamily: 'monospace',
    color: '#888',
  },
  houseCats: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  shopSection: {
    background: '#16213e',
    borderRadius: '10px',
    padding: '14px',
  },
  shopSubTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#ccc',
  },
  shopGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
  },
  shopItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 8px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
  },
  shopCatIcon: {
    fontSize: '20px',
  },
  shopPrice: {
    color: '#4CAF50',
    fontWeight: 600,
  },
  shopHint: {
    fontSize: '12px',
    color: '#666',
  },
  sellGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sellItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
  },
  sellPrice: {
    color: '#4CAF50',
    fontWeight: 600,
  },
  tradeInfo: {
    background: '#16213e',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
    color: '#888',
  },
  tradeHint: {
    fontSize: '12px',
    color: '#555',
    marginTop: '8px',
  },
  tabBar: {
    display: 'flex',
    borderTop: '1px solid #222',
    background: '#111',
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: '11px',
    cursor: 'pointer',
  },
  tabActive: {
    color: '#43e97b',
    borderBottom: '2px solid #43e97b',
  },
  tabCount: {
    fontSize: '10px',
    background: '#333',
    padding: '1px 6px',
    borderRadius: '8px',
  },
  disconnectBtn: {
    padding: '10px',
    background: 'transparent',
    color: '#666',
    border: 'none',
    borderTop: '1px solid #222',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default MobileGame;
