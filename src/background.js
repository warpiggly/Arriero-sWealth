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
//   4. Abrimos el popup, que recoge todo eso y le hace la cuenta de una.
//
// AQUÍ NO SE GUARDA NADA EN LA LIBRETA, Y ES A PROPÓSITO
//   En la Fase 2 este archivo apuntaba de una en IndexedDB, como escalón para
//   poder revisar que la plomería servía. Ya no: desde la Fase 3, el cálculo
//   termina en tres botones ("guardar suelto", "guardar en un grupo",
//   "dejarlo así") y GUARDAR ES UNA DECISIÓN DE LA PERSONA.
//
//   Quien solo quería el número tiene que poder irse sin guardar nada y sin
//   haber tenido que decidir nada de antemano (README, punto 4). Si el menú
//   contextual siguiera apuntando solo, la libreta se llenaría de cosas que
//   nadie pidió guardar.
//
//   Lo que sí queda es `precioCapturado` en chrome.storage.local: es "lo que
//   se está mirando ahora", no un archivo. El popup lo recoge, calcula, y lo
//   borra en cuanto lo usa.
//
// LA TARJETA FLOTANTE, PARA DESPUÉS
//   Decidido el 2 de septiembre de 2026: por ahora el clic derecho sigue
//   abriendo la extensión, que es lo que ya funciona. Más adelante el recibo
//   puede aparecer sobre la misma página de la tienda (vía contentScript), sin
//   cambiar de ventana: es más cómodo y es más trabajo, y se hace cuando el
//   recibo ya esté probado.
// =================================================================

// (Aquí estaba un importScripts('/src/db.js'). Se quitó al llegar la Fase 3:
// este archivo ya no guarda en la libreta, así que no la necesita. Si algún
// día el menú contextual vuelve a escribir directo — por ejemplo para la
// tarjeta flotante sobre la página de la tienda —, se vuelve a cargar así.)

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
});
