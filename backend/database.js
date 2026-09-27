const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    archivo TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contenido (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ofertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    precio TEXT NOT NULL,
    moneda TEXT DEFAULT 'CUP',
    caracteristicas TEXT,
    destacada INTEGER DEFAULT 0,
    orden INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    servicio TEXT,
    mensaje TEXT,
    leido INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const countContenido = db.prepare('SELECT COUNT(*) AS c FROM contenido').get();

if (countContenido.c === 0) {
  const insert = db.prepare('INSERT INTO contenido (clave, valor) VALUES (?, ?)');
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
    insert.run(clave, valor);
  }
}

module.exports = db;
