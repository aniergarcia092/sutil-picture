const express = require('express');
const multer = require('multer');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');
const { storage, requireCloudinary } = require('../utils/cloudinary');

const router = express.Router();

/* =========================================================
   GET /api/contenido
   Devuelve todos los textos editables
========================================================= */
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT clave, valor FROM contenido').all();
  const obj = {};

  rows.forEach(row => {
    obj[row.clave] = row.valor;
  });

  res.json(obj);
});

/* =========================================================
   PUT /api/contenido
   Actualiza textos editables
========================================================= */
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

/* =========================================================
   MULTER - Configuración para subir imagen "Sobre" a Cloudinary
========================================================= */
const uploadSobre = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'), ok);
  }
});

/* =========================================================
   POST /api/contenido/sobre-imagen
   Sube la imagen de la sección "Sobre el estudio"
========================================================= */
router.post(
  '/sobre-imagen',
  verificarToken,
  requireCloudinary,
  uploadSobre.single('archivo'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // req.file.path es la URL completa de Cloudinary
    const urlCloudinary = req.file.path;

    const stmt = db.prepare(`
      INSERT INTO contenido (clave, valor, actualizado_en)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET
        valor=excluded.valor,
        actualizado_en=CURRENT_TIMESTAMP
    `);

    stmt.run('sobre_imagen', urlCloudinary);

    res.json({
      ok: true,
      archivo: urlCloudinary,
      mensaje: 'Imagen actualizada correctamente'
    });
  }
);

module.exports = router;