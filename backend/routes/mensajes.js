const express = require('express');
const { db } = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   POST /api/mensajes (público)
========================================================= */
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, servicio, mensaje } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
    }

    const result = await db.execute({
      sql: `INSERT INTO mensajes (nombre, telefono, servicio, mensaje)
            VALUES (?, ?, ?, ?)`,
      args: [
        nombre,
        telefono,
        servicio || '',
        mensaje || ''
      ]
    });

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Error en POST /mensajes:', err.message);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
});

/* =========================================================
   GET /api/mensajes (admin)
========================================================= */
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM mensajes ORDER BY creado_en DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /mensajes:', err.message);
    res.status(500).json({ error: 'Error al obtener los mensajes' });
  }
});

/* =========================================================
   PUT /api/mensajes/:id/leido
========================================================= */
router.put('/:id/leido', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'UPDATE mensajes SET leido=1 WHERE id=?',
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /mensajes/leido:', err.message);
    res.status(500).json({ error: 'Error al actualizar el mensaje' });
  }
});

/* =========================================================
   DELETE /api/mensajes/:id
========================================================= */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM mensajes WHERE id=?',
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /mensajes:', err.message);
    res.status(500).json({ error: 'Error al eliminar el mensaje' });
  }
});

module.exports = router;