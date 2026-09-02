// =================================================================
// db.js — La libreta del arriero (IndexedDB)
//
// Aquí se guarda lo que la persona quiere comprar. Es la Fase 2 del rediseño
// del módulo de Ahorro (docs/modulo-ahorro/PLAN.md).
//
// POR QUÉ INDEXEDDB Y NO chrome.storage.sync
//   chrome.storage.sync da 8 KB POR DATO. Guardando el link de cada producto
//   (las direcciones de internet son larguísimas) eso se llena rápido y, lo
//   peor, falla EN SILENCIO: nadie se entera de que dejó de guardar. IndexedDB
//   no tiene ese tope y aguanta muchos ítems, links y grupos sin apretarse.
//
//   Lo que SÍ se queda en chrome.storage.sync es la configuración de la persona
//   (lo que gana, la frecuencia, la moneda, el prellenado): es poquita cosa y
//   además viaja entre sus computadores. Eso vive en src/ajustes.js.
//
// DE CADA COSA SE GUARDA lo que pide el diagrama:
//   nombre · precio · link (el lugar donde se vio el precio) · grupo · creado
//
// ESTE ARCHIVO NO TOCA LA PANTALLA. Ni un getElementById. Así lo puede usar
// tanto el popup como el service worker del menú contextual (src/background.js,
// que lo carga con importScripts).
//
// Todo devuelve promesas. Los nombres van en español, como el resto de la app.
// =================================================================

const DB_NOMBRE = 'arriero';
const DB_VERSION = 1;
const DB_ITEMS = 'items';
const DB_GRUPOS = 'grupos';

// Un ítem sin grupo (una cosa suelta) lleva esta marca en vez de cadena vacía:
// IndexedDB no indexa el string vacío de forma confiable en todos los
// navegadores, y así "los sueltos" son un grupo más para las consultas.
const SIN_GRUPO = '(suelto)';

// La conexión se abre una sola vez y se reparte.
let dbPromesa = null;

// ----------------------------------------------------------------
// Abrir (y crear la primera vez)
// ----------------------------------------------------------------
function dbAbrir() {
  if (dbPromesa) return dbPromesa;

  dbPromesa = new Promise(function (resolver, rechazar) {
    if (typeof indexedDB === 'undefined') {
      rechazar(new Error('Este navegador no tiene IndexedDB'));
      return;
    }

    const pet = indexedDB.open(DB_NOMBRE, DB_VERSION);

    pet.onupgradeneeded = function (e) {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(DB_ITEMS)) {
        // La llave la pone la base sola: no hay que inventar ids.
        const items = db.createObjectStore(DB_ITEMS, {
          keyPath: 'id',
          autoIncrement: true
        });
        // Para sacar "los ítems de este grupo" sin recorrerlo todo.
        items.createIndex('grupo', 'grupo', { unique: false });
        // Para mostrarlos del más nuevo al más viejo.
        items.createIndex('creado', 'creado', { unique: false });
      }

      if (!db.objectStoreNames.contains(DB_GRUPOS)) {
        // Los grupos tienen store propio para que uno pueda existir VACÍO
        // (recién creado, antes de meterle la primera cosa).
        db.createObjectStore(DB_GRUPOS, { keyPath: 'nombre' });
      }
    };

    pet.onsuccess = function () { resolver(pet.result); };
    pet.onerror = function () { rechazar(pet.error); };
  });

  // Si falló, que el próximo intento vuelva a probar en vez de quedar pegado
  // con la promesa rota para siempre.
  dbPromesa.catch(function () { dbPromesa = null; });

  return dbPromesa;
}

// Envuelve una transacción: `hacer(store)` devuelve la petición de IndexedDB.
function dbHacer(almacen, modo, hacer) {
  return dbAbrir().then(function (db) {
    return new Promise(function (resolver, rechazar) {
      const tx = db.transaction(almacen, modo);
      const store = tx.objectStore(almacen);
      let resultado;
      try {
        const pet = hacer(store);
        if (pet) pet.onsuccess = function () { resultado = pet.result; };
      } catch (e) {
        rechazar(e);
        return;
      }
      tx.oncomplete = function () { resolver(resultado); };
      tx.onerror = function () { rechazar(tx.error); };
      tx.onabort = function () { rechazar(tx.error); };
    });
  });
}

// ----------------------------------------------------------------
// Limpiar lo que entra
//
// El precio puede llegar de un teclado, de un clic derecho en una tienda o de
// una celda corregida a mano. Todo pasa por aquí antes de guardarse, para que
// en la base no queden textos raros ni precios negativos.
// ----------------------------------------------------------------
function dbLimpiarTexto(v, tope) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, tope || 120);
}

function dbLimpiarPrecio(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || n < 0) return 0;
  // Redondeo a dos decimales: más allá de eso no hay plata que valga.
  return Math.round(n * 100) / 100;
}

function dbNormalizarGrupo(g) {
  const t = dbLimpiarTexto(g, 60);
  return t === '' ? SIN_GRUPO : t;
}

// ----------------------------------------------------------------
// Los ítems
// ----------------------------------------------------------------

// Guardar una cosa nueva. Devuelve su id.
// datos = { nombre, precio, link, titulo, grupo }
function dbGuardarItem(datos) {
  const d = datos || {};
  const item = {
    nombre: dbLimpiarTexto(d.nombre, 120),
    precio: dbLimpiarPrecio(d.precio),
    link: dbLimpiarTexto(d.link, 2000),
    grupo: dbNormalizarGrupo(d.grupo),
    creado: Date.now()
  };
  // Si vino de una tienda y no tiene nombre, el título de la página sirve de
  // nombre sugerido: es gratis y es lo que pide el diagrama.
  if (!item.nombre) item.nombre = dbLimpiarTexto(d.titulo, 120);

  return dbHacer(DB_ITEMS, 'readwrite', function (s) {
    return s.add(item);
  }).then(function (id) {
    // Si venía con grupo, que el grupo exista también en su propio store.
    if (item.grupo !== SIN_GRUPO) return dbCrearGrupo(item.grupo).then(function () { return id; });
    return id;
  });
}

// Corregir el nombre, el precio o el grupo de algo que ya está guardado.
// Es lo que hace la cara de atrás del recibo.
function dbActualizarItem(id, cambios) {
  return dbAbrir().then(function (db) {
    return new Promise(function (resolver, rechazar) {
      const tx = db.transaction(DB_ITEMS, 'readwrite');
      const s = tx.objectStore(DB_ITEMS);
      const pet = s.get(Number(id));
      pet.onsuccess = function () {
        const item = pet.result;
        if (!item) { rechazar(new Error('No existe el ítem ' + id)); return; }
        const c = cambios || {};
        if (c.nombre !== undefined) item.nombre = dbLimpiarTexto(c.nombre, 120);
        if (c.precio !== undefined) item.precio = dbLimpiarPrecio(c.precio);
        if (c.link !== undefined) item.link = dbLimpiarTexto(c.link, 2000);
        if (c.grupo !== undefined) item.grupo = dbNormalizarGrupo(c.grupo);
        s.put(item);
      };
      pet.onerror = function () { rechazar(pet.error); };
      tx.oncomplete = function () { resolver(true); };
      tx.onerror = function () { rechazar(tx.error); };
    });
  });
}

function dbBorrarItem(id) {
  return dbHacer(DB_ITEMS, 'readwrite', function (s) {
    return s.delete(Number(id));
  });
}

function dbItem(id) {
  return dbHacer(DB_ITEMS, 'readonly', function (s) {
    return s.get(Number(id));
  });
}

// Todo lo guardado, del más nuevo al más viejo.
function dbTodosLosItems() {
  return dbHacer(DB_ITEMS, 'readonly', function (s) {
    return s.getAll();
  }).then(function (lista) {
    return (lista || []).sort(function (a, b) { return b.creado - a.creado; });
  });
}

// Los ítems de un grupo. Sin nombre, los sueltos.
function dbItemsDelGrupo(grupo) {
  const g = dbNormalizarGrupo(grupo);
  return dbHacer(DB_ITEMS, 'readonly', function (s) {
    return s.index('grupo').getAll(g);
  }).then(function (lista) {
    return (lista || []).sort(function (a, b) { return b.creado - a.creado; });
  });
}

// ----------------------------------------------------------------
// Los grupos
// ----------------------------------------------------------------
function dbCrearGrupo(nombre) {
  const n = dbLimpiarTexto(nombre, 60);
  if (!n || n === SIN_GRUPO) return Promise.resolve(null);
  return dbHacer(DB_GRUPOS, 'readwrite', function (s) {
    // put y no add: si ya existe, no truena — crear dos veces "La casa" es
    // algo normal que la persona va a hacer.
    return s.put({ nombre: n, creado: Date.now() });
  }).then(function () { return n; });
}

// Los grupos que existen, con cuántas cosas tiene cada uno y cuánto suman.
// Es lo que necesita la pantalla para pintar los botones de grupo.
function dbGrupos() {
  return Promise.all([
    dbHacer(DB_GRUPOS, 'readonly', function (s) { return s.getAll(); }),
    dbTodosLosItems()
  ]).then(function (r) {
    const grupos = r[0] || [];
    const items = r[1] || [];
    return grupos.map(function (g) {
      const suyos = items.filter(function (i) { return i.grupo === g.nombre; });
      return {
        nombre: g.nombre,
        creado: g.creado,
        cuantos: suyos.length,
        total: suyos.reduce(function (a, i) { return a + i.precio; }, 0)
      };
    }).sort(function (a, b) { return b.creado - a.creado; });
  });
}

// Borrar un grupo. Sus cosas NO se borran: se vuelven sueltas. Borrar la
// carpeta no debería botar lo que había adentro.
function dbBorrarGrupo(nombre) {
  const n = dbNormalizarGrupo(nombre);
  if (n === SIN_GRUPO) return Promise.resolve(false);
  return dbItemsDelGrupo(n).then(function (items) {
    return Promise.all(items.map(function (i) {
      return dbActualizarItem(i.id, { grupo: SIN_GRUPO });
    }));
  }).then(function () {
    return dbHacer(DB_GRUPOS, 'readwrite', function (s) { return s.delete(n); });
  }).then(function () { return true; });
}

// ----------------------------------------------------------------
// Botar todo (lo usa el botón de la ventanita de pruebas)
// ----------------------------------------------------------------
function dbBorrarTodo() {
  return Promise.all([
    dbHacer(DB_ITEMS, 'readwrite', function (s) { return s.clear(); }),
    dbHacer(DB_GRUPOS, 'readwrite', function (s) { return s.clear(); })
  ]).then(function () { return true; });
}

// Cuántas cosas hay guardadas, sin traérselas todas.
function dbCuantos() {
  return dbHacer(DB_ITEMS, 'readonly', function (s) { return s.count(); });
}
