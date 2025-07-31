const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(require('cors')());

// В памяти: единственная текущая сессия
let session = {
  id: null,
  name: "",
  size: 4,
  items: [], // массив строк, длина size*size
  marks: {} // { index: true }
};

// API: создать/обновить сессию
app.post('/api/session', (req, res) => {
  const { name, size, items } = req.body;
  if (!name || !size || !items) return res.status(400).json({ error: 'missing' });
  if (size < 2 || size > 6) return res.status(400).json({ error: 'size out of bounds' });
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be array' });
  // обрезаем/дополняем до size*size
  const expected = size * size;
  let padded = items.slice(0, expected);
  while (padded.length < expected) padded.push("");
  session = {
    id: nanoid(8),
    name,
    size,
    items: padded,
    marks: {}
  };
  res.json(session);
});

// получить текущую сессию
app.get('/api/session', (req, res) => {
  res.json(session);
});

// чек/анчек клетки
app.post('/api/mark', (req, res) => {
  const { index } = req.body;
  if (typeof index !== 'number') return res.status(400).json({ error: 'index required' });
  if (index < 0 || index >= session.size * session.size) return res.status(400).json({ error: 'out of range' });
  if (session.marks[index]) {
    delete session.marks[index];
  } else {
    session.marks[index] = true;
  }
  res.json({ marks: session.marks });
});

// сброс меток
app.post('/api/reset-marks', (req, res) => {
  session.marks = {};
  res.json({ marks: session.marks });
});

// сброс всей сессии (очистить)
app.post('/api/reset-session', (req, res) => {
  session = {
    id: null,
    name: "",
    size: 4,
    items: [],
    marks: {}
  };
  res.json(session);
});

// статика (фронтенд)
app.use('/', express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  // вся маршрутизация на фронтенде
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bingo app listening on :${PORT}`);
});
