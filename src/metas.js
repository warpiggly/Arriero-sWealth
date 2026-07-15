// =================================================================
// metas.js — El corazón de la app: "¿Cuándo puedo comprarlo?"
//
// Idea sencilla: el usuario dice qué quiere comprar (nombre + precio) y, con
// dos datos de su economía (cuánto ahorra al mes y cuánto tiene guardado), la
// app le responde SIN que él haga cuentas:
//   • ¿Cuánto le falta?
//   • ¿Cuándo lo logra a su ritmo actual?           (modo "¿cuándo llego?")
//   • Si le pone fecha: ¿cuánto ahorrar por día?      (modo "¿cuánto ahorro?")
//
// La lista funciona como un carrito: los precios se van sumando y se muestra
// el total a recoger, cuánto lleva y cuándo llega a todo.
//
// Reutiliza helpers de logic_quotation.js (cargado antes): formatearDinero,
// valorNumerico, soloDigitos, pintarJornal, vistaActiva, enterParaAgregar.
// =================================================================

// Economía del usuario (los dos únicos datos que pedimos)
let economia = { ahorroMensual: 0, ahorrosActuales: 0 };

// Lista de productos: { id, nombre, precio, fecha }  (fecha ISO 'YYYY-MM-DD' o null)
let metasLista = [];

document.addEventListener('DOMContentLoaded', function () {
  cargarEconomia();
  cargarMetas();

  // Al escribir la economía: guardar y recalcular al vuelo
  ['ahorroMensual', 'ahorrosActuales'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { guardarEconomia(); recalcularMetas(); });
  });

  const btnAgregar = document.getElementById('agregar-meta');
  if (btnAgregar) btnAgregar.addEventListener('click', agregarMeta);

  // Enter en cualquier campo del formulario = "Agregar" (helper global)
  if (typeof enterParaAgregar === 'function') {
    enterParaAgregar(['meta-nombre', 'meta-precio', 'meta-fecha'], agregarMeta);
  }

  // ¿Venimos de un clic derecho sobre un precio en una página?
  revisarPrecioCapturado();
});

// ----------------------------------------------------------------
// Persistencia (chrome.storage.sync, igual que el resto de la app)
// ----------------------------------------------------------------
function cargarEconomia() {
  chrome.storage.sync.get(['economia'], function (data) {
    economia = Object.assign({ ahorroMensual: 0, ahorrosActuales: 0 }, data.economia || {});
    const inM = document.getElementById('ahorroMensual');
    const inS = document.getElementById('ahorrosActuales');
    if (inM) inM.value = economia.ahorroMensual ? Math.round(economia.ahorroMensual).toLocaleString('es-CO') : '';
    if (inS) inS.value = economia.ahorrosActuales ? Math.round(economia.ahorrosActuales).toLocaleString('es-CO') : '';
    recalcularMetas();
  });
}

function guardarEconomia() {
  economia.ahorroMensual = valorNumerico('ahorroMensual');
  economia.ahorrosActuales = valorNumerico('ahorrosActuales');
  chrome.storage.sync.set({ economia: economia });
}

function cargarMetas() {
  chrome.storage.sync.get(['metasLista'], function (data) {
    metasLista = data.metasLista || [];
    recalcularMetas();
  });
}

function persistirMetas() {
  chrome.storage.sync.set({ metasLista: metasLista });
}

// ----------------------------------------------------------------
// Agregar / quitar productos
// ----------------------------------------------------------------
function agregarMeta() {
  const nombre = document.getElementById('meta-nombre').value.trim();
  const precio = valorNumerico('meta-precio');
  const fecha = document.getElementById('meta-fecha').value || null;

  if (precio <= 0) { alert('Ponle el precio, mijo (solo el número).'); return; }
  if (nombre === '') { alert('¿Qué es lo que quieres comprar?'); return; }

  metasLista.push({ id: 'meta_' + Date.now(), nombre, precio, fecha });
  persistirMetas();

  // Limpiar el formulario para el siguiente
  document.getElementById('meta-nombre').value = '';
  document.getElementById('meta-precio').value = '';
  document.getElementById('meta-fecha').value = '';

  recalcularMetas();
}

function eliminarMeta(id) {
  metasLista = metasLista.filter(m => m.id !== id);
  persistirMetas();
  recalcularMetas();
}

// Cambiar la fecha objetivo de un producto (desde su tarjeta)
function cambiarFechaMeta(id, fecha) {
  const m = metasLista.find(x => x.id === id);
  if (!m) return;
  m.fecha = fecha || null;
  persistirMetas();
  recalcularMetas();
}

// Si el usuario llegó por el menú contextual, precargamos el precio capturado.
function revisarPrecioCapturado() {
  if (!chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get(['precioCapturado'], function (data) {
    const cap = data.precioCapturado;
    if (!cap || !cap.precio) return;

    const campo = document.getElementById('meta-precio');
    if (campo) campo.value = Math.round(cap.precio).toLocaleString('es-CO');
    const nombreEl = document.getElementById('meta-nombre');
    if (nombreEl) nombreEl.focus();

    // Un solo uso: lo borramos para que no reaparezca la próxima vez.
    chrome.storage.local.remove('precioCapturado');
  });
}

// ----------------------------------------------------------------
// Cálculos de tiempo (sin que el usuario saque cuentas a mano)
// ----------------------------------------------------------------
// Días que faltan para llegar a "falta" dinero, ahorrando M al mes.
function diasNecesarios(falta) {
  const M = economia.ahorroMensual;
  if (M <= 0) return Infinity;              // no sabemos su ritmo todavía
  if (falta <= 0) return 0;                 // ya lo tiene
  const ahorroDiario = M / 30;
  return falta / ahorroDiario;
}

// Convierte una cantidad de días en un texto humano ("~3 meses", "~1 año y 2 meses").
function describirDias(dias) {
  if (!isFinite(dias)) return 'define tu ahorro mensual';
  const d = Math.ceil(dias);
  if (d <= 0) return 'ya mismo';
  if (d < 30) return `~${d} día${d === 1 ? '' : 's'}`;
  if (d < 365) {
    const meses = Math.max(1, Math.round(d / 30));
    return `~${meses} mes${meses === 1 ? '' : 'es'}`;
  }
  const anios = Math.floor(d / 365);
  const meses = Math.round((d % 365) / 30);
  let txt = `~${anios} año${anios === 1 ? '' : 's'}`;
  if (meses > 0) txt += ` y ${meses} mes${meses === 1 ? '' : 'es'}`;
  return txt;
}

// Fecha aproximada (hoy + X días), en texto corto: "12 de oct de 2026".
function fechaEstimadaTexto(dias) {
  if (!isFinite(dias)) return '';
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  f.setDate(f.getDate() + Math.ceil(dias));
  return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Días desde hoy hasta una fecha ISO 'YYYY-MM-DD' (puede ser negativo si ya pasó).
function diasHastaFecha(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaISO + 'T00:00:00');
  return Math.round((f - hoy) / 86400000);
}

// Fecha ISO en texto corto para mostrarla bonita.
function fechaISOaTexto(fechaISO) {
  const f = new Date(fechaISO + 'T00:00:00');
  return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ----------------------------------------------------------------
// Pintar todo
// ----------------------------------------------------------------
// La cabecera (caja dorada) muestra "Te falta ahorrar" cuando Metas está activa.
function metasPintarJornal() {
  const total = metasLista.reduce((s, m) => s + m.precio, 0);
  const falta = Math.max(0, total - economia.ahorrosActuales);
  if (typeof pintarJornal === 'function') {
    pintarJornal('Te falta ahorrar:', formatearDinero(falta));
  }
}

// Punto de entrada que se llama tras cualquier cambio (o al cambiar de moneda).
function metasRefrescar() {
  recalcularMetas();
}

function recalcularMetas() {
  renderResumen();
  renderListaMetas();
  // Si Metas es la vista activa, refrescar también el número grande de arriba.
  if (typeof vistaActiva === 'function' && vistaActiva() === 'metas') {
    metasPintarJornal();
  }
}

// Resumen del total: barra de progreso + cuánto falta + cuándo llegas a todo.
function renderResumen() {
  const cont = document.getElementById('meta-resumen');
  if (!cont) return;

  if (metasLista.length === 0) {
    cont.style.display = 'none';
    cont.innerHTML = '';
    return;
  }
  cont.style.display = 'block';

  const total = metasLista.reduce((s, m) => s + m.precio, 0);
  const S = economia.ahorrosActuales;
  const M = economia.ahorroMensual;
  const falta = Math.max(0, total - S);
  const progreso = total > 0 ? Math.min(100, (S / total) * 100) : 0;

  // Suma de lo que habría que ahorrar por día para cumplir TODAS las fechas
  // puestas (mediciones dinámicas cuando hay fechas distintas).
  let ahorroDiarioFechas = 0;
  let hayFechas = false;
  metasLista.forEach(m => {
    if (m.fecha) {
      const d = diasHastaFecha(m.fecha);
      if (d > 0) { ahorroDiarioFechas += m.precio / d; hayFechas = true; }
    }
  });

  let html = '';
  html += `<div class="meta-progreso"><div class="meta-progreso-relleno" style="width:${progreso.toFixed(0)}%"></div></div>`;
  html += `<div class="meta-resumen-fila"><span>Total a recoger</span><strong>${formatearDinero(total)}</strong></div>`;
  html += `<div class="meta-resumen-fila"><span>Ya tienes</span><strong>${formatearDinero(S)} · ${progreso.toFixed(0)}%</strong></div>`;
  html += `<div class="meta-resumen-fila destacado"><span>Te falta</span><strong>${formatearDinero(falta)}</strong></div>`;

  if (falta <= 0) {
    html += `<p class="meta-frase">¡Ya tienes con qué, mijo! A comprar. 🎉</p>`;
  } else if (M > 0) {
    const dias = diasNecesarios(falta);
    html += `<p class="meta-frase">A tu ritmo (${formatearDinero(M)}/mes) lo tienes todo en <strong>${describirDias(dias)}</strong> (≈ ${fechaEstimadaTexto(dias)}).</p>`;
  } else {
    html += `<p class="meta-frase">Dime arriba cuánto puedes ahorrar al mes y te digo cuándo llegas.</p>`;
  }

  if (hayFechas) {
    html += `<p class="meta-frase sub">Para cumplir todas las fechas que pusiste: ahorra <strong>${formatearDinero(ahorroDiarioFechas)}/día</strong>.</p>`;
  }

  cont.innerHTML = html;
}

// La lista tipo carrito. Cada tarjeta muestra ambos modos:
//   🐢 cuándo llegas (a tu ritmo, en orden de la lista, contando lo que ya tienes)
//   📅 cuánto ahorrar por día si le pusiste fecha
function renderListaMetas() {
  const cont = document.getElementById('metas-container');
  const vacio = document.getElementById('sin-metas');
  if (!cont) return;
  cont.innerHTML = '';

  if (vacio) vacio.style.display = metasLista.length ? 'none' : 'block';

  // Para el "¿cuándo llego?" usamos el acumulado: primero ahorras para lo de
  // arriba, luego lo de abajo. Así, para un solo producto responde justo
  // "cuándo puedo comprarlo con mi economía actual".
  let acumulado = 0;
  const S = economia.ahorrosActuales;

  metasLista.forEach(m => {
    acumulado += m.precio;
    const faltaAcum = Math.max(0, acumulado - S);
    const diasItem = diasNecesarios(faltaAcum);

    const div = document.createElement('div');
    div.className = 'meta-item';

    // Fila superior: nombre + precio + borrar
    const cab = document.createElement('div');
    cab.className = 'meta-item-cab';
    const nom = document.createElement('span');
    nom.className = 'meta-item-nombre';
    nom.textContent = m.nombre;                 // textContent = a prueba de HTML
    const pre = document.createElement('span');
    pre.className = 'meta-item-precio';
    pre.textContent = formatearDinero(m.precio);
    const btnX = document.createElement('button');
    btnX.className = 'btn-eliminar';
    btnX.textContent = 'X';
    btnX.title = 'Quitar de la lista';
    btnX.addEventListener('click', () => eliminarMeta(m.id));
    cab.appendChild(nom);
    cab.appendChild(pre);
    cab.appendChild(btnX);
    div.appendChild(cab);

    // Modo "¿cuándo llego?"
    const lineaRitmo = document.createElement('div');
    lineaRitmo.className = 'meta-item-linea';
    if (faltaAcum <= 0) {
      lineaRitmo.innerHTML = `🎉 <span>Ya puedes comprarlo</span>`;
    } else if (economia.ahorroMensual > 0) {
      lineaRitmo.innerHTML = `🐢 <span>A tu ritmo lo logras <strong>${describirDias(diasItem)}</strong> (≈ ${fechaEstimadaTexto(diasItem)})</span>`;
    } else {
      lineaRitmo.innerHTML = `🐢 <span>Dime tu ahorro mensual para calcular cuándo llegas</span>`;
    }
    div.appendChild(lineaRitmo);

    // Modo "¿cuánto ahorro?" (si tiene fecha objetivo)
    const lineaFecha = document.createElement('div');
    lineaFecha.className = 'meta-item-linea';
    if (m.fecha) {
      const dias = diasHastaFecha(m.fecha);
      if (dias <= 0) {
        lineaFecha.innerHTML = `📅 <span>La fecha (${fechaISOaTexto(m.fecha)}) ya pasó</span>`;
      } else {
        const porDia = m.precio / dias;
        lineaFecha.innerHTML = `📅 <span>Para el ${fechaISOaTexto(m.fecha)}: ahorra <strong>${formatearDinero(porDia)}/día</strong></span>`;
      }
    } else {
      lineaFecha.innerHTML = `📅 <span>¿Lo quieres para una fecha?</span>`;
    }
    // Selector de fecha (siempre editable) al final de la línea
    const inFecha = document.createElement('input');
    inFecha.type = 'date';
    inFecha.className = 'meta-item-fecha';
    inFecha.value = m.fecha || '';
    inFecha.addEventListener('change', () => cambiarFechaMeta(m.id, inFecha.value));
    lineaFecha.appendChild(inFecha);
    div.appendChild(lineaFecha);

    cont.appendChild(div);
  });
}
