import React, { useEffect, useState } from 'react';

function getSessionIdFromURL() {
  return new URLSearchParams(window.location.search).get('sessionId') || '';
}

function buildQuery(sessionId) {
  return sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
}

export default function Settings() {
  const [name, setName] = useState('');
  const [size, setSize] = useState(4);
  const [rawItems, setRawItems] = useState('');
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('');

  const sessionId = getSessionIdFromURL();

  const fetchSession = async () => {
    const res = await fetch(`/api/session${buildQuery(sessionId)}`);
    const data = await res.json();
    setSession(data);
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      setName(session.name);
      setSize(session.size);
      setRawItems(session.items.join('\n'));
      // sync URL if no sessionId present
      if (!sessionId && session.id) {
        const u = new URL(window.location.href);
        u.searchParams.set('sessionId', session.id);
        window.history.replaceState(null, '', u.toString());
      }
    }
  }, [session]);

  const save = async () => {
    const items = rawItems
      .split('\n')
      .map(s => s.trim());
    const body = {
      name,
      size: Number(size),
      items,
    };
    if (sessionId) body.sessionId = sessionId;
    const res = await fetch(`/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setSession(data);
    setStatus('Saved');
    // push new sessionId into URL
    if (data.id) {
      const u = new URL(window.location.href);
      u.searchParams.set('sessionId', data.id);
      window.history.replaceState(null, '', u.toString());
    }
    setTimeout(() => setStatus(''), 1500);
  };

  const resetAll = async () => {
    // reset whole session (keeps name/size)
    const res = await fetch(`/api/reset-session${buildQuery(sessionId)}`, { method: 'POST' });
    const updated = await res.json();
    setSession(updated);
    setRawItems(updated.items.join('\n'));
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
                  <strong>{session.name || '(unnamed)'}</strong> — grid {session.size}×{session.size} —{' '}
                  <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                    {session.id}
                  </code>
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
