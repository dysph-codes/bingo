const express = require('express');
const cookieParser = require('cookie-parser');
const { randomUUID } = require('crypto');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(cookieParser());

// in-memory sessions: sessionId -> session object
const sessions = new Map();

function createNewSession({ name = '', size = 4, items = [] } = {}) {
  const id = randomUUID();
  const normalized = items.slice(0, size * size);
  while (normalized.length < size * size) normalized.push('');
  return {
    id,
    name,
    size,
    items: normalized,
    marks: {},
    updatedAt: Date.now(),
  };
}

app.get('/api/session', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).send('missing sessionId');
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).send('session not found');
  res.json(s);
});

app.post('/api/session', (req, res) => {
  const { name, size, items, sessionId: provided } = req.body;
  let session;
  if (provided && sessions.has(provided)) {
    session = sessions.get(provided);
    session.name = name ?? session.name;
    session.size = size ?? session.size;
    if (Array.isArray(items)) {
      const normalized = items.slice(0, session.size * session.size);
      while (normalized.length < session.size * session.size) normalized.push('');
      session.items = normalized;
    }
    session.updatedAt = Date.now();
  } else {
    session = createNewSession({ name, size, items });
    sessions.set(session.id, session);
  }
  res.json(session);
});

app.post('/api/mark', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).send('missing sessionId');
  const { index } = req.body;
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).send('session not found');
  if (typeof index === 'number') {
    if (s.marks[index]) delete s.marks[index];
    else s.marks[index] = true;
    s.updatedAt = Date.now();
  }
  res.json(s);
});

app.post('/api/reset-marks', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).send('missing sessionId');
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).send('session not found');
  s.marks = {};
  s.updatedAt = Date.now();
  res.json(s);
});

// serve static built frontend
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: any non-API path returns index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  const { sessionId } = socket.handshake.query || {};
  console.log('socket connected', socket.id, 'sessionId=', sessionId);
  socket.emit('connected');

  socket.on('bingo', (data) => {
    console.log('received bingo event from', data);
    io.emit('other-bingo', {
      sessionId: data.sessionId,
      name: data.name,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Bingo app listening on :${PORT}`);
});
