import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

// парсинг sessionId из URL
function getSessionIdFromURL() {
  return new URLSearchParams(window.location.search).get('sessionId') || '';
}
function buildQuery(sessionId) {
  return sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
}

// звуковой синтез: победа и чужое бинго
function useSounds() {
  const ctxRef = useRef(null);
  useEffect(() => {
    try {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }, []);

  const playWin = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    osc1.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(550, now); // C#5
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc1.stop(now + 1);
    osc2.stop(now + 1);
  };

  const playOther = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.15, now);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.stop(now + 0.7);
  };

  return { playWin, playOther };
}

function ConfettiCanvas() {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const particlesRef = React.useRef([]);
  const timeoutRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createParticles = () => {
      const p = [];
      const colors = ['#10b981', '#7c3aed', '#fff', '#ffda6b', '#5fdde5'];
      for (let i = 0; i < 140; i++) {
        p.push({
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: (Math.random() - 0.5) * 5,
          vy: Math.random() * 4 + 2,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: Math.random() * 60 + 60,
        });
      }
      particlesRef.current = p;
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    createParticles();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 1;
        if (particle.life <= 0 || particle.y > height + 20) {
          particle.x = Math.random() * width;
          particle.y = -10;
          particle.vx = (Math.random() - 0.5) * 5;
          particle.vy = Math.random() * 4 + 2;
          particle.size = Math.random() * 6 + 4;
          particle.life = Math.random() * 60 + 60;
        }
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        const scale = Math.max(0.2, particle.life / 120);
        ctx.arc(particle.x, particle.y, particle.size * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, width, height);
    }, 3000);

    return () => {
      clearTimeout(timeoutRef.current);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

function computeBingos(items, marks, size) {
  const lines = [];
  for (let r = 0; r < size; r++) {
    let ok = true;
    const idxs = [];
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      idxs.push(i);
      if (!marks[i]) ok = false;
    }
    if (ok) lines.push({ type: 'row', indices: idxs });
  }
  for (let c = 0; c < size; c++) {
    let ok = true;
    const idxs = [];
    for (let r = 0; r < size; r++) {
      const i = r * size + c;
      idxs.push(i);
      if (!marks[i]) ok = false;
    }
    if (ok) lines.push({ type: 'col', indices: idxs });
  }
  let okDiag1 = true;
  const diag1 = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + i;
    diag1.push(idx);
    if (!marks[idx]) okDiag1 = false;
  }
  if (okDiag1) lines.push({ type: 'diag', indices: diag1 });
  let okDiag2 = true;
  const diag2 = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + (size - 1 - i);
    diag2.push(idx);
    if (!marks[idx]) okDiag2 = false;
  }
  if (okDiag2) lines.push({ type: 'diag', indices: diag2 });
  return lines;
}

function OtherBingoBanner({ info, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => {
      onDone();
    }, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="other-bingo-animated">
      <div className="other-bingo-content">
        <div className="emoji">🎉</div>
        <div className="text">
          В другой игре <strong>{info.name || info.sessionId}</strong> выпало{' '}
          <span className="bingo-label">BINGO!</span>
        </div>
      </div>
    </div>
  );
}

export default function Game() {
  const [session, setSession] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [bingos, setBingos] = useState([]);
  const [confettiKey, setConfettiKey] = useState(0);
  const [error, setError] = useState(null);
  const [otherBingoInfo, setOtherBingoInfo] = useState(null);

  const prevHasBingoRef = useRef(false);
  const socketRef = useRef(null);

  const sessionId = getSessionIdFromURL();
  const { playWin, playOther } = useSounds();

  const socketEndpoint = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3000`;
    }
    return window.location.origin;
  })();

  useEffect(() => {
    if (!sessionId) return;
    // один раз инициализируем, с query sessionId
    socketRef.current = io(socketEndpoint, {
      path: '/socket.io',
      query: { sessionId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('socket connected', socketRef.current.id, 'sessionId=', sessionId);
    });
    socketRef.current.on('other-bingo', (data) => {
      if (data.sessionId === sessionId) return; // игнорировать своё
      console.log('received other-bingo event', data);
      setOtherBingoInfo(data);
      playOther();
    });
    socketRef.current.on('disconnect', (reason) => {
      console.log('socket disconnected', reason);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [socketEndpoint, sessionId, playOther]);

  const load = async () => {
    setLoading(true);
    if (!sessionId) {
      setError('sessionId missing in URL. Go to settings to create one.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/session${buildQuery(sessionId)}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Fetch session failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      setSession(data);
      setMarks(data.marks || {});
      const lines = computeBingos(data.items, data.marks || {}, data.size);
      setBingos(lines);

      const hasBingoNow = lines.length > 0;
      const hadBingoBefore = prevHasBingoRef.current;

      if (hasBingoNow && !hadBingoBefore) {
        console.log('new bingo detected, emitting to server', {
          sessionId: data.id,
          name: data.name,
        });
        socketRef.current?.emit('bingo', { sessionId: data.id, name: data.name });
        setConfettiKey((k) => k + 1);
        playWin();
      }

      prevHasBingoRef.current = hasBingoNow;
      setError(null);
    } catch (e) {
      console.error('Failed to load session', e);
      setError('Session load error. Перейди в настройки и выбери сессию.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [sessionId]);

  const toggle = async (i) => {
    if (!sessionId) return;
    await fetch(`/api/mark${buildQuery(sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: i }),
    });
    await load();
  };

  const resetMarks = async () => {
    if (!sessionId) return;
    await fetch(`/api/reset-marks${buildQuery(sessionId)}`, { method: 'POST' });
    await load();
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) {
    return (
      <div className="card">
        <div className="mb-4">{error}</div>
        <div className="button-group">
          <a href={`/settings${buildQuery(sessionId)}`}>
            <button className="primary">Настроить / новая сессия</button>
          </a>
        </div>
      </div>
    );
  }
  if (!session || !session.items?.length) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="mb-2">
            No active session. Перейди в <strong>Settings</strong> и создай игру.
          </p>
          <div className="button-group justify-center">
            <a href={`/settings${buildQuery(sessionId)}`}>
              <button className="primary">Настроить</button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const size = session.size;
  const hasBingo = bingos.length > 0;

  return (
    <div className="space-y-6">
      {otherBingoInfo && otherBingoInfo.sessionId !== sessionId && (
        <OtherBingoBanner
          info={otherBingoInfo}
          onDone={() => {
            setOtherBingoInfo(null);
          }}
        />
      )}
      {hasBingo && <ConfettiCanvas key={confettiKey} />}

      <div className="card flex flex-col md:flex-row gap-6 game-top">
        <div className="flex-1">
          <h2>{session.name || 'Bingo Game'}</h2>
          <div className="small">
            Grid: {size}×{size}
            {otherBingoInfo && otherBingoInfo.sessionId !== sessionId && (
              <div className="text-sm text-gray-300 mt-1">
                Другой бинго: <strong>{otherBingoInfo.name || otherBingoInfo.sessionId}</strong>
              </div>
            )}
          </div>
          <div className="mt-3 button-group">
            <button onClick={resetMarks} className="primary">
              Reset marks
            </button>
            <button onClick={load} className="secondary">
              Refresh
            </button>
            <a href={`/settings${buildQuery(sessionId)}`}>
              <button className="secondary">Edit session</button>
            </a>
          </div>
          {hasBingo && (
            <div style={{ marginTop: '10px', position: 'relative' }}>
              <div className="bingo-badge" aria-label="Bingo!">
                🎉 <strong>BINGO!</strong>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="small">Click cell to toggle mark. Bingo logic auto-detected.</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {session.items.map((it, i) => {
          const marked = marks[i];
          let extraClass = '';
          if (hasBingo) {
            for (const line of bingos) {
              if (line.indices.includes(i)) {
                extraClass = ' bingo-line';
                break;
              }
            }
          }
          return (
            <div
              key={i}
              onClick={() => toggle(i)}
              className={`grid-cell ${marked ? 'marked' : ''}${extraClass}`}
            >
              <div className="w-full">{it || <span className="small">[empty]</span>}</div>
              {marked && (
                <div className="badge" style={{ position: 'absolute', top: 6, right: 6 }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
