# Sutil Picture

Sitio web de fotografía profesional con:

- Web pública.
- Galería dinámica.
- Panel de administración.
- Login con JWT.
- Subida y eliminación de fotografías.
- Ofertas/servicios.
- Contenido editable.
- Formulario de contacto.
- SQLite.
- Protección básica contra intentos repetidos de login.

## 1. Requisitos

Instala Node.js LTS.

Comprueba:

```bash
node -v
npm -v
```

## 2. Instalar

Abre una terminal dentro de `backend`:

```bash
cd backend
npm install
```

## 3. Crear .env

Copia:

```text
.env.example
```

como:

```text
.env
```

Genera el hash de tu contraseña:

```bash
node -e "console.log(require('bcryptjs').hashSync('TU_CONTRASEÑA_AQUI', 10))"
```

Copia el resultado dentro de:

```env
ADMIN_PASSWORD_HASH=...
```

También cambia:

```env
JWT_SECRET=una_clave_larga_y_aleatoria
ADMIN_USER=admin
```

## 4. Iniciar backend

Desde `backend`:

```bash
npm run dev
```

o:

```bash
npm start
```

Debe aparecer:

```text
Backend corriendo en http://localhost:3000
```

Prueba:

```text
http://localhost:3000/api/health
```

## 5. Abrir la web

La estructura principal es:

```text
sutil-picture/
├── backend/
│   ├── middleware/
│   ├── routes/
│   ├── uploads/
│   ├── .env.example
│   ├── database.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── css/
│   ├── js/
│   ├── admin.html
│   └── index.html
├── .gitignore
└── README.md
```

Para desarrollo local, puedes usar VS Code + Live Server para `frontend/index.html` y `frontend/admin.html`.

## 6. Panel

Abre:

```text
frontend/admin.html
```

Usa el usuario y contraseña que configuraste en `.env`.

## 7. Fotografías

Desde el panel:

1. Entra a Fotos.
2. Selecciona título.
3. Selecciona categoría.
4. Selecciona la imagen.
5. Pulsa Subir foto.

Las imágenes se guardan en:

```text
backend/uploads/
```

La base de datos se crea automáticamente como:

```text
backend/database.db
```

## 8. Importante

No subas `.env` ni `database.db` a GitHub.

Para producción debes cambiar las URLs:

```js
const API_URL = 'http://localhost:3000/api';
```

por la URL real de tu backend.

También conviene restringir CORS a tu dominio real y usar HTTPS.

## 9. Despliegue

El backend puede desplegarse en servicios compatibles con Node.js.

El frontend puede alojarse como sitio estático.

Si usas Render para el backend, configura como raíz:

```text
backend
```

Build:

```text
npm install
```

Start:

```text
npm start
```

Variables:

```text
JWT_SECRET
ADMIN_USER
ADMIN_PASSWORD_HASH
PORT
```
