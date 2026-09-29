const express = require('express');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', (req, res) => {
  const { nombre, telefono, servicio, mensaje } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  const stmt = db.prepare(`
    INSERT INTO mensajes (nombre, telefono, servicio, mensaje)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    nombre,
    telefono,
    servicio || '',
    mensaje || ''
  );

  res.json({ id: result.lastInsertRowid });
});

router.get('/', verificarToken, (req, res) => {
  const mensajes = db
    .prepare('SELECT * FROM mensajes ORDER BY creado_en DESC')
    .all();

  res.json(mensajes);
});

router.put('/:id/leido', verificarToken, (req, res) => {
  const result = db
    .prepare('UPDATE mensajes SET leido=1 WHERE id=?')
    .run(req.params.id);

  if (!result.changes) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  res.json({ ok: true });
});

router.delete('/:id', verificarToken, (req, res) => {
  const result = db
    .prepare('DELETE FROM mensajes WHERE id=?')
    .run(req.params.id);

  if (!result.changes) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  res.json({ ok: true });
});

module.exports = router;
