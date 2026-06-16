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

  // Recalcular automáticamente al escribir en cualquier campo numérico
  ['ingresoDeseado', 'horasFacturables', 'horasTrabajo', 'costoTransporte',
   'otrosGastos', 'margenGanancia'].forEach(id => {
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
});

// Muestra la vista indicada y marca la estrella activa
function cambiarVista(idVista, estrella) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  const vista = document.getElementById(idVista);
  if (vista) vista.classList.add('activa');

  document.querySelectorAll('.estrella').forEach(e => e.classList.remove('activa'));
  if (estrella) estrella.classList.add('activa');
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

  renderMateriales();
  renderHerramientas();
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
  const her = (c.herramientas || []).reduce((s, h) => s + h.costo, 0);
  const costoTotal = manoObra + mat + her + (c.costoTransporte || 0) + (c.otrosGastos || 0);
  return costoTotal * (1 + (c.margenGanancia || 0) / 100);
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
                     `<div class="detalle">Precio: $${formatearNumero(precioVentaDe(p))}</div>`;
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
    const div = document.createElement('div');
    div.className = 'gasto-item';
    const total = m.costo * m.cantidad;
    div.innerHTML = `<span>${m.nombre} — $${formatearNumero(m.costo)} x ${m.cantidad} = $${formatearNumero(total)}</span>`;
    const btn = document.createElement('button');
    btn.textContent = 'X';
    btn.addEventListener('click', () => eliminarMaterial(m.id));
    div.appendChild(btn);
    cont.appendChild(div);
  });
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
function renderHerramientas() {
  const cont = document.getElementById('herramientas-container');
  if (!cont) return;
  cont.innerHTML = '';
  herramientasCotizacion.forEach(h => {
    const div = document.createElement('div');
    div.className = 'gasto-item';
    div.innerHTML = `<span>${h.nombre} — $${formatearNumero(h.costo)}</span>`;
    const btn = document.createElement('button');
    btn.textContent = 'X';
    btn.addEventListener('click', () => eliminarHerramienta(h.id));
    div.appendChild(btn);
    cont.appendChild(div);
  });
}

function agregarHerramientaCotizacion() {
  const nombre = document.getElementById('herramienta-nombre').value.trim();
  const costo = valorNumerico('herramienta-costo');

  if (nombre === '') { alert('Por favor, ingrese un nombre para la herramienta'); return; }
  if (costo <= 0) { alert('Por favor, ingrese un costo válido'); return; }

  herramientasCotizacion.push({ id: 'her_' + Date.now(), nombre, costo });
  document.getElementById('herramienta-nombre').value = '';
  document.getElementById('herramienta-costo').value = '';
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
  const subtotalMateriales = materialesCotizacion.reduce((s, m) => s + m.costo * m.cantidad, 0);
  const subtotalHerramientas = herramientasCotizacion.reduce((s, h) => s + h.costo, 0);

  const transporte = valorNumerico('costoTransporte');
  const otros = valorNumerico('otrosGastos');

  // Costo total
  const costoTotal = costoManoObra + subtotalMateriales + subtotalHerramientas + transporte + otros;

  // Margen y precio de venta
  const margen = valorNumerico('margenGanancia');
  const ganancia = costoTotal * (margen / 100);
  const precioVenta = costoTotal * (1 + margen / 100);

  document.getElementById('tarifaHora').innerHTML = `<strong>Tu hora vale:</strong> $${formatearNumero(tarifaHora)}`;
  document.getElementById('costoManoObra').innerHTML = `<strong>Costo de tu tiempo:</strong> $${formatearNumero(costoManoObra)}`;
  document.getElementById('subtotalMateriales').innerHTML = `<strong>Subtotal materiales:</strong> $${formatearNumero(subtotalMateriales)}`;
  document.getElementById('subtotalHerramientas').innerHTML = `<strong>Subtotal herramientas:</strong> $${formatearNumero(subtotalHerramientas)}`;
  document.getElementById('cotiz-costo-total').textContent = '$' + formatearNumero(costoTotal);
  document.getElementById('cotiz-margen-pct').textContent = margen;
  document.getElementById('cotiz-ganancia').textContent = '$' + formatearNumero(ganancia);
  document.getElementById('cotiz-precio-venta').textContent = '$' + formatearNumero(precioVenta);

  // Persistir el estado actual en cada recálculo (autoguardado)
  autoguardarCotizacion();
}
