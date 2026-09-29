const express = require('express');
const multer = require('multer');
const { db } = require('../database');
const { verificarToken } = require('../middleware/auth');
const { storage, requireCloudinary } = require('../utils/cloudinary');

const router = express.Router();

/* =========================================================
   GET /api/contenido
========================================================= */
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT clave, valor FROM contenido');
    const obj = {};

    result.rows.forEach(row => {
      obj[row.clave] = row.valor;
    });

    res.json(obj);
  } catch (err) {
    console.error('Error en GET /contenido:', err.message);
    res.status(500).json({ error: 'Error al obtener el contenido' });
  }
});

/* =========================================================
   PUT /api/contenido
========================================================= */
router.put('/', verificarToken, async (req, res) => {
  try {
    const datos = req.body;

    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
      return res.status(400).json({ error: 'Contenido inválido' });
    }

    const entries = Object.entries(datos);

    for (const [clave, valor] of entries) {
      await db.execute({
        sql: `INSERT INTO contenido (clave, valor, actualizado_en)
              VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(clave) DO UPDATE SET
                valor=excluded.valor,
                actualizado_en=CURRENT_TIMESTAMP`,
        args: [clave, String(valor ?? '')]
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /contenido:', err.message);
    res.status(500).json({ error: 'Error al guardar el contenido' });
  }
});

/* =========================================================
   MULTER - Subir imagen "Sobre" a Cloudinary
========================================================= */
const uploadSobre = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'), ok);
  }
});

/* =========================================================
   POST /api/contenido/sobre-imagen
========================================================= */
router.post(
  '/sobre-imagen',
  verificarToken,
  requireCloudinary,
  uploadSobre.single('archivo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo' });
      }

      const urlCloudinary = req.file.path;

      await db.execute({
        sql: `INSERT INTO contenido (clave, valor, actualizado_en)
              VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(clave) DO UPDATE SET
                valor=excluded.valor,
                actualizado_en=CURRENT_TIMESTAMP`,
        args: ['sobre_imagen', urlCloudinary]
      });

      res.json({
        ok: true,
        archivo: urlCloudinary,
        mensaje: 'Imagen actualizada correctamente'
      });
    } catch (err) {
      console.error('Error en POST /sobre-imagen:', err.message);
      res.status(500).json({ error: 'Error al subir la imagen' });
    }
  }
);

module.exports = router;