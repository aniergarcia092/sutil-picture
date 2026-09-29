const express = require('express');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

function normalizarOferta(oferta) {
  return {
    ...oferta,
    caracteristicas: JSON.parse(oferta.caracteristicas || '[]')
  };
}

router.get('/', (req, res) => {
  const ofertas = db
    .prepare('SELECT * FROM ofertas ORDER BY orden, id')
    .all()
    .map(normalizarOferta);

  res.json(ofertas);
});

router.post('/', verificarToken, (req, res) => {
  const {
    titulo,
    descripcion,
    precio,
    moneda,
    caracteristicas,
    destacada,
    orden
  } = req.body;

  if (!titulo || !precio) {
    return res.status(400).json({ error: 'Título y precio son obligatorios' });
  }

  const stmt = db.prepare(`
    INSERT INTO ofertas
    (titulo, descripcion, precio, moneda, caracteristicas, destacada, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    titulo,
    descripcion || '',
    precio,
    moneda || 'CUP',
    JSON.stringify(Array.isArray(caracteristicas) ? caracteristicas : []),
    destacada ? 1 : 0,
    Number(orden) || 0
  );

  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verificarToken, (req, res) => {
  const {
    titulo,
    descripcion,
    precio,
    moneda,
    caracteristicas,
    destacada,
    orden
  } = req.body;

  const result = db.prepare(`
    UPDATE ofertas
    SET titulo=?, descripcion=?, precio=?, moneda=?, caracteristicas=?, destacada=?, orden=?
    WHERE id=?
  `).run(
    titulo,
    descripcion || '',
    precio,
    moneda || 'CUP',
    JSON.stringify(Array.isArray(caracteristicas) ? caracteristicas : []),
    destacada ? 1 : 0,
    Number(orden) || 0,
    req.params.id
  );

  if (!result.changes) {
    return res.status(404).json({ error: 'Oferta no encontrada' });
  }

  res.json({ ok: true });
});

router.delete('/:id', verificarToken, (req, res) => {
  const result = db
    .prepare('DELETE FROM ofertas WHERE id=?')
    .run(req.params.id);

  if (!result.changes) {
    return res.status(404).json({ error: 'Oferta no encontrada' });
  }

  res.json({ ok: true });
});

module.exports = router;
