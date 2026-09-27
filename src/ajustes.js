// =================================================================
// ajustes.js — Lo que la app sabe de la persona
//
// UN SOLO DATO ES OBLIGATORIO: cuánto gana al mes. Todo lo demás es opcional
// (docs/modulo-ahorro/README.md, punto 3).
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

// TODO VA POR MES — decidido el 24 de septiembre de 2026. Antes se escogía
// día / semana / quincena / mes, y eso obligaba a la persona a pensar en
// periodos. Ahora escribe lo que gana al mes, como lo anotaría en el cuaderno.

// LO NECESARIO: los renglones fijos de la hoja, en el orden en que se ven.
// `ayuda` es lo que sale al pasar el mouse o tocar el dibujito: quien no sepa
// qué va en "Servicios" no tiene por qué adivinarlo.
//
// "ahorro" va en la lista pero NO es un gasto: no suma al total de lo
// necesario ni al porcentaje gastado (se guarda, no se gasta). Se compara
// contra el 10 % de la regla.
const NECESARIOS = [
  { clave: 'mercado',    rotulo: 'Mercado',     ayuda: 'La comida y las cosas de la casa: arroz, carne, jabón, papel…' },
  { clave: 'casa',       rotulo: 'Casa',        ayuda: 'El arriendo o la cuota de la casa.' },
  { clave: 'servicios',  rotulo: 'Servicios',   ayuda: 'Luz, agua, gas, internet y teléfono fijo.' },
  { clave: 'transporte', rotulo: 'Transporte',  ayuda: 'Bus, taxi, gasolina o pasajes para moverse.' },
  { clave: 'deudas',     rotulo: 'Deudas',      ayuda: 'Cuotas de préstamos, tarjetas o lo que le debe a alguien.' },
  { clave: 'ahorro',     rotulo: 'Ahorro',      ayuda: 'Lo que aparta cada mes para guardar. No es un gasto: se guarda.', guarda: true }
];

// LOS OTROS GASTOS: lo que se tiene en una casa pero no es vital. Cuentan como
// los "gustos" de la regla 70 / 30. La persona escoge de esta lista con el +;
// "otra" deja escribir el nombre y se puede poner varias veces.
const OTROS_CATALOGO = [
  { clave: 'gym',       rotulo: 'Gimnasio',                 ayuda: 'La mensualidad del gimnasio o de algún deporte.' },
  { clave: 'mascotas',  rotulo: 'Mascotas',                 ayuda: 'Comida, veterinario y cositas del perro o el gato.' },
  { clave: 'celular',   rotulo: 'Plan de celular',          ayuda: 'Lo que paga cada mes por el celular.' },
  { clave: 'tele',      rotulo: 'Televisión y plataformas', ayuda: 'Cable, Netflix, música y parecidos.' },
  { clave: 'salidas',   rotulo: 'Salidas y comer afuera',   ayuda: 'Restaurantes, paseos, cine, rumba.' },
  { clave: 'ropa',      rotulo: 'Ropa y zapatos',           ayuda: 'Lo que se va en ropa y zapatos.' },
  { clave: 'cuidado',   rotulo: 'Peluquería y cuidado',     ayuda: 'Peluquería, barbería, uñas, cremas.' },
  { clave: 'regalos',   rotulo: 'Regalos',                  ayuda: 'Cumpleaños, navidad y detalles.' },
  { clave: 'estudio',   rotulo: 'Cursos y estudio',         ayuda: 'Cursos, útiles y matrículas.' },
  { clave: 'familia',   rotulo: 'Ayuda a la familia',       ayuda: 'Lo que le manda a los papás, a los hijos o a quien ayude.' },
  { clave: 'chance',    rotulo: 'Chance y lotería',         ayuda: 'Lo que juega en chance, lotería o rifas.' },
  { clave: 'otra',      rotulo: 'Otra cosa',                ayuda: 'Algo que no está en la lista: usted le pone el nombre.' }
];

function ajustesVacios() {
  const gastos = {};
  NECESARIOS.forEach(function (r) { gastos[r.clave] = 0; });
  return {
    ingreso: 0,
    // Todos en cero: la app no adivina.
    gastos: gastos,
    // [{ clave, nombre, monto }]
    otros: [],
    // Las dos reglas son opcionales y solo MUESTRAN topes: no cambian ningún
    // número que la persona escribió.
    regla7030: false,
    regla10: false,
    // false -> el ahorro del mes es un colchón: no se toca.
    // true  -> ese ahorro cuenta como plata para comprar cosas.
    ahorroDisponible: false,
    // Lo que ya tiene juntado PARA COMPRAR. Es lo que hace que el veredicto
    // pueda decir "ya le alcanza" en vez de mandarla a esperar meses.
    ahorroJuntado: 0,
    // Y lo que tiene juntado en el colchón. Esta es la reserva: no se toca, y
    // si para comprar algo hubiera que meterle mano, la app avisa.
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
  a.regla7030 = crudo.regla7030 === true;
  a.regla10 = crudo.regla10 === true;
  a.ahorroDisponible = crudo.ahorroDisponible === true;
  a.ahorroJuntado = ajustesNumero(crudo.ahorroJuntado);
  a.colchonJuntado = ajustesNumero(crudo.colchonJuntado);

  // OJO AL AÑADIR CAMPOS NUEVOS: si un campo no se copia aquí, se pierde en
  // silencio en cada guardado, porque ajustesGuardar() pasa por esta función.
  // Así se perdía `ahorroJuntado`: la persona escribía lo que ya tenía
  // guardado, el campo se borraba solo, y el veredicto la mandaba a esperar
  // meses por algo que ya podía comprar.

  const g = crudo.gastos || {};
  NECESARIOS.forEach(function (r) {
    a.gastos[r.clave] = ajustesNumero(g[r.clave]);
  });

  a.otros = (Array.isArray(crudo.otros) ? crudo.otros : [])
    .filter(function (o) { return o && typeof o.clave === 'string'; })
    .map(function (o) {
      return {
        clave: o.clave.slice(0, 40),
        nombre: String(o.nombre || '').slice(0, 40),
        monto: ajustesNumero(o.monto)
      };
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

// ¿Está todo en cero? Si sí, la pantalla tiene que avisar que la cuenta está
// asumiendo que no gasta nada (README, punto 3.2).
function ajustesFaltaElPrellenado(a) {
  if (!a) return true;
  const nada = NECESARIOS.every(function (r) { return !a.gastos[r.clave]; });
  return nada && !(a.otros || []).some(function (o) { return o.monto > 0; });
}

function ajustesDelCatalogo(clave) {
  const base = String(clave || '').split('-')[0];
  return OTROS_CATALOGO.find(function (c) { return c.clave === base; }) || null;
}
