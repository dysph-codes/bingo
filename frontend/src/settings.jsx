import React, { useEffect, useState } from 'react';

export default function Settings() {
  const [name, setName] = useState('');
  const [size, setSize] = useState(4);
  const [rawItems, setRawItems] = useState('');
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(setSession);
  }, []);

  useEffect(() => {
    if (session) {
      setName(session.name);
      setSize(session.size);
      setRawItems(session.items.join('\n'));
    }
  }, [session]);

  const save = async () => {
    const items = rawItems
      .split('\n')
      .map(s => s.trim());
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size: Number(size), items })
    });
    const data = await res.json();
    setSession(data);
    setStatus('Saved');
    setTimeout(() => setStatus(''), 1500);
  };

  const resetAll = async () => {
    const res = await fetch('/api/reset-session', { method: 'POST' });
    setSession(await res.json());
    setStatus('Session reset');
    setTimeout(() => setStatus(''), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h2>Session Settings</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Bingo Game"
                />
              </div>
              <div>
                <label>Grid size</label>
                <select value={size} onChange={e => setSize(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>
                      {n}×{n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label>Items (по одной на строку, будет обрезано/дополнено до {size * size})</label>
              <textarea
                value={rawItems}
                onChange={e => setRawItems(e.target.value)}
                placeholder="Вариант 1\nВариант 2\n..."
              />
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div className="button-group">
              <button onClick={save} className="primary">
                Save / Create
              </button>
              <button onClick={resetAll} className="secondary">
                Reset Session
              </button>
            </div>
            <div className="small mt-2">
              {session && (
                <div className="session-info">
                  Current session:{' '}
                  <strong>{session.name || '(unnamed)'}</strong> — grid {session.size}×{session.size}
                </div>
              )}
              {status && <div className="small">{status}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Quick preview</h3>
        {session ? (
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${session.size}, 1fr)`, gap: '8px', marginTop: '8px' }}
          >
            {session.items.map((it, i) => (
              <div key={i} className="grid-cell">
                {it || <span className="small">[empty]</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="small">No session yet.</div>
        )}
      </div>
    </div>
  );
}
