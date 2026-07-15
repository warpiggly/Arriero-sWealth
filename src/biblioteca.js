// =================================================================
// biblioteca.js — "Mi Despensa"
// El usuario guarda piezas con nombre (tarifas, tiempos, materiales,
// herramientas y descuentos) DESDE la vista de cotizar, con el botón
// "💾 Guardar en despensa" de cada sección. Luego, en la vista
// "Mi Despensa", toca una pieza de la tabla para sumarla al presupuesto
// y ve el precio cambiar en vivo arriba.
//
// Reutiliza funciones y datos globales de logic_quotation.js:
//   valorNumerico, formatearInputMoneda, formatearDinero, soloDigitos,
//   desgastePorHora, materialesCotizacion, herramientasCotizacion,
//   renderMateriales, renderHerramientas, recalcularCotizacion.
// =================================================================

// La despensa: cinco gavetas, cada una con sus piezas guardadas.
let biblioteca = {
  tarifas: [],
  tiempos: [],
  materiales: [],
  herramientas: [],
  descuentos: []
};

document.addEventListener('DOMContentLoaded', function () {
  cargarBiblioteca();

  // Botones "💾 Guardar en despensa" repartidos por la vista de cotizar.
  // Cada uno sabe qué tipo guarda por su atributo data-guardar.
  document.querySelectorAll('.btn-guardar-despensa').forEach(btn => {
    btn.addEventListener('click', () => guardarEnDespensa(btn.dataset.guardar, btn));
  });
});

// ----------------------------------------------------------------
// Persistencia
// ----------------------------------------------------------------
function cargarBiblioteca() {
  chrome.storage.sync.get(['biblioteca'], function (data) {
    const b = data.biblioteca || {};
    biblioteca = {
      tarifas: b.tarifas || [],
      tiempos: b.tiempos || [],
      materiales: b.materiales || [],
      herramientas: b.herramientas || [],
      descuentos: b.descuentos || []
    };
    renderTodasLasGavetas();
  });
}

function persistirBiblioteca() {
  chrome.storage.sync.set({ biblioteca: biblioteca });
}

function nuevoId(prefijo) {
  return prefijo + '_' + Date.now();
}

// ----------------------------------------------------------------
// Guardar en la despensa (desde los campos de la vista de cotizar)
// ----------------------------------------------------------------
function guardarEnDespensa(tipo, btn) {
  let pieza = null;

  if (tipo === 'tarifa') {
    const nombre = valorTexto('save-tarifa-nombre');
    const ingresoDeseado = valorNumerico('ingresoDeseado');
    const horasFacturables = valorNumerico('horasFacturables');
    if (!nombre) return avisar('Póngale un nombre a la tarifa, mijo');
    if (ingresoDeseado <= 0 || horasFacturables <= 0) return avisar('Llene ingreso y horas facturables arriba');
    pieza = { id: nuevoId('tar'), nombre, ingresoDeseado, horasFacturables };
    biblioteca.tarifas.push(pieza);
    setVal('save-tarifa-nombre', '');

  } else if (tipo === 'tiempo') {
    const nombre = valorTexto('save-tiempo-nombre');
    const horas = valorNumerico('horasTrabajo');
    if (!nombre) return avisar('Póngale un nombre al tiempo, mijo');
    if (horas <= 0) return avisar('Escriba las horas de este trabajo arriba');
    pieza = { id: nuevoId('tie'), nombre, horas };
    biblioteca.tiempos.push(pieza);
    setVal('save-tiempo-nombre', '');

  } else if (tipo === 'material') {
    // Usa el mini-formulario de materiales (nombre/costo/cantidad)
    const nombre = valorTexto('material-nombre');
    const costo = valorNumerico('material-costo');
    const cantidad = valorNumerico('material-cantidad') || 1;
    if (!nombre) return avisar('Escriba el nombre del material arriba');
    if (costo <= 0) return avisar('Escriba un costo válido para el material');
    pieza = { id: nuevoId('mat'), nombre, costo, cantidad };
    biblioteca.materiales.push(pieza);

  } else if (tipo === 'herramienta') {
    const nombre = valorTexto('herramienta-nombre');
    const costo = valorNumerico('herramienta-costo');
    const anios = valorNumerico('herramienta-anios');
    const horasPorAnio = valorNumerico('herramienta-uso') || 1200;
    if (!nombre) return avisar('Escriba el nombre de la herramienta arriba');
    if (costo <= 0) return avisar('Escriba un valor inicial válido');
    if (anios <= 0) return avisar('Escriba cuántos años de vida tiene');
    pieza = { id: nuevoId('her'), nombre, costo, anios, horasPorAnio, vidaUtil: anios * horasPorAnio };
    biblioteca.herramientas.push(pieza);

  } else if (tipo === 'descuento') {
    const nombre = valorTexto('save-descuento-nombre');
    const porcentaje = valorNumerico('descuentoPorcentaje');
    if (!nombre) return avisar('Póngale un nombre al descuento, mijo');
    if (porcentaje <= 0) return avisar('Escriba un descuento mayor que 0');
    pieza = { id: nuevoId('des'), nombre, porcentaje };
    biblioteca.descuentos.push(pieza);
    setVal('save-descuento-nombre', '');
  }

  if (!pieza) return;
  persistirBiblioteca();
  renderTodasLasGavetas();
  confirmarBoton(btn);
}

// ----------------------------------------------------------------
// Pintar las gavetas de la despensa (vista 2) como tablas clickeables
// ----------------------------------------------------------------
function renderTodasLasGavetas() {
  renderGaveta('tarifas');
  renderGaveta('tiempos');
  renderGaveta('materiales');
  renderGaveta('herramientas');
  renderGaveta('descuentos');
}

// Texto descriptivo de cada pieza guardada, según su tipo
function detalleDePieza(tipo, p) {
  if (tipo === 'tarifas') {
    const hora = p.horasFacturables > 0 ? p.ingresoDeseado / p.horasFacturables : 0;
    return `${formatearDinero(p.ingresoDeseado)}/mes · ${p.horasFacturables} h → ${formatearDinero(hora)}/h`;
  }
  if (tipo === 'tiempos') return `${p.horas} h`;
  if (tipo === 'materiales') return `${formatearDinero(p.costo)} x ${p.cantidad}`;
  if (tipo === 'herramientas') {
    const desg = p.vidaUtil > 0 ? desgastePorHora(p) : 0;
    return `${formatearDinero(p.costo)} · ${p.anios} años · ${formatearDinero(desg)}/h`;
  }
  if (tipo === 'descuentos') return `${p.porcentaje}%`;
  return '';
}

function renderGaveta(tipo) {
  const cont = document.getElementById('lib-' + tipo + '-container');
  const vacio = document.getElementById('lib-' + tipo + '-vacio');
  if (!cont) return;
  cont.innerHTML = '';

  const lista = biblioteca[tipo];
  if (vacio) vacio.style.display = lista.length ? 'none' : 'block';

  lista.forEach(p => {
    const fila = document.createElement('div');
    fila.className = 'lib-item';
    fila.title = 'Tocar para sumar al presupuesto';
    fila.innerHTML =
      `<div class="info">` +
        `<div class="nombre">${p.nombre}</div>` +
        `<div class="detalle">${detalleDePieza(tipo, p)}</div>` +
      `</div>`;

    // Clic en la fila = aplicar la pieza al presupuesto (el bufet)
    fila.addEventListener('click', () => aplicarPieza(tipo, p));

    const btn = document.createElement('button');
    btn.className = 'btn-eliminar';
    btn.textContent = 'X';
    btn.title = 'Eliminar de la despensa';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();          // no aplicar la pieza al borrarla
      eliminarDeLib(tipo, p.id);
    });
    fila.appendChild(btn);

    cont.appendChild(fila);
  });
}

function eliminarDeLib(tipo, id) {
  biblioteca[tipo] = biblioteca[tipo].filter(p => p.id !== id);
  persistirBiblioteca();
  renderGaveta(tipo);
}

// ----------------------------------------------------------------
// El bufet: aplicar una pieza guardada al presupuesto actual
//   - tarifa / tiempo / descuento: REEMPLAZAN (solo puede haber uno)
//   - materiales / herramientas: se SUMAN a la lista (puede haber varios)
// ----------------------------------------------------------------
function aplicarPieza(tipo, p) {
  if (tipo === 'tarifas') {
    setVal('ingresoDeseado', p.ingresoDeseado);
    setVal('horasFacturables', p.horasFacturables);
    formatearMoneda('ingresoDeseado');
  } else if (tipo === 'tiempos') {
    setVal('horasTrabajo', p.horas);
  } else if (tipo === 'materiales') {
    // Copia independiente: editarla en el presupuesto no toca lo guardado
    materialesCotizacion.push({
      id: nuevoId('mat'), nombre: p.nombre, costo: p.costo,
      cantidad: p.cantidad, bloqueado: false
    });
    renderMateriales();
  } else if (tipo === 'herramientas') {
    herramientasCotizacion.push({
      id: nuevoId('her'), nombre: p.nombre, costo: p.costo, anios: p.anios,
      horasPorAnio: p.horasPorAnio, vidaUtil: p.vidaUtil, bloqueado: false
    });
    renderHerramientas();
  } else if (tipo === 'descuentos') {
    setVal('descuentoPorcentaje', p.porcentaje);
  }
  recalcularCotizacion();
  pulsarPrecio();   // el número de arriba parpadea para que se note el cambio
}

// ----------------------------------------------------------------
// Helpers cortos
// ----------------------------------------------------------------
function valorTexto(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = (val !== undefined && val !== null) ? val : '';
}

function formatearMoneda(id) {
  const el = document.getElementById(id);
  if (el) formatearInputMoneda(el);
}

function avisar(msg) {
  alert(msg);
}

// Realimentación corta en el botón: "✓ Guardado" por un momento
function confirmarBoton(btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = '✓ Guardado en despensa';
  btn.classList.add('ok');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('ok');
  }, 1300);
}

// Pulso suave del precio "Deberías cobrar" cuando cambia por una pieza
function pulsarPrecio() {
  const el = document.getElementById('jornal-num');
  if (!el) return;
  el.classList.remove('pulso');
  void el.offsetWidth;          // reinicia la animación
  el.classList.add('pulso');
}
