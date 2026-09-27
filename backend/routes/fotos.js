const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombre = `foto-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombre);
  }
});

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

router.post('/', verificarToken, upload.single('archivo'), (req, res) => {
  const { titulo, descripcion, categoria, orden } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  if (!titulo || !categoria) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Título y categoría son obligatorios' });
  }

  const stmt = db.prepare(`
    INSERT INTO fotos (titulo, descripcion, categoria, archivo, orden)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    titulo,
    descripcion || '',
    categoria,
    req.file.filename,
    Number(orden) || 0
  );

  res.json({
    id: result.lastInsertRowid,
    archivo: req.file.filename
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

router.delete('/:id', verificarToken, (req, res) => {
  const foto = db.prepare('SELECT * FROM fotos WHERE id=?').get(req.params.id);

  if (!foto) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  const ruta = path.join(__dirname, '..', 'uploads', foto.archivo);

  if (fs.existsSync(ruta)) {
    fs.unlinkSync(ruta);
  }

  db.prepare('DELETE FROM fotos WHERE id=?').run(req.params.id);

  res.json({ ok: true });
});

module.exports = router;
