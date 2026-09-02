// =================================================================
// background.js — Service worker (menú contextual)
//
// CORAZÓN DE LA APP — "¿Cuándo puedo comprarlo, mijo?"
//
// El usuario selecciona un precio en CUALQUIER página, hace clic derecho y
// elige "Arriero: ¿cuándo puedo comprarlo?". Aquí:
//   1. Leemos el texto seleccionado y le sacamos el número (el precio).
//   2. Lo guardamos en chrome.storage.local (precioCapturado).
//   3. Nos quedamos también con el LINK de la página (tab.url) y con su
//      TÍTULO (tab.title), que sirve de nombre sugerido del producto. Sale
//      casi gratis: la pestaña ya llega aquí, en el parámetro `tab`. Antes se
//      tiraban los dos a la basura, y el diagrama los pide.
//   4. Lo apuntamos en la libreta del arriero (IndexedDB, src/db.js).
//   5. Abrimos el popup.
//
// POR QUÉ EL PASO 4 EXISTE HOY, Y HASTA CUÁNDO
//   Estamos en la Fase 2: la app tiene que poder GUARDAR y RECORDAR aunque
//   todavía no sepa hacer cuentas. Por eso el clic derecho apunta de una, y
//   así se puede revisar en la ventanita de pruebas que la plomería sirve
//   (esa es la prueba escrita de la Fase 2: tres tiendas distintas, cerrar el
//   navegador, y las tres cosas siguen ahí).
//
//   EN LA FASE 3 ESTO CAMBIA: cuando el cálculo tenga sus tres botones del
//   final ("guardar suelto", "guardar en un grupo", "dejarlo así"), guardar
//   deja de ser automático y pasa a ser una decisión de la persona — porque
//   quien solo quería el número tiene que poder irse sin guardar nada
//   (README, punto 4). Cuando llegue ese día, este paso 4 se quita de aquí.
//
// LA TARJETA FLOTANTE, PARA DESPUÉS
//   Decidido el 2 de septiembre de 2026: por ahora el clic derecho sigue
//   abriendo la extensión, que es lo que ya funciona. Más adelante el recibo
//   puede aparecer sobre la misma página de la tienda (vía contentScript), sin
//   cambiar de ventana: es más cómodo y es más trabajo, y se hace cuando el
//   recibo ya esté probado.
// =================================================================

// La libreta del arriero. Un service worker no tiene <script>, así que se
// carga con importScripts. db.js no toca la pantalla justamente para poder
// usarse desde aquí igual que desde el popup.
importScripts('/src/db.js');

// Lo que se guardaba de la vista de Ahorro vieja y de los sobres. El código
// que lo leía ya no existe (Fase 1 del rediseño), así que estas claves solo
// estarían ocupando el almacén. Se botan: está decidido en PLAN.md y en
// README.md ("se puede romper con confianza" — David es el único que usa la
// app y no está publicada, así que no hay datos de nadie que proteger).
//
// Esta limpieza es de una sola vez. Se puede borrar de aquí cuando la Fase 2
// esté hecha y la base de datos nueva (IndexedDB) sea la que manda.
const CLAVES_VIEJAS = [
  'economia',            // lo que ganaba / lo que ya tenía guardado
  'ahorroMensual',       // los dos datos tecleados a mano
  'ahorrosActuales',
  'metasLista',          // la lista de productos apuntados
  'metasPasosAbiertos',  // qué pasos había dejado abiertos
  'sobresCiclo',         // los sobres del ciclo en curso
  'sobresHistorial',     // los ciclos anteriores
  'calcCinta',           // los renglones de la cinta de la calculadora
  'calcCintaAbierta'     // si la cinta había quedado abierta
];

function botarLoViejo() {
  try {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.remove(CLAVES_VIEJAS);
    }
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['precioCapturado']);
    }
  } catch (e) { /* si no hay almacén, no hay nada que botar */ }
}

// Crear la opción en el menú contextual (solo cuando hay texto seleccionado)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "calcularCompra",
    title: "Arriero: ¿cuándo puedo comprarlo?",
    contexts: ["selection"]
  });

  botarLoViejo();
});

// Extrae un precio (número) de un texto como "$1.999.900", "1,999.900 COP",
// "US$ 49.99", etc. Devuelve un número o null si no encuentra nada usable.
//
// Regla sencilla y robusta para Latinoamérica y USA: nos quedamos solo con
// dígitos, puntos y comas; luego decidimos cuál es el separador decimal según
// cuál aparezca de último. Así "1.999.900" -> 1999900 y "49.99" -> 49.99.
function extraerPrecio(texto) {
  if (!texto) return null;

  // Dejar solo dígitos y separadores
  const limpio = texto.replace(/[^\d.,]/g, '');
  if (!limpio) return null;

  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');

  let normalizado;
  if (ultimaComa > ultimoPunto) {
    // La coma va de última => es el separador decimal (formato europeo/latino:
    // "1.999.900,50"). Quitamos puntos (miles) y la coma pasa a punto decimal.
    normalizado = limpio.replace(/\./g, '').replace(',', '.');
  } else if (ultimoPunto > ultimaComa) {
    // El punto va de último => separador decimal (formato USA: "1,999,900.50").
    normalizado = limpio.replace(/,/g, '');
  } else {
    // No hay separadores decimales claros: quitamos ambos (son miles).
    normalizado = limpio.replace(/[.,]/g, '');
  }

  const num = parseFloat(normalizado);
  return isNaN(num) ? null : num;
}

// Manejar el clic en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "calcularCompra") return;

  const precio = extraerPrecio(info.selectionText);

  if (precio === null || precio <= 0) {
    // No se pudo leer un precio: avisamos discretamente en la página.
    if (tab && tab.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, {
        action: "mostrarAlerta",
        mensaje: "No pude leer un precio en lo que seleccionaste, mijo. Selecciona solo el número."
      });
    }
    return;
  }

  // El link del lugar donde se vio el precio y el título de la página, que
  // sirve de nombre sugerido del producto. Los dos pueden no venir (una
  // pestaña interna del navegador, por ejemplo): se aguanta sin ellos.
  const link = (tab && tab.url) ? tab.url : '';
  const titulo = (tab && tab.title) ? tab.title : '';

  // Lo que se acaba de señalar, para que el popup lo recoja al abrirse y le
  // haga la cuenta de una.
  chrome.storage.local.set({
    precioCapturado: {
      precio: precio,
      texto: (info.selectionText || '').trim().slice(0, 60),
      link: link,
      titulo: titulo,
      cuando: Date.now()
    }
  }, () => {
    // Abrir el popup. openPopup() solo existe/funciona en navegadores recientes;
    // si falla (no hay gesto válido, versión vieja), el precio queda guardado y
    // el usuario lo verá igual la próxima vez que abra la extensión.
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {});
    }
  });

  // Y apuntarlo en la libreta. Ojo con el orden: esto va DESPUÉS de guardar el
  // precio capturado y de abrir el popup, porque es lo que puede demorarse; si
  // la libreta fallara, la persona igual ve su cuenta.
  //
  // (Paso temporal de la Fase 2 — ver la nota del encabezado.)
  dbGuardarItem({
    nombre: '',          // sin nombre: db.js usa el título de la página
    titulo: titulo,
    precio: precio,
    link: link,
    grupo: ''            // una cosa suelta
  }).catch((e) => {
    // Que no se caiga el service worker por esto. Si la libreta no quiso
    // guardar, el precio capturado ya está a salvo en storage.local.
    console.warn('Arriero: no pude apuntar en la libreta —', e);
  });
});
