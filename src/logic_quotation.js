// =================================================================
// logic_quotation.js — Lógica central de cotización
// "¿Cuánto cobrar?" = tarifa por hora + costos + margen de ganancia
//
//   Precio de venta = Costo Total x (1 + Margen)
//   Costo Total     = Mano de obra + Materiales + Herramientas + Transporte + Otros
//   Mano de obra    = Horas del trabajo x Tarifa por hora
//   Tarifa por hora = Ingreso deseado al mes / Horas facturables al mes
// =================================================================

let materialesCotizacion = [];
let herramientasCotizacion = [];
let presupuestosGuardados = [];
let presupuestoEditandoId = null; // id del presupuesto que se está editando (o null = nuevo)

document.addEventListener('DOMContentLoaded', function() {
  cargarCotizacion();
  cargarPresupuestos();

  // Moneda: llenar el menú, cargar la guardada y reaccionar al cambio
  poblarSelectorMoneda();
  cargarMoneda();
  const selMoneda = document.getElementById('selector-moneda');
  if (selMoneda) selMoneda.addEventListener('change', () => cambiarMoneda(selMoneda.value));

  // Recalcular automáticamente al escribir en cualquier campo numérico
  ['ingresoDeseado', 'horasFacturables', 'horasTrabajo', 'costoTransporte',
   'otrosGastos', 'margenGanancia', 'descuentoPorcentaje'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcularCotizacion);
  });

  const btnMaterial = document.getElementById('agregar-material');
  if (btnMaterial) btnMaterial.addEventListener('click', agregarMaterialCotizacion);

  const btnHerramienta = document.getElementById('agregar-herramienta');
  if (btnHerramienta) btnHerramienta.addEventListener('click', agregarHerramientaCotizacion);

  const btnGuardarPres = document.getElementById('guardarPresupuesto');
  if (btnGuardarPres) btnGuardarPres.addEventListener('click', guardarPresupuesto);

  const btnNuevo = document.getElementById('nuevoPresupuesto');
  if (btnNuevo) btnNuevo.addEventListener('click', nuevoPresupuesto);

  // Estrellas: cambiar de vista
  document.querySelectorAll('.estrella').forEach(b => {
    b.addEventListener('click', () => cambiarVista(b.dataset.view, b));
  });

  // Secciones expandibles: clic en el título alterna abierto/cerrado
  document.querySelectorAll('.colapsable h4').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('cerrada'));
  });

  // Botón maestro: abre/cierra todo el cálculo
  const btnMaestro = document.getElementById('toggleCalculo');
  const panel = document.getElementById('panel-calculo');
  if (btnMaestro && panel) {
    btnMaestro.addEventListener('click', () => {
      const cerrado = panel.classList.toggle('cerrado');
      btnMaestro.textContent = cerrado ? '+' : '−'; // + / −
    });
  }

  // ----- Captura rápida -----

  // Campos de dinero: mostrar separadores de miles (3.000.000) para leerlos
  // como en una factura. Al enfocar se muestran solo los dígitos (editar fácil);
  // al salir se vuelven a formatear. valorNumerico() ya quita los puntos al calcular.
  document.querySelectorAll('.input-money').forEach(el => {
    el.addEventListener('focus', () => { el.value = soloDigitos(el.value); });
    el.addEventListener('blur', () => { formatearInputMoneda(el); });
    formatearInputMoneda(el); // formatear el valor inicial (si viene precargado)
  });

  // Enter dentro de un mini-formulario = "Agregar" (sin tocar el mouse)
  enterParaAgregar(['material-nombre', 'material-costo', 'material-cantidad'],
                   agregarMaterialCotizacion);
  enterParaAgregar(['herramienta-nombre', 'herramienta-costo', 'herramienta-anios'],
                   agregarHerramientaCotizacion);

  // Chips de margen: fijar 20/30/40/50% de un toque
  document.querySelectorAll('.chip-margen').forEach(chip => {
    chip.addEventListener('click', () => {
      const campo = document.getElementById('margenGanancia');
      if (campo) campo.value = chip.dataset.margen;
      recalcularCotizacion();
      marcarChipMargen();
    });
  });
  const campoMargen = document.getElementById('margenGanancia');
  if (campoMargen) campoMargen.addEventListener('input', marcarChipMargen);
  marcarChipMargen();
});

// Deja solo los dígitos de un texto ("3.000.000" -> "3000000")
function soloDigitos(texto) {
  return String(texto).replace(/[^\d]/g, '');
}

// Formatea el contenido de un input de dinero con separadores de miles (es-CO).
// Se usan puntos como separador, que es justo lo que valorNumerico() sabe quitar.
function formatearInputMoneda(el) {
  const digitos = soloDigitos(el.value);
  el.value = digitos ? parseInt(digitos, 10).toLocaleString('es-CO') : '';
}

// Reformatea todos los campos de dinero (tras cargar datos en el formulario)
function formatearTodosLosMontos() {
  document.querySelectorAll('.input-money').forEach(formatearInputMoneda);
}

// Conecta el Enter de varios campos a una acción de "agregar"
function enterParaAgregar(ids, accion) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); accion(); }
    });
  });
}

// Resalta el chip que coincide con el margen escrito (o ninguno si es otro valor)
function marcarChipMargen() {
  const campo = document.getElementById('margenGanancia');
  const actual = campo ? String(parseInt(campo.value, 10)) : '';
  document.querySelectorAll('.chip-margen').forEach(chip => {
    chip.classList.toggle('activo', chip.dataset.margen === actual);
  });
}

// Muestra la vista indicada y marca la estrella activa
function cambiarVista(idVista, estrella) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  const vista = document.getElementById(idVista);
  if (vista) vista.classList.add('activa');

  document.querySelectorAll('.estrella').forEach(e => e.classList.remove('activa'));
  if (estrella) estrella.classList.add('activa');

  // En "Mi Despensa" la cabecera se compacta (barra: logo · precio · refrán).
  // La animación y el nuevo layout los hace el CSS al ver esta clase en <body>.
  document.body.classList.toggle('modo-despensa', idVista === 'vista2');

  // El número grande de la cabecera cambia de significado según la vista.
  actualizarCabecera();

  // Ajustar el ancho de la app: solo se ensancha en Metas + hoja de cálculo.
  if (typeof actualizarAnchoApp === 'function') actualizarAnchoApp();
}

// ¿Qué vista está activa ahora? Devuelve su id (ej: 'metas', 'cotizar').
function vistaActiva() {
  const v = document.querySelector('.vista.activa');
  return v ? v.id : '';
}

// Escribe la etiqueta y el número grande de la cabecera (la caja dorada).
// Lo usan tanto el cotizador como las metas, según cuál esté al frente.
function pintarJornal(etiqueta, valorTexto) {
  const lbl = document.getElementById('jornal-label');
  const num = document.getElementById('jornal-num');
  if (lbl) lbl.textContent = etiqueta;
  if (num) num.textContent = valorTexto;
}

// Repinta la cabecera con lo que corresponde a la vista activa. En Metas
// muestra "Te falta ahorrar"; en Cotizar/Despensa, "Deberías cobrar".
function actualizarCabecera() {
  const vista = vistaActiva();
  if (vista === 'metas' && typeof metasPintarJornal === 'function') {
    metasPintarJornal();
  } else {
    pintarJornal('Deberías cobrar:', formatearDinero(window.__precioVentaActual || 0));
  }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function formatearNumero(numero) {
  const num = parseFloat(numero);
  if (isNaN(num)) return "0";
  return Math.round(num).toLocaleString('es-CO');
}

function valorNumerico(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(String(el.value).replace(/\./g, '').replace(',', '.')) || 0;
}

// ----------------------------------------------------------------
// Moneda (divisa) — el usuario puede cambiarla cuando quiera
//
// IMPORTANTE: NO convertimos entre monedas. Convertir (ej: COP -> USD)
// necesitaría tasas de cambio que cambian a diario, y sin una fuente externa
// daríamos cifras falsas. En vez de eso, cada presupuesto se trabaja en UNA
// sola moneda: el número que el usuario escribe ES el número; aquí solo
// decidimos CÓMO se muestra (símbolo, decimales y separadores de cada país).
//
// Todo el formato sale de Intl.NumberFormat, que ya viene en el navegador,
// conoce todas las monedas del mundo y funciona sin internet ni librerías.
// ----------------------------------------------------------------

// Monedas disponibles en el selector. Para agregar una nueva, basta con añadir
// aquí su código ISO 4217 y un locale (para que el formato se sienta nativo).
const MONEDAS = [
  { codigo: 'COP', nombre: 'Peso colombiano',       locale: 'es-CO' },
  { codigo: 'USD', nombre: 'Dólar estadounidense',  locale: 'en-US' },
  { codigo: 'EUR', nombre: 'Euro',                  locale: 'es-ES' },
  { codigo: 'MXN', nombre: 'Peso mexicano',         locale: 'es-MX' },
  { codigo: 'ARS', nombre: 'Peso argentino',        locale: 'es-AR' },
  { codigo: 'CLP', nombre: 'Peso chileno',          locale: 'es-CL' },
  { codigo: 'PEN', nombre: 'Sol peruano',           locale: 'es-PE' },
  { codigo: 'BRL', nombre: 'Real brasileño',        locale: 'pt-BR' },
  { codigo: 'GBP', nombre: 'Libra esterlina',       locale: 'en-GB' },
  { codigo: 'CNY', nombre: 'Yuan chino',            locale: 'zh-CN' },
  { codigo: 'JPY', nombre: 'Yen japonés',           locale: 'ja-JP' }
];

// Moneda activa. Arranca en peso colombiano y se sobreescribe con lo que el
// usuario haya guardado la última vez (ver cargarMoneda).
let monedaActual = 'COP';

// Configuración de la moneda activa (o la primera de la lista si algo falla).
function monedaConfig() {
  return MONEDAS.find(m => m.codigo === monedaActual) || MONEDAS[0];
}

// Formatea un valor como dinero EN LA MONEDA ACTIVA, con su símbolo, decimales
// y separadores correctos. Reemplaza al viejo "'$' + formatearNumero(...)".
// Ej: 50000 -> "$ 50.000" (COP), "$50,000.00" (USD), "50.000 €" (EUR).
function formatearDinero(valor) {
  const m = monedaConfig();
  const num = parseFloat(valor);
  const seguro = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat(m.locale, {
    style: 'currency',
    currency: m.codigo
  }).format(seguro);
}

// Llena el menú <select> con todas las monedas disponibles.
function poblarSelectorMoneda() {
  const sel = document.getElementById('selector-moneda');
  if (!sel) return;
  sel.innerHTML = '';
  MONEDAS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.codigo;
    opt.textContent = m.codigo;           // solo el código (COP, USD…), compacto
    opt.title = m.nombre;                 // el nombre completo queda como tooltip
    sel.appendChild(opt);
  });
}

// Carga la moneda guardada y refresca toda la pantalla con ella.
function cargarMoneda() {
  chrome.storage.sync.get(['moneda'], function(data) {
    monedaActual = data.moneda || 'COP';
    const sel = document.getElementById('selector-moneda');
    if (sel) sel.value = monedaActual;
    refrescarTodo();
  });
}

// Cambia la moneda activa, la guarda y vuelve a pintar todo con la nueva.
function cambiarMoneda(codigo) {
  monedaActual = codigo;
  chrome.storage.sync.set({ moneda: codigo });
  refrescarTodo();
}

// Vuelve a pintar todo lo que muestra dinero (listas + cálculo + presupuestos).
function refrescarTodo() {
  renderMateriales();
  renderHerramientas();
  renderPresupuestos();
  recalcularCotizacion();
  // Las metas también muestran dinero: que se repinten con la nueva moneda.
  if (typeof metasRefrescar === 'function') metasRefrescar();
}

// ----------------------------------------------------------------
// Persistencia
// ----------------------------------------------------------------
// Vuelca un objeto de cotización en los campos del formulario
function aplicarDatosEnFormulario(c) {
  materialesCotizacion = c.materiales || [];
  herramientasCotizacion = c.herramientas || [];

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };
  setVal('ingresoDeseado', c.ingresoDeseado);
  setVal('horasFacturables', c.horasFacturables);
  setVal('horasTrabajo', c.horasTrabajo);
  setVal('costoTransporte', c.costoTransporte);
  setVal('otrosGastos', c.otrosGastos);
  setVal('margenGanancia', c.margenGanancia !== undefined ? c.margenGanancia : 30);
  setVal('descuentoPorcentaje', c.descuentoPorcentaje !== undefined ? c.descuentoPorcentaje : 0);

  renderMateriales();
  renderHerramientas();
  formatearTodosLosMontos();   // mostrar 3.000.000 en los campos de dinero
  marcarChipMargen();          // resaltar el chip de margen si coincide
  recalcularCotizacion();
}

function cargarCotizacion() {
  chrome.storage.sync.get(['cotizacion'], function(data) {
    aplicarDatosEnFormulario(data.cotizacion || {});
  });
}

// Construye el objeto con el estado actual de la cotización
function obtenerCotizacionActual() {
  return {
    ingresoDeseado: valorNumerico('ingresoDeseado'),
    horasFacturables: valorNumerico('horasFacturables'),
    horasTrabajo: valorNumerico('horasTrabajo'),
    costoTransporte: valorNumerico('costoTransporte'),
    otrosGastos: valorNumerico('otrosGastos'),
    margenGanancia: valorNumerico('margenGanancia'),
    descuentoPorcentaje: valorNumerico('descuentoPorcentaje'),
    materiales: materialesCotizacion,
    herramientas: herramientasCotizacion
  };
}

// Autoguardado silencioso: se llama tras cada cambio para que nada se pierda
// aunque el usuario cierre la extensión sin pulsar "Guardar".
function autoguardarCotizacion() {
  chrome.storage.sync.set({ cotizacion: obtenerCotizacionActual() });
}

// ----------------------------------------------------------------
// Presupuestos guardados (cada uno con nombre, editable cuando quiera)
// ----------------------------------------------------------------
function cargarPresupuestos() {
  chrome.storage.sync.get(['presupuestos'], function(data) {
    presupuestosGuardados = data.presupuestos || [];
    renderPresupuestos();
  });
}

function persistirPresupuestos() {
  chrome.storage.sync.set({ presupuestos: presupuestosGuardados });
}

// Precio de venta calculado de un objeto de cotización (para mostrarlo en la lista)
function precioVentaDe(c) {
  const tarifa = (c.horasFacturables > 0) ? c.ingresoDeseado / c.horasFacturables : 0;
  const manoObra = (c.horasTrabajo || 0) * tarifa;
  const mat = (c.materiales || []).reduce((s, m) => s + m.costo * m.cantidad, 0);
  const her = (c.herramientas || []).reduce((s, h) => s + costoDesgasteHerramienta(h, c.horasTrabajo || 0), 0);
  const costoTotal = manoObra + mat + her + (c.costoTransporte || 0) + (c.otrosGastos || 0);
  const precioConMargen = costoTotal * (1 + (c.margenGanancia || 0) / 100);
  // El descuento se aplica al final, sobre el precio ya con margen.
  return precioConMargen * (1 - (c.descuentoPorcentaje || 0) / 100);
}

function renderPresupuestos() {
  const cont = document.getElementById('presupuestos-container');
  const vacio = document.getElementById('sin-presupuestos');
  if (!cont) return;
  cont.innerHTML = '';

  if (vacio) vacio.style.display = presupuestosGuardados.length ? 'none' : 'block';

  presupuestosGuardados.forEach(p => {
    const div = document.createElement('div');
    div.className = 'presupuesto-item';

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="nombre">${p.nombre}</div>` +
                     `<div class="detalle">Precio: ${formatearDinero(precioVentaDe(p))}</div>`;
    div.appendChild(info);

    const btnCargar = document.createElement('button');
    btnCargar.className = 'btn-cargar';
    btnCargar.textContent = 'Editar';
    btnCargar.addEventListener('click', () => cargarPresupuesto(p.id));
    div.appendChild(btnCargar);

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn-eliminar';
    btnEliminar.textContent = 'X';
    btnEliminar.addEventListener('click', () => eliminarPresupuesto(p.id));
    div.appendChild(btnEliminar);

    cont.appendChild(div);
  });
}

// Guardar: si se está editando uno, lo actualiza; si no, crea uno nuevo
function guardarPresupuesto() {
  const nombre = document.getElementById('nombrePresupuesto').value.trim();
  if (nombre === '') { alert('Póngale un nombre al presupuesto, mijo'); return; }

  const datos = obtenerCotizacionActual();

  if (presupuestoEditandoId) {
    const i = presupuestosGuardados.findIndex(p => p.id === presupuestoEditandoId);
    if (i !== -1) {
      presupuestosGuardados[i] = Object.assign({}, datos, { id: presupuestoEditandoId, nombre });
    }
  } else {
    presupuestoEditandoId = 'pres_' + Date.now();
    presupuestosGuardados.push(Object.assign({}, datos, { id: presupuestoEditandoId, nombre }));
  }

  persistirPresupuestos();
  renderPresupuestos();
  actualizarEstadoEdicion(nombre);
  alert('Presupuesto guardado correctamente');
}

// Cargar un presupuesto en el formulario para modificarlo
function cargarPresupuesto(id) {
  const p = presupuestosGuardados.find(x => x.id === id);
  if (!p) return;
  presupuestoEditandoId = id;
  document.getElementById('nombrePresupuesto').value = p.nombre;
  aplicarDatosEnFormulario(p);
  actualizarEstadoEdicion(p.nombre);
}

function eliminarPresupuesto(id) {
  presupuestosGuardados = presupuestosGuardados.filter(p => p.id !== id);
  persistirPresupuestos();
  renderPresupuestos();
  if (presupuestoEditandoId === id) nuevoPresupuesto();
}

// Empezar uno nuevo: limpia el formulario y deja de editar
function nuevoPresupuesto() {
  presupuestoEditandoId = null;
  document.getElementById('nombrePresupuesto').value = '';
  aplicarDatosEnFormulario({});
  actualizarEstadoEdicion(null);
}

function actualizarEstadoEdicion(nombre) {
  const el = document.getElementById('estado-edicion');
  if (!el) return;
  el.textContent = (presupuestoEditandoId && nombre)
    ? `Editando: "${nombre}"`
    : '';
}

// ----------------------------------------------------------------
// Materiales
// ----------------------------------------------------------------
function renderMateriales() {
  const cont = document.getElementById('materiales-container');
  if (!cont) return;
  cont.innerHTML = '';
  materialesCotizacion.forEach(m => {
    const total = m.costo * m.cantidad;
    const bloqueado = !!m.bloqueado;

    const div = document.createElement('div');
    div.className = 'item-cotiz' + (bloqueado ? ' bloqueado' : '');

    div.innerHTML =
      `<div class="item-nombre">${m.nombre}</div>` +
      `<div class="item-campos">` +
        `<label>Costo <input type="text" inputmode="numeric" class="input-num item-costo"></label>` +
        `<label>Cant. <input type="number" min="1" class="input-num item-cantidad"></label>` +
      `</div>` +
      `<div class="item-total">= ${formatearDinero(total)}</div>` +
      `<div class="item-acciones"></div>`;

    // Valores actuales en los campos (el costo con separadores de miles)
    const inCosto = div.querySelector('.item-costo');
    const inCant = div.querySelector('.item-cantidad');
    inCosto.value = m.costo ? Math.round(m.costo).toLocaleString('es-CO') : '';
    inCant.value = m.cantidad;

    // Editar solo este presupuesto (no toca lo guardado en la despensa)
    inCosto.addEventListener('input', () => {
      m.costo = parseInt(soloDigitos(inCosto.value), 10) || 0;
      div.querySelector('.item-total').textContent = '= ' + formatearDinero(m.costo * m.cantidad);
      recalcularCotizacion();
    });
    inCosto.addEventListener('focus', () => { inCosto.value = soloDigitos(inCosto.value); });
    inCosto.addEventListener('blur', () => formatearInputMoneda(inCosto));
    inCant.addEventListener('input', () => {
      m.cantidad = parseInt(inCant.value, 10) || 1;
      div.querySelector('.item-total').textContent = '= ' + formatearDinero(m.costo * m.cantidad);
      recalcularCotizacion();
    });

    // Candado: al bloquear no se puede editar ni eliminar
    inCosto.disabled = bloqueado;
    inCant.disabled = bloqueado;

    const acciones = div.querySelector('.item-acciones');
    const btnLock = document.createElement('button');
    btnLock.className = 'btn-lock' + (bloqueado ? ' activo' : '');
    btnLock.textContent = bloqueado ? '🔒' : '🔓';
    btnLock.title = bloqueado ? 'Desbloquear' : 'Bloquear (no se podrá editar ni eliminar)';
    btnLock.addEventListener('click', () => toggleBloqueoMaterial(m.id));
    acciones.appendChild(btnLock);

    if (!bloqueado) {
      const btnX = document.createElement('button');
      btnX.className = 'btn-eliminar';
      btnX.textContent = 'X';
      btnX.addEventListener('click', () => eliminarMaterial(m.id));
      acciones.appendChild(btnX);
    }

    cont.appendChild(div);
  });
}

// Bloquea/desbloquea un material del presupuesto (candado)
function toggleBloqueoMaterial(id) {
  const m = materialesCotizacion.find(x => x.id === id);
  if (!m) return;
  m.bloqueado = !m.bloqueado;
  renderMateriales();
  recalcularCotizacion();
}

function agregarMaterialCotizacion() {
  const nombre = document.getElementById('material-nombre').value.trim();
  const costo = valorNumerico('material-costo');
  const cantidad = valorNumerico('material-cantidad') || 1;

  if (nombre === '') { alert('Por favor, ingrese un nombre para el material'); return; }
  if (costo <= 0) { alert('Por favor, ingrese un costo válido'); return; }

  materialesCotizacion.push({ id: 'mat_' + Date.now(), nombre, costo, cantidad });
  document.getElementById('material-nombre').value = '';
  document.getElementById('material-costo').value = '';
  document.getElementById('material-cantidad').value = '1';
  renderMateriales();
  recalcularCotizacion();
}

function eliminarMaterial(id) {
  materialesCotizacion = materialesCotizacion.filter(m => m.id !== id);
  renderMateriales();
  recalcularCotizacion();
}

// ----------------------------------------------------------------
// Herramientas
// ----------------------------------------------------------------
// Desgaste por hora de una herramienta = valor inicial ÷ vida útil (horas).
function desgastePorHora(h) {
  return (h.vidaUtil > 0) ? h.costo / h.vidaUtil : 0;
}

// Costo de desgaste de la herramienta para un trabajo de `horas` horas.
// Si la herramienta no tiene vida útil (datos viejos), se conserva el costo fijo.
function costoDesgasteHerramienta(h, horas) {
  return (h.vidaUtil > 0) ? desgastePorHora(h) * horas : h.costo;
}

function renderHerramientas() {
  const cont = document.getElementById('herramientas-container');
  if (!cont) return;
  cont.innerHTML = '';
  herramientasCotizacion.forEach(h => {
    const bloqueado = !!h.bloqueado;

    const div = document.createElement('div');
    div.className = 'item-cotiz' + (bloqueado ? ' bloqueado' : '');

    div.innerHTML =
      `<div class="item-nombre">${h.nombre}</div>` +
      `<div class="item-campos">` +
        `<label>Valor <input type="text" inputmode="numeric" class="input-num item-costo"></label>` +
        `<label>Años <input type="number" min="0.5" step="0.5" class="input-num item-anios"></label>` +
      `</div>` +
      `<div class="item-total"></div>` +
      `<div class="item-acciones"></div>`;

    const inCosto = div.querySelector('.item-costo');
    const inAnios = div.querySelector('.item-anios');
    const elTotal = div.querySelector('.item-total');
    inCosto.value = h.costo ? Math.round(h.costo).toLocaleString('es-CO') : '';
    inAnios.value = h.anios || '';

    // Muestra el desgaste por hora (lo que de verdad se cobra por trabajo)
    const pintarDetalle = () => {
      elTotal.textContent = (h.vidaUtil > 0)
        ? `desgaste ${formatearDinero(desgastePorHora(h))}/h`
        : `valor fijo`;
    };
    pintarDetalle();

    // Editar solo este presupuesto (no toca lo guardado en la despensa)
    inCosto.addEventListener('input', () => {
      h.costo = parseInt(soloDigitos(inCosto.value), 10) || 0;
      pintarDetalle();
      recalcularCotizacion();
    });
    inCosto.addEventListener('focus', () => { inCosto.value = soloDigitos(inCosto.value); });
    inCosto.addEventListener('blur', () => formatearInputMoneda(inCosto));
    inAnios.addEventListener('input', () => {
      h.anios = parseFloat(inAnios.value) || 0;
      h.vidaUtil = h.anios * (h.horasPorAnio || 1200);
      pintarDetalle();
      recalcularCotizacion();
    });

    inCosto.disabled = bloqueado;
    inAnios.disabled = bloqueado;

    const acciones = div.querySelector('.item-acciones');
    const btnLock = document.createElement('button');
    btnLock.className = 'btn-lock' + (bloqueado ? ' activo' : '');
    btnLock.textContent = bloqueado ? '🔒' : '🔓';
    btnLock.title = bloqueado ? 'Desbloquear' : 'Bloquear (no se podrá editar ni eliminar)';
    btnLock.addEventListener('click', () => toggleBloqueoHerramienta(h.id));
    acciones.appendChild(btnLock);

    if (!bloqueado) {
      const btnX = document.createElement('button');
      btnX.className = 'btn-eliminar';
      btnX.textContent = 'X';
      btnX.addEventListener('click', () => eliminarHerramienta(h.id));
      acciones.appendChild(btnX);
    }

    cont.appendChild(div);
  });
}

// Bloquea/desbloquea una herramienta del presupuesto (candado)
function toggleBloqueoHerramienta(id) {
  const h = herramientasCotizacion.find(x => x.id === id);
  if (!h) return;
  h.bloqueado = !h.bloqueado;
  renderHerramientas();
  recalcularCotizacion();
}

function agregarHerramientaCotizacion() {
  const nombre = document.getElementById('herramienta-nombre').value.trim();
  const costo = valorNumerico('herramienta-costo');
  const anios = valorNumerico('herramienta-anios');
  // Horas de uso al año según el nivel elegido (poco/medio/mucho).
  const horasPorAnio = valorNumerico('herramienta-uso') || 1200;
  // Vida útil en horas = años x horas de uso al año. La app lo calcula solo.
  const vidaUtil = anios * horasPorAnio;

  if (nombre === '') { alert('Por favor, ingrese un nombre para la herramienta'); return; }
  if (costo <= 0) { alert('Por favor, ingrese un valor inicial válido'); return; }
  if (anios <= 0) { alert('Por favor, ingrese cuántos años de vida tiene la herramienta'); return; }

  herramientasCotizacion.push({ id: 'her_' + Date.now(), nombre, costo, anios, horasPorAnio, vidaUtil });
  document.getElementById('herramienta-nombre').value = '';
  document.getElementById('herramienta-costo').value = '';
  document.getElementById('herramienta-anios').value = '';
  renderHerramientas();
  recalcularCotizacion();
}

function eliminarHerramienta(id) {
  herramientasCotizacion = herramientasCotizacion.filter(h => h.id !== id);
  renderHerramientas();
  recalcularCotizacion();
}

// ----------------------------------------------------------------
// Cálculo principal
// ----------------------------------------------------------------
function recalcularCotizacion() {
  // Tarifa por hora = ingreso deseado / horas facturables al mes
  const ingresoDeseado = valorNumerico('ingresoDeseado');
  const horasFacturables = valorNumerico('horasFacturables');
  const tarifaHora = horasFacturables > 0 ? ingresoDeseado / horasFacturables : 0;

  // Mano de obra de este trabajo = horas del trabajo x tarifa por hora
  const horasTrabajo = valorNumerico('horasTrabajo');
  const costoManoObra = horasTrabajo * tarifaHora;

  // Subtotales de materiales y herramientas
  // El de herramientas es el DESGASTE por las horas de este trabajo (no el valor completo).
  const subtotalMateriales = materialesCotizacion.reduce((s, m) => s + m.costo * m.cantidad, 0);
  const subtotalHerramientas = herramientasCotizacion.reduce((s, h) => s + costoDesgasteHerramienta(h, horasTrabajo), 0);

  const transporte = valorNumerico('costoTransporte');
  const otros = valorNumerico('otrosGastos');

  // Costo total
  const costoTotal = costoManoObra + subtotalMateriales + subtotalHerramientas + transporte + otros;

  // Margen y precio con margen
  const margen = valorNumerico('margenGanancia');
  const ganancia = costoTotal * (margen / 100);
  const precioConMargen = costoTotal * (1 + margen / 100);

  // Descuento: se aplica al final, sobre el precio ya con margen.
  const descuento = valorNumerico('descuentoPorcentaje');
  const valorDescuento = precioConMargen * (descuento / 100);
  const precioVenta = precioConMargen - valorDescuento;

  document.getElementById('tarifaHora').innerHTML = `<strong>Tu hora vale:</strong> ${formatearDinero(tarifaHora)}`;
  document.getElementById('costoManoObra').innerHTML = `<strong>Costo de tu tiempo:</strong> ${formatearDinero(costoManoObra)}`;
  document.getElementById('subtotalMateriales').innerHTML = `<strong>Subtotal materiales:</strong> ${formatearDinero(subtotalMateriales)}`;
  document.getElementById('subtotalHerramientas').innerHTML = `<strong>Subtotal herramientas (desgaste de ${formatearNumero(horasTrabajo)} h):</strong> ${formatearDinero(subtotalHerramientas)}`;
  document.getElementById('cotiz-costo-total').textContent = formatearDinero(costoTotal);
  document.getElementById('cotiz-margen-pct').textContent = margen;
  document.getElementById('cotiz-ganancia').textContent = formatearDinero(ganancia);
  document.getElementById('cotiz-descuento-pct').textContent = descuento;
  document.getElementById('cotiz-descuento').textContent = '-' + formatearDinero(valorDescuento);

  // Guardamos el precio para que la cabecera pueda repintarlo al volver a esta
  // vista, pero solo tocamos el número grande si Cotizar está al frente (si no,
  // pisaríamos el "Te falta ahorrar" de la vista de Metas).
  window.__precioVentaActual = precioVenta;
  // Cotizar y Mi Despensa comparten el número "Deberías cobrar". Solo la vista
  // de Metas usa la cabecera para otra cosa ("Te falta ahorrar").
  if (vistaActiva() !== 'metas') {
    pintarJornal('Deberías cobrar:', formatearDinero(precioVenta));
  }

  // Persistir el estado actual en cada recálculo (autoguardado)
  autoguardarCotizacion();
}
