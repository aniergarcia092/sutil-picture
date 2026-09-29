const express = require('express');
const { db } = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

function normalizarOferta(oferta) {
  return {
    ...oferta,
    caracteristicas: JSON.parse(oferta.caracteristicas || '[]')
  };
}

/* =========================================================
   GET /api/ofertas
========================================================= */
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM ofertas ORDER BY orden, id');
    const ofertas = result.rows.map(normalizarOferta);
    res.json(ofertas);
  } catch (err) {
    console.error('Error en GET /ofertas:', err.message);
    res.status(500).json({ error: 'Error al obtener las ofertas' });
  }
});

/* =========================================================
   POST /api/ofertas
========================================================= */
router.post('/', verificarToken, async (req, res) => {
  try {
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

    const result = await db.execute({
      sql: `INSERT INTO ofertas
            (titulo, descripcion, precio, moneda, caracteristicas, destacada, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        titulo,
        descripcion || '',
        precio,
        moneda || 'CUP',
        JSON.stringify(Array.isArray(caracteristicas) ? caracteristicas : []),
        destacada ? 1 : 0,
        Number(orden) || 0
      ]
    });

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Error en POST /ofertas:', err.message);
    res.status(500).json({ error: 'Error al crear la oferta' });
  }
});

/* =========================================================
   PUT /api/ofertas/:id
========================================================= */
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      precio,
      moneda,
      caracteristicas,
      destacada,
      orden
    } = req.body;

    const result = await db.execute({
      sql: `UPDATE ofertas
            SET titulo=?, descripcion=?, precio=?, moneda=?, caracteristicas=?, destacada=?, orden=?
            WHERE id=?`,
      args: [
        titulo,
        descripcion || '',
        precio,
        moneda || 'CUP',
        JSON.stringify(Array.isArray(caracteristicas) ? caracteristicas : []),
        destacada ? 1 : 0,
        Number(orden) || 0,
        req.params.id
      ]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /ofertas:', err.message);
    res.status(500).json({ error: 'Error al actualizar la oferta' });
  }
});

/* =========================================================
   DELETE /api/ofertas/:id
========================================================= */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM ofertas WHERE id=?',
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /ofertas:', err.message);
    res.status(500).json({ error: 'Error al eliminar la oferta' });
  }
});

module.exports = router;