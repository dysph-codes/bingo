import React, { useEffect, useState } from 'react';

function buildQuery(sessionId) {
  return sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
}

async function createSession(payload = { name: 'My Game', size: 4, items: [] }) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default function Settings() {
  const [name, setName] = useState('');
  const [size, setSize] = useState(4);
  const [rawItems, setRawItems] = useState('');
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState('');

  const getSessionIdFromURL = () => new URLSearchParams(window.location.search).get('sessionId') || '';

  const fetchSession = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/session${buildQuery(id)}`);
      if (!res.ok) throw new Error('Failed to get session');
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
      setStatus('Session not found. Create new.');
      setSession(null);
    }
  };

  useEffect(() => {
    (async () => {
      const id = getSessionIdFromURL();
      if (id) {
        setSessionId(id);
        await fetchSession(id);
      }
    })();
  }, []);

  useEffect(() => {
    if (session) {
      setName(session.name || '');
      setSize(session.size || 4);
      setRawItems(Array.isArray(session.items) ? session.items.join('\n') : '');
    }
  }, [session]);

  const save = async () => {
    const items = rawItems.split('\n').map(s => s.trim());
    const body = { name, size: Number(size), items };
    if (sessionId) body.sessionId = sessionId;
    try {
      const res = await fetch(`/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSession(data);
      setStatus('Saved');
      if (data.id) {
        setSessionId(data.id);
        const u = new URL(window.location.href);
        u.searchParams.set('sessionId', data.id);
        window.history.replaceState(null, '', u.toString());
      }
    } catch (e) {
      console.error('Save failed', e);
      setStatus('Save error');
    }
    setTimeout(() => setStatus(''), 1500);
  };

  const resetAll = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/reset-session${buildQuery(sessionId)}`, { method: 'POST' });
      const updated = await res.json();
      setSession(updated);
      setRawItems(Array.isArray(updated.items) ? updated.items.join('\n') : '');
      setStatus('Session reset');
    } catch (e) {
      console.error('Reset failed', e);
      setStatus('Reset error');
    }
    setTimeout(() => setStatus(''), 1500);
  };

  const newSession = async () => {
    try {
      const data = await createSession({ name: '', size: 4, items: [] });
      setSession(data);
      setSessionId(data.id);
      setName(data.name || '');
      setSize(data.size || 4);
      setRawItems(Array.isArray(data.items) ? data.items.join('\n') : '');
      setStatus('New session');
      const u = new URL(window.location.href);
      u.searchParams.set('sessionId', data.id);
      window.history.replaceState(null, '', u.toString());
    } catch (e) {
      console.error('New session failed', e);
      setStatus('Error');
    }
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
              <label>Items (по одной на строке, будет обрезано/дополнено до {size * size})</label>
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
              <button onClick={newSession} className="secondary">
                New Session
              </button>
              {sessionId && (
                <a href={`/${buildQuery(sessionId)}`}>
                  <button className="primary">Go to Game</button>
                </a>
              )}
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
              {!sessionId && <div className="small text-red-300">No session selected yet.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Quick preview</h3>
        {session ? (
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${session.size || 4}, 1fr)`, gap: '8px', marginTop: '8px' }}
          >
            {Array.isArray(session.items)
              ? session.items.map((it, i) => (
                  <div key={i} className="grid-cell">
                    {it || <span className="small">[empty]</span>}
                  </div>
                ))
              : Array.from({ length: (session.size || 4) ** 2 }).map((_, i) => (
                  <div key={i} className="grid-cell">
                    <span className="small">[empty]</span>
                  </div>
                ))}
          </div>
        ) : (
          <div className="small">No session yet. Create one above.</div>
        )}
      </div>
    </div>
  );
}
