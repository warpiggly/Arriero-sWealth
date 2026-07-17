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

  // Botón maestro de la MULA: abre/cierra toda la cuenta (igual que "Cotizar").
  const btnMetas = document.getElementById('toggleMetas');
  const panelMetas = document.getElementById('panel-metas');
  if (btnMetas && panelMetas) {
    btnMetas.addEventListener('click', () => {
      const cerrado = panelMetas.classList.toggle('cerrado');
      const wrap = btnMetas.closest('.master-toggle-wrap');
      if (wrap) wrap.classList.toggle('metas-cerrado', cerrado);
      btnMetas.title = cerrado
        ? 'Toque la mula para ver su cuenta'
        : 'Toque la mula para ocultar su cuenta';
    });
  }

  // Enter en cualquier campo del formulario = "Agregar" (helper global)
  if (typeof enterParaAgregar === 'function') {
    enterParaAgregar(['meta-nombre', 'meta-precio', 'meta-fecha'], agregarMeta);
  }

  // Los dos datos de economía en la HOJA de cálculo (espejo de los de arriba)
  ['ahorroMensualHoja', 'ahorrosActualesHoja'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => { guardarEconomiaHoja(); recalcularMetas(); });
    el.addEventListener('focus', () => { el.value = soloDigitos(el.value); });
    el.addEventListener('blur', () => { if (typeof formatearInputMoneda === 'function') formatearInputMoneda(el); });
  });

  // Interruptor horizontal: vista sencilla <-> hoja de cálculo
  const sw = document.getElementById('switchVista');
  if (sw) sw.addEventListener('click', () => setVistaHoja(sw.getAttribute('aria-checked') !== 'true'));

  // Recordar en cuál vista estaba
  chrome.storage.sync.get(['metasVistaHoja'], function (data) {
    setVistaHoja(!!data.metasVistaHoja);
  });

  // ¿Venimos de un clic derecho sobre un precio en una página?
  revisarPrecioCapturado();
});

// Cambia entre la vista sencilla (por pasos) y la hoja de cálculo tipo Excel.
function setVistaHoja(on) {
  const sw = document.getElementById('switchVista');
  const sencilla = document.getElementById('metas-sencilla');
  const hoja = document.getElementById('metas-hoja');
  const lblS = document.getElementById('vs-lbl-sencilla');
  const lblH = document.getElementById('vs-lbl-hoja');
  if (sw) { sw.setAttribute('aria-checked', on ? 'true' : 'false'); sw.classList.toggle('on', on); }
  if (sencilla) sencilla.classList.toggle('oculto', on);
  if (hoja) hoja.classList.toggle('oculto', !on);
  if (lblS) lblS.classList.toggle('activa', !on);
  if (lblH) lblH.classList.toggle('activa', on);
  if (chrome.storage && chrome.storage.sync) chrome.storage.sync.set({ metasVistaHoja: on });
  if (on) renderHoja();
  actualizarAnchoApp();
}

// Ensancha la app (clase .modo-hoja en <body>) SOLO cuando el interruptor está
// en "Hoja de cálculo" y además la vista de Metas es la que está al frente.
// Al salir de Metas (o volver a "Sencilla") regresa al ancho normal.
function actualizarAnchoApp() {
  const sw = document.getElementById('switchVista');
  const enHoja = !!(sw && sw.getAttribute('aria-checked') === 'true');
  const enMetas = (typeof vistaActiva === 'function') ? vistaActiva() === 'metas' : true;
  document.body.classList.toggle('modo-hoja', enHoja && enMetas);
}

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

// Igual, pero leyendo los campos de la HOJA de cálculo.
function guardarEconomiaHoja() {
  economia.ahorroMensual = valorNumerico('ahorroMensualHoja');
  economia.ahorrosActuales = valorNumerico('ahorrosActualesHoja');
  chrome.storage.sync.set({ economia: economia });
}

// Escribe los valores de economía en AMBAS vistas (sencilla y hoja), sin tocar
// el campo que el usuario está escribiendo en ese momento.
function sincronizarEconomiaEnInputs() {
  const pares = [
    ['ahorroMensual', economia.ahorroMensual],
    ['ahorrosActuales', economia.ahorrosActuales],
    ['ahorroMensualHoja', economia.ahorroMensual],
    ['ahorrosActualesHoja', economia.ahorrosActuales]
  ];
  pares.forEach(function (par) {
    const el = document.getElementById(par[0]);
    if (!el || el === document.activeElement) return;
    el.value = par[1] ? Math.round(par[1]).toLocaleString('es-CO') : '';
  });
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
  renderHoja();
  sincronizarEconomiaEnInputs();
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
  html += `<div class="meta-resumen-tit">La cuenta de todo junto</div>`;
  html += `<div class="meta-progreso"><div class="meta-progreso-relleno" style="width:${progreso.toFixed(0)}%"></div></div>`;
  html += `<div class="meta-resumen-fila"><span>Todo lo que quiere</span><strong>${formatearDinero(total)}</strong></div>`;
  html += `<div class="meta-resumen-fila"><span>Ya tiene guardado</span><strong>${formatearDinero(S)} · ${progreso.toFixed(0)}%</strong></div>`;
  html += `<div class="meta-resumen-fila destacado"><span>Le falta</span><strong>${formatearDinero(falta)}</strong></div>`;

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
  if (metasLista.length === 0) return;

  // Tabla tipo Excel: cada renglón es un producto (celdas con líneas de
  // cuadrícula). Debajo de cada producto va una franja para la fecha.
  const tabla = document.createElement('table');
  tabla.className = 'excel-tabla';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['Lo que quiero', 'Precio', '¿Cuándo lo tengo?', ''].forEach((txt, i) => {
    const th = document.createElement('th');
    th.textContent = txt;
    if (i === 1) th.className = 'col-precio';
    if (i === 2) th.className = 'col-cuando';
    if (i === 3) th.className = 'col-x';
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  tabla.appendChild(thead);

  // Para el "¿cuándo llego?" usamos el acumulado: primero ahorra para lo de
  // arriba, luego lo de abajo. Así, para un solo producto responde justo
  // "cuándo puedo comprarlo con mi economía actual".
  let acumulado = 0;
  const S = economia.ahorrosActuales;

  metasLista.forEach(m => {
    acumulado += m.precio;
    const faltaAcum = Math.max(0, acumulado - S);
    const diasItem = diasNecesarios(faltaAcum);

    // Cada producto = un <tbody> (así la cuadrícula "raya" por producto y sus
    // dos renglones quedan siempre juntos).
    const grupo = document.createElement('tbody');
    grupo.className = 'grupo';

    // --- Renglón principal: nombre | precio | cuándo | quitar ---
    const tr = document.createElement('tr');
    tr.className = 'fila-meta';

    const tdNom = document.createElement('td');
    tdNom.className = 'celda-nombre';
    tdNom.textContent = m.nombre;              // textContent = a prueba de HTML
    tr.appendChild(tdNom);

    const tdPre = document.createElement('td');
    tdPre.className = 'col-precio';
    tdPre.textContent = formatearDinero(m.precio);
    tr.appendChild(tdPre);

    const tdCuando = document.createElement('td');
    tdCuando.className = 'col-cuando celda-cuando';
    if (faltaAcum <= 0) {
      tdCuando.innerHTML = `<span class="ok">✔ Ya puede comprarlo</span>`;
    } else if (economia.ahorroMensual > 0) {
      tdCuando.innerHTML =
        `<strong>${describirDias(diasItem)}</strong>` +
        `<span class="sub">por ${fechaEstimadaTexto(diasItem)}</span>`;
    } else {
      tdCuando.innerHTML = `<span class="aviso">Falta poner cuánto guarda al mes</span>`;
    }
    tr.appendChild(tdCuando);

    const tdX = document.createElement('td');
    tdX.className = 'col-x';
    const btnX = document.createElement('button');
    btnX.className = 'btn-eliminar';
    btnX.textContent = '✕';
    btnX.title = 'Quitar de la lista';
    btnX.addEventListener('click', () => eliminarMeta(m.id));
    tdX.appendChild(btnX);
    tr.appendChild(tdX);

    grupo.appendChild(tr);

    // --- Renglón de fecha (franja completa debajo) ---
    const trF = document.createElement('tr');
    trF.className = 'fila-fecha';
    const tdF = document.createElement('td');
    tdF.colSpan = 4;

    const linea = document.createElement('div');
    linea.className = 'linea';

    const info = document.createElement('span');
    info.className = 'fecha-info';
    if (m.fecha) {
      const dias = diasHastaFecha(m.fecha);
      if (dias <= 0) {
        info.innerHTML = `📅 <span class="aviso">Esa fecha (${fechaISOaTexto(m.fecha)}) ya pasó</span>`;
      } else {
        const porDia = m.precio / dias;
        info.innerHTML = `📅 Para el ${fechaISOaTexto(m.fecha)}: guarde <strong>${formatearDinero(porDia)}</strong> al día`;
      }
    } else {
      info.innerHTML = `📅 ¿Lo quiere para una fecha? Póngala aquí →`;
    }

    const inFecha = document.createElement('input');
    inFecha.type = 'date';
    inFecha.className = 'meta-item-fecha';
    inFecha.value = m.fecha || '';
    inFecha.addEventListener('change', () => cambiarFechaMeta(m.id, inFecha.value));

    linea.appendChild(info);
    linea.appendChild(inFecha);
    tdF.appendChild(linea);
    trF.appendChild(tdF);
    grupo.appendChild(trF);

    tabla.appendChild(grupo);
  });

  cont.appendChild(tabla);
}

// ----------------------------------------------------------------
// VISTA HOJA DE CÁLCULO (tipo Excel)
// La misma información, pero como una hoja: filas numeradas, columnas
// A-B-C-D-E y celdas que se escriben directo. Las columnas de "Me falta" y
// "¿Cuándo?" las lleno yo. Comparte metasLista y economia con la vista sencilla,
// así los números siempre concuerdan (usa la misma cuenta acumulada).
// ----------------------------------------------------------------
function renderHoja() {
  const cuerpo = document.getElementById('hoja-cuerpo');
  const pie = document.getElementById('hoja-pie');
  if (!cuerpo) return;               // la hoja no existe en el DOM
  cuerpo.innerHTML = '';
  if (pie) pie.innerHTML = '';

  const S = economia.ahorrosActuales;
  const M = economia.ahorroMensual;
  let acumulado = 0;
  let totalPrecio = 0;

  metasLista.forEach(function (m, i) {
    acumulado += m.precio;
    totalPrecio += m.precio;
    const faltaAcum = Math.max(0, acumulado - S);
    const diasItem = diasNecesarios(faltaAcum);

    const tr = document.createElement('tr');
    tr.className = 'hoja-fila';

    // № (número de fila, estilo Excel)
    const tdN = document.createElement('td');
    tdN.className = 'hoja-num';
    tdN.textContent = i + 1;
    tr.appendChild(tdN);

    // A · Lo que quiero (se escribe)
    const tdNom = document.createElement('td');
    tdNom.className = 'celda';
    const inNom = document.createElement('input');
    inNom.type = 'text';
    inNom.className = 'celda-input celda-texto';
    inNom.value = m.nombre;
    inNom.addEventListener('change', function () {
      const v = inNom.value.trim();
      if (v) { m.nombre = v; persistirMetas(); recalcularMetas(); }
      else { inNom.value = m.nombre; }
    });
    tdNom.appendChild(inNom);
    tr.appendChild(tdNom);

    // B · Precio (se escribe)
    const tdPre = document.createElement('td');
    tdPre.className = 'celda';
    const inPre = document.createElement('input');
    inPre.type = 'text';
    inPre.inputMode = 'numeric';
    inPre.className = 'celda-input celda-num';
    inPre.value = Math.round(m.precio).toLocaleString('es-CO');
    inPre.addEventListener('focus', function () { inPre.value = soloDigitos(inPre.value); });
    inPre.addEventListener('blur', function () {
      const val = parseInt(soloDigitos(inPre.value), 10) || 0;
      if (val > 0) { m.precio = val; persistirMetas(); recalcularMetas(); }
      else { inPre.value = Math.round(m.precio).toLocaleString('es-CO'); }
    });
    tdPre.appendChild(inPre);
    tr.appendChild(tdPre);

    // C · Me falta (la lleno yo)
    const tdFalta = document.createElement('td');
    tdFalta.className = 'hoja-calc';
    tdFalta.textContent = formatearDinero(faltaAcum);
    tr.appendChild(tdFalta);

    // D · ¿Cuándo lo tengo? (la lleno yo)
    const tdCu = document.createElement('td');
    tdCu.className = 'hoja-calc celda-cuando';
    if (faltaAcum <= 0) {
      tdCu.innerHTML = '<span class="ok">✔ Ya puede</span>';
    } else if (M > 0) {
      tdCu.innerHTML = '<strong>' + describirDias(diasItem) + '</strong>' +
        '<span class="sub">' + fechaEstimadaTexto(diasItem) + '</span>';
    } else {
      tdCu.innerHTML = '<span class="aviso">Falta el ahorro</span>';
    }
    tr.appendChild(tdCu);

    // E · Si es para una fecha (fecha + cuánto guardar al día)
    const tdF = document.createElement('td');
    tdF.className = 'celda hoja-fechacel';
    const inF = document.createElement('input');
    inF.type = 'date';
    inF.className = 'celda-input celda-fecha';
    inF.value = m.fecha || '';
    inF.addEventListener('change', function () { cambiarFechaMeta(m.id, inF.value); });
    tdF.appendChild(inF);
    const info = document.createElement('div');
    info.className = 'hoja-fecha-info';
    if (m.fecha) {
      const d = diasHastaFecha(m.fecha);
      if (d <= 0) info.innerHTML = '<span class="aviso">ya pasó</span>';
      else info.innerHTML = 'guarde <strong>' + formatearDinero(m.precio / d) + '</strong>/día';
    }
    tdF.appendChild(info);
    tr.appendChild(tdF);

    // Quitar
    const tdX = document.createElement('td');
    tdX.className = 'hoja-x';
    const bX = document.createElement('button');
    bX.className = 'btn-eliminar';
    bX.textContent = '✕';
    bX.title = 'Quitar de la hoja';
    bX.addEventListener('click', function () { eliminarMeta(m.id); });
    tdX.appendChild(bX);
    tr.appendChild(tdX);

    cuerpo.appendChild(tr);
  });

  // --- Fila en blanco para APUNTAR uno nuevo (como escribir en Excel) ---
  const trNueva = document.createElement('tr');
  trNueva.className = 'hoja-fila hoja-nueva';

  const tdNn = document.createElement('td');
  tdNn.className = 'hoja-num';
  tdNn.textContent = metasLista.length + 1;
  trNueva.appendChild(tdNn);

  const tdNn2 = document.createElement('td');
  tdNn2.className = 'celda';
  const inNn = document.createElement('input');
  inNn.type = 'text';
  inNn.id = 'hoja-nombre-nuevo';
  inNn.className = 'celda-input celda-texto';
  inNn.placeholder = 'Escriba aquí…';
  tdNn2.appendChild(inNn);
  trNueva.appendChild(tdNn2);

  const tdNp = document.createElement('td');
  tdNp.className = 'celda';
  const inNp = document.createElement('input');
  inNp.type = 'text';
  inNp.inputMode = 'numeric';
  inNp.id = 'hoja-precio-nuevo';
  inNp.className = 'celda-input celda-num';
  inNp.placeholder = '0';
  inNp.addEventListener('focus', function () { inNp.value = soloDigitos(inNp.value); });
  inNp.addEventListener('blur', function () { if (typeof formatearInputMoneda === 'function') formatearInputMoneda(inNp); });
  tdNp.appendChild(inNp);
  trNueva.appendChild(tdNp);

  const tdEmpty1 = document.createElement('td'); tdEmpty1.className = 'hoja-calc'; tdEmpty1.textContent = '—'; trNueva.appendChild(tdEmpty1);
  const tdEmpty2 = document.createElement('td'); tdEmpty2.className = 'hoja-calc'; tdEmpty2.textContent = '—'; trNueva.appendChild(tdEmpty2);

  const tdNf = document.createElement('td');
  tdNf.className = 'celda hoja-fechacel';
  const inNf = document.createElement('input');
  inNf.type = 'date';
  inNf.id = 'hoja-fecha-nuevo';
  inNf.className = 'celda-input celda-fecha';
  tdNf.appendChild(inNf);
  trNueva.appendChild(tdNf);

  const tdAdd = document.createElement('td');
  tdAdd.className = 'hoja-x';
  const bAdd = document.createElement('button');
  bAdd.className = 'hoja-btn-add';
  bAdd.textContent = '＋';
  bAdd.title = 'Apuntar en la hoja';
  bAdd.addEventListener('click', agregarMetaHoja);
  tdAdd.appendChild(bAdd);
  trNueva.appendChild(tdAdd);

  cuerpo.appendChild(trNueva);

  // Enter en cualquiera de los campos nuevos = apuntar
  [inNn, inNp, inNf].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); agregarMetaHoja(); }
    });
  });

  // --- Fila de TOTAL en el pie ---
  if (pie && metasLista.length) {
    const totalFalta = Math.max(0, totalPrecio - S);
    const trT = document.createElement('tr');
    trT.className = 'hoja-total';
    trT.innerHTML =
      '<td class="hoja-num">Σ</td>' +
      '<td class="celda">TOTAL</td>' +
      '<td class="hoja-calc">' + formatearDinero(totalPrecio) + '</td>' +
      '<td class="hoja-calc">' + formatearDinero(totalFalta) + '</td>' +
      '<td class="hoja-calc"></td>' +
      '<td class="celda"></td>' +
      '<td class="hoja-x"></td>';
    pie.appendChild(trT);
  }
}

// Apuntar un producto nuevo desde la fila en blanco de la hoja.
function agregarMetaHoja() {
  const inN = document.getElementById('hoja-nombre-nuevo');
  const inP = document.getElementById('hoja-precio-nuevo');
  const inF = document.getElementById('hoja-fecha-nuevo');
  const nombre = inN ? inN.value.trim() : '';
  const precio = inP ? (parseInt(soloDigitos(inP.value), 10) || 0) : 0;
  const fecha = (inF && inF.value) ? inF.value : null;

  if (precio <= 0) { alert('Ponga el precio, mijo (solo el número).'); return; }
  if (nombre === '') { alert('¿Qué es lo que quiere comprar?'); return; }

  metasLista.push({ id: 'meta_' + Date.now(), nombre: nombre, precio: precio, fecha: fecha });
  persistirMetas();
  recalcularMetas();

  // Dejar el cursor listo para seguir apuntando el siguiente.
  const nuevoN = document.getElementById('hoja-nombre-nuevo');
  if (nuevoN) nuevoN.focus();
}
