// =================================================================
// ajustes.js — Lo que la app sabe de la persona
//
// UN SOLO DATO ES OBLIGATORIO: cuánto gana, con su frecuencia. Todo lo demás
// es opcional (docs/modulo-ahorro/README.md, punto 3).
//
// POR QUÉ ESTO NO VA EN INDEXEDDB: es poquita cosa (unos números) y va mejor en
// chrome.storage.sync, que además lo lleva de un computador a otro de la misma
// persona. Lo que no cabía en sync eran los ítems con sus links — esos viven en
// src/db.js.
//
// EL INGRESO PUEDE SER 0. No es un error ni un callejón sin salida: es un caso
// normal que la app tiene que atender (README, punto 3.1). Quien no gana nada
// igual merece que le digan cuánto tendría que juntar.
//
// EL PRELLENADO LLEGA EN CERO — decidido el 2 de septiembre de 2026. La app no
// se inventa cuánto gasta la gente. La consecuencia es que, vacío, la cuenta
// asume que puede guardar TODO lo que gana; por eso existe
// ajustesFaltaElPrellenado(), para que la pantalla lo diga en voz alta en vez
// de fingir que sabe. Ver el punto 3.2 del README.
//
// ESTE ARCHIVO NO TOCA LA PANTALLA.
// =================================================================

const AJUSTES_KEY = 'ajustesArriero';

// Cada cuánto le entra la plata, y cuántos de esos periodos caben en un mes.
// Sirve para llevar todo a "por mes" y poder comparar.
const FRECUENCIAS = {
  dia:      { rotulo: 'cada día',      alMes: 30 },
  semana:   { rotulo: 'cada semana',   alMes: 52 / 12 },
  quincena: { rotulo: 'cada quincena', alMes: 2 },
  mes:      { rotulo: 'cada mes',      alMes: 1 }
};

// Los renglones del prellenado, en el orden en que se muestran.
//
// `resta` dice qué le hace cada uno a la cuenta (README, punto 3.4):
//   true  -> es un gasto: se resta
//   false -> NO es un gasto
// El colchón se resta de lo disponible (se aparta) pero no se gasta: se guarda
// y se protege. El renglón de "ahorros" es el camino corto: si la persona lo
// llena, ese número manda sobre toda la cuenta.
const RENGLONES = [
  { clave: 'casa',             rotulo: 'Gastos de la casa',     resta: true },
  { clave: 'movilidad',        rotulo: 'Movilidad / transporte', resta: true },
  { clave: 'ocio',             rotulo: 'Ocio',                   resta: true },
  { clave: 'responsabilidades', rotulo: 'Responsabilidades',     resta: true },
  { clave: 'ahorros',          rotulo: 'Lo que ya aparta',       resta: false },
  { clave: 'colchon',          rotulo: 'Colchón (la reserva)',   resta: false }
];

function ajustesVacios() {
  return {
    ingreso: 0,
    frecuencia: 'mes',
    // Todos en cero: la app no adivina.
    gastos: {
      casa: 0,
      movilidad: 0,
      ocio: 0,
      responsabilidades: 0,
      ahorros: 0,
      colchon: 0
    },
    // El colchón es opcional: hay gente que lo maneja así y gente que no
    // (README, punto 3.3). Se puede apagar.
    usaColchon: true,
    // Lo que ya tiene juntado en el colchón, si lo sabe.
    colchonJuntado: 0
  };
}

function ajustesAlmacen() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      return chrome.storage.sync;
    }
  } catch (e) { /* sin almacén: la app funciona, solo no recuerda */ }
  return null;
}

function ajustesNumero(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

// Deja siempre un objeto completo y con números de verdad, aunque en el almacén
// haya quedado algo a medias o de una versión anterior.
function ajustesNormalizar(crudo) {
  const a = ajustesVacios();
  if (!crudo || typeof crudo !== 'object') return a;

  a.ingreso = ajustesNumero(crudo.ingreso);
  a.frecuencia = FRECUENCIAS[crudo.frecuencia] ? crudo.frecuencia : 'mes';
  a.usaColchon = crudo.usaColchon !== false;
  a.colchonJuntado = ajustesNumero(crudo.colchonJuntado);

  const g = crudo.gastos || {};
  RENGLONES.forEach(function (r) {
    a.gastos[r.clave] = ajustesNumero(g[r.clave]);
  });

  return a;
}

// ----------------------------------------------------------------
// Cargar y guardar
// ----------------------------------------------------------------
function ajustesCargar() {
  const almacen = ajustesAlmacen();
  if (!almacen) return Promise.resolve(ajustesVacios());

  return new Promise(function (resolver) {
    almacen.get([AJUSTES_KEY], function (data) {
      resolver(ajustesNormalizar(data && data[AJUSTES_KEY]));
    });
  });
}

// Guarda solo lo que cambió y devuelve cómo quedó todo.
// No hay botón de "guardar" en la pantalla: se guarda mientras la persona
// escribe, para que no se le pierda nada por olvidarse de confirmar.
function ajustesGuardar(parcial) {
  return ajustesCargar().then(function (a) {
    const nuevo = ajustesNormalizar(Object.assign({}, a, parcial || {}, {
      gastos: Object.assign({}, a.gastos, (parcial && parcial.gastos) || {})
    }));

    const almacen = ajustesAlmacen();
    if (!almacen) return nuevo;

    return new Promise(function (resolver) {
      const datos = {};
      datos[AJUSTES_KEY] = nuevo;
      almacen.set(datos, function () { resolver(nuevo); });
    });
  });
}

// ----------------------------------------------------------------
// Preguntas que la pantalla le hace a los ajustes
// ----------------------------------------------------------------

// ¿Ya nos dijo cuánto gana? (0 cuenta como respondido: es un caso normal.)
function ajustesTieneIngreso(a) {
  return !!a && a.ingreso > 0;
}

// ¿Está todo el prellenado en cero? Si sí, la pantalla tiene que avisar que la
// cuenta está asumiendo que no gasta nada (README, punto 3.2).
function ajustesFaltaElPrellenado(a) {
  if (!a) return true;
  return RENGLONES.every(function (r) { return !a.gastos[r.clave]; });
}

// Lo que gana, llevado a "por mes", para poder comparar peras con peras.
function ajustesIngresoMensual(a) {
  if (!a) return 0;
  const f = FRECUENCIAS[a.frecuencia] || FRECUENCIAS.mes;
  return a.ingreso * f.alMes;
}

function ajustesRotuloFrecuencia(a) {
  const f = FRECUENCIAS[(a && a.frecuencia) || 'mes'] || FRECUENCIAS.mes;
  return f.rotulo;
}
