const express = require('express');
const { db } = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   POST /api/reservas
   Cliente crea reserva desde el carrito (público)
========================================================= */
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      items,
      total,
      moneda,
      fecha_deseada,
      hora_deseada
    } = req.body;

    if (!nombre || !telefono || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    if (!fecha_deseada || !hora_deseada) {
      return res.status(400).json({ error: 'Debes seleccionar fecha y hora para tu sesión' });
    }

    // Verificar que la hora esté libre
    const existe = await db.execute({
      sql: `SELECT id FROM reservas 
            WHERE fecha_deseada = ? AND hora_deseada = ? AND estado != 'rechazada'`,
      args: [fecha_deseada, hora_deseada]
    });

    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'Esa hora ya está reservada. Por favor elige otra.'
      });
    }

    const result = await db.execute({
      sql: `INSERT INTO reservas 
            (nombre, telefono, items, total, moneda, fecha_deseada, hora_deseada, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      args: [
        nombre,
        telefono,
        JSON.stringify(items),
        Number(total) || 0,
        moneda || 'CUP',
        fecha_deseada,
        hora_deseada
      ]
    });

    res.json({ id: Number(result.lastInsertRowid), ok: true });
  } catch (err) {
    console.error('Error en POST /reservas:', err.message);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

/* =========================================================
   GET /api/reservas/disponibilidad?fecha=YYYY-MM-DD
   Devuelve las horas ocupadas para esa fecha (público)
========================================================= */
router.get('/disponibilidad', async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const result = await db.execute({
      sql: `SELECT hora_deseada FROM reservas 
            WHERE fecha_deseada = ? AND estado != 'rechazada'`,
      args: [fecha]
    });

    const horasOcupadas = result.rows.map(r => r.hora_deseada);

    res.json({ fecha, horasOcupadas });
  } catch (err) {
    console.error('Error en GET /reservas/disponibilidad:', err.message);
    res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
});

/* =========================================================
   GET /api/reservas
   Admin lista todas las reservas
========================================================= */
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM reservas ORDER BY creado_en DESC');

    const reservas = result.rows.map(r => ({
      ...r,
      items: JSON.parse(r.items || '[]')
    }));

    res.json(reservas);
  } catch (err) {
    console.error('Error en GET /reservas:', err.message);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

/* =========================================================
   PUT /api/reservas/:id/confirmar
========================================================= */
router.put('/:id/confirmar', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `UPDATE reservas
            SET estado='confirmada', confirmado_en=CURRENT_TIMESTAMP
            WHERE id=?`,
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /reservas/confirmar:', err.message);
    res.status(500).json({ error: 'Error al confirmar la reserva' });
  }
});

/* =========================================================
   PUT /api/reservas/:id/rechazar
========================================================= */
router.put('/:id/rechazar', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `UPDATE reservas SET estado='rechazada' WHERE id=?`,
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /reservas/rechazar:', err.message);
    res.status(500).json({ error: 'Error al rechazar la reserva' });
  }
});

/* =========================================================
   DELETE /api/reservas/:id
========================================================= */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM reservas WHERE id=?',
      args: [req.params.id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /reservas:', err.message);
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

/* =========================================================
   GET /api/reservas/stats
========================================================= */
router.get('/stats', verificarToken, async (req, res) => {
  try {
    const sumarPorPeriodo = async (condicion) => {
      const result = await db.execute({
        sql: `SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
              FROM reservas
              WHERE estado='confirmada' AND ${condicion}`,
        args: []
      });
      return {
        cantidad: Number(result.rows[0].cantidad),
        total: Number(result.rows[0].total)
      };
    };

    const hoy = await sumarPorPeriodo("DATE(confirmado_en) = DATE('now')");
    const semana = await sumarPorPeriodo("confirmado_en >= DATE('now', '-7 days')");
    const mes = await sumarPorPeriodo("confirmado_en >= DATE('now', '-30 days')");
    const total = await sumarPorPeriodo("1=1");

    const pendientesResult = await db.execute(
      "SELECT COUNT(*) as c FROM reservas WHERE estado='pendiente'"
    );
    const pendientes = Number(pendientesResult.rows[0].c);

    res.json({ hoy, semana, mes, total, pendientes });
  } catch (err) {
    console.error('Error en GET /reservas/stats:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;