import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import { COLOR_NAMES, GENDER_NAMES, CatColor, CatGender, CAT_COLORS, CAT_GENDERS } from '../common/types';

const TradePanel = observer(() => {
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [price, setPrice] = useState(0);

  const myCats = gameStore.myCats;

  const toggleCat = (catId: string) => {
    setSelectedCats(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const handleCreateOffer = () => {
    if (selectedCats.length === 0 || price <= 0) return;
    gameStore.createTradeOffer(selectedCats, price);
    setSelectedCats([]);
    setPrice(0);
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Создать предложение</h4>

      <div style={styles.catSelect}>
        {myCats.map(cat => (
          <button
            key={cat.id}
            style={{
              ...styles.catOption,
              ...(selectedCats.includes(cat.id) ? styles.catOptionSelected : {}),
            }}
            onClick={() => toggleCat(cat.id)}
          >
            {COLOR_NAMES[cat.color]} {GENDER_NAMES[cat.gender]}
          </button>
        ))}
      </div>

      {selectedCats.length > 0 && (
        <div style={styles.priceRow}>
          <label style={styles.priceLabel}>Цена:</label>
          <input
            style={styles.priceInput}
            type="number"
            value={price}
            onChange={e => setPrice(+e.target.value)}
            min={0}
          />
          <span style={styles.priceUnit}>💰</span>
        </div>
      )}

      <button
        style={{
          ...styles.createBtn,
          opacity: selectedCats.length > 0 && price > 0 ? 1 : 0.5,
        }}
        onClick={handleCreateOffer}
        disabled={selectedCats.length === 0 || price <= 0}
      >
        Предложить ({selectedCats.length} котов)
      </button>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    background: '#16213e',
    borderRadius: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ccc',
  },
  catSelect: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  catOption: {
    padding: '8px 12px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#aaa',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  catOptionSelected: {
    background: '#4CAF5033',
    borderColor: '#4CAF50',
    color: '#4CAF50',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  priceLabel: {
    fontSize: '12px',
    color: '#888',
  },
  priceInput: {
    flex: 1,
    padding: '8px 10px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  priceUnit: {
    fontSize: '16px',
  },
  createBtn: {
    padding: '10px',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default TradePanel;
