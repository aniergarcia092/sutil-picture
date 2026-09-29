require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

require('./database');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Inténtalo nuevamente más tarde.' }
});

app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/fotos', require('./routes/fotos'));
app.use('/api/contenido', require('./routes/contenido'));
app.use('/api/ofertas', require('./routes/ofertas'));
app.use('/api/mensajes', require('./routes/mensajes'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    nombre: 'Sutil Picture API',
    health: '/api/health'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
