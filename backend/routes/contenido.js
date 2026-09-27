const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

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
   MULTER - Configuración para imagen "Sobre"
========================================================= */
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageSobre = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `sobre-imagen${ext}`);
  }
});

const uploadSobre = multer({
  storage: storageSobre,
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
  uploadSobre.single('archivo'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const stmt = db.prepare(`
      INSERT INTO contenido (clave, valor, actualizado_en)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET
        valor=excluded.valor,
        actualizado_en=CURRENT_TIMESTAMP
    `);

    stmt.run('sobre_imagen', req.file.filename);

    res.json({
      ok: true,
      archivo: req.file.filename,
      mensaje: 'Imagen actualizada correctamente'
    });
  }
);

module.exports = router;