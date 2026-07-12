import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from './store/gameStore';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import MobileLobby from './pages/MobileLobby';
import MobileGame from './pages/MobileGame';
import './styles/themes.css';

type StyleName = 'editorial' | 'midnight' | 'brutalist' | 'neon' | 'paper';

const STYLES: { key: StyleName; label: string; swatch: string; desc: string }[] = [
  { key: 'editorial', label: 'Editorial', swatch: '#000000', desc: 'Белый, классический' },
  { key: 'midnight', label: 'Midnight', swatch: '#6366F1', desc: 'Тёмный, стекло' },
  { key: 'brutalist', label: 'Brutalist', swatch: '#ff3300', desc: 'Грубый, без скруглений' },
  { key: 'neon', label: 'Neon', swatch: '#00ff88', desc: 'Тёмный, неон' },
  { key: 'paper', label: 'Paper', swatch: '#c05621', desc: 'Тёплый, бумажный' },
];

const FEATURES = [
  { icon: '🐱', title: '8 пород котов', desc: 'Чёрные, серые, белые, рыжие — самцы и самки' },
  { icon: '🏠', title: 'Питомники и магазины', desc: 'Питомники разводят, магазины продают' },
  { icon: '💰', title: 'Экономика', desc: 'Покупка, продажа, кредиты, торговля между игроками' },
  { icon: '🍂', title: 'Сезоны', desc: 'Лето, осень, зима, весна — меняются цены и условия' },
  { icon: '🏥', title: 'Болезни', desc: 'Блохи, отравление, лишай, перелом — лечите котов' },
  { icon: '🔄', title: 'Мультиплеер', desc: 'До 10+ игроков по WiFi с QR-кодом' },
];

const HOW_TO_PLAY = [
  { step: '1', title: 'Создайте игру', desc: 'На смартборде нажмите "Хост". Появится QR-код' },
  { step: '2', title: 'Подключите игроков', desc: 'Студенты сканируют QR и вводят имя' },
  { step: '3', title: 'Играйте!', desc: 'Покупайте котов, стройте дома, торгуйте друг с другом' },
  { step: '4', title: 'Побеждает богатейший', desc: 'Кто накопит больше монет к концу сезона — тот выиграл' },
];

const App = observer(() => {
  const [mode, setMode] = useState<'landing' | 'host' | 'mobile'>('landing');
  const [mobileConnected, setMobileConnected] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<StyleName>('midnight');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-style', currentStyle === 'editorial' ? '' : currentStyle);
  }, [currentStyle]);

  if (mode === 'host') {
    if (gameStore.game?.phase === 'playing') {
      return <HostGame onBack={() => { gameStore.disconnect(); setMode('landing'); }} />;
    }
    return (
      <HostLobby
        onBack={() => { gameStore.disconnect(); setMode('landing'); }}
        currentStyle={currentStyle}
        onStyleChange={setCurrentStyle}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        styles={STYLES}
      />
    );
  }

  if (mode === 'mobile') {
    if (gameStore.playerId && gameStore.game?.phase === 'playing') {
      return <MobileGame onDisconnect={() => { gameStore.disconnect(); setMode('landing'); }} />;
    }
    return <MobileLobby onBack={() => setMode('landing')} />;
  }

  return (
    <LandingPage
      onHost={() => setMode('host')}
      onJoin={() => setMode('mobile')}
      currentStyle={currentStyle}
      onStyleChange={setCurrentStyle}
      styles={STYLES}
    />
  );
});

const LandingPage = observer(({
  onHost, onJoin, currentStyle, onStyleChange, styles
}: {
  onHost: () => void;
  onJoin: () => void;
  currentStyle: StyleName;
  onStyleChange: (s: StyleName) => void;
  styles: typeof STYLES;
}) => {
  return (
    <div className="app-shell">
      {/* Style Label */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 200 }}>
        <span className="style-label">{styles.find(s => s.key === currentStyle)?.label}</span>
      </div>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 40px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          padding: '6px 14px', borderRadius: 'var(--radius-tag)',
          background: 'var(--tag-bg)', marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          Business Cats
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,6vw,64px)',
          fontWeight: 700, lineHeight: 1.08, letterSpacing: '-.03em', marginBottom: 20,
        }}>
          Мультиплеерная<br />экономическая игра
        </h1>
        <p style={{
          fontSize: 'clamp(16px,2vw,20px)', color: 'var(--text-secondary)',
          maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.6,
        }}>
          Коты, деньги, торговля и стратегия. Учитель запускает .exe — класс подключается по QR-коду.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onHost} style={{ padding: '14px 32px', fontSize: 16 }}>
            🖥️ Запустить на смартборде
          </button>
          <button className="btn btn-secondary" onClick={onJoin} style={{ padding: '14px 32px', fontSize: 16 }}>
            📱 Присоединиться
          </button>
        </div>
        <div style={{
          display: 'flex', gap: 36, marginTop: 48, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {['Один .exe', 'QR-код', 'Мгновенный старт', 'Локальная сеть'].map(s => (
            <span key={s} style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s}</span>
          ))}
        </div>
      </section>

      {/* How to Play */}
      <section style={{ padding: '60px 0' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--heading-size)',
          fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8, textAlign: 'center',
        }}>Как играть</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 40 }}>
          От запуска до первой сделки — меньше минуты
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--gap)' }}>
          {HOW_TO_PLAY.map(s => (
            <div key={s.step} className="card-section" style={{ textAlign: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 18, fontWeight: 700, color: 'var(--accent)',
              }}>{s.step}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 0' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--heading-size)',
          fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8, textAlign: 'center',
        }}>Возможности</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 40 }}>
          Всё для экономической игры в классе
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--gap)' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card-section">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Style Picker (footer) */}
      <section style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-mono)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          Стиль интерфейса
        </p>
        <div className="style-picker" style={{ display: 'inline-flex' }}>
          {styles.map(s => (
            <button
              key={s.key}
              className={currentStyle === s.key ? 'active' : ''}
              onClick={() => onStyleChange(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 0', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        <div>🐱💼 Business Cats — мультиплеерная экономическая игра</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://github.com/IlyaSigma111/kot-biz" style={{ color: 'var(--text-muted)' }}>GitHub</a>
          <a href="https://github.com/IlyaSigma111/kot-biz/issues" style={{ color: 'var(--text-muted)' }}>Обратная связь</a>
        </div>
      </footer>
    </div>
  );
});

export default App;
