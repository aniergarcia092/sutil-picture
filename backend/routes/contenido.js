const express = require('express');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT clave, valor FROM contenido').all();
  const obj = {};

  rows.forEach(row => {
    obj[row.clave] = row.valor;
  });

  res.json(obj);
});

router.put('/', verificarToken, (req, res) => {
  const datos = req.body;

  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return res.status(400).json({ error: 'Contenido inválido' });
  }

  const stmt = db.prepare(`
    INSERT INTO contenido (clave, valor, actualizado_en)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(clave) DO UPDATE SET
      valor=excluded.valor,
      actualizado_en=CURRENT_TIMESTAMP
  `);

  const trans = db.transaction(entries => {
    for (const [clave, valor] of entries) {
      stmt.run(clave, String(valor ?? ''));
    }
  });

  trans(Object.entries(datos));

  res.json({ ok: true });
});

module.exports = router;
