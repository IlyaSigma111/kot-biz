import { observer } from 'mobx-react-lite';
import { House, Cat } from '../common/types';
import CatCard from './CatCard';

interface Props {
  house: House;
  cats: Cat[];
  onMoveCat?: (catId: string) => void;
  onToggleInsurance?: (houseId: string) => void;
}

const HouseCard = observer(({ house, cats, onMoveCat, onToggleInsurance }: Props) => {
  const houseCats = house.cat_ids
    .map(id => cats.find(c => c.id === id))
    .filter(Boolean) as Cat[];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>🏠</span>
        <div style={styles.info}>
          <span style={styles.title}>Дом</span>
          <span style={styles.capacity}>
            {house.cat_ids.length}/4 котов
          </span>
        </div>
        <div style={styles.actions}>
          {!house.is_insured && (
            <button
              style={styles.insureBtn}
              onClick={() => onToggleInsurance?.(house.id)}
            >
              🔒 Страховка
            </button>
          )}
          {house.is_insured && (
            <span style={styles.insuredBadge}>🔒 Застроен</span>
          )}
        </div>
      </div>

      <div style={styles.catsGrid}>
        {houseCats.map(cat => (
          <CatCard key={cat.id} cat={cat} compact />
        ))}
        {Array.from({ length: Math.max(0, 4 - house.cat_ids.length) }).map((_, i) => (
          <div key={`empty-${i}`} style={styles.emptySlot}>
            <span>+</span>
          </div>
        ))}
      </div>

      {house.cat_ids.length < 4 && onMoveCat && (
        <button style={styles.moveBtn}>
          Переместить кота
        </button>
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#16213e',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '24px',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontWeight: 700,
    fontSize: '14px',
  },
  capacity: {
    fontSize: '12px',
    color: '#888',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  insureBtn: {
    padding: '4px 10px',
    background: '#FF980033',
    border: '1px solid #FF980066',
    borderRadius: '6px',
    color: '#FF9800',
    fontSize: '11px',
    cursor: 'pointer',
  },
  insuredBadge: {
    fontSize: '11px',
    color: '#4CAF50',
    padding: '4px 8px',
    background: '#4CAF5022',
    borderRadius: '6px',
  },
  catsGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  emptySlot: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a1628',
    border: '2px dashed #333',
    borderRadius: '8px',
    color: '#444',
    fontSize: '18px',
  },
  moveBtn: {
    padding: '8px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#aaa',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default HouseCard;
