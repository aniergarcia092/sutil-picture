const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/* =========================================================
   INICIALIZAR BASE DE DATOS
========================================================= */
async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fotos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT NOT NULL,
      archivo TEXT NOT NULL,
      cloudinary_public_id TEXT,
      orden INTEGER DEFAULT 0,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS contenido (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ofertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      precio TEXT NOT NULL,
      moneda TEXT DEFAULT 'CUP',
      caracteristicas TEXT,
      destacada INTEGER DEFAULT 0,
      orden INTEGER DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS mensajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      servicio TEXT,
      mensaje TEXT,
      leido INTEGER DEFAULT 0,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      items TEXT,
      total REAL DEFAULT 0,
      moneda TEXT DEFAULT 'CUP',
      fecha_deseada TEXT,
      hora_deseada TEXT,
      estado TEXT DEFAULT 'pendiente',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmado_en DATETIME
    )
  `);

  // =========================================================
  // MIGRACIONES AUTOMÁTICAS
  // =========================================================

  // Migración: fotos.cloudinary_public_id
  try {
    const result = await db.execute('PRAGMA table_info(fotos)');
    const hasColumn = result.rows.some(row => row.name === 'cloudinary_public_id');
    if (!hasColumn) {
      await db.execute('ALTER TABLE fotos ADD COLUMN cloudinary_public_id TEXT');
      console.log('✅ Migración: cloudinary_public_id añadida a fotos');
    }
  } catch (err) {
    console.error('Error en migración de fotos:', err.message);
  }

  // Migración: reservas.fecha_deseada y reservas.hora_deseada
  try {
    const resColumns = await db.execute('PRAGMA table_info(reservas)');
    const nombres = resColumns.rows.map(row => row.name);

    if (!nombres.includes('fecha_deseada')) {
      await db.execute('ALTER TABLE reservas ADD COLUMN fecha_deseada TEXT');
      console.log('✅ Migración: fecha_deseada añadida a reservas');
    }

    if (!nombres.includes('hora_deseada')) {
      await db.execute('ALTER TABLE reservas ADD COLUMN hora_deseada TEXT');
      console.log('✅ Migración: hora_deseada añadida a reservas');
    }
  } catch (err) {
    console.error('Error en migración de reservas:', err.message);
  }

  // =========================================================
  // CONTENIDO POR DEFECTO
  // =========================================================
  const count = await db.execute('SELECT COUNT(*) AS c FROM contenido');
  const total = Number(count.rows[0].c);

  if (total === 0) {
    const defaults = [
      ['hero_eyebrow', 'Fotografía profesional'],
      ['hero_titulo', 'Historias que merecen ser recordadas.'],
      ['hero_subtitulo', 'Capturamos momentos reales, emociones y detalles a través de fotografías de estudio, exteriores y videos profesionales.'],
      ['sobre_titulo', 'Fotografía con intención y personalidad.'],
      ['sobre_texto_1', 'Cada sesión es una oportunidad para contar una historia. Trabajamos con luz, composición y emoción para crear imágenes que representen la esencia de cada persona.'],
      ['sobre_texto_2', 'Realizamos sesiones de estudio, exteriores, retratos, celebraciones y videos profesionales para marcas y clientes particulares.'],
      ['whatsapp', '5356453839'],
      ['instagram', 'sutil_picture'],
      ['color_accent', '#d8ad70'],
      ['nombre_negocio', 'Sutil Picture']
    ];

    for (const [clave, valor] of defaults) {
      await db.execute({
        sql: 'INSERT INTO contenido (clave, valor) VALUES (?, ?)',
        args: [clave, valor]
      });
    }
  }

  console.log('✅ Base de datos Turso lista');
}

module.exports = { db, initDB };