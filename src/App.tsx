import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from './store/gameStore';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import MobileLobby from './pages/MobileLobby';
import MobileGame from './pages/MobileGame';

const App = observer(() => {
  const [mode, setMode] = useState<'landing' | 'host' | 'mobile'>('landing');
  const [mobileConnected, setMobileConnected] = useState(false);

  if (mode === 'host') {
    if (gameStore.game?.phase === 'playing') {
      return <HostGame onBack={() => { gameStore.disconnect(); setMode('landing'); }} />;
    }
    return <HostLobby onBack={() => { gameStore.disconnect(); setMode('landing'); }} />;
  }

  if (mode === 'mobile') {
    if (gameStore.playerId && gameStore.game?.phase === 'playing') {
      return <MobileGame onDisconnect={() => { gameStore.disconnect(); setMode('landing'); }} />;
    }
    return <MobileLobby onBack={() => setMode('landing')} />;
  }

  return <LandingPage onHost={() => setMode('host')} onJoin={() => setMode('mobile')} />;
});

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
  { step: '2', title: 'Подключите игроков', desc: 'Студенты сканируют QR и вводят имя + PIN' },
  { step: '3', title: 'Играйте!', desc: 'Покупайте котов, стройте дома, торгуйте друг с другом' },
  { step: '4', title: 'Побеждает богатейший', desc: 'Кто накопит больше монет к концу сезона — тот выиграл' },
];

const LandingPage = observer(({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) => {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <header style={styles.hero}>
        <div style={styles.heroBg} />
        <div style={styles.heroContent}>
          <div style={styles.heroEmoji}>🐱💼</div>
          <h1 style={styles.heroTitle}>Business Cats</h1>
          <p style={styles.heroSubtitle}>
            Мультиплеерная экономическая игра для класса.
            <br />
            Коты, деньги, торговля и стратегия.
          </p>
          <div style={styles.heroButtons}>
            <button style={styles.hostBtn} onClick={onHost}>
              🖥️ Запустить на смартборде
            </button>
            <button style={styles.joinBtn} onClick={onJoin}>
              📱 Присоединиться с телефона
            </button>
          </div>
          <p style={styles.heroHint}>
            Нужно одно устройство в качестве сервера + телефоны студентов
          </p>
        </div>
      </header>

      {/* Features */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Возможности</h2>
        <div style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} style={styles.featureCard}>
              <div style={styles.featureIcon}>{f.icon}</div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to play */}
      <section style={{ ...styles.section, background: '#0f0f23' }}>
        <h2 style={styles.sectionTitle}>Как играть</h2>
        <div style={styles.stepsGrid}>
          {HOW_TO_PLAY.map((s, i) => (
            <div key={i} style={styles.stepCard}>
              <div style={styles.stepNumber}>{s.step}</div>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Технологии</h2>
        <div style={styles.techGrid}>
          {[
            { icon: '🦀', name: 'Rust + Tauri', desc: 'Десктоп-сервер' },
            { icon: '⚛️', name: 'React + TypeScript', desc: 'Веб-интерфейс' },
            { icon: '🔌', name: 'WebSocket', desc: 'Реалтайм-связь' },
            { icon: '💾', name: 'SQLite', desc: 'Хранение данных' },
          ].map((t, i) => (
            <div key={i} style={styles.techCard}>
              <div style={styles.techIcon}>{t.icon}</div>
              <div style={styles.techName}>{t.name}</div>
              <div style={styles.techDesc}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Business Cats — Educational Game</p>
        <p style={styles.footerSmall}>Локальная сеть • Мультиплеер • До 10+ игроков</p>
      </footer>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a1a',
    color: '#eee',
  },
  hero: {
    position: 'relative',
    padding: '80px 24px 60px',
    textAlign: 'center',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, #1a1a3e 0%, #0a0a1a 50%, #1a0a2e 100%)',
    zIndex: 0,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '700px',
    margin: '0 auto',
  },
  heroEmoji: {
    fontSize: '72px',
    marginBottom: '16px',
  },
  heroTitle: {
    fontSize: '56px',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #feca57 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '16px',
    lineHeight: 1.1,
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#aaa',
    lineHeight: 1.6,
    marginBottom: '32px',
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  hostBtn: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  joinBtn: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    color: '#0a0a1a',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  heroHint: {
    fontSize: '13px',
    color: '#555',
  },
  section: {
    padding: '60px 24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '40px',
    color: '#eee',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  featureCard: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#eee',
  },
  featureDesc: {
    fontSize: '13px',
    color: '#888',
    lineHeight: 1.5,
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
  },
  stepCard: {
    textAlign: 'center',
    padding: '20px',
  },
  stepNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
    color: 'white',
    margin: '0 auto 16px',
  },
  stepTitle: {
    fontSize: '15px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#eee',
  },
  stepDesc: {
    fontSize: '13px',
    color: '#888',
    lineHeight: 1.5,
  },
  techGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
  },
  techCard: {
    background: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  techIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  techName: {
    fontSize: '14px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  techDesc: {
    fontSize: '12px',
    color: '#666',
  },
  footer: {
    padding: '40px 24px',
    textAlign: 'center',
    borderTop: '1px solid #222',
    color: '#555',
    fontSize: '14px',
  },
  footerSmall: {
    fontSize: '12px',
    color: '#333',
    marginTop: '8px',
  },
};

export default App;
