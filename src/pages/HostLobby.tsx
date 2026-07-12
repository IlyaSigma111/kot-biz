import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '@tauri-apps/api/core';

type StyleName = 'editorial' | 'midnight' | 'brutalist' | 'neon' | 'paper';

interface Props {
  onBack: () => void;
  currentStyle: StyleName;
  onStyleChange: (s: StyleName) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  styles: { key: StyleName; label: string; swatch: string; desc: string }[];
}

type Player = { id: string; name: string; role: string };

const HostLobby = observer(({
  onBack, currentStyle, onStyleChange, showSettings, onToggleSettings, styles
}: Props) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [pin, setPin] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const createdPin = await invoke<string>('create_game');
        setPin(createdPin);

        const url = await invoke<string>('get_server_url');
        setServerUrl(url);

        const ws = new WebSocket(`${url}/ws?host=1&pin=${createdPin}`);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'host_join' }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'player_joined') {
              setPlayers(prev => [...prev, { id: Date.now().toString(), name: msg.name, role: msg.role || 'Игрок' }]);
            }
            if (msg.type === 'player_left') {
              setPlayers(prev => prev.filter(p => p.id !== msg.player_id));
            }
            if (msg.type === 'game_started') {
              setIsStarted(true);
            }
          } catch {}
        };
      } catch (e) {
        console.error('Failed to init game:', e);
      }
    };
    init();
    return () => { wsRef.current?.close(); };
  }, []);

  const startGame = () => {
    if (wsRef.current && pin) {
      wsRef.current.send(JSON.stringify({ type: 'start_game' }));
    }
  };

  const httpUrl = serverUrl.replace('ws://', 'http://');
  const qrValue = serverUrl ? `${httpUrl}/player?pin=${pin}` : '';

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="app-header">
        <div className="header-left">
          <button className="btn btn-ghost" onClick={onBack}>← Назад</button>
          <div className="app-logo">🐱</div>
          <span className="app-title">Лобби</span>
        </div>
        <div className="header-right">
          <span className="style-label">
            {styles.find(s => s.key === currentStyle)?.label}
          </span>
          <button className="btn btn-ghost" onClick={onToggleSettings} style={{ fontSize: 12 }}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card-section" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Стиль интерфейса</h3>
          <div className="settings-grid">
            {styles.map(s => (
              <button
                key={s.key}
                className={`settings-card ${currentStyle === s.key ? 'selected' : ''}`}
                onClick={() => onStyleChange(s.key)}
              >
                <div className="settings-card-title">{s.label}</div>
                <div className="settings-card-desc">{s.desc}</div>
                <div className="settings-card-swatch" style={{ background: s.swatch }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lobby-layout">
        {/* Left: Players & Info */}
        <div className="lobby-main">
          <div className="card-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 className="section-title">Игроки ({players.length})</h2>
                <p className="section-subtitle">Ждём подключения учеников</p>
              </div>
            </div>

            {players.length === 0 ? (
              <p className="wait-hint">Сканируйте QR-код для подключения...</p>
            ) : (
              <div className="player-chips">
                {players.map((p) => (
                  <div key={p.id} className="player-chip">
                    {p.role === 'Питомник' ? '🏠' : '🛒'} {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIN */}
          <div className="card-section" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>PIN</p>
            <div style={{
              fontSize: 56, fontWeight: 800, color: 'var(--accent)',
              letterSpacing: 12, fontFamily: 'var(--font-mono)',
            }}>
              {pin || '----'}
            </div>
          </div>

          {/* Server Info */}
          {serverUrl && (
            <div className="card-section" style={{ textAlign: 'center', padding: '16px 20px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Сервер: {serverUrl}
              </p>
            </div>
          )}

          {/* Start Button */}
          <button
            className="btn btn-primary"
            onClick={startGame}
            disabled={players.length < 2}
            style={{
              width: '100%', padding: '18px 32px', fontSize: 18,
              opacity: players.length >= 2 ? 1 : 0.5,
            }}
          >
            Начать игру ({players.length} игроков)
          </button>
        </div>

        {/* Right: QR Code */}
        <div className="lobby-qr">
          <div className="qr-section">
            {qrValue ? (
              <>
                <QRCodeSVG
                  value={qrValue}
                  size={180}
                  bgColor="transparent"
                  fgColor={currentStyle === 'editorial' ? '#13151b' : '#e8e8f0'}
                  level="M"
                />
                <p className="qr-url">{httpUrl.replace('http://', '')}</p>
                <p className="qr-hint">Наведи камеру на QR</p>
                <p className="qr-secondary">
                  PIN: <strong>{pin}</strong>
                </p>
              </>
            ) : (
              <p className="qr-hint">Загрузка сервера...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HostLobby;
