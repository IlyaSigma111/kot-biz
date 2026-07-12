import { observer } from 'mobx-react-lite';
import { Cat, COLOR_NAMES, GENDER_NAMES } from '../common/types';
import { gameStore } from '../store/gameStore';

interface Props {
  cat: Cat;
  compact?: boolean;
}

const BalanceBar = observer(({ cat, compact }: Props) => {
  const myPlayer = gameStore.myPlayer;
  if (!myPlayer) return null;

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Баланс:</span>
        <span style={styles.value}>💰 {myPlayer.balance}</span>
      </div>
      {cat && (
        <div style={styles.row}>
          <span style={styles.label}>Кот:</span>
          <span style={styles.value}>
            {COLOR_NAMES[cat.color]} {GENDER_NAMES[cat.gender]} — 💰 {cat.price}
          </span>
        </div>
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 12px',
    background: '#0f3460',
    borderRadius: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: '12px',
    color: '#888',
  },
  value: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
};

export default BalanceBar;
