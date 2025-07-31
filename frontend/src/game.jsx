import React, { useEffect, useState } from 'react';

export default function Game() {
  const [session, setSession] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/session');
    const data = await res.json();
    setSession(data);
    setMarks(data.marks || {});
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (i) => {
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

  if (loading) return <div className="text-center">Loading...</div>;
  if (!session || !session.items.length) {
    return (
      <div className="card max-w-lg mx-auto">
        <div className="text-center">
          <p className="mb-2">No active session. Перейди в <strong>Settings</strong> и создай игру.</p>
          <div className="flex justify-center gap-2">
            <a href="/settings" className="px-4 py-2 bg-primary rounded-full">Настроить</a>
          </div>
        </div>
      </div>
    );
  }

  const size = session.size;
  const cellSize = Math.min(200 / size, 120);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-1">{session.name || 'Bingo Game'}</h2>
          <div>Grid: {size}×{size}</div>
          <div className="mt-2 flex gap-3">
            <button onClick={resetMarks} className="px-4 py-2 bg-red-500 rounded-full hover:brightness-110">
              Reset marks
            </button>
            <button onClick={load} className="px-4 py-2 bg-purple-600 rounded-full hover:brightness-110">
              Refresh
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            Click cell to toggle mark. Bingo logic not enforced (free-form).
          </div>
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {session.items.map((it, i) => {
          const marked = marks[i];
          return (
            <div
              key={i}
              onClick={() => toggle(i)}
              className={`relative cursor-pointer select-none flex items-center justify-center rounded-xl p-3 text-center break-words font-medium shadow-inner transition-all`}
              style={{
                minHeight: 80,
                background: marked
                  ? 'linear-gradient(135deg,#10B981, #7C3AED)'
                  : '#1f2a44',
                border: marked ? '3px solid #ffffff' : '2px solid #7C3AED',
                color: marked ? 'white' : '#d1d9ff'
              }}
            >
              <div className="w-full">
                {it || <span className="text-gray-500">[empty]</span>}
              </div>
              {marked && (
                <div className="absolute top-1 right-1 text-xs bg-white/20 px-2 py-1 rounded-full">
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
