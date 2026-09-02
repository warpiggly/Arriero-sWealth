// =================================================================
// calculadora.js — "La calculadora del arriero"
//
// Una calculadora de toda la vida (números, + − × ÷, coma, %, =) metida en una
// ventana flotante que sale con el botón de la vista de Ahorro. Además trae:
//
//   · ATAJOS DE ARRIERO: las cuentas que uno hace siempre para ahorrar
//       ÷ 12 · al mes   ÷ 30 · al día   × 12 · al año   10 % de esto
//     Cada atajo trabaja sobre lo que está en la pantalla y cancela la
//     operación que estuviera a medias (así no hay sorpresas). Son cuentas
//     puras: no guardan nada ni tocan el ahorro.
//
// ESTÁ A PROPÓSITO DESCONECTADA DE TODO. No apunta, no guarda, no reparte en
// sobres, no alimenta el ahorro. Existe y no afecta nada. El botón se queda en
// su lugar para que la gente ya esté acostumbrada a verlo el día que se le dé
// su uso creativo dentro del módulo de Ahorro.
//   Ver docs/modulo-ahorro/README.md, punto 2 ("La calculadora es el caso
//   especial") y punto 10.
//
// Lo que se le quitó en la Fase 1 del rediseño: la CINTA (el rollo de cuentas
// guardadas en chrome.storage.sync) y LOS SOBRES (el reparto del ingreso por
// categorías, que vivía dentro de esta misma ventana). Con eso afuera, lo que
// queda es un teclado limpio.
//
// NOTA SOBRE LOS NÚMEROS: se trabaja con coma decimal y punto de miles (es-CO),
// igual que el resto de la app. La entrada se guarda como TEXTO (calcEntrada)
// para no perder ceros ni comas mientras el usuario escribe, y solo se pasa a
// número al operar.
// =================================================================

const CALC_MAX_DIGITOS = 15;        // más allá de esto los números pierden precisión

// --- Estado de la calculadora -------------------------------------
// Vive solo en memoria: al cerrar el popup se olvida, como una calculadora de
// bolsillo a la que se le acabó la pila. Es lo que se busca.
let calcEntrada = '0';       // lo que se ve en la pantalla, como texto
let calcAcumulado = null;    // el número que quedó a la izquierda del operador
let calcOperador = null;     // '+', '−', '×', '÷'
let calcReiniciar = false;   // true = el próximo dígito arranca un número nuevo
let calcExpresion = '';      // la última cuenta hecha, en texto ("1.200 ÷ 12")

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

  // Teclado físico (solo mientras la ventana está abierta)
  document.addEventListener('keydown', calcTeclaFisica);

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

  if (e.key === 'Escape') { e.preventDefault(); cerrarCalculadora(); return; }

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
