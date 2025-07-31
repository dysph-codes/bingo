import React, { useEffect, useState, useRef } from 'react';

// confetti canvas, запускается при монтировании, гаснет сам через 3 секунды
function ConfettiCanvas() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const createParticles = () => {
      const p = [];
      const colors = ['#10b981', '#7c3aed', '#fff', '#ffb86c', '#5fdde5'];
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
      const ps = particlesRef.current;
      ps.forEach(particle => {
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

    // автозакрытие через 3 секунды
    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, width, height);
    }, 5000);

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
  // rows
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
  // cols
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
  // diag TL-BR
  let okDiag1 = true;
  const diag1 = [];
  for (let i = 0; i < size; i++) {
    const idx = i * size + i;
    diag1.push(idx);
    if (!marks[idx]) okDiag1 = false;
  }
  if (okDiag1) lines.push({ type: 'diag', indices: diag1 });
  // diag TR-BL
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

export default function Game() {
  const [session, setSession] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [bingos, setBingos] = useState([]);
  const [confettiKey, setConfettiKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      setSession(data);
      setMarks(data.marks || {});
      const lines = computeBingos(data.items, data.marks || {}, data.size);
      const hadBingo = bingos.length > 0;
      setBingos(lines);
      if (lines.length > 0 && !hadBingo) {
        // новое бинго — триггерим confetti
        setConfettiKey(k => k + 1);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const toggle = async i => {
    await fetch('/api/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: i })
    });
    await load();
  };

  const resetMarks = async () => {
    await fetch('/api/reset-marks', { method: 'POST' });
    await load();
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!session || !session.items.length) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="mb-2">
            No active session. Перейди в <strong>Settings</strong> и создай игру.
          </p>
          <div className="button-group justify-center">
            <a href="/settings">
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
      {hasBingo && <ConfettiCanvas key={confettiKey} />}

      <div className="card flex flex-col md:flex-row gap-6 game-top">
        <div className="flex-1">
          <h2>{session.name || 'Bingo Game'}</h2>
          <div className="small">Grid: {size}×{size}</div>
          <div className="mt-3 button-group">
            <button onClick={resetMarks} className="primary">
              Reset marks
            </button>
            <button onClick={load} className="secondary">
              Refresh
            </button>
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
          <div className="small">
            Click cell to toggle mark. Bingo logic auto-detected.
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
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
              <div className="w-full">
                {it || <span className="small">[empty]</span>}
              </div>
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
