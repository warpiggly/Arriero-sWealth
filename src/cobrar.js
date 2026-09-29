// =================================================================
// cobrar.js — La cara de Cobrar
//
// POR QUÉ EXISTE
//   Rehecha el 29 de septiembre de 2026 con la estética de Ahorro. Antes
//   Cobrar era una rejilla de diez cuadritos con formularios; ahora son dos
//   papeles que la gente ya conoce:
//
//     · LA HOJA DEL TRABAJO, para la persona. La misma hoja de cuaderno de
//       "¿cuánto gana, mijo?" (src/cuaderno.js): su tiempo, lo que compra, los
//       gastos, la raya y "Cóbrele". Aquí SÍ se ve la ganancia.
//     · LA CUENTA DE COBRO, para el cliente. El mismo recibo de Ahorro con lo
//       que trae una cuenta de cobro de verdad: número, fecha, a quién, el
//       total en letras. NUNCA la ganancia (va dentro de la mano de obra).
//
//   Y debajo, "Mis cuentas de cobro": lo que le deben (los fiados), con sus
//   abonos, los presupuestos que mandó y lo que ya le pagaron.
//
// DÓNDE VIVE CADA COSA
//   las cuentas ............ src/cobro.js (puras: ni pantalla ni almacén)
//   las cuentas guardadas .. src/db.js, store `cobros` (IndexedDB)
//   lo que vale su día y la hoja a medio llenar ... chrome.storage.sync
//   la imagen que se baja .. src/cobro-descargar.js
// =================================================================

const COB_PERFIL_KEY = 'perfilCobro';
const COB_TRABAJO_KEY = 'trabajoCobro';
const COB_TOPE_SIEMPRE = 30;

// Los dibujitos propios de Cobrar. Los que ya existen (transporte, otra) se
// toman de la hoja del mes, CUA_ICONOS, para que las dos hojas se parezcan.
const COB_ICONOS = {
  tiempo:      'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 2',
  herramienta: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.7-.7-2.3z',
  ayudante:    'M12 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7 M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5',
  comida:      'M3 12h18 M4 12a8 7 0 0 0 16 0 M9 4c-1 1.5 1 2.5 0 4 M13 4c-1 1.5 1 2.5 0 4',
  envio:       'M3 7h11v9H3z M14 10h4l3 3v3h-7 M5.5 18a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0 M15.5 18a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'
};

// El + de "Anotar otro gasto". "Otra cosa" deja escribir el nombre y se puede
// poner varias veces.
const COB_OTROS = [
  { clave: 'ayudante',    rotulo: 'Ayudante',           ayuda: 'Lo que le paga a quien le ayuda en este trabajo.' },
  { clave: 'herramienta', rotulo: 'Uso de herramienta', ayuda: 'Lo que se gasta la herramienta, o el alquiler de un equipo.' },
  { clave: 'comida',      rotulo: 'Almuerzos',          ayuda: 'La comida de los días que dura el trabajo.' },
  { clave: 'envio',       rotulo: 'Envío o domicilio',  ayuda: 'Lo que cuesta llevar o traer las cosas.' },
  { clave: 'otra',        rotulo: 'Otra cosa',          ayuda: 'Algo que no está en la lista: usted le pone el nombre.' }
];

const COB_CHIPS_TIEMPO = { dias: [0.5, 1, 2, 3, 5], horas: [1, 2, 4, 8] };
const COB_CHIPS_MARGEN = [0, 20, 30, 40, 50];
const COB_CHIPS_DESCUENTO = [0, 5, 10, 15];

let cobPerfil = null;      // { nombre, ganarMes, diasMes, siempre: [{ nombre, precio }] }
let cobTrabajo = null;     // la hoja del trabajo (cobroTrabajoVacio)
let cobEditando = null;    // id de la cuenta guardada que se está corrigiendo
let cobCuentas = [];       // las cuentas guardadas
let cobAhora = null;       // la cuenta de cobro que se está mirando
let cobYoAbierto = false;
let cobFirmaMat = null;
let cobFirmaOtros = null;
let cobTimerGuardar = null;
let cobAvisoTimer = null;
// Mientras se practica con el ejemplo de la guía (src/guia.js), aquí queda la
// hoja que la persona tenía antes, para devolvérsela intacta al borrarlo.
let cobAntesDelEjemplo = null;

// El trabajo de mentiras para practicar. Don Julio es el mismo de la guía.
const COB_EJEMPLO = {
  cliente: 'Don Julio',
  trabajo: 'Pintar la sala y el comedor',
  unidad: 'dias',
  tiempo: 2,
  materiales: [
    { nombre: 'Pintura (galón)', cantidad: 3, precio: 90000 },
    { nombre: 'Rodillo y brocha', cantidad: 1, precio: 25000 }
  ],
  transporte: 30000,
  otros: [{ clave: 'ayudante', nombre: 'Ayudante', monto: 80000 }],
  margen: 30,
  descuento: 0,
  tipo: 'cobro'
};

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('cob-recibo')) return;

  cobPonerIconosQuietos();

  // --- Lo que vale su día ---
  cobAtar('cob-yo-resumen', 'click', function () { cobAbrirYo(true); });
  cobAtar('cob-yo-listo', 'click', function () { cobAbrirYo(false); });
  cobAtarMoneda('cob-ganar', function (n) { cobCambiarPerfil({ ganarMes: n }); });
  cobAtar('cob-dias-mes', 'input', function (el) {
    cobCambiarPerfil({ diasMes: Math.min(31, parseInt(soloDigitos(el.value), 10) || 0) });
  });
  cobAtar('cob-yo-nombre', 'input', function (el) { cobCambiarPerfil({ nombre: el.value.trim() }); });
  cobAtarMoneda('cob-basico', function (n) { cobCambiarPerfil({ basicoHora: n }); });

  // --- La hoja ---
  cobAtar('cob-cliente', 'input', function (el) { cobCambiar({ cliente: el.value }); });
  cobAtar('cob-trabajo', 'input', function (el) { cobCambiar({ trabajo: el.value }); });
  cobAtar('cob-tiempo', 'input', function (el) { cobCambiar({ tiempo: cobDecimal(el.value) }); });
  document.querySelectorAll('.cob-unidad-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (cobTrabajo.unidad === b.dataset.unidad) return;
      cobCambiar({ unidad: b.dataset.unidad, tiempo: 0 });
      cobPonerTexto('cob-tiempo', '', true);
    });
  });
  cobAtarMoneda('cob-transporte', function (n) { cobCambiar({ transporte: n }); });
  cobAtar('cob-mas-material', 'click', function () { cobAgregarMaterial({ nombre: '', cantidad: 1, precio: 0 }, true); });
  cobAtar('cob-mas-otro', 'click', function (el) {
    const cat = document.getElementById('cob-catalogo');
    const abierto = cat.classList.toggle('oculto') === false;
    el.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) cobPintarCatalogo();
  });
  cobAtar('cob-hacer', 'click', cobHacerLaCuenta);
  cobAtar('cob-nuevo', 'click', cobEmpezarOtro);
  cobAtar('cob-ejemplo-borrar', 'click', cobQuitarEjemplo);

  // --- La cuenta de cobro ---
  cobAtar('cob-r-cerrar', 'click', cobEsconderRecibo);
  cobAtar('cob-r-g-guardar', 'click', cobGuardar);
  cobAtar('cob-r-g-dejar', 'click', function () {
    cobEsconderRecibo();
    cobAvisar('Listo: no guardé nada. La hoja sigue ahí.');
  });
  cobAtar('cob-r-tipo-btn', 'click', cobCambiarTipo);
  cobAtar('cob-r-descargar', 'click', function () {
    if (cobAhora && typeof cobdDescargar === 'function') cobdDescargar(cobAhora);
  });
  cobAtar('cob-r-corregir', 'click', cobCorregir);
  cobAtar('cob-r-quitar', 'click', cobQuitar);
  cobAtarMoneda('cob-abono', null);
  const abono = document.getElementById('cob-abono');
  if (abono) {
    abono.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); cobAnotarAbono(); }
    });
  }
  cobAtar('cob-abono-anotar', 'click', function () { cobAnotarAbono(); });
  cobAtar('cob-pago-todo', 'click', function () {
    if (cobAhora) cobAnotarAbono(cobroSaldo(cobAhora));
  });
  document.addEventListener('keydown', function (e) {
    const caja = document.getElementById('cob-recibo');
    if (e.key === 'Escape' && caja && !caja.classList.contains('oculto')) cobEsconderRecibo();
  });

  // --- Mis cuentas ---
  cobAtar('cob-libreta-tit', 'click', function (el) {
    const caja = document.getElementById('cob-libreta');
    const cerrado = caja.classList.toggle('cerrado');
    el.setAttribute('aria-expanded', cerrado ? 'false' : 'true');
  });

  cobCargar();
});

function cobAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function (e) { hacer(el, e); });
}

// Campo de plata: puntos de miles al salir, dígitos al entrar (recAtarMoneda,
// el mismo gesto de toda la app).
function cobAtarMoneda(id, alCambiar) {
  const el = document.getElementById(id);
  if (!el) return;
  recAtarMoneda(el);
  if (alCambiar) el.addEventListener('input', function () { alCambiar(recNumero(el.value)); });
}

function cobDecimal(txt) {
  const n = parseFloat(String(txt || '').replace(/[^\d,.]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
}

// ----------------------------------------------------------------
// Guardar y cargar
// ----------------------------------------------------------------
function cobAlmacen() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage.sync;
  } catch (e) { /* sin almacén: funciona, solo no recuerda */ }
  return null;
}

function cobCargar() {
  const alm = cobAlmacen();
  const listo = function (data) {
    cobPerfil = cobPerfilNormal(data[COB_PERFIL_KEY]);
    const guardado = data[COB_TRABAJO_KEY] || {};
    cobTrabajo = cobTrabajoNormal(guardado.trabajo);
    cobEditando = guardado.editando || null;
    cobAntesDelEjemplo = guardado.antesDelEjemplo || null;
    cobPintarEjemplo();
    cobAbrirYo(!(cobPerfil.ganarMes > 0));
    cobPintarTodo();
    cobCargarCuentas();
  };
  if (alm) alm.get([COB_PERFIL_KEY, COB_TRABAJO_KEY], listo);
  else listo({});
}

function cobPerfilNormal(p) {
  const d = p && typeof p === 'object' ? p : {};
  return {
    nombre: String(d.nombre || '').slice(0, 80),
    ganarMes: Number(d.ganarMes) > 0 ? Number(d.ganarMes) : 0,
    diasMes: Number(d.diasMes) > 0 ? Number(d.diasMes) : 0,
    basicoHora: Number(d.basicoHora) > 0 ? Number(d.basicoHora) : 0,
    siempre: (Array.isArray(d.siempre) ? d.siempre : []).filter(function (s) {
      return s && s.nombre;
    }).slice(0, COB_TOPE_SIEMPRE)
  };
}

function cobTrabajoNormal(t) {
  const base = cobroTrabajoVacio();
  if (!t || typeof t !== 'object') return base;
  Object.keys(base).forEach(function (k) { if (t[k] !== undefined) base[k] = t[k]; });
  base.unidad = base.unidad === 'horas' ? 'horas' : 'dias';
  base.materiales = Array.isArray(base.materiales) ? base.materiales : [];
  base.otros = Array.isArray(base.otros) ? base.otros : [];
  return base;
}

function cobGuardarLuego() {
  if (cobTimerGuardar) clearTimeout(cobTimerGuardar);
  cobTimerGuardar = setTimeout(cobGuardarYa, 350);
}

function cobGuardarYa() {
  const alm = cobAlmacen();
  if (!alm) return;
  const datos = {};
  datos[COB_PERFIL_KEY] = cobPerfil;
  datos[COB_TRABAJO_KEY] = { trabajo: cobTrabajo, editando: cobEditando, antesDelEjemplo: cobAntesDelEjemplo };
  alm.set(datos);
}

function cobCargarCuentas() {
  return dbTodosLosCobros().then(function (lista) {
    cobCuentas = lista;
    cobPintarLibreta();
    cobPintarEditando();
  }).catch(function (e) {
    console.error('No se pudieron leer las cuentas de cobro:', e);
  });
}

// ----------------------------------------------------------------
// 1. Lo que vale su día
// ----------------------------------------------------------------
function cobAbrirYo(abierto) {
  cobYoAbierto = abierto;
  const cuerpo = document.getElementById('cob-yo-cuerpo');
  const resumen = document.getElementById('cob-yo-resumen');
  if (cuerpo) cuerpo.classList.toggle('oculto', !abierto);
  if (resumen) {
    resumen.classList.toggle('oculto', abierto);
    resumen.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  }
  if (!abierto) cobGuardarYa();
}

function cobCambiarPerfil(cambio) {
  Object.assign(cobPerfil, cambio);
  cobGuardarLuego();
  cobPintarTodo();
}

function cobPintarYo() {
  const p = cobPerfil;
  recPonerValor('cob-ganar', p.ganarMes);
  cobPonerTexto('cob-dias-mes', p.diasMes ? String(p.diasMes) : '');
  cobPonerTexto('cob-yo-nombre', p.nombre);

  const jornal = cobroJornal(p);
  const dias = cobroDiasMes(p);
  const vale = document.getElementById('cob-vale');
  if (vale) {
    vale.innerHTML = '';
    if (jornal > 0) {
      cobFuerte(vale, 'Su día vale ' + cobPlataRedonda(jornal));
      vale.appendChild(document.createTextNode(' y su hora ' + cobPlataRedonda(jornal / COBRO_HORAS_DIA) +
        (p.diasMes ? '.' : ' (contando ' + dias + ' días de trabajo al mes).')));
    } else {
      vale.textContent = 'Escriba cuánto se quiere ganar y le digo cuánto vale su día.';
    }
    const gastos = cobGastosDelMes();
    if (gastos > 0) {
      const p2 = document.createElement('span');
      p2.className = 'cob-vale-ojo';
      p2.textContent = p.ganarMes > 0 && p.ganarMes < gastos
        ? '! Eso no le alcanza: sus gastos del mes (en Ahorro) son ' + recPlata(gastos) + '.'
        : 'Sus gastos del mes (en Ahorro) son ' + recPlata(gastos) + ': no se quiera ganar menos que eso.';
      vale.appendChild(p2);
    }
  }

  const b = cobroFrenteAlBasico(p, cobMoneda());
  recPonerValor('cob-basico', b.basico);
  cobPintarBasico(b);

  const txt = document.getElementById('cob-yo-resumen-txt');
  if (txt) {
    txt.textContent = jornal > 0
      ? 'Su día de trabajo vale ' + cobPlataRedonda(jornal) +
        (b.tono === 'no' ? ' · menos del básico' : '')
      : 'Todavía no me ha dicho cuánto vale su día';
    txt.classList.toggle('cob-bajo-basico', b.tono === 'no');
  }
}

// Qué tan lejos está su hora del básico. Por debajo: rojo y en palabras.
function cobPintarBasico(b) {
  const dice = document.getElementById('cob-basico-dice');
  if (!dice) return;
  dice.classList.toggle('oculto', b.tono === 'nada');
  dice.classList.toggle('cob-basico-no', b.tono === 'no');
  dice.classList.toggle('cob-basico-bien', b.tono === 'bien');
  if (b.tono === 'nada') { dice.textContent = ''; return; }

  const hora = 'Su hora sale a ' + cobPlataRedonda(b.hora) + ' y el básico es ' + cobPlataRedonda(b.basico);
  if (b.tono === 'no') {
    dice.textContent = '× Está ganando menos del básico. ' + hora + ': le faltan ' +
      cobPlataRedonda(-b.diferencia) + ' la hora (' + (-b.pct) + ' % menos). Súbale a lo que se quiere ganar.';
  } else if (b.pct === 0) {
    dice.textContent = '✓ ' + hora + ': está justo en el básico.';
  } else {
    dice.textContent = '✓ ' + hora + ': está ' + b.pct + ' % por encima.';
  }
}

// Lo que la persona gasta al mes, según su hoja de Ahorro. Sirve de piso: el
// que cobra menos que eso está trabajando a pérdida sin saberlo.
function cobGastosDelMes() {
  if (typeof recAjustes === 'undefined' || !recAjustes || typeof ahorroHoja !== 'function') return 0;
  try {
    const h = ahorroHoja(recAjustes);
    return (h.necesarios || 0) + (h.otros || 0);
  } catch (e) { return 0; }
}

// ----------------------------------------------------------------
// 2. La hoja del trabajo
// ----------------------------------------------------------------
function cobCambiar(cambio) {
  Object.assign(cobTrabajo, cambio);
  cobGuardarLuego();
  cobPintarHoja();
}

function cobPintarTodo() {
  if (!cobPerfil || !cobTrabajo) return;
  cobPintarYo();
  cobPintarHoja();
}

function cobPintarHoja() {
  const t = cobTrabajo;
  cobPonerTexto('cob-cliente', t.cliente);
  cobPonerTexto('cob-trabajo', t.trabajo);
  cobPonerTexto('cob-tiempo', t.tiempo ? cobroCifra(t.tiempo) : '');
  recPonerValor('cob-transporte', t.transporte);

  document.querySelectorAll('.cob-unidad-btn').forEach(function (b) {
    const si = b.dataset.unidad === t.unidad;
    b.classList.toggle('prendida', si);
    b.setAttribute('aria-pressed', si ? 'true' : 'false');
  });

  cobPintarChips('cob-chips-tiempo', COB_CHIPS_TIEMPO[t.unidad], t.tiempo, function (v) {
    return v === 0.5 ? '½ día' : cobroCifra(v) + (t.unidad === 'horas' ? ' h' : (v === 1 ? ' día' : ' días'));
  }, function (v) {
    cobCambiar({ tiempo: v });
  });
  cobPintarChips('cob-chips-margen', COB_CHIPS_MARGEN, t.margen, function (v) { return v + ' %'; },
    function (v) { cobCambiar({ margen: v }); }, 'margen');
  cobPintarChips('cob-chips-descuento', COB_CHIPS_DESCUENTO, t.descuento,
    function (v) { return v ? v + ' %' : 'Sin'; },
    function (v) { cobCambiar({ descuento: v }); }, 'descuento');

  cobPintarMateriales();
  cobPintarSiempre();
  cobPintarOtros();

  const c = cobroCuenta(t, cobPerfil);
  cobTexto('cob-mano', cobPlataRedonda(c.manoObra));
  cobPintarNotaMano(c);
  cobTexto('cob-costo', cobPlataRedonda(c.costo));
  cobTexto('cob-ganancia', cobPlataRedonda(c.ganancia));
  cobTexto('cob-descuento', c.descuento > 0 ? '− ' + cobPlataRedonda(c.descuento) : recPlata(0));

  const total = document.getElementById('cob-total');
  if (total) {
    total.textContent = recPlata(c.total);
    total.style.color = CUA_TONO[c.tono].color;
  }
  const sello = document.getElementById('cob-sello');
  if (sello) {
    sello.textContent = c.sello;
    sello.style.color = CUA_TONO[c.tono].color;
  }

  cobPintarJornal();

  // Si la cuenta de cobro de esta hoja está abierta y sin guardar, que se
  // rehaga sola mientras la persona corrige la hoja.
  if (cobAhora && !cobAhora.guardada) {
    cobArmarCuenta();
    cobPintarRecibo();
  }
}

function cobPintarNotaMano(c) {
  const nota = document.getElementById('cob-mano-nota');
  if (!nota) return;
  nota.innerHTML = '';
  if (!c.tiempo) {
    nota.textContent = 'Escriba arriba cuánto le lleva el trabajo.';
    return;
  }
  if (c.jornal <= 0) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cob-enlace';
    b.textContent = 'Dígame cuánto vale su día';
    b.addEventListener('click', function () {
      cobAbrirYo(true);
      const g = document.getElementById('cob-ganar');
      if (g) g.focus();
    });
    nota.appendChild(b);
    nota.appendChild(document.createTextNode(' y le cobro su tiempo.'));
    return;
  }
  const t = cobTrabajo;
  nota.textContent = t.unidad === 'horas'
    ? cobroTiempoEnPalabras(t) + ' × ' + cobPlataRedonda(c.jornal / COBRO_HORAS_DIA) + ' que vale su hora.'
    : cobroTiempoEnPalabras(t) + ' × ' + cobPlataRedonda(c.jornal) + ' que vale su día.';
  if (cobroFrenteAlBasico(cobPerfil, cobMoneda()).tono === 'no') {
    const ojo = document.createElement('span');
    ojo.className = 'cob-nota-ojo';
    ojo.textContent = ' × Su hora está por debajo del básico.';
    nota.appendChild(ojo);
  }
}

// Los botoncitos de un toque. El último es un cuadrito para escribir otro %.
function cobPintarChips(id, valores, actual, rotulo, alTocar, conCampo) {
  const cont = document.getElementById(id);
  if (!cont) return;
  const firma = valores.join('|') + '|' + (conCampo || '');
  if (cont.dataset.firma !== firma) {
    cont.dataset.firma = firma;
    cont.innerHTML = '';
    valores.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cob-chip';
      b.dataset.valor = String(v);
      b.textContent = rotulo(v);
      b.addEventListener('click', function () { alTocar(v); });
      cont.appendChild(b);
    });
    if (conCampo) {
      const lbl = document.createElement('label');
      lbl.className = 'cob-chip-otro';
      const campo = document.createElement('input');
      campo.type = 'text';
      campo.inputMode = 'numeric';
      campo.className = 'cua-tinta';
      campo.id = id + '-campo';
      campo.maxLength = 3;
      campo.setAttribute('aria-label', conCampo === 'margen' ? 'Otro porcentaje de ganancia' : 'Otro porcentaje de descuento');
      campo.addEventListener('input', function () {
        alTocar(Math.min(conCampo === 'descuento' ? 100 : 500, parseInt(soloDigitos(campo.value), 10) || 0));
      });
      lbl.appendChild(campo);
      lbl.appendChild(document.createTextNode('%'));
      cont.appendChild(lbl);
    }
  }
  let alguno = false;
  cont.querySelectorAll('.cob-chip').forEach(function (b) {
    const si = Number(b.dataset.valor) === Number(actual);
    if (si) alguno = true;
    b.classList.toggle('prendida', si);
    b.setAttribute('aria-pressed', si ? 'true' : 'false');
  });
  const campo = document.getElementById(id + '-campo');
  if (campo && document.activeElement !== campo) campo.value = alguno || !actual ? '' : String(actual);
}

// --- Lo que compra ---
//
// Los renglones se rearman solo cuando cambia la LISTA (se agrega o se quita
// uno): rearmar mientras la persona escribe le robaría el cursor.
function cobPintarMateriales() {
  const cont = document.getElementById('cob-materiales');
  if (!cont) return;
  const lista = cobTrabajo.materiales;
  const firma = String(lista.length);
  if (firma !== cobFirmaMat) {
    cobFirmaMat = firma;
    cont.innerHTML = '';
    lista.forEach(function (m, i) { cobRenglonMaterial(cont, m, i); });
  }
  lista.forEach(function (m, i) {
    cobPonerTexto('cob-m-n-' + i, m.nombre);
    cobPonerTexto('cob-m-c-' + i, m.cantidad && m.cantidad !== 1 ? cobroCifra(m.cantidad) : '');
    recPonerValor('cob-m-p-' + i, m.precio);
    const nota = document.getElementById('cob-m-nota-' + i);
    const cant = Number(m.cantidad) || 1;
    if (nota) {
      nota.textContent = cant !== 1 && m.precio > 0
        ? cobroCifra(cant) + ' × ' + recPlata(m.precio) + ' = ' + recPlata(cant * m.precio)
        : '';
    }
    const est = document.getElementById('cob-m-s-' + i);
    if (est) {
      const ya = cobEnSiempre(m.nombre);
      est.textContent = ya ? '★' : '☆';
      est.classList.toggle('prendida', ya);
      est.title = ya ? 'Ya está en "lo que siempre uso"' : 'Guardarlo para la próxima vez';
    }
  });
}

function cobRenglonMaterial(cont, m, i) {
  const fila = document.createElement('div');
  fila.className = 'cua-fila cob-fila-mat';

  const nombre = document.createElement('input');
  nombre.type = 'text';
  nombre.id = 'cob-m-n-' + i;
  nombre.className = 'cua-tinta cua-nombre cob-mat-nombre';
  nombre.placeholder = '¿Qué compra?';
  nombre.maxLength = 60;
  nombre.setAttribute('aria-label', 'Qué material');
  nombre.addEventListener('input', function () { cobCambiarMaterial(i, { nombre: nombre.value }); });

  const por = document.createElement('span');
  por.className = 'cob-por';
  por.textContent = '×';
  por.setAttribute('aria-hidden', 'true');

  const cant = document.createElement('input');
  cant.type = 'text';
  cant.inputMode = 'decimal';
  cant.id = 'cob-m-c-' + i;
  cant.className = 'cua-tinta cob-mat-cant';
  cant.placeholder = '1';
  cant.maxLength = 5;
  cant.title = '¿Cuántos?';
  cant.setAttribute('aria-label', 'Cuántos');
  cant.addEventListener('input', function () { cobCambiarMaterial(i, { cantidad: cobDecimal(cant.value) || 1 }); });

  const precio = document.createElement('input');
  precio.type = 'text';
  precio.inputMode = 'numeric';
  precio.id = 'cob-m-p-' + i;
  precio.className = 'cua-tinta cua-monto cob-mat-precio';
  precio.placeholder = '$ 0';
  precio.title = '¿A cómo cada uno?';
  precio.setAttribute('aria-label', 'A cómo cada uno');
  recAtarMoneda(precio);
  precio.addEventListener('input', function () { cobCambiarMaterial(i, { precio: recNumero(precio.value) }); });

  const estrella = document.createElement('button');
  estrella.type = 'button';
  estrella.id = 'cob-m-s-' + i;
  estrella.className = 'cob-estrella';
  estrella.setAttribute('aria-label', 'Guardarlo en lo que siempre uso');
  estrella.addEventListener('click', function () { cobGuardarEnSiempre(cobTrabajo.materiales[i]); });

  const quitar = cobBotonQuitar('Borrar este material', function () {
    const lista = cobTrabajo.materiales.slice();
    lista.splice(i, 1);
    cobCambiar({ materiales: lista });
  });

  [nombre, por, cant, precio, estrella, quitar].forEach(function (el) { fila.appendChild(el); });
  cont.appendChild(fila);

  const nota = document.createElement('p');
  nota.id = 'cob-m-nota-' + i;
  nota.className = 'cob-mat-nota';
  cont.appendChild(nota);
}

function cobCambiarMaterial(i, cambio) {
  const lista = cobTrabajo.materiales.map(function (m) { return Object.assign({}, m); });
  if (!lista[i]) return;
  Object.assign(lista[i], cambio);
  cobCambiar({ materiales: lista });
}

function cobAgregarMaterial(m, enfocar) {
  const lista = cobTrabajo.materiales.concat([Object.assign({ nombre: '', cantidad: 1, precio: 0 }, m)]);
  cobCambiar({ materiales: lista });
  if (enfocar) {
    const foco = document.getElementById('cob-m-n-' + (lista.length - 1));
    if (foco) foco.focus();
  }
}

// --- Lo que siempre uso (reemplaza a la vieja "Mi Despensa") ---
function cobEnSiempre(nombre) {
  const n = String(nombre || '').trim().toLowerCase();
  return !!n && cobPerfil.siempre.some(function (s) { return s.nombre.toLowerCase() === n; });
}

function cobGuardarEnSiempre(m) {
  if (!m) return;
  const nombre = String(m.nombre || '').trim();
  if (!nombre) { cobAvisar('Primero escríbale el nombre, mijo.'); return; }
  const lista = cobPerfil.siempre.filter(function (s) { return s.nombre.toLowerCase() !== nombre.toLowerCase(); });
  const yaEstaba = lista.length !== cobPerfil.siempre.length;
  if (!yaEstaba) {
    lista.unshift({ nombre: nombre, precio: Number(m.precio) || 0 });
    cobCambiarPerfil({ siempre: lista.slice(0, COB_TOPE_SIEMPRE) });
    cobAvisar('Listo: "' + nombre + '" quedó en lo que siempre usa.');
  } else {
    cobCambiarPerfil({ siempre: lista });
    cobAvisar('Lo saqué de lo que siempre usa.');
  }
}

function cobPintarSiempre() {
  const caja = document.getElementById('cob-siempre');
  const cont = document.getElementById('cob-siempre-lista');
  if (!caja || !cont) return;
  const lista = cobPerfil.siempre;
  caja.classList.toggle('oculto', !lista.length);
  cont.innerHTML = '';
  lista.forEach(function (s) {
    const chip = document.createElement('span');
    chip.className = 'cob-siempre-chip';

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cob-siempre-usar';
    b.textContent = s.nombre + (s.precio ? ' · ' + recPlata(s.precio) : '');
    b.title = 'Anotarlo en este trabajo';
    b.addEventListener('click', function () {
      cobAgregarMaterial({ nombre: s.nombre, cantidad: 1, precio: s.precio }, false);
    });

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'cob-siempre-x';
    x.textContent = '×';
    x.title = 'Ya no lo uso';
    x.setAttribute('aria-label', 'Quitar ' + s.nombre + ' de lo que siempre uso');
    x.addEventListener('click', function () {
      cobCambiarPerfil({ siempre: cobPerfil.siempre.filter(function (o) { return o !== s; }) });
    });

    chip.appendChild(b);
    chip.appendChild(x);
    cont.appendChild(chip);
  });
}

// --- Los otros gastos ---
function cobPintarOtros() {
  const cont = document.getElementById('cob-otros');
  if (!cont) return;
  const lista = cobTrabajo.otros;
  const firma = lista.map(function (o) { return o.clave; }).join('|');
  if (firma !== cobFirmaOtros) {
    cobFirmaOtros = firma;
    cont.innerHTML = '';
    lista.forEach(function (o, i) { cobRenglonOtro(cont, o, i); });
  }
  lista.forEach(function (o, i) {
    recPonerValor('cob-o-' + i, o.monto);
    cobPonerTexto('cob-on-' + i, o.nombre);
  });
}

function cobRenglonOtro(cont, o, i) {
  const base = String(o.clave || '').split('-')[0];
  const cat = COB_OTROS.find(function (c) { return c.clave === base; }) || COB_OTROS[COB_OTROS.length - 1];

  const fila = document.createElement('div');
  fila.className = 'cua-fila';

  const ico = document.createElement('span');
  ico.className = 'cua-ico cob-ico-quieto';
  ico.title = cat.ayuda;
  ico.appendChild(cobSvg(base));

  let rot;
  if (base === 'otra') {
    rot = document.createElement('input');
    rot.type = 'text';
    rot.id = 'cob-on-' + i;
    rot.className = 'cua-tinta cua-nombre';
    rot.placeholder = '¿Qué es?';
    rot.maxLength = 40;
    rot.setAttribute('aria-label', 'Nombre del gasto');
    rot.addEventListener('input', function () { cobCambiarOtro(i, { nombre: rot.value }); });
  } else {
    rot = document.createElement('label');
    rot.className = 'cua-fila-rot';
    rot.htmlFor = 'cob-o-' + i;
    rot.textContent = cat.rotulo;
  }

  const lin = document.createElement('span');
  lin.className = 'rec-lin';

  const monto = document.createElement('input');
  monto.type = 'text';
  monto.inputMode = 'numeric';
  monto.id = 'cob-o-' + i;
  monto.className = 'cua-tinta cua-monto';
  monto.placeholder = '$ 0';
  monto.setAttribute('aria-label', cat.rotulo + ', cuánto');
  recAtarMoneda(monto);
  monto.addEventListener('input', function () { cobCambiarOtro(i, { monto: recNumero(monto.value) }); });

  const quitar = cobBotonQuitar('Borrar este gasto', function () {
    const lista = cobTrabajo.otros.slice();
    lista.splice(i, 1);
    cobCambiar({ otros: lista });
  });

  [ico, rot, lin, monto, quitar].forEach(function (el) { fila.appendChild(el); });
  cont.appendChild(fila);
}

function cobCambiarOtro(i, cambio) {
  const lista = cobTrabajo.otros.map(function (o) { return Object.assign({}, o); });
  if (!lista[i]) return;
  Object.assign(lista[i], cambio);
  cobCambiar({ otros: lista });
}

function cobPintarCatalogo() {
  const cat = document.getElementById('cob-catalogo');
  if (!cat) return;
  const ya = cobTrabajo.otros.map(function (o) { return o.clave; });
  cat.innerHTML = '';
  COB_OTROS.forEach(function (c) {
    if (c.clave !== 'otra' && ya.indexOf(c.clave) !== -1) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cua-opcion';
    b.title = c.ayuda;
    b.appendChild(cobSvg(c.clave));
    b.appendChild(document.createTextNode(c.rotulo));
    b.addEventListener('click', function () { cobAgregarOtro(c); });
    cat.appendChild(b);
  });
}

function cobAgregarOtro(c) {
  const esOtra = c.clave === 'otra';
  const clave = esOtra ? 'otra-' + Date.now().toString(36) : c.clave;
  document.getElementById('cob-catalogo').classList.add('oculto');
  document.getElementById('cob-mas-otro').setAttribute('aria-expanded', 'false');
  cobCambiar({ otros: cobTrabajo.otros.concat([{ clave: clave, nombre: esOtra ? '' : c.rotulo, monto: 0 }]) });
  const i = cobTrabajo.otros.length - 1;
  const foco = document.getElementById(esOtra ? 'cob-on-' + i : 'cob-o-' + i);
  if (foco) foco.focus();
}

// --- Piezas chiquitas de la hoja ---
function cobBotonQuitar(titulo, hacer) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cua-quitar';
  b.textContent = '×';
  b.title = titulo;
  b.setAttribute('aria-label', titulo);
  b.addEventListener('click', hacer);
  return b;
}

function cobSvg(clave) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', cobIcono(clave));
  svg.appendChild(path);
  return svg;
}

function cobIcono(clave) {
  return COB_ICONOS[clave] || (typeof CUA_ICONOS !== 'undefined' && (CUA_ICONOS[clave] || CUA_ICONOS.otra)) || '';
}

function cobPonerIconosQuietos() {
  document.querySelectorAll('.cob-ico-quieto[data-ico]').forEach(function (el) {
    el.appendChild(cobSvg(el.dataset.ico));
  });
}

function cobEmpezarOtro() {
  if (cobAntesDelEjemplo) { cobQuitarEjemplo(); return; }
  const margen = cobTrabajo ? cobTrabajo.margen : 30;
  cobTrabajo = Object.assign(cobroTrabajoVacio(), { margen: margen });
  cobEditando = null;
  cobFirmaMat = null;
  cobFirmaOtros = null;
  cobGuardarYa();
  if (cobAhora && !cobAhora.guardada) cobEsconderRecibo();
  cobPintarHoja();
  cobPintarEditando();
  const f = document.getElementById('cob-cliente');
  if (f) f.focus();
}

// ----------------------------------------------------------------
// Practicar con un ejemplo (lo llama la guía, src/guia.js)
// ----------------------------------------------------------------
function cobCargarEjemplo() {
  if (!cobTrabajo) return;
  if (!cobAntesDelEjemplo) {
    cobAntesDelEjemplo = { trabajo: JSON.parse(JSON.stringify(cobTrabajo)), editando: cobEditando };
  }
  cobTrabajo = cobTrabajoNormal(JSON.parse(JSON.stringify(COB_EJEMPLO)));
  cobEditando = null;
  cobFirmaMat = null;
  cobFirmaOtros = null;
  if (cobAhora && !cobAhora.guardada) cobEsconderRecibo();
  cobGuardarYa();
  cobPintarHoja();
  cobPintarEditando();
  cobPintarEjemplo();
}

function cobQuitarEjemplo() {
  if (!cobAntesDelEjemplo) return;
  cobTrabajo = cobTrabajoNormal(cobAntesDelEjemplo.trabajo);
  cobEditando = cobAntesDelEjemplo.editando || null;
  cobAntesDelEjemplo = null;
  cobFirmaMat = null;
  cobFirmaOtros = null;
  if (cobAhora && !cobAhora.guardada) cobEsconderRecibo();
  cobGuardarYa();
  cobPintarHoja();
  cobPintarEditando();
  cobPintarEjemplo();
  cobAvisar('Listo: borré el ejemplo. Su hoja quedó como estaba.');
}

function cobPintarEjemplo() {
  cobMostrar('cob-ejemplo', !!cobAntesDelEjemplo);
}

function cobPintarEditando() {
  const p = document.getElementById('cob-editando');
  if (!p) return;
  const cuenta = cobEditando ? cobCuentas.find(function (c) { return c.id === cobEditando; }) : null;
  p.classList.toggle('oculto', !cuenta);
  p.innerHTML = '';
  if (!cuenta) return;
  p.appendChild(document.createTextNode('Está corrigiendo la cuenta ' + cobroNumeroBonito(cuenta.numero) +
    (cuenta.cliente ? ' de ' + cuenta.cliente : '') + '. '));
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cob-enlace';
  b.textContent = 'Mejor empezar otro';
  b.addEventListener('click', cobEmpezarOtro);
  p.appendChild(b);
}

// ----------------------------------------------------------------
// 3. La cuenta de cobro
// ----------------------------------------------------------------
function cobHacerLaCuenta() {
  const c = cobroCuenta(cobTrabajo, cobPerfil);
  if (c.total <= 0) {
    cobAvisar('Anote primero el trabajo: su tiempo, lo que compra o los gastos.');
    return;
  }
  cobArmarCuenta();
  cobMostrarRecibo();
}

function cobArmarCuenta() {
  const c = cobroCuenta(cobTrabajo, cobPerfil);
  const base = cobEditando ? cobCuentas.find(function (x) { return x.id === cobEditando; }) : null;
  cobAhora = {
    id: base ? base.id : null,
    numero: base ? base.numero : cobroSiguienteNumero(cobCuentas),
    tipo: cobTrabajo.tipo === 'presupuesto' ? 'presupuesto' : 'cobro',
    cliente: String(cobTrabajo.cliente || '').trim(),
    trabajo: String(cobTrabajo.trabajo || '').trim(),
    yo: cobPerfil.nombre,
    fecha: base ? base.fecha : Date.now(),
    renglones: c.renglones,
    descuentoPct: c.descuentoPct,
    descuento: c.descuento,
    total: c.total,
    abonos: base ? base.abonos.slice() : [],
    datos: JSON.parse(JSON.stringify(cobTrabajo)),
    creado: base ? base.creado : Date.now(),
    guardada: false
  };
}

function cobMostrarRecibo() {
  cobPintarRecibo();
  const caja = document.getElementById('cob-recibo');
  if (!caja) return;
  caja.classList.remove('oculto');
  caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cobEsconderRecibo() {
  const caja = document.getElementById('cob-recibo');
  if (caja) caja.classList.add('oculto');
  cobAhora = null;
}

function cobPintarRecibo() {
  const c = cobAhora;
  if (!c) return;
  const esPres = c.tipo === 'presupuesto';

  cobTexto('cob-r-tipo', (esPres ? 'Presupuesto' : 'Cuenta de cobro') + ' · ' + cobroNumeroBonito(c.numero));
  cobTexto('cob-r-fecha', cobFecha(c.fecha));

  const partes = document.getElementById('cob-r-partes');
  if (partes) {
    partes.innerHTML = '';
    cobParte(partes, esPres ? 'Para' : 'Señor(a)', c.cliente);
    cobParte(partes, esPres ? 'De' : 'Debe a', c.yo);
    if (c.trabajo) cobParte(partes, 'Por', c.trabajo);
  }

  cobTexto('cob-r-total', recPlata(c.total));
  cobTexto('cob-r-letras', cobroEnLetras(c.total, cobMoneda()));

  const cont = document.getElementById('cob-r-renglones');
  if (cont) {
    cont.innerHTML = '';
    c.renglones.forEach(function (r) { cont.appendChild(cobRenglon(r.rotulo, recPlata(r.valor), false)); });
    if (c.descuento > 0) {
      cont.appendChild(cobRenglon('Descuento (' + cobroCifra(c.descuentoPct) + ' %)',
        '− ' + cobPlataRedonda(c.descuento), false));
    }
    cont.appendChild(cobRenglon('Total', recPlata(c.total), true));
  }

  cobPintarEstado(c);
  cobPintarAbonos(c);

  const guardar = document.getElementById('cob-r-g-guardar');
  if (guardar) guardar.textContent = c.id ? 'Guardar los cambios' : 'Guárdemela en mis cuentas';
  cobMostrar('cob-r-guardar', !c.guardada);
  cobMostrar('cob-abonar', c.guardada && !esPres && cobroSaldo(c) > 0);
  cobMostrar('cob-r-corregir', c.guardada);
  cobMostrar('cob-r-quitar', c.guardada);

  const tipo = document.getElementById('cob-r-tipo-btn');
  if (tipo) {
    tipo.textContent = esPres
      ? '✓ El cliente dijo que sí: volverla cuenta de cobro'
      : 'Mejor mandarla como presupuesto';
    tipo.classList.toggle('oculto', !esPres && c.abonos.length > 0);
  }
}

function cobParte(cont, rot, valor) {
  const p = document.createElement('p');
  p.className = 'cob-r-parte';
  const r = document.createElement('span');
  r.className = 'cob-r-parte-rot';
  r.textContent = rot + ':';
  const v = document.createElement('span');
  v.className = 'cob-r-parte-val' + (valor ? '' : ' cob-r-parte-vacia');
  v.textContent = valor || '';
  p.appendChild(r);
  p.appendChild(v);
  cont.appendChild(p);
}

function cobRenglon(rot, valor, fuerte) {
  const d = document.createElement('div');
  d.className = 'rec-renglon' + (fuerte ? ' rec-renglon-fuerte' : '');
  const r = document.createElement('span');
  r.className = 'rec-rot cob-r-rot';
  r.textContent = rot;
  const l = document.createElement('span');
  l.className = 'rec-lin';
  const v = document.createElement('span');
  v.className = 'rec-val';
  v.textContent = valor;
  d.appendChild(r);
  d.appendChild(l);
  d.appendChild(v);
  return d;
}

// El sello: lo que se le dice al cliente sobre el pago. En palabras.
function cobPintarEstado(c) {
  const caja = document.getElementById('cob-r-estado');
  if (!caja) return;
  caja.innerHTML = '';
  const e = cobEstadoEnPalabras(c);
  const sello = document.createElement('div');
  sello.className = 'cob-sello cob-sello-' + e.tono;
  const t = document.createElement('strong');
  t.textContent = e.titulo;
  sello.appendChild(t);
  if (e.detalle) {
    const d = document.createElement('span');
    d.textContent = e.detalle;
    sello.appendChild(d);
  }
  caja.appendChild(sello);
}

// Lo comparten la pantalla y la imagen (src/cobro-descargar.js).
function cobEstadoEnPalabras(c) {
  const estado = cobroEstado(c);
  if (estado === 'presupuesto') {
    return {
      tono: 'lento',
      titulo: 'Presupuesto',
      detalle: 'Vale por ' + COBRO_VALE_DIAS + ' días, hasta el ' +
               cobFecha(Number(c.fecha) + COBRO_VALE_DIAS * 86400000) + '.'
    };
  }
  if (estado === 'pagada') return { tono: 'bien', titulo: 'Pagado ✓', detalle: 'Gracias por su pago.' };
  if (estado === 'abonada') {
    return {
      tono: 'ojo',
      titulo: 'Queda debiendo ' + recPlata(cobroSaldo(c)),
      detalle: 'Ha abonado ' + recPlata(cobroAbonado(c)) + ' de ' + recPlata(c.total) + '.'
    };
  }
  return { tono: 'ojo', titulo: 'Pendiente de pago', detalle: '' };
}

function cobPintarAbonos(c) {
  const cont = document.getElementById('cob-r-abonos');
  if (!cont) return;
  cont.innerHTML = '';
  if (!c.abonos.length) return;
  const tit = document.createElement('p');
  tit.className = 'cua-rotulo';
  tit.textContent = 'Lo que ha pagado';
  cont.appendChild(tit);
  c.abonos.forEach(function (a, i) {
    const fila = cobRenglon('Abono del ' + cobFechaCorta(a.fecha), recPlata(a.monto), false);
    if (c.guardada) {
      fila.appendChild(cobBotonQuitar('Borrar este abono', function () { cobBorrarAbono(i); }));
    }
    cont.appendChild(fila);
  });
}

function cobGuardar() {
  const c = cobAhora;
  if (!c) return;
  if (cobAntesDelEjemplo && !c.guardada) {
    cobAvisar('Esto es de práctica, mijo: no se guarda. Pero así mismito se hace con uno de verdad.');
    return;
  }
  const esNueva = !c.id;
  const hacer = esNueva ? dbGuardarCobro(c) : dbActualizarCobro(c.id, c).then(function () { return c.id; });
  hacer.then(function (id) {
    c.id = id;
    c.guardada = true;
    cobEditando = null;
    cobTrabajo = Object.assign(cobroTrabajoVacio(), { margen: cobTrabajo.margen });
    cobFirmaMat = null;
    cobFirmaOtros = null;
    cobGuardarYa();
    cobPintarHoja();
    cobPintarRecibo();
    cobAvisar(esNueva
      ? 'Quedó guardada: ' + (c.tipo === 'presupuesto' ? 'presupuesto ' : 'cuenta ') +
        cobroNumeroBonito(c.numero) + (c.cliente ? ' de ' + c.cliente : '') + '.'
      : 'Listo: guardé los cambios de la cuenta ' + cobroNumeroBonito(c.numero) + '.');
    return cobCargarCuentas();
  }).catch(function (e) {
    console.error('No se pudo guardar la cuenta:', e);
    cobAvisar('No se pudo guardar. Intente otra vez.');
  });
}

function cobActualizarGuardada() {
  const c = cobAhora;
  if (!c || !c.guardada) return Promise.resolve();
  return dbActualizarCobro(c.id, c).then(cobCargarCuentas).then(cobPintarRecibo);
}

function cobCambiarTipo() {
  const c = cobAhora;
  if (!c) return;
  const aCobro = c.tipo === 'presupuesto';
  c.tipo = aCobro ? 'cobro' : 'presupuesto';
  if (!c.guardada) {
    cobTrabajo.tipo = c.tipo;
    cobGuardarLuego();
    cobPintarRecibo();
    return;
  }
  // El presupuesto aceptado se vuelve cuenta de cobro con la fecha de hoy:
  // desde hoy es que le deben.
  if (aCobro) c.fecha = Date.now();
  cobActualizarGuardada().then(function () {
    cobAvisar(aCobro ? 'Listo: ahora es una cuenta de cobro. Ya le puede anotar abonos.'
                     : 'Listo: la volví presupuesto.');
  });
}

function cobAnotarAbono(monto) {
  const c = cobAhora;
  if (!c || !c.guardada) return;
  const campo = document.getElementById('cob-abono');
  let n = monto !== undefined ? monto : recNumero(campo ? campo.value : '');
  if (!(n > 0)) {
    cobAvisar('Escriba cuánto le pagaron.');
    if (campo) campo.focus();
    return;
  }
  const saldo = cobroSaldo(c);
  let aviso = '';
  if (n > saldo) {
    n = saldo;
    aviso = 'Le pagaron de más: anoté solo lo que debía (' + recPlata(saldo) + ').';
  }
  c.abonos.push({ monto: n, fecha: Date.now() });
  if (campo) campo.value = '';
  cobActualizarGuardada().then(function () {
    const falta = cobroSaldo(c);
    cobAvisar(aviso || (falta > 0
      ? 'Anotado. Le quedan debiendo ' + recPlata(falta) + '.'
      : '¡Le pagaron todo! Quedó sellada como pagada.'));
  });
}

function cobBorrarAbono(i) {
  const c = cobAhora;
  if (!c || !c.abonos[i]) return;
  const quitado = c.abonos.splice(i, 1)[0];
  cobActualizarGuardada().then(function () {
    cobAvisar('Borré el abono de ' + recPlata(quitado.monto) + '.', {
      texto: 'Deshacer',
      hacer: function () {
        if (cobAhora !== c) return;
        c.abonos.splice(i, 0, quitado);
        cobActualizarGuardada();
      }
    });
  });
}

function cobCorregir() {
  const c = cobAhora;
  if (!c || !c.datos) {
    cobAvisar('Esta cuenta no se puede abrir en la hoja.');
    return;
  }
  cobTrabajo = cobTrabajoNormal(c.datos);
  cobTrabajo.tipo = c.tipo;
  cobEditando = c.id;
  cobFirmaMat = null;
  cobFirmaOtros = null;
  cobGuardarYa();
  cobEsconderRecibo();
  cobPintarHoja();
  cobPintarEditando();
  const hoja = document.querySelector('.cob-hoja');
  if (hoja) hoja.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cobQuitar() {
  const c = cobAhora;
  if (!c || !c.id) return;
  const copia = Object.assign({}, c);
  dbBorrarCobro(c.id).then(function () {
    if (cobEditando === c.id) cobEditando = null;
    cobEsconderRecibo();
    cobCargarCuentas();
    cobAvisar('Quité la cuenta ' + cobroNumeroBonito(c.numero) + '.', {
      texto: 'Deshacer',
      hacer: function () { dbActualizarCobro(copia.id, copia).then(cobCargarCuentas); }
    });
  });
}

// ----------------------------------------------------------------
// 4. Mis cuentas de cobro
// ----------------------------------------------------------------
function cobPintarLibreta() {
  const cont = document.getElementById('cob-libreta-lista');
  if (!cont) return;
  cont.innerHTML = '';

  const deben = cobCuentas.filter(function (c) {
    const e = cobroEstado(c);
    return e === 'debe' || e === 'abonada';
  }).sort(function (a, b) { return a.fecha - b.fecha; });
  const pres = cobCuentas.filter(function (c) { return c.tipo === 'presupuesto'; });
  const pagadas = cobCuentas.filter(function (c) { return cobroEstado(c) === 'pagada'; });

  const leDeben = deben.reduce(function (s, c) { return s + cobroSaldo(c); }, 0);
  const pepita = document.getElementById('cob-libreta-cuenta');
  if (pepita) {
    pepita.classList.toggle('oculto', !cobCuentas.length);
    pepita.textContent = leDeben > 0 ? 'le deben ' + recPlata(leDeben) : String(cobCuentas.length);
  }

  if (!cobCuentas.length) {
    const p = document.createElement('p');
    p.className = 'cob-lib-vacia';
    p.textContent = 'Todavía no ha guardado ninguna cuenta, mijo. Haga la primera arriba.';
    cont.appendChild(p);
    return;
  }

  cobSeccion(cont, 'Me deben', deben);
  cobSeccion(cont, 'Presupuestos que mandé', pres);
  cobSeccion(cont, 'Ya me pagaron', pagadas.slice(0, 15));
}

function cobSeccion(cont, titulo, lista) {
  if (!lista.length) return;
  const t = document.createElement('p');
  t.className = 'ah-lib-seccion';
  t.textContent = titulo;
  cont.appendChild(t);
  lista.forEach(function (c) { cont.appendChild(cobLibRenglon(c)); });
}

function cobLibRenglon(c) {
  const estado = cobroEstado(c);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ah-lib-item cob-lib-' + estado;

  const izq = document.createElement('span');
  izq.className = 'ah-lib-izq';
  const nom = document.createElement('span');
  nom.className = 'ah-lib-nombre';
  nom.textContent = c.cliente || 'Sin nombre';
  const sub = document.createElement('span');
  sub.className = 'ah-lib-sub';
  sub.textContent = [c.trabajo, cobroNumeroBonito(c.numero), cobroHaceCuanto(c.fecha)]
    .filter(Boolean).join(' · ');
  izq.appendChild(nom);
  izq.appendChild(sub);

  const der = document.createElement('span');
  der.className = 'ah-lib-der';
  const plata = document.createElement('span');
  plata.className = 'ah-lib-plata';
  plata.textContent = recPlata(estado === 'debe' || estado === 'abonada' ? cobroSaldo(c) : c.total);
  const pill = document.createElement('span');
  const p = cobPildora(c, estado);
  pill.className = 'ah-lib-plazo ah-lib-plazo-' + p.tono;
  pill.textContent = p.txt;
  der.appendChild(plata);
  der.appendChild(pill);

  const ir = document.createElement('span');
  ir.className = 'ah-lib-ir';
  ir.setAttribute('aria-hidden', 'true');
  ir.textContent = '›';

  b.appendChild(izq);
  b.appendChild(der);
  b.appendChild(ir);
  b.addEventListener('click', function () { cobVerCuenta(c.id); });
  return b;
}

// Más de un mes sin pagar se pone rojo: ahí ya toca ir a cobrar.
function cobPildora(c, estado) {
  const dias = cobroDiasDesde(c.fecha);
  if (estado === 'pagada') return { tono: 'bien', txt: 'pagada ✓' };
  if (estado === 'presupuesto') {
    return dias > COBRO_VALE_DIAS ? { tono: 'no', txt: 'ya se venció' } : { tono: 'lento', txt: 'presupuesto' };
  }
  if (dias > 30) return { tono: 'no', txt: 'hace ' + dias + ' días' };
  if (estado === 'abonada') return { tono: 'lento', txt: 'abonó ' + recPlata(cobroAbonado(c)) };
  return { tono: 'lento', txt: 'le debe todo' };
}

function cobVerCuenta(id) {
  const c = cobCuentas.find(function (x) { return x.id === id; });
  if (!c) return;
  cobAhora = Object.assign(JSON.parse(JSON.stringify(c)), { guardada: true });
  cobMostrarRecibo();
}

// ----------------------------------------------------------------
// La cabecera, la moneda y el aviso
// ----------------------------------------------------------------
function cobPintarJornal() {
  if (typeof pintarJornal !== 'function' || vistaActiva() !== 'cotizar' || !cobTrabajo) return;
  // Al llegar a Cobrar la hoja de Ahorro ya cargó: que el piso de "sus gastos
  // del mes" salga al día.
  cobPintarYo();
  // En Cobrar el número de arriba es lo que se quiere ganar al mes (pedido por
  // David): lo que hay que cobrar por ESTE trabajo ya sale grande en la hoja.
  pintarJornal('Quiere ganar al mes:', cobPerfil.ganarMes > 0 ? recPlata(cobPerfil.ganarMes) : '—');
  const num = document.getElementById('jornal-num');
  if (num) num.classList.toggle('jornal-rojo', cobroFrenteAlBasico(cobPerfil, cobMoneda()).tono === 'no');
}

// Lo llama refrescarTodo() (src/app.js) cuando cambia la moneda.
function cobRefrescar() {
  if (!cobPerfil) return;
  cobPintarTodo();
  if (cobAhora) cobPintarRecibo();
  cobPintarLibreta();
}

function cobMoneda() {
  return typeof monedaActual !== 'undefined' ? monedaActual : 'COP';
}

function cobAvisar(texto, accion) {
  const av = document.getElementById('cob-aviso');
  if (!av) return;
  av.textContent = texto;
  if (accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ah-aviso-btn';
    b.textContent = accion.texto;
    b.addEventListener('click', function () {
      av.classList.add('oculto');
      accion.hacer();
    });
    av.appendChild(b);
  }
  av.classList.remove('oculto');
  if (cobAvisoTimer) clearTimeout(cobAvisoTimer);
  cobAvisoTimer = setTimeout(function () { av.classList.add('oculto'); }, accion ? 7000 : 4000);
}

function cobMostrar(id, si) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('oculto', !si);
}

function cobTexto(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// Pone el texto de un campo SIN pisar lo que la persona está escribiendo.
function cobPonerTexto(id, valor, aunEnfocado) {
  const el = document.getElementById(id);
  if (!el || (!aunEnfocado && document.activeElement === el)) return;
  el.value = valor || '';
}

// Lo que vale el día o la hora sale de una división y trae centavos sueltos
// ("$ 6.818,18"). En cifras grandes se muestran pesos enteros; en las chicas
// (dólares, euros) se dejan los centavos, que ahí sí pesan.
function cobPlataRedonda(n) {
  const v = Number(n) || 0;
  return recPlata(Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);
}

function cobFuerte(padre, txt) {
  const s = document.createElement('strong');
  s.textContent = txt;
  padre.appendChild(s);
}

function cobFecha(ms) {
  try {
    return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return new Date(ms).toLocaleDateString();
  }
}

function cobFechaCorta(ms) {
  try {
    return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch (e) {
    return new Date(ms).toLocaleDateString();
  }
}
