const API = 'https://sutil-picture-api.onrender.com/api';
const SERVER = API.replace('/api', '');

let token = localStorage.getItem('adminToken') || null;

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + path, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error(data.error || 'Sesión expirada');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Ha ocurrido un error');
  }

  return data;
}

function logout() {
  localStorage.removeItem('adminToken');
  token = null;

  document.getElementById('loginView').hidden = false;
  document.getElementById('adminView').hidden = true;
}

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async event => {
  event.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const contraseña = document.getElementById('contraseña').value;
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, contraseña })
    });

    token = data.token;
    localStorage.setItem('adminToken', token);
    mostrarPanel();
  } catch (error) {
    errorEl.textContent = error.message;
  }
});

function mostrarPanel() {
  document.getElementById('loginView').hidden = true;
  document.getElementById('adminView').hidden = false;

  cargarDashboard();
  cargarFotos();
  cargarOfertas();
  cargarContenido();
  cargarMensajes();
  cargarFinanzas();
}

document.querySelectorAll('.sidebar nav button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.sidebar nav button')
      .forEach(item => item.classList.remove('active'));

    document.querySelectorAll('.tab')
      .forEach(tab => tab.hidden = true);

    button.classList.add('active');
    document.getElementById(`tab-${button.dataset.tab}`).hidden = false;
  });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('mobileLogout').addEventListener('click', logout);

/* =========================================================
   DASHBOARD
========================================================= */
async function cargarDashboard() {
  try {
    const [fotos, ofertas, mensajes] = await Promise.all([
      api('/fotos'),
      api('/ofertas'),
      api('/mensajes')
    ]);

    document.getElementById('statFotos').textContent = fotos.length;
    document.getElementById('statOfertas').textContent = ofertas.length;
    document.getElementById('statMensajes').textContent = mensajes.length;
    document.getElementById('statNoLeidos').textContent =
      mensajes.filter(mensaje => !mensaje.leido).length;
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   FOTOS
========================================================= */
async function cargarFotos() {
  try {
    const fotos = await api('/fotos');
    const container = document.getElementById('listaFotos');

    container.innerHTML = '';

    if (!fotos.length) {
      container.innerHTML = '<p class="status">Todavía no hay fotografías.</p>';
      return;
    }

    fotos.forEach(foto => {
      const div = document.createElement('article');
      div.className = 'foto-admin';

      const img = document.createElement('img');
      img.src = foto.archivo;
      img.alt = foto.titulo;

      const info = document.createElement('div');
      info.className = 'info';

      const title = document.createElement('h4');
      title.textContent = foto.titulo;

      const meta = document.createElement('p');
      meta.textContent = `${foto.categoria} · orden ${foto.orden}`;

      const actions = document.createElement('div');
      actions.className = 'acciones';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-danger';
      deleteButton.textContent = 'Eliminar';

      deleteButton.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta foto?')) return;

        try {
          await api(`/fotos/${foto.id}`, { method: 'DELETE' });
          await cargarFotos();
          await cargarDashboard();
        } catch (error) {
          alert(error.message);
        }
      });

      actions.appendChild(deleteButton);
      info.append(title, meta, actions);
      div.append(img, info);
      container.appendChild(div);
    });
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('formFoto').addEventListener('submit', async event => {
  event.preventDefault();

  const status = document.getElementById('fotoStatus');
  const form = new FormData(event.target);

  status.textContent = 'Subiendo...';

  try {
    await api('/fotos', {
      method: 'POST',
      body: form
    });

    event.target.reset();
    status.textContent = 'Foto subida correctamente.';
    await cargarFotos();
    await cargarDashboard();
  } catch (error) {
    status.textContent = error.message;
  }
});

/* =========================================================
   OFERTAS
========================================================= */
async function cargarOfertas() {
  try {
    const ofertas = await api('/ofertas');
    const container = document.getElementById('listaOfertas');

    container.innerHTML = '';

    if (!ofertas.length) {
      container.innerHTML = '<p class="status">Todavía no hay ofertas.</p>';
      return;
    }

    ofertas.forEach(oferta => {
      const div = document.createElement('article');
      div.className = 'item-admin';

      const title = document.createElement('h4');
      title.textContent = `${oferta.titulo}${oferta.destacada ? ' ⭐' : ''}`;

      const description = document.createElement('p');
      description.textContent = oferta.descripcion || 'Sin descripción';

      const price = document.createElement('strong');
      price.textContent = `${oferta.precio} ${oferta.moneda}`;

      const actions = document.createElement('div');
      actions.className = 'acciones';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-danger';
      deleteButton.textContent = 'Eliminar';

      deleteButton.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta oferta?')) return;

        try {
          await api(`/ofertas/${oferta.id}`, { method: 'DELETE' });
          await cargarOfertas();
          await cargarDashboard();
        } catch (error) {
          alert(error.message);
        }
      });

      actions.appendChild(deleteButton);
      div.append(title, description, price, actions);
      container.appendChild(div);
    });
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('nuevaOferta').addEventListener('click', async () => {
  const titulo = prompt('Título de la oferta:');
  if (!titulo) return;

  const precio = prompt('Precio:');
  if (!precio) return;

  const descripcion = prompt('Descripción:') || '';
  const caracteristicasText =
    prompt('Características separadas por coma:') || '';

  const caracteristicas = caracteristicasText
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  try {
    await api('/ofertas', {
      method: 'POST',
      body: JSON.stringify({
        titulo,
        precio,
        descripcion,
        caracteristicas,
        moneda: 'CUP',
        orden: 0
      })
    });

    await cargarOfertas();
    await cargarDashboard();
  } catch (error) {
    alert(error.message);
  }
});

/* =========================================================
   CONTENIDO
========================================================= */
async function cargarContenido() {
  try {
    const data = await api('/contenido');
    const form = document.getElementById('formContenido');

    Object.entries(data).forEach(([key, value]) => {
      if (form.elements[key]) {
        form.elements[key].value = value;
      }
    });

    if (data.sobre_imagen) {
      const preview = document.getElementById('sobreImagenPreview');
      const wrap = document.getElementById('sobreImagenPreviewWrap');
      if (preview && wrap) {
        preview.src = data.sobre_imagen;
        wrap.style.display = 'block';
      }
    }
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('formContenido').addEventListener('submit', async event => {
  event.preventDefault();

  const status = document.getElementById('contenidoStatus');
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  delete data.sobreImagenInput;

  try {
    await api('/contenido', {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    status.textContent = 'Contenido guardado correctamente.';
  } catch (error) {
    status.textContent = error.message;
  }
});

/* =========================================================
   SUBIR IMAGEN "SOBRE"
========================================================= */
document.getElementById('subirSobreBtn').addEventListener('click', async () => {
  const input = document.getElementById('sobreImagenInput');
  const status = document.getElementById('sobreImagenStatus');
  const preview = document.getElementById('sobreImagenPreview');
  const wrap = document.getElementById('sobreImagenPreviewWrap');

  if (!input.files.length) {
    status.textContent = 'Selecciona un archivo primero.';
    return;
  }

  status.textContent = 'Subiendo imagen...';

  const formData = new FormData();
  formData.append('archivo', input.files[0]);

  try {
    const response = await fetch(`${API}/contenido/sobre-imagen`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'Error al subir la imagen');

    status.textContent = '✓ Imagen actualizada correctamente.';
    input.value = '';

    if (preview && wrap) {
      preview.src = result.archivo;
      wrap.style.display = 'block';
    }
  } catch (error) {
    status.textContent = error.message;
  }
});

/* =========================================================
   MENSAJES
========================================================= */
async function cargarMensajes() {
  try {
    const mensajes = await api('/mensajes');
    const container = document.getElementById('listaMensajes');

    container.innerHTML = '';

    if (!mensajes.length) {
      container.innerHTML = '<p class="status">No hay mensajes todavía.</p>';
      return;
    }

    mensajes.forEach(mensaje => {
      const div = document.createElement('article');
      div.className = `item-admin${mensaje.leido ? '' : ' no-leido'}`;

      const title = document.createElement('h4');
      title.textContent = `${mensaje.nombre} · ${mensaje.telefono}`;

      const service = document.createElement('p');
      service.textContent = `Servicio: ${mensaje.servicio || '—'}`;

      const message = document.createElement('p');
      message.textContent = mensaje.mensaje || 'Sin mensaje';

      const date = document.createElement('small');
      date.textContent = new Date(mensaje.creado_en).toLocaleString();

      const actions = document.createElement('div');
      actions.className = 'acciones';

      if (!mensaje.leido) {
        const readButton = document.createElement('button');
        readButton.className = 'btn';
        readButton.textContent = 'Marcar leído';

        readButton.addEventListener('click', async () => {
          await api(`/mensajes/${mensaje.id}/leido`, { method: 'PUT' });
          await cargarMensajes();
          await cargarDashboard();
        });

        actions.appendChild(readButton);
      }

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-danger';
      deleteButton.textContent = 'Eliminar';

      deleteButton.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este mensaje?')) return;

        await api(`/mensajes/${mensaje.id}`, { method: 'DELETE' });
        await cargarMensajes();
        await cargarDashboard();
      });

      actions.appendChild(deleteButton);
      div.append(title, service, message, date, actions);
      container.appendChild(div);
    });
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   FINANZAS (RESERVAS)
========================================================= */
let filtroFinanzas = 'todas';

async function cargarFinanzas() {
  try {
    // Cargar estadísticas
    const stats = await api('/reservas/stats');

    document.getElementById('statHoy').textContent =
      `${Number(stats.hoy.total).toLocaleString('es-ES')} CUP`;
    document.getElementById('statSemana').textContent =
      `${Number(stats.semana.total).toLocaleString('es-ES')} CUP`;
    document.getElementById('statMes').textContent =
      `${Number(stats.mes.total).toLocaleString('es-ES')} CUP`;
    document.getElementById('statTotal').textContent =
      `${Number(stats.total.total).toLocaleString('es-ES')} CUP`;

    document.getElementById('statHoyCant').textContent =
      `${stats.hoy.cantidad} reservas`;
    document.getElementById('statSemanaCant').textContent =
      `${stats.semana.cantidad} reservas`;
    document.getElementById('statMesCant').textContent =
      `${stats.mes.cantidad} reservas`;
    document.getElementById('statTotalCant').textContent =
      `${stats.total.cantidad} reservas`;

    // Cargar lista de reservas
    const reservas = await api('/reservas');
    renderReservas(reservas);
  } catch (error) {
    console.error('Error cargando finanzas:', error);
  }
}

function renderReservas(reservas) {
  const container = document.getElementById('listaReservas');
  container.innerHTML = '';

  // Aplicar filtro
  let filtradas = reservas;
  if (filtroFinanzas !== 'todas') {
    filtradas = reservas.filter(r => r.estado === filtroFinanzas);
  }

  if (!filtradas.length) {
    container.innerHTML = '<p class="status">No hay reservas en esta categoría.</p>';
    return;
  }

  filtradas.forEach(reserva => {
    const div = document.createElement('article');
    div.className = `item-admin reserva-${reserva.estado}`;

    const header = document.createElement('div');
    header.className = 'reserva-header';

    const title = document.createElement('h4');
    title.textContent = `#${reserva.id} · ${reserva.nombre}`;

    const badge = document.createElement('span');
    badge.className = `reserva-badge badge-${reserva.estado}`;
    badge.textContent = reserva.estado.toUpperCase();

    header.append(title, badge);

    const info = document.createElement('p');
    info.textContent = `📞 ${reserva.telefono}`;

    // ✅ FECHA Y HORA DE LA SESIÓN
    if (reserva.fecha_deseada) {
      const sesion = document.createElement('div');
      sesion.className = 'reserva-sesion';

      const fechaObj = new Date(reserva.fecha_deseada + 'T00:00:00');
      const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      sesion.innerHTML = `
        <span class="reserva-sesion-icon">📅</span>
        <span>${fechaFormateada}</span>
        ${reserva.hora_deseada ? `<span class="reserva-sesion-hora">· ${reserva.hora_deseada}</span>` : ''}
      `;

      div.append(header, info, sesion);
    } else {
      div.append(header, info);
    }

    const itemsList = document.createElement('ul');
    itemsList.className = 'reserva-items';

    (reserva.items || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.titulo} — ${item.precio} ${item.moneda || 'CUP'}`;
      itemsList.appendChild(li);
    });

    const totalEl = document.createElement('strong');
    totalEl.className = 'reserva-total';
    totalEl.textContent = `Total: ${Number(reserva.total).toLocaleString('es-ES')} ${reserva.moneda || 'CUP'}`;

    const date = document.createElement('small');
    date.className = 'reserva-fecha';
    date.textContent = `Reservado el ${new Date(reserva.creado_en).toLocaleString('es-ES')}`;

    const actions = document.createElement('div');
    actions.className = 'acciones';

    if (reserva.estado === 'pendiente') {
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn-confirmar';
      confirmBtn.textContent = '✅ Hecho';

      confirmBtn.addEventListener('click', async () => {
        if (!confirm('¿Confirmar esta reserva y sumarla a finanzas?')) return;
        try {
          await api(`/reservas/${reserva.id}/confirmar`, { method: 'PUT' });
          await cargarFinanzas();
        } catch (error) {
          alert(error.message);
        }
      });

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-rechazar';
      rejectBtn.textContent = '❌ Rechazar';

      rejectBtn.addEventListener('click', async () => {
        if (!confirm('¿Rechazar esta reserva?')) return;
        try {
          await api(`/reservas/${reserva.id}/rechazar`, { method: 'PUT' });
          await cargarFinanzas();
        } catch (error) {
          alert(error.message);
        }
      });

      actions.append(confirmBtn, rejectBtn);
    } else {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.textContent = 'Eliminar del historial';

      deleteBtn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta reserva del historial?')) return;
        try {
          await api(`/reservas/${reserva.id}`, { method: 'DELETE' });
          await cargarFinanzas();
        } catch (error) {
          alert(error.message);
        }
      });

      actions.appendChild(deleteBtn);
    }

    div.append(itemsList, totalEl, date, actions);
    container.appendChild(div);
  });
}

// Botones de filtro
document.querySelectorAll('.filtro-finanzas').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-finanzas').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroFinanzas = btn.dataset.filtro;
    cargarFinanzas();
  });
});

/* =========================================================
   INICIALIZACIÓN
========================================================= */
if (token) {
  mostrarPanel();
}