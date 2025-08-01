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
    osc1.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(550, now);
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
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const create = () => {
      const arr = [];
      const cols = ['#10b981', '#7c3aed', '#fff', '#ffda6b', '#5fdde5'];
      for (let i = 0; i < 140; i++) {
        arr.push({
          x: Math.random() * w,
          y: Math.random() * -h,
          vx: (Math.random() - 0.5) * 5,
          vy: Math.random() * 4 + 2,
          size: Math.random() * 6 + 4,
          color: cols[Math.floor(Math.random() * cols.length)],
          life: Math.random() * 60 + 60,
        });
      }
      particlesRef.current = arr;
    };

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    create();

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0 || p.y > h + 20) {
          p.x = Math.random() * w;
          p.y = -10;
          p.vx = (Math.random() - 0.5) * 5;
          p.vy = Math.random() * 4 + 2;
          p.size = Math.random() * 6 + 4;
          p.life = Math.random() * 60 + 60;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const scale = Math.max(0.2, p.life / 120);
        ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, w, h);
    }, 3000);

    return () => {
      clearTimeout(timeoutRef.current);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}

function computeBingos(items, marks, size) {
  const lines = [];
  for (let r = 0; r < size; r++) {
    let ok = true,
      idxs = [];
    for (let c = 0; c < size; c++) {
      const i = r * size + c;
      idxs.push(i);
      if (!marks[i]) ok = false;
    }
    if (ok) lines.push({ type: 'row', indices: idxs });
  }
  for (let c = 0; c < size; c++) {
    let ok = true,
      idxs = [];
    for (let r = 0; r < size; r++) {
      const i = r * size + c;
      idxs.push(i);
      if (!marks[i]) ok = false;
    }
    if (ok) lines.push({ type: 'col', indices: idxs });
  }
  let ok1 = true,
    diag1 = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + i;
    diag1.push(idx);
    if (!marks[idx]) ok1 = false;
  }
  if (ok1) lines.push({ type: 'diag', indices: diag1 });
  let ok2 = true,
    diag2 = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + (size - 1 - i);
    diag2.push(idx);
    if (!marks[idx]) ok2 = false;
  }
  if (ok2) lines.push({ type: 'diag', indices: diag2 });
  return lines;
}

function OtherBingoBanner({ info, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
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

  const socketEndpoint = window.location.origin + (window.location.port === '5173' ? ':3000' : '');

  // --------- здесь инициализируем ровно 1 раз для данного sessionId ----------
  useEffect(() => {
    if (!sessionId) return;
    const socket = io(socketEndpoint, {
      path: '/socket.io',
      query: { sessionId },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('socket connected', socket.id, 'sessionId=', sessionId);
    });
    socket.on('other-bingo', (data) => {
      if (data.sessionId === sessionId) return;
      console.log('received other-bingo', data);
      setOtherBingoInfo(data);
      playOther();
    });
    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', reason);
    });

    return () => {
      socket.disconnect();
    };
  }, [socketEndpoint, sessionId]); // <<** убрали playOther из зависимостей! **

  // загрузка сессии / детект бинго ----------------
  const load = async () => {
    setLoading(true);
    if (!sessionId) {
      setError('sessionId missing in URL');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/session${buildQuery(sessionId)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSession(data);
      setMarks(data.marks || {});
      const lines = computeBingos(data.items, data.marks || {}, data.size);
      setBingos(lines);

      const hasBingoNow = lines.length > 0;
      const hadBingoBefore = prevHasBingoRef.current;
      if (hasBingoNow && !hadBingoBefore) {
        console.log('new bingo, emit', data.id, data.name);
        socketRef.current.emit('bingo', { sessionId: data.id, name: data.name });
        setConfettiKey((k) => k + 1);
        playWin();
      }
      prevHasBingoRef.current = hasBingoNow;
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Session load error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [sessionId]);

  const toggle = async (i) => {
    await fetch(`/api/mark${buildQuery(sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: i }),
    });
    await load();
  };
  const resetMarks = async () => {
    await fetch(`/api/reset-marks${buildQuery(sessionId)}`, { method: 'POST' });
    await load();
  };

  // ---------------- вёрстка --------------------
  if (loading) return <div className="card">Loading…</div>;
  if (error)
    return (
      <div className="card">
        <p>{error}</p>
        <a href={`/settings${buildQuery(sessionId)}`}>
          <button className="primary">Go to Settings</button>
        </a>
      </div>
    );
  if (!session) return null;

  const size = session.size;
  const hasBingo = bingos.length > 0;

  return (
    <div className="space-y-6 container">
      {otherBingoInfo && <OtherBingoBanner info={otherBingoInfo} onDone={() => setOtherBingoInfo(null)} />}
      {hasBingo && <ConfettiCanvas key={confettiKey} />}

      <header>
        <div className="brand">
          <div className="dot" /> Bingo
        </div>
      </header>

      <div className="card game-top">
        <h2>{session.name || 'Bingo'}</h2>
        <div className="small">Grid: {size}×{size}</div>
        <div className="button-group" style={{ marginTop: '1rem' }}>
          <button onClick={resetMarks} className="primary">Reset marks</button>
          <button onClick={load} className="secondary">Refresh</button>
          <a href={`/settings${buildQuery(sessionId)}`}>
            <button className="secondary">Edit session</button>
          </a>
        </div>
        {hasBingo && (
          <div style={{ marginTop: '1rem' }}>
            <div className="bingo-badge">🎉 BINGO!</div>
          </div>
        )}
        <div className="small" style={{ marginTop: '0.5rem' }}>
          Click cell to toggle mark.
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {session.items.map((it, i) => {
          const marked = marks[i];
          let extra = '';
          if (hasBingo && bingos.some((L) => L.indices.includes(i))) extra = ' bingo-line';
          return (
            <div key={i} onClick={() => toggle(i)} className={`grid-cell${marked ? ' marked' : ''}${extra}`}>
              {it || <span className="small">[empty]</span>}
              {marked && <div className="badge" style={{ position: 'absolute', top: 6, right: 6 }}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
