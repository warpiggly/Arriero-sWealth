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
    // Lo que ya tiene juntado PARA COMPRAR. Es lo que hace que el veredicto
    // pueda decir "ya le alcanza" en vez de mandarla a esperar meses.
    ahorroJuntado: 0,
    // Y lo que tiene juntado en el colchón, si lo sabe. Esta es la reserva:
    // no se toca, y si para comprar algo hubiera que meterle mano, la app
    // avisa (README, punto 3.3 y el veredicto del punto 7).
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
  a.ahorroJuntado = ajustesNumero(crudo.ahorroJuntado);
  a.colchonJuntado = ajustesNumero(crudo.colchonJuntado);

  // OJO AL AÑADIR CAMPOS NUEVOS: si un campo no se copia aquí, se pierde en
  // silencio en cada guardado, porque ajustesGuardar() pasa por esta función.
  // Así se perdía `ahorroJuntado`: la persona escribía lo que ya tenía
  // guardado, el campo se borraba solo, y el veredicto la mandaba a esperar
  // meses por algo que ya podía comprar.

  const g = crudo.gastos || {};
  RENGLONES.forEach(function (r) {
    a.gastos[r.clave] = ajustesNumero(g[r.clave]);
  });

  return a;
}

// ----------------------------------------------------------------
// Cargar y guardar
//
// HAY UN SOLO OBJETO DE AJUSTES EN MEMORIA, y es el que manda mientras el
// popup está abierto. Esto no es una optimización: arregla un error de verdad.
//
// EL ERROR QUE HABÍA. No hay botón de "guardar": se guarda mientras la persona
// escribe, para que no se le pierda nada por olvidarse de confirmar. Pero eso
// significa que CADA TECLA dispara un guardado. Si cada guardado hace su
// propio "leer del almacén → cambiar → escribir", y el almacén responde
// cuando quiere, varias lecturas salen a la vez, TODAS ven el estado viejo, y
// la última escritura pisa a las demás. En la práctica: la persona llenaba
// cinco renglones de gastos y solo quedaba el último. La cuenta salía mal y
// nadie se enteraba de por qué.
//
// CÓMO QUEDÓ. Se lee del almacén UNA vez y queda un objeto en memoria. Los
// cambios se aplican sobre ese objeto, que es lo que la pantalla usa de
// inmediato — así la cuenta se repinta sin esperar al disco. La escritura al
// almacén se agrupa: si llegan diez cambios seguidos, se escribe una vez al
// final. Eso además cuida la cuota de chrome.storage.sync, que solo admite
// unas 120 escrituras por minuto y no avisa cuando uno se pasa.
// ----------------------------------------------------------------

// El objeto que manda. null = todavía no se ha leído del almacén.
let ajustesEnMemoria = null;

// La escritura agrupada
let ajustesTimerEscritura = null;
const AJUSTES_ESPERA = 400;   // ms que se esperan por si viene otra tecla

function ajustesCargar() {
  if (ajustesEnMemoria) return Promise.resolve(ajustesEnMemoria);

  const almacen = ajustesAlmacen();
  if (!almacen) {
    ajustesEnMemoria = ajustesVacios();
    return Promise.resolve(ajustesEnMemoria);
  }

  return new Promise(function (resolver) {
    almacen.get([AJUSTES_KEY], function (data) {
      // Ojo: si dos partes de la app piden los ajustes al mismo tiempo antes
      // de que haya nada en memoria, las dos lecturas llegan aquí. La primera
      // en llegar deja el objeto y la segunda lo respeta, para que no haya
      // dos objetos distintos dando vueltas.
      if (!ajustesEnMemoria) {
        ajustesEnMemoria = ajustesNormalizar(data && data[AJUSTES_KEY]);
      }
      resolver(ajustesEnMemoria);
    });
  });
}

// Guarda solo lo que cambió y devuelve cómo quedó todo.
function ajustesGuardar(parcial) {
  return ajustesCargar().then(function (a) {
    // Se cambia el objeto que ya está en memoria: no se crea otro. Así quien
    // tenga una referencia a los ajustes sigue viendo la verdad.
    const fusionado = ajustesNormalizar(Object.assign({}, a, parcial || {}, {
      gastos: Object.assign({}, a.gastos, (parcial && parcial.gastos) || {})
    }));

    Object.keys(fusionado).forEach(function (k) {
      ajustesEnMemoria[k] = fusionado[k];
    });

    ajustesProgramarEscritura();
    return ajustesEnMemoria;
  });
}

function ajustesProgramarEscritura() {
  if (ajustesTimerEscritura) clearTimeout(ajustesTimerEscritura);
  ajustesTimerEscritura = setTimeout(ajustesEscribirYa, AJUSTES_ESPERA);
}

// Escribe de una, sin esperar. Se llama solo, y también sirve para forzarlo.
function ajustesEscribirYa() {
  if (ajustesTimerEscritura) {
    clearTimeout(ajustesTimerEscritura);
    ajustesTimerEscritura = null;
  }
  const almacen = ajustesAlmacen();
  if (!almacen || !ajustesEnMemoria) return Promise.resolve(ajustesEnMemoria);

  return new Promise(function (resolver) {
    const datos = {};
    datos[AJUSTES_KEY] = ajustesEnMemoria;
    almacen.set(datos, function () { resolver(ajustesEnMemoria); });
  });
}

// Si la persona cambia sus datos en OTRO computador (storage.sync viaja), o en
// otra ventana de la extensión, lo de memoria queda viejo. Se recoge el cambio
// y se avisa, para que la pantalla se repinte con la verdad.
try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function (cambios, area) {
      if (area !== 'sync' || !cambios[AJUSTES_KEY]) return;
      // Si el cambio es el que acabamos de escribir nosotros, no hay nada que
      // hacer. Se compara contra lo que tenemos para no repintar de gratis.
      const llego = ajustesNormalizar(cambios[AJUSTES_KEY].newValue);
      if (JSON.stringify(llego) === JSON.stringify(ajustesEnMemoria)) return;
      ajustesEnMemoria = llego;
      if (typeof ajustesCambiaronDeAfuera === 'function') {
        ajustesCambiaronDeAfuera(ajustesEnMemoria);
      }
    });
  }
} catch (e) { /* sin almacén: no hay de dónde llegar un cambio */ }

// Si la persona escribe y cierra el popup de una, el último cambio todavía
// podría estar esperando su turno. Aquí se fuerza la escritura antes de que la
// ventana se muera.
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', ajustesEscribirYa);
    window.addEventListener('beforeunload', ajustesEscribirYa);
  }
} catch (e) { /* sin ventana (pruebas, service worker): no hace falta */ }

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
