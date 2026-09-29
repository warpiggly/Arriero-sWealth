// =================================================================
// app.js — Lo que comparte toda la app
//
// Las vistas y las estrellas, las dos mulas de abajo, el número grande de la
// cabecera y la moneda. Va PRIMERO en popup.html: el resto de la app usa sus
// funciones (formatearDinero, soloDigitos, pintarJornal...).
//
// Antes se llamaba logic_quotation.js y además tenía el cotizador de
// mosaicos. El 29 de septiembre de 2026 Cobrar se rehízo con la cara de
// Ahorro y el cotizador se fue a src/cobro.js (las cuentas) y src/cobrar.js
// (la pantalla).
// =================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Moneda: llenar el menú, cargar la guardada y reaccionar al cambio
  poblarSelectorMoneda();
  cargarMoneda();
  const selMoneda = document.getElementById('selector-moneda');
  if (selMoneda) selMoneda.addEventListener('change', () => cambiarMoneda(selMoneda.value));

  // Estrellas: cambiar de vista
  document.querySelectorAll('.estrella').forEach(b => {
    b.addEventListener('click', () => cambiarVista(b.dataset.view, b));
  });

  // Las DOS MULAS (control de abajo): un toque cambia de sección Y abre su
  // contenido. Si se toca la que ya está abierta al frente, se cierra.
  // Mantienen marcada la 1ª estrella (no la bolita).
  const estrellaUno = document.querySelector('.estrella[data-view="metas"]');
  document.querySelectorAll('.bolita-mula').forEach(b => {
    b.addEventListener('click', () => activarMula(b.dataset.view, estrellaUno));
  });
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

// Muestra la vista indicada y marca la estrella activa
function cambiarVista(idVista, estrella) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  const vista = document.getElementById(idVista);
  if (vista) vista.classList.add('activa');

  document.querySelectorAll('.estrella').forEach(e => e.classList.remove('activa'));
  if (estrella) estrella.classList.add('activa');

  // Las dos mulas (bolitas) solo se ven en la 1ª estrella y resaltan la activa.
  actualizarBolitas(idVista);

  // El número grande de la cabecera cambia de significado según la vista.
  actualizarCabecera();
}

// Panel colapsable que le corresponde a cada mula.
function panelDeVista(idVista) {
  if (idVista === 'metas')   return document.getElementById('panel-metas');
  if (idVista === 'cotizar') return document.getElementById('panel-calculo');
  return null;
}

// Abre o cierra el panel de una vista.
function ponerPanel(idVista, abierto) {
  const panel = panelDeVista(idVista);
  if (panel) panel.classList.toggle('cerrado', !abierto);
  const bolita = document.querySelector(`.bolita-mula[data-view="${idVista}"]`);
  if (bolita) bolita.classList.toggle('abierta', abierto);
}

// Clic en una mula (el control de abajo). Un solo toque:
//   · si su sección ya está al frente y abierta -> la cierra (interruptor);
//   · si no -> cambia a su sección y abre su contenido.
function activarMula(idVista, estrella) {
  const panel = panelDeVista(idVista);
  const yaAlFrente = vistaActiva() === idVista;
  const abierto = !!(panel && !panel.classList.contains('cerrado'));
  if (yaAlFrente && abierto) {
    ponerPanel(idVista, false);
  } else {
    cambiarVista(idVista, estrella);
    ponerPanel(idVista, true);
  }
}

// Muestra la barra de las dos mulas SOLO en la 1ª estrella (Ahorro/Cobrar) y
// resalta la mula que corresponde a la vista activa. En construcción, la
// barra se oculta.
function actualizarBolitas(idVista) {
  const barra = document.getElementById('bolitas-mulas');
  if (!barra) return;
  const enPrimeraEstrella = (idVista === 'metas' || idVista === 'cotizar');
  barra.classList.toggle('oculta', !enPrimeraEstrella);
  barra.querySelectorAll('.bolita-mula').forEach(b => {
    const activa = b.dataset.view === idVista;
    b.classList.toggle('activa', activa);
    b.setAttribute('aria-selected', activa ? 'true' : 'false');
  });
}

// ¿Qué vista está activa ahora? Devuelve su id (ej: 'metas', 'cotizar').
function vistaActiva() {
  const v = document.querySelector('.vista.activa');
  return v ? v.id : '';
}

// Escribe la etiqueta y el número grande de la cabecera (la caja dorada).
// Lo usan Ahorro y Cobrar, según cuál esté al frente.
function pintarJornal(etiqueta, valorTexto) {
  const lbl = document.getElementById('jornal-label');
  const num = document.getElementById('jornal-num');
  if (lbl) lbl.textContent = etiqueta;
  if (num) {
    num.textContent = valorTexto;
    // El rojo lo pone la vista que lo necesite (Cobrar, bajo el básico).
    num.classList.remove('jornal-rojo');
  }
}

// Repinta la cabecera con lo que corresponde a la vista activa: en AHORRO,
// "Puede guardar"; en Cobrar, "Deberías cobrar".
//
// OJO: ESTA FUNCIÓN CORRE CADA VEZ QUE SE CAMBIA DE VISTA, así que lo que
// escriba aquí PISA lo que la vista haya pintado por su cuenta. En la Fase 1
// del rediseño esto tenía un guion de marcador temporal, y al llegar el recibo
// se quedó sin cambiar: el número aparecía un instante y la mula de Ahorro lo
// borraba. Quien manda sobre ese número es la vista, no esta función; aquí solo
// se le pide que lo pinte.
function actualizarCabecera() {
  const vista = vistaActiva();

  if (vista === 'metas') {
    // El dueño del número es src/recibo.js, que es el que sabe cuánto puede
    // guardar la persona. La guarda de typeof es para que la app no se caiga
    // si algún día esa vista no está cargada.
    if (typeof recPintarJornal === 'function') {
      recPintarJornal();
    } else {
      pintarJornal('Puede guardar:', '—');
    }
    return;
  }

  // En Cobrar el dueño es src/cobrar.js, que sabe cuánto va la hoja.
  if (vista === 'cotizar' && typeof cobPintarJornal === 'function') {
    cobPintarJornal();
    return;
  }
  pintarJornal('Deberías cobrar:', '—');
}

// ----------------------------------------------------------------
// Moneda (divisa) — el usuario puede cambiarla cuando quiera
//
// IMPORTANTE: NO convertimos entre monedas. Convertir (ej: COP -> USD)
// necesitaría tasas de cambio que cambian a diario, y sin una fuente externa
// daríamos cifras falsas. En vez de eso, cada cuenta se trabaja en UNA
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

// Igual que formatearDinero, pero SIN los centavos cuando el monto es redondo.
// Lo usa el recibo del ahorro, y la razón es el público de la app: "$ 850.000"
// se lee de un golpe, y "$ 850.000,00" hay que descifrarlo. Cuando el monto
// trae centavos de verdad, sí se muestran — no se pierde precisión, solo se
// quita el ruido.
//
// Va aquí, al lado de formatearDinero, porque las dos tienen que mirar la
// MISMA moneda: si algún día se le agrega una moneda a MONEDAS, las dos la
// heredan sin que nadie se acuerde de esta.
function formatearDineroLimpio(valor) {
  const m = monedaConfig();
  const num = parseFloat(valor);
  const seguro = isNaN(num) ? 0 : num;
  const redondo = Math.abs(seguro - Math.round(seguro)) < 0.005;
  return new Intl.NumberFormat(m.locale, {
    style: 'currency',
    currency: m.codigo,
    minimumFractionDigits: redondo ? 0 : 2,
    maximumFractionDigits: redondo ? 0 : 2
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

// Vuelve a pintar todo lo que muestra dinero.
function refrescarTodo() {
  if (typeof cobRefrescar === 'function') cobRefrescar();

  // El recibo del ahorro es casi puro dinero: si cambió la moneda, hay que
  // REHACERLO, no solo repintarlo — las frases del veredicto llevan las cifras
  // metidas por dentro ("tendría que sacar $800.000 del colchón"), así que un
  // repintado dejaría números de la moneda vieja dentro de las frases.
  if (typeof recRefrescar === 'function') recRefrescar();
}
