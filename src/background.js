// =================================================================
// background.js — Service worker (menú contextual)
//
// CORAZÓN DE LA APP — "¿Cuándo puedo comprarlo, mijo?"
//
// El usuario selecciona un precio en CUALQUIER página, hace clic derecho y
// elige "Arriero: ¿cuándo puedo comprarlo?". Aquí:
//   1. Leemos el texto seleccionado y le sacamos el número (el precio).
//   2. Lo guardamos en chrome.storage.local (precioCapturado).
//   3. Abrimos el popup: la vista de Metas lo detecta, lo pone en el campo
//      "precio" y calcula al instante cuánto le falta / cuánto tardaría.
//
// TODO (futuro, ver docs/NUEVA_VISION.md — Fase 2):
//   En vez de abrir el popup, mostrar una TARJETA FLOTANTE sobre la misma
//   página (vía contentScript) con el resultado al instante, sin cambiar de
//   ventana. Sería más rápido para el usuario. Por ahora abrimos el popup.
// =================================================================

// Crear la opción en el menú contextual (solo cuando hay texto seleccionado)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "calcularCompra",
    title: "Arriero: ¿cuándo puedo comprarlo?",
    contexts: ["selection"]
  });
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

  // Guardar el precio capturado. La vista de Metas (metas.js) lo recoge al
  // abrir el popup, lo pone en el formulario y calcula de una.
  chrome.storage.local.set({
    precioCapturado: {
      precio: precio,
      texto: (info.selectionText || '').trim().slice(0, 60)
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
