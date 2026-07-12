import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';

interface Props {
  onBack: () => void;
}

const HostLobby = observer(({ onBack }: Props) => {
  const [players, setPlayers] = useState<{ name: string; role: string; pin: string }[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'nursery' | 'shop'>('nursery');
  const [wsUrl, setWsUrl] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [nurseryCount, setNurseryCount] = useState(2);
  const [shopCount, setShopCount] = useState(2);

  useEffect(() => {
    // Get local IP and create WS URL
    const host = window.location.hostname || '127.0.0.1';
    const port = 9001;
    const url = `ws://${host}:${port}`;
    setWsUrl(url);
    setQrValue(url);

    // Connect as host
    gameStore.isHost = true;
    gameStore.connect(url);
  }, []);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;

    // Create player via Tauri command or direct state update
    const pin = Math.random().toString().slice(2, 8);
    setPlayers(prev => [...prev, { name: newPlayerName, role: newPlayerRole, pin }]);
    setNewPlayerName('');
  };

  const startGame = () => {
    // Initialize game state with players
    gameStore.isHost = true;
    gameStore.send({ msg_type: 'join', player_name: 'Host', pin: '' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Назад</button>
        <h2>Host Lobby</h2>
        <div style={styles.status}>
          {gameStore.isConnected ? '🟢 Подключён' : '🔴 Ожидание...'}
        </div>
      </div>

      <div style={styles.content}>
        {/* QR Code Section */}
        <div style={styles.qrSection}>
          <h3>QR-код для подключения</h3>
          {qrValue && (
            <div style={styles.qrPlaceholder}>
              <div style={styles.qrBox}>
                <span style={styles.qrText}>📱</span>
                <span style={styles.qrUrl}>{qrValue}</span>
              </div>
            </div>
          )}
          <p style={styles.qrHint}>Сканируйте QR или введите URL вручную</p>
        </div>

        {/* Players Section */}
        <div style={styles.playersSection}>
          <h3>Игроки ({players.length})</h3>

          <div style={styles.addPlayer}>
            <input
              style={styles.input}
              placeholder="Имя игрока"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <select
              style={styles.select}
              value={newPlayerRole}
              onChange={e => setNewPlayerRole(e.target.value as any)}
            >
              <option value="nursery">Питомник</option>
              <option value="shop">Зоомагазин</option>
            </select>
            <button style={styles.addBtn} onClick={addPlayer}>+</button>
          </div>

          <div style={styles.playerList}>
            {players.map((p, i) => (
              <div key={i} style={styles.playerCard}>
                <span style={styles.playerName}>{p.name}</span>
                <span style={styles.playerRole}>
                  {p.role === 'nursery' ? '🏠 Питомник' : '🛒 Магазин'}
                </span>
                <span style={styles.playerPin}>PIN: {p.pin}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={styles.settingsSection}>
          <h3>Настройки</h3>
          <div style={styles.setting}>
            <label>Питомников:</label>
            <input type="number" value={nurseryCount} onChange={e => setNurseryCount(+e.target.value)} style={styles.numberInput} />
          </div>
          <div style={styles.setting}>
            <label>Магазинов:</label>
            <input type="number" value={shopCount} onChange={e => setShopCount(+e.target.value)} style={styles.numberInput} />
          </div>
        </div>

        {/* Start Button */}
        <button
          style={{
            ...styles.startBtn,
            opacity: players.length >= 2 ? 1 : 0.5,
          }}
          onClick={startGame}
          disabled={players.length < 2}
        >
          Начать игру ({players.length} игроков)
        </button>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #333',
  },
  backBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#888',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  status: {
    fontSize: '14px',
  },
  content: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto 1fr auto',
    gap: '24px',
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  qrSection: {
    gridColumn: '1',
    gridRow: '1',
    background: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  qrPlaceholder: {
    margin: '16px 0',
  },
  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '32px',
    background: 'white',
    borderRadius: '12px',
    color: '#1a1a2e',
  },
  qrText: {
    fontSize: '64px',
  },
  qrUrl: {
    fontSize: '14px',
    fontWeight: 600,
  },
  qrHint: {
    fontSize: '12px',
    color: '#666',
  },
  playersSection: {
    gridColumn: '2',
    gridRow: '1 / 3',
    background: '#16213e',
    borderRadius: '16px',
    padding: '24px',
  },
  addPlayer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  select: {
    padding: '10px 14px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  addBtn: {
    width: '42px',
    height: '42px',
    background: '#4CAF50',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#0f3460',
    borderRadius: '8px',
  },
  playerName: {
    fontWeight: 600,
    flex: 1,
  },
  playerRole: {
    fontSize: '13px',
    color: '#aaa',
  },
  playerPin: {
    fontFamily: 'monospace',
    background: '#333',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  settingsSection: {
    gridColumn: '1',
    gridRow: '2',
    background: '#16213e',
    borderRadius: '16px',
    padding: '24px',
  },
  setting: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  numberInput: {
    width: '60px',
    padding: '8px',
    background: '#0f3460',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    textAlign: 'center',
  },
  startBtn: {
    gridColumn: '1 / 3',
    padding: '20px',
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '16px',
  },
};

export default HostLobby;
