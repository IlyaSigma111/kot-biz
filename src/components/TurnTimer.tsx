import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { SEASON_NAMES, SEASON_COLORS } from '../common/types';

interface Props {
  season: string;
  turn: number;
  totalTurns: number;
  turnDuration: number;
  onEndTurn?: () => void;
}

const TurnTimer = observer(({ season, turn, totalTurns, turnDuration, onEndTurn }: Props) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [turn]);

  const remaining = Math.max(0, turnDuration - elapsed);
  const pct = turnDuration > 0 ? (elapsed / turnDuration) * 100 : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const seasonName = SEASON_NAMES[season] || season;
  const seasonColor = SEASON_COLORS[season] || '#888';

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div style={{ ...styles.seasonBadge, background: seasonColor }}>
          {seasonName}
        </div>
        <div style={styles.turnInfo}>
          Ход {turn} / {totalTurns}
        </div>
      </div>

      <div style={styles.timerRow}>
        <div style={styles.timerText}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <div style={styles.progressBg}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.min(100, pct)}%`,
              background: remaining < 30 ? '#f5576c' : '#43e97b',
            }}
          />
        </div>
      </div>

      {onEndTurn && (
        <button
          style={{
            ...styles.endTurnBtn,
            opacity: elapsed > 10 ? 1 : 0.5,
          }}
          onClick={onEndTurn}
          disabled={elapsed <= 10}
        >
          Завершить ход
        </button>
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: '#16213e',
    borderRadius: '12px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seasonBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'white',
  },
  turnInfo: {
    fontSize: '12px',
    color: '#888',
    fontFamily: 'monospace',
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timerText: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#eee',
    minWidth: '80px',
  },
  progressBg: {
    flex: 1,
    height: '6px',
    background: '#0a0a1a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s linear',
  },
  endTurnBtn: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default TurnTimer;
