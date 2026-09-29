const express = require('express');
const multer = require('multer');
const { db } = require('../database');
const { verificarToken } = require('../middleware/auth');
const { cloudinary, storage, requireCloudinary } = require('../utils/cloudinary');

const router = express.Router();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|jpg|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), ok);
  }
});

/* =========================================================
   GET /api/fotos
========================================================= */
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM fotos ORDER BY orden, id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /fotos:', err.message);
    res.status(500).json({ error: 'Error al obtener las fotos' });
  }
});

/* =========================================================
   POST /api/fotos
========================================================= */
router.post('/', verificarToken, requireCloudinary, upload.single('archivo'), async (req, res) => {
  try {
    const { titulo, descripcion, categoria, orden } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    if (!titulo || !categoria) {
      return res.status(400).json({ error: 'Título y categoría son obligatorios' });
    }

    const urlCloudinary = req.file.path || req.file.secure_url;
    const publicId = req.file.filename || null;

    if (!urlCloudinary || !String(urlCloudinary).startsWith('http')) {
      return res.status(500).json({ error: 'Cloudinary no devolvió una URL válida' });
    }

    const result = await db.execute({
      sql: `INSERT INTO fotos (titulo, descripcion, categoria, archivo, cloudinary_public_id, orden)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        titulo,
        descripcion || '',
        categoria,
        urlCloudinary,
        publicId,
        Number(orden) || 0
      ]
    });

    res.json({
      id: Number(result.lastInsertRowid),
      archivo: urlCloudinary,
      cloudinary_public_id: publicId
    });
  } catch (err) {
    console.error('Error en POST /fotos:', err.message);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

/* =========================================================
   PUT /api/fotos/:id
========================================================= */
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { titulo, descripcion, categoria, orden } = req.body;

    const result = await db.execute({
      sql: `UPDATE fotos
            SET titulo=?, descripcion=?, categoria=?, orden=?
            WHERE id=?`,
      args: [
        titulo,
        descripcion || '',
        categoria,
        Number(orden) || 0,
        req.params.id
      ]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en PUT /fotos:', err.message);
    res.status(500).json({ error: 'Error al actualizar la foto' });
  }
});

/* =========================================================
   DELETE /api/fotos/:id
========================================================= */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM fotos WHERE id=?',
      args: [req.params.id]
    });

    const foto = result.rows[0];

    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    // Intentar borrar de Cloudinary
    try {
      let publicId = foto.cloudinary_public_id || null;

      if (!publicId && foto.archivo && foto.archivo.includes('res.cloudinary.com')) {
        const urlParts = foto.archivo.split('/upload/');
        if (urlParts[1]) {
          const withoutVersion = urlParts[1].replace(/^v\d+\//, '');
          publicId = withoutVersion.replace(/\.[^/.]+$/, '');
        }
      }

      if (publicId) {
        const cloudResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        console.log('Cloudinary destroy:', publicId, cloudResult);
      }
    } catch (err) {
      console.warn('No se pudo borrar de Cloudinary:', err.message);
    }

    await db.execute({
      sql: 'DELETE FROM fotos WHERE id=?',
      args: [req.params.id]
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /fotos:', err.message);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

module.exports = router;