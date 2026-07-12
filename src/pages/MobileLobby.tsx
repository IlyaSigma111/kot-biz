import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';

interface Props {
  onBack: () => void;
}

const MobileLobby = observer(({ onBack }: Props) => {
  const [serverUrl, setServerUrl] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-detect server URL from browser
    const host = window.location.hostname || '127.0.0.1';
    setServerUrl(`ws://${host}:9001`);
  }, []);

  useEffect(() => {
    if (gameStore.error) {
      setError(gameStore.error);
    }
  }, [gameStore.error]);

  const handleJoin = () => {
    if (!playerName.trim() || !pin.trim()) {
      setError('Введите имя и PIN');
      return;
    }

    gameStore.connect(serverUrl);
    setTimeout(() => {
      gameStore.joinGame(playerName, pin);
    }, 500);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Business Cats</h1>
        <p style={styles.subtitle}>Присоединиться к игре</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Сервер</label>
          <input
            style={styles.input}
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="ws://192.168.1.x:9001"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Ваше имя</label>
          <input
            style={styles.input}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Введите имя"
            maxLength={20}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>PIN-код</label>
          <input
            style={{ ...styles.input, ...styles.pinInput }}
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="000000"
            maxLength={6}
            type="number"
          />
        </div>

        <button
          style={{
            ...styles.joinBtn,
            opacity: playerName && pin ? 1 : 0.5,
          }}
          onClick={handleJoin}
          disabled={!playerName || !pin}
        >
          Присоединиться
        </button>

        <div style={styles.connectStatus}>
          {gameStore.isConnected ? '🟢 Подключено' : '🔴 Не подключено'}
        </div>

        <button style={styles.backBtn} onClick={onBack}>← Назад</button>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    background: '#16213e',
    borderRadius: '20px',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
  },
  error: {
    background: '#ff444422',
    border: '1px solid #ff4444',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ff6666',
    fontSize: '13px',
    width: '100%',
    textAlign: 'center',
  },
  field: {
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '6px',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '10px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
  },
  pinInput: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '8px',
    fontFamily: 'monospace',
  },
  joinBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  connectStatus: {
    fontSize: '12px',
    color: '#666',
  },
  backBtn: {
    background: 'transparent',
    color: '#666',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    marginTop: '8px',
  },
};

export default MobileLobby;
