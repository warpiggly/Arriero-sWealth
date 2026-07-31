// =================================================================
// calculadora.js — "La calculadora del arriero"
//
// Una calculadora de toda la vida (números, + − × ÷, coma, %, =) metida en una
// ventana flotante que sale con el botón de la vista de Ahorro. Además trae:
//
//   · ATAJOS DE ARRIERO: las cuentas que uno hace siempre para ahorrar
//       ÷ 12 · al mes   ÷ 30 · al día   × 12 · al año   10 % de esto
//     Cada atajo trabaja sobre lo que está en la pantalla y cancela la
//     operación que estuviera a medias (así no hay sorpresas).
//
//   · LA CINTA: como el rollo de papel de una calculadora de escritorio. Cada
//     cuenta que el usuario guarda queda apuntada con su operación, su
//     resultado y un nombre opcional. Se guarda en chrome.storage.sync, así que
//     sigue ahí cuando vuelva a abrir el popup. Tocar una cuenta de la cinta
//     devuelve su resultado a la pantalla.
//
// NOTA SOBRE LOS NÚMEROS: se trabaja con coma decimal y punto de miles (es-CO),
// igual que el resto de la app. La entrada se guarda como TEXTO (calcEntrada)
// para no perder ceros ni comas mientras el usuario escribe, y solo se pasa a
// número al operar.
// =================================================================

const CALC_CINTA_KEY = 'calcCinta';
const CALC_CINTA_MAX = 30;          // tope: la cinta no crece sin control
const CALC_MAX_DIGITOS = 15;        // más allá de esto los números pierden precisión

// --- Estado de la calculadora -------------------------------------
let calcEntrada = '0';       // lo que se ve en la pantalla, como texto
let calcAcumulado = null;    // el número que quedó a la izquierda del operador
let calcOperador = null;     // '+', '−', '×', '÷'
let calcReiniciar = false;   // true = el próximo dígito arranca un número nuevo
let calcExpresion = '';      // la última cuenta hecha, en texto ("1.200 ÷ 12")
let calcCinta = [];          // [{ id, operacion, resultado, nombre }]

// Acceso a chrome.storage a prueba de balas: si la app se abre como archivo
// suelto (sin ser extensión) no existe `chrome` y no queremos que truene.
function calcAlmacen() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      return chrome.storage.sync;
    }
  } catch (e) { /* sin almacenamiento: la calculadora igual funciona */ }
  return null;
}

// ----------------------------------------------------------------
// Arranque
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  const abrir = document.getElementById('abrir-calculadora');
  if (abrir) abrir.addEventListener('click', abrirCalculadora);

  const cerrar = document.getElementById('calc-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarCalculadora);

  // Tocar el fondo oscurecido también cierra
  const fondo = document.getElementById('calc-fondo');
  if (fondo) fondo.addEventListener('click', cerrarCalculadora);

  // Teclado: números y operadores
  document.querySelectorAll('.calc-tecla').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.num !== undefined) { calcMeterCaracter(t.dataset.num); return; }
      if (t.dataset.op !== undefined) { calcOperar(t.dataset.op); return; }
      switch (t.dataset.accion) {
        case 'igual':      calcIgual(); break;
        case 'limpiar':    calcLimpiar(); break;
        case 'borrar':     calcBorrar(); break;
        case 'porcentaje': calcPorcentaje(); break;
        case 'signo':      calcSigno(); break;
      }
    });
  });

  // Atajos de arriero
  document.querySelectorAll('.calc-atajo').forEach(function (a) {
    a.addEventListener('click', function () { calcAtajo(a.dataset.atajo); });
  });

  // Guardar en la cinta
  const guardar = document.getElementById('calc-guardar-btn');
  if (guardar) guardar.addEventListener('click', calcGuardarEnCinta);

  const nombre = document.getElementById('calc-nombre');
  if (nombre) {
    nombre.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); calcGuardarEnCinta(); }
    });
  }

  const limpiarCinta = document.getElementById('calc-cinta-limpiar');
  if (limpiarCinta) limpiarCinta.addEventListener('click', calcVaciarCinta);

  // Teclado físico (solo mientras la ventana está abierta)
  document.addEventListener('keydown', calcTeclaFisica);

  calcCargarCinta();
  calcPintar();
});

// ----------------------------------------------------------------
// Abrir / cerrar la ventana
// ----------------------------------------------------------------
function calcAbierta() {
  const v = document.getElementById('calc-ventana');
  return !!(v && !v.classList.contains('oculto'));
}

function abrirCalculadora() {
  const fondo = document.getElementById('calc-fondo');
  const vent = document.getElementById('calc-ventana');
  if (!fondo || !vent) return;

  // La ventana va con position:absolute sobre TODO el documento, así que
  // subimos al tope para que quede siempre a la vista, y bloqueamos el
  // desplazamiento para que no se pueda "perder" detrás del fondo oscuro.
  window.scrollTo(0, 0);
  document.documentElement.classList.add('calc-abierta');

  fondo.classList.remove('oculto');
  vent.classList.remove('oculto');
  calcPintar();
}

function cerrarCalculadora() {
  const fondo = document.getElementById('calc-fondo');
  const vent = document.getElementById('calc-ventana');
  if (fondo) fondo.classList.add('oculto');
  if (vent) vent.classList.add('oculto');
  document.documentElement.classList.remove('calc-abierta');
}

// ----------------------------------------------------------------
// Formato de números (coma decimal, punto de miles — igual que la app)
// ----------------------------------------------------------------
// Pone los puntos de miles sin pasar por Number, para no perder precisión ni
// los ceros que el usuario esté escribiendo ("1,50" sigue siendo "1,50").
function calcFormatear(entrada) {
  const negativo = entrada.charAt(0) === '-';
  const cuerpo = negativo ? entrada.slice(1) : entrada;
  const partes = cuerpo.split(',');
  const enteros = partes[0] === '' ? '0' : partes[0];
  let txt = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (partes.length > 1) txt += ',' + partes[1];
  return (negativo ? '-' : '') + txt;
}

// Texto de la pantalla -> número
function calcANumero(entrada) {
  const n = parseFloat(String(entrada).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Número -> texto de la pantalla. Redondea un pelito para matar el ruido de la
// coma flotante (lo clásico: 0,1 + 0,2 = 0,30000000000000004).
function calcDeNumero(n) {
  const limpio = Math.round(n * 1e8) / 1e8;
  return String(limpio).replace('.', ',');
}

// ----------------------------------------------------------------
// Pintar la pantalla
// ----------------------------------------------------------------
function calcPintar() {
  const num = document.getElementById('calc-numero');
  const op = document.getElementById('calc-operacion');
  if (num) num.textContent = calcFormatear(calcEntrada);
  if (op) {
    if (calcOperador && calcAcumulado !== null) {
      op.textContent = calcFormatear(calcDeNumero(calcAcumulado)) + ' ' + calcOperador;
    } else {
      op.textContent = calcExpresion ? calcExpresion + ' =' : '';
    }
  }
}

// Aviso corto en la pantalla (división por cero, número gigante…)
function calcAviso(texto) {
  const num = document.getElementById('calc-numero');
  const op = document.getElementById('calc-operacion');
  if (op) op.textContent = '';
  if (num) num.textContent = texto;
  calcEntrada = '0';
  calcAcumulado = null;
  calcOperador = null;
  calcExpresion = '';
  calcReiniciar = true;
}

// ----------------------------------------------------------------
// Escribir números
// ----------------------------------------------------------------
function calcMeterCaracter(c) {
  if (c === ',') { calcMeterComa(); return; }

  if (calcReiniciar) { calcEntrada = '0'; calcReiniciar = false; calcExpresion = ''; }

  // No dejamos crecer el número más allá de la precisión confiable
  const digitos = calcEntrada.replace(/[^0-9]/g, '').length;
  if (digitos >= CALC_MAX_DIGITOS) return;

  if (calcEntrada === '0') calcEntrada = c;
  else if (calcEntrada === '-0') calcEntrada = '-' + c;
  else calcEntrada += c;

  calcPintar();
}

function calcMeterComa() {
  if (calcReiniciar) { calcEntrada = '0'; calcReiniciar = false; calcExpresion = ''; }
  if (calcEntrada.indexOf(',') === -1) calcEntrada += ',';
  calcPintar();
}

function calcBorrar() {
  if (calcReiniciar) { calcLimpiar(); return; }
  calcEntrada = calcEntrada.slice(0, -1);
  if (calcEntrada === '' || calcEntrada === '-') calcEntrada = '0';
  calcPintar();
}

function calcLimpiar() {
  calcEntrada = '0';
  calcAcumulado = null;
  calcOperador = null;
  calcExpresion = '';
  calcReiniciar = false;
  calcPintar();
}

function calcSigno() {
  if (calcEntrada === '0') return;
  calcEntrada = calcEntrada.charAt(0) === '-' ? calcEntrada.slice(1) : '-' + calcEntrada;
  calcPintar();
}

// % = convertir lo de la pantalla en porcentaje (dividir entre 100).
// Se deja así, simple y predecible, en vez del "% del anterior" que confunde.
function calcPorcentaje() {
  const n = calcANumero(calcEntrada);
  calcExpresion = calcFormatear(calcEntrada) + ' %';
  calcEntrada = calcDeNumero(n / 100);
  calcReiniciar = true;
  calcPintar();
}

// ----------------------------------------------------------------
// Operar
// ----------------------------------------------------------------
function calcAplicar(a, operador, b) {
  let r;
  switch (operador) {
    case '+': r = a + b; break;
    case '−': r = a - b; break;
    case '×': r = a * b; break;
    case '÷':
      if (b === 0) { calcAviso('No se puede'); return null; }
      r = a / b;
      break;
    default: return null;
  }
  if (!isFinite(r) || Math.abs(r) >= 1e15) { calcAviso('Muy grande'); return null; }
  return r;
}

// Tocar un operador: si ya había uno pendiente, primero resuelve lo anterior
// (así 2 + 3 + 4 va mostrando resultados, como cualquier calculadora).
function calcOperar(operador) {
  const actual = calcANumero(calcEntrada);

  if (calcOperador !== null && calcAcumulado !== null && !calcReiniciar) {
    const r = calcAplicar(calcAcumulado, calcOperador, actual);
    if (r === null) return;
    calcAcumulado = r;
    calcEntrada = calcDeNumero(r);
  } else {
    calcAcumulado = actual;
  }

  calcOperador = operador;
  calcReiniciar = true;
  calcExpresion = '';
  calcPintar();
}

function calcIgual() {
  if (calcOperador === null || calcAcumulado === null) return;

  const b = calcANumero(calcEntrada);
  const a = calcAcumulado;
  const r = calcAplicar(a, calcOperador, b);
  if (r === null) return;

  calcExpresion = calcFormatear(calcDeNumero(a)) + ' ' + calcOperador + ' ' + calcFormatear(calcDeNumero(b));
  calcEntrada = calcDeNumero(r);
  calcAcumulado = null;
  calcOperador = null;
  calcReiniciar = true;
  calcPintar();
}

// ----------------------------------------------------------------
// Atajos de arriero
// ----------------------------------------------------------------
function calcAtajo(tipo) {
  const n = calcANumero(calcEntrada);
  const visto = calcFormatear(calcEntrada);
  let r, texto;

  switch (tipo) {
    case 'mes':  r = n / 12;  texto = visto + ' ÷ 12 (al mes)'; break;
    case 'dia':  r = n / 30;  texto = visto + ' ÷ 30 (al día)'; break;
    case 'anio': r = n * 12;  texto = visto + ' × 12 (al año)'; break;
    case 'diez': r = n * 0.1; texto = '10 % de ' + visto;       break;
    default: return;
  }

  if (!isFinite(r) || Math.abs(r) >= 1e15) { calcAviso('Muy grande'); return; }

  // El atajo cancela lo que estuviera a medias: trabaja sobre la pantalla.
  calcAcumulado = null;
  calcOperador = null;
  calcExpresion = texto;
  calcEntrada = calcDeNumero(r);
  calcReiniciar = true;
  calcPintar();
}

// ----------------------------------------------------------------
// Teclado físico
// ----------------------------------------------------------------
function calcTeclaFisica(e) {
  if (!calcAbierta()) return;

  // Escape cierra siempre, incluso escribiendo el nombre de la cuenta
  if (e.key === 'Escape') { e.preventDefault(); cerrarCalculadora(); return; }

  // Si está escribiendo el nombre de la cuenta, el teclado es para el texto
  if (document.activeElement && document.activeElement.id === 'calc-nombre') return;

  if (e.key >= '0' && e.key <= '9') { e.preventDefault(); calcMeterCaracter(e.key); return; }

  switch (e.key) {
    case ',': case '.':      e.preventDefault(); calcMeterComa(); break;
    case '+':                e.preventDefault(); calcOperar('+'); break;
    case '-':                e.preventDefault(); calcOperar('−'); break;
    case '*': case 'x':      e.preventDefault(); calcOperar('×'); break;
    case '/':                e.preventDefault(); calcOperar('÷'); break;
    case '=': case 'Enter':  e.preventDefault(); calcIgual(); break;
    case 'Backspace':        e.preventDefault(); calcBorrar(); break;
    case 'Delete':           e.preventDefault(); calcLimpiar(); break;
    case '%':                e.preventDefault(); calcPorcentaje(); break;
  }
}

// ----------------------------------------------------------------
// LA CINTA (cuentas guardadas)
// ----------------------------------------------------------------
function calcCargarCinta() {
  const almacen = calcAlmacen();
  if (!almacen) { calcRenderCinta(); return; }
  almacen.get([CALC_CINTA_KEY], function (data) {
    calcCinta = (data && data[CALC_CINTA_KEY]) || [];
    calcRenderCinta();
  });
}

function calcPersistirCinta() {
  const almacen = calcAlmacen();
  if (!almacen) return;
  const datos = {};
  datos[CALC_CINTA_KEY] = calcCinta;
  almacen.set(datos);
}

function calcGuardarEnCinta() {
  const campoNombre = document.getElementById('calc-nombre');
  const nombre = campoNombre ? campoNombre.value.trim() : '';

  // Si no hizo ninguna cuenta, guardamos el número tal cual (también sirve
  // para apuntar una cifra que no quiere olvidar).
  const operacion = calcExpresion || calcFormatear(calcEntrada);

  calcCinta.unshift({
    id: 'cta_' + Date.now(),
    operacion: operacion,
    resultado: calcFormatear(calcEntrada),
    nombre: nombre
  });

  // Tope: nos quedamos con las más recientes
  if (calcCinta.length > CALC_CINTA_MAX) calcCinta = calcCinta.slice(0, CALC_CINTA_MAX);

  calcPersistirCinta();
  calcRenderCinta();

  if (campoNombre) campoNombre.value = '';

  // Un guiño de que quedó guardada
  const caja = document.getElementById('calc-cinta');
  if (caja && caja.firstChild) {
    caja.firstChild.classList.add('recien');
    setTimeout(function () {
      if (caja.firstChild) caja.firstChild.classList.remove('recien');
    }, 900);
  }
}

function calcBorrarDeCinta(id) {
  calcCinta = calcCinta.filter(function (c) { return c.id !== id; });
  calcPersistirCinta();
  calcRenderCinta();
}

function calcVaciarCinta() {
  if (!calcCinta.length) return;
  if (!confirm('¿Borro todas las cuentas de la cinta, mijo?')) return;
  calcCinta = [];
  calcPersistirCinta();
  calcRenderCinta();
}

// Tocar una cuenta guardada devuelve su resultado a la pantalla.
function calcUsarDeCinta(c) {
  calcEntrada = String(c.resultado).replace(/\./g, '');
  calcAcumulado = null;
  calcOperador = null;
  calcExpresion = c.nombre || c.operacion;
  calcReiniciar = true;
  calcPintar();
}

function calcRenderCinta() {
  const cont = document.getElementById('calc-cinta');
  const vacia = document.getElementById('calc-cinta-vacia');
  if (!cont) return;

  cont.innerHTML = '';
  if (vacia) vacia.style.display = calcCinta.length ? 'none' : 'block';

  const limpiar = document.getElementById('calc-cinta-limpiar');
  if (limpiar) limpiar.style.visibility = calcCinta.length ? 'visible' : 'hidden';

  calcCinta.forEach(function (c) {
    const fila = document.createElement('div');
    fila.className = 'calc-cinta-fila';

    // Zona que se toca para reutilizar el resultado
    const usar = document.createElement('button');
    usar.type = 'button';
    usar.className = 'calc-cinta-usar';
    usar.title = 'Traer este resultado a la pantalla';

    if (c.nombre) {
      const nom = document.createElement('span');
      nom.className = 'calc-cinta-nombre';
      nom.textContent = c.nombre;        // textContent = a prueba de HTML
      usar.appendChild(nom);
    }

    const oper = document.createElement('span');
    oper.className = 'calc-cinta-oper';
    oper.textContent = c.operacion;
    usar.appendChild(oper);

    const res = document.createElement('span');
    res.className = 'calc-cinta-res';
    res.textContent = c.resultado;
    usar.appendChild(res);

    usar.addEventListener('click', function () { calcUsarDeCinta(c); });
    fila.appendChild(usar);

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'calc-cinta-x';
    x.textContent = '✕';
    x.title = 'Quitar de la cinta';
    x.addEventListener('click', function () { calcBorrarDeCinta(c.id); });
    fila.appendChild(x);

    cont.appendChild(fila);
  });
}
