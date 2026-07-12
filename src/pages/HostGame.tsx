import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import { SEASON_NAMES, SEASON_COLORS } from '../common/types';
import CatCard from '../components/CatCard';

interface Props {
  onBack: () => void;
}

const HostGame = observer(({ onBack }: Props) => {
  const [elapsed, setElapsed] = useState(0);
  const game = gameStore.game;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [game?.current_turn]);

  useEffect(() => {
    setElapsed(0);
  }, [game?.current_turn]);

  if (!game) {
    return (
      <div style={styles.center}>
        <p>Загрузка состояния игры...</p>
      </div>
    );
  }

  const seasonName = SEASON_NAMES[game.current_season] || game.current_season;
  const seasonColor = SEASON_COLORS[game.current_season] || '#888';
  const turnRemaining = Math.max(0, game.turn_duration_sec - elapsed);
  const minutes = Math.floor(turnRemaining / 60);
  const seconds = turnRemaining % 60;

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={{ ...styles.seasonBadge, background: seasonColor }}>
          {seasonName} — Ход {game.current_turn}/{game.total_turns}
        </div>
        <div style={styles.timer}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <button style={styles.backBtn} onClick={onBack}>← Назад</button>
      </div>

      <div style={styles.playersGrid}>
        {game.players.map(player => {
          const playerCats = game.cats.filter(c => c.owner_id === player.id);
          const playerHouses = game.houses.filter(h => h.owner_id === player.id);

          return (
            <div key={player.id} style={styles.playerPanel}>
              <div style={styles.playerHeader}>
                <span style={styles.playerName}>{player.name}</span>
                <span style={styles.playerRole}>
                  {player.role === 'nursery' ? '🏠' : '🛒'}
                </span>
                <span style={styles.playerBalance}>
                  💰 {player.balance}
                </span>
              </div>

              <div style={styles.housesRow}>
                {playerHouses.map(house => (
                  <div key={house.id} style={styles.houseBox}>
                    <div style={styles.houseHeader}>
                      Дом ({house.cat_ids.length}/4)
                      {house.is_insured && ' 🔒'}
                    </div>
                    <div style={styles.catsInHouse}>
                      {house.cat_ids.map(catId => {
                        const cat = game.cats.find(c => c.id === catId);
                        return cat ? <CatCard key={cat.id} cat={cat} compact /> : null;
                      })}
                    </div>
                  </div>
                ))}
                {playerHouses.length === 0 && (
                  <div style={styles.noHouse}>Нет домов</div>
                )}
              </div>

              <div style={styles.catsRow}>
                {playerCats.filter(c => !c.house_id).map(cat => (
                  <CatCard key={cat.id} cat={cat} compact />
                ))}
                {playerCats.filter(c => !c.house_id).length === 0 && (
                  <div style={styles.noCats}>Нет свободных котов</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.bottomBar}>
        <div style={styles.waitingPlayers}>
          Ожидают завершения хода: {game.players
            .filter(p => p.is_connected)
            .map(p => p.name)
            .join(', ')}
        </div>
      </div>
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
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid #222',
    background: '#111',
  },
  seasonBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    fontWeight: 700,
    fontSize: '14px',
    color: 'white',
  },
  timer: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#f5576c',
  },
  backBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#888',
    border: '1px solid #444',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  playersGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    padding: '16px',
    overflow: 'auto',
  },
  playerPanel: {
    background: '#16213e',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #333',
  },
  playerName: {
    fontWeight: 700,
    fontSize: '16px',
    flex: 1,
  },
  playerRole: {
    fontSize: '18px',
  },
  playerBalance: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#4CAF50',
  },
  housesRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  houseBox: {
    flex: 1,
    minWidth: '120px',
    background: '#0f3460',
    borderRadius: '8px',
    padding: '8px',
  },
  houseHeader: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '6px',
  },
  catsInHouse: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  noHouse: {
    color: '#555',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  catsRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  noCats: {
    color: '#555',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  bottomBar: {
    padding: '12px 24px',
    borderTop: '1px solid #222',
    background: '#111',
    textAlign: 'center',
  },
  waitingPlayers: {
    color: '#888',
    fontSize: '13px',
  },
};

export default HostGame;
