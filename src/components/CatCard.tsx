import { observer } from 'mobx-react-lite';
import { Cat, COLOR_NAMES, GENDER_NAMES, SICKNESS_NAMES, CatColor, CatGender } from '../common/types';

interface Props {
  cat: Cat;
  compact?: boolean;
  onClick?: () => void;
}

const CAT_EMOJIS: Record<CatColor, Record<CatGender, string>> = {
  black: { male: '🐈‍⬛', female: '🐈‍⬛' },
  gray: { male: '🐱', female: '🐱' },
  white: { male: '🐈', female: '🐈' },
  ginger: { male: '🐱', female: '🐱' },
};

const COLOR_HEX: Record<CatColor, string> = {
  black: '#2d2d2d',
  gray: '#888888',
  white: '#dddddd',
  ginger: '#e8833a',
};

const CatCard = observer(({ cat, compact = false, onClick }: Props) => {
  const emoji = CAT_EMOJIS[cat.color]?.[cat.gender] || '🐱';
  const colorHex = COLOR_HEX[cat.color] || '#888';

  if (compact) {
    return (
      <div
        style={{
          ...compactStyles.card,
          borderColor: colorHex,
        }}
        onClick={onClick}
      >
        <span style={compactStyles.emoji}>{emoji}</span>
        {cat.sickness && <span style={compactStyles.sick}>🤒</span>}
        {cat.is_hungry && <span style={compactStyles.hungry}>🍖</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        ...fullStyles.card,
        borderColor: colorHex,
      }}
      onClick={onClick}
    >
      <div style={fullStyles.header}>
        <span style={fullStyles.emoji}>{emoji}</span>
        <div style={fullStyles.info}>
          <div style={fullStyles.name}>
            {COLOR_NAMES[cat.color]}
          </div>
          <div style={fullStyles.gender}>
            {GENDER_NAMES[cat.gender]}
          </div>
        </div>
      </div>

      <div style={fullStyles.stats}>
        <div style={fullStyles.stat}>
          <span style={fullStyles.statLabel}>Возраст</span>
          <span style={fullStyles.statValue}>{cat.age_months} мес.</span>
        </div>
        <div style={fullStyles.stat}>
          <span style={fullStyles.statLabel}>Цена</span>
          <span style={fullStyles.statValue}>💰 {cat.price}</span>
        </div>
      </div>

      {cat.sickness && (
        <div style={fullStyles.sickness}>
          🤒 {SICKNESS_NAMES[cat.sickness]}
        </div>
      )}

      {cat.is_hungry && (
        <div style={fullStyles.hungry}>
          Голоден! 🍖
        </div>
      )}

      {cat.is_pregnant && (
        <div style={fullStyles.pregnant}>
          🤰 Беременна
        </div>
      )}
    </div>
  );
});

const compactStyles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '8px',
    background: '#0f3460',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '24px',
    aspectRatio: '1',
  },
  emoji: {
    fontSize: '28px',
  },
  sick: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    fontSize: '10px',
  },
  hungry: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    fontSize: '10px',
  },
};

const fullStyles: Record<string, React.CSSProperties> = {
  card: {
    background: '#16213e',
    border: '2px solid',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  emoji: {
    fontSize: '32px',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: 700,
    fontSize: '14px',
  },
  gender: {
    fontSize: '12px',
    color: '#aaa',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  sickness: {
    background: '#ff444422',
    border: '1px solid #ff444466',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    color: '#ff6666',
  },
  hungry: {
    background: '#ff980022',
    border: '1px solid #ff980066',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    color: '#ff9800',
  },
  pregnant: {
    background: '#e91e6322',
    border: '1px solid #e91e6366',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    color: '#e91e63',
  },
};

export default CatCard;
