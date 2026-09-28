const express = require('express');
const multer = require('multer');
const db = require('../database');
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

router.get('/', (req, res) => {
  const fotos = db.prepare('SELECT * FROM fotos ORDER BY orden, id DESC').all();
  res.json(fotos);
});

router.post('/', verificarToken, requireCloudinary, upload.single('archivo'), (req, res) => {
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

  const stmt = db.prepare(`
    INSERT INTO fotos (titulo, descripcion, categoria, archivo, cloudinary_public_id, orden)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    titulo,
    descripcion || '',
    categoria,
    urlCloudinary,
    publicId,
    Number(orden) || 0
  );

  res.json({
    id: result.lastInsertRowid,
    archivo: urlCloudinary,
    cloudinary_public_id: publicId
  });
});

router.put('/:id', verificarToken, (req, res) => {
  const { titulo, descripcion, categoria, orden } = req.body;

  const result = db.prepare(`
    UPDATE fotos
    SET titulo=?, descripcion=?, categoria=?, orden=?
    WHERE id=?
  `).run(
    titulo,
    descripcion || '',
    categoria,
    Number(orden) || 0,
    req.params.id
  );

  if (!result.changes) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  res.json({ ok: true });
});

router.delete('/:id', verificarToken, async (req, res) => {
  const foto = db.prepare('SELECT * FROM fotos WHERE id=?').get(req.params.id);

  if (!foto) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  // Las fotos antiguas guardadas como nombres locales no existen en Cloudinary.
  // En ese caso solo se elimina el registro de la base de datos.
  try {
    let publicId = foto.cloudinary_public_id || null;

    // Compatibilidad con fotos Cloudinary creadas antes de guardar public_id.
    if (!publicId && foto.archivo && foto.archivo.includes('res.cloudinary.com')) {
      const urlParts = foto.archivo.split('/upload/');
      if (urlParts[1]) {
        const withoutVersion = urlParts[1].replace(/^v\d+\//, '');
        publicId = withoutVersion.replace(/\.[^/.]+$/, '');
      }
    }

    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      console.log('Cloudinary destroy:', publicId, result);
    }
  } catch (err) {
    console.warn('No se pudo borrar de Cloudinary:', err.message);
    // No bloqueamos el borrado del registro.
  }

  db.prepare('DELETE FROM fotos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
