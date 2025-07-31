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
    const items = rawItems.split('\n').map(s => s.trim());
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Session Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              className="w-full p-2 rounded-md bg-[#1f2a44] border border-purple-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Bingo Game"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Grid size</label>
            <select
              className="w-full p-2 rounded-md bg-[#1f2a44] border border-purple-500"
              value={size}
              onChange={e => setSize(Number(e.target.value))}
            >
              {[2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n}×{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block mb-1 font-medium">Items (по одной на строку, будет обрезано/дополнено до {size * size})</label>
          <textarea
            className="w-full h-40 p-2 rounded-md bg-[#1f2a44] border border-purple-500 resize-none"
            value={rawItems}
            onChange={e => setRawItems(e.target.value)}
            placeholder="Вариант 1\nВариант 2\n..."
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={save}
            className="px-5 py-2 bg-accent rounded-full hover:brightness-110"
          >
            Save / Create
          </button>
          <button
            onClick={resetAll}
            className="px-5 py-2 border border-red-400 rounded-full hover:bg-red-500"
          >
            Reset Session
          </button>
          <div className="ml-auto text-sm italic">{status}</div>
        </div>
        {session && (
          <div className="mt-2 text-xs text-gray-300">
            Current session: <strong>{session.name || '(unnamed)'}</strong> — grid {session.size}×{session.size}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="font-semibold">Quick preview</h3>
        {session ? (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${session.size}, 1fr)` }}>
            {session.items.map((it, i) => (
              <div key={i} className="p-2 border border-purple-700 m-1 rounded">
                {it || <span className="text-gray-500">[empty]</span>}
              </div>
            ))}
          </div>
        ) : (
          <div>No session yet.</div>
        )}
      </div>
    </div>
  );
}
