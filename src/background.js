// =================================================================
// background.js — Service worker (menú contextual)
//
// ⚠️ PENDIENTE DE MIGRACIÓN (Fase 2 — ver docs/NUEVA_VISION.md)
//
// Este archivo todavía implementa el menú contextual de la app VIEJA
// ("¿puedo pagar esto?"): lee `resumen.disponible` de storage, un dato
// que el cotizador nuevo YA NO GUARDA. Por eso hoy el menú no funciona:
// siempre caerá en "configura tu ingreso primero".
//
// La visión nueva quiere otro flujo: el usuario selecciona un precio que
// le OFRECEN, y la app le dice "¿Vale la pena este encargo, mijo?"
// comparando contra su tarifa mínima por hora. Cuando se construya esa
// función, este archivo se reescribe completo. Se conserva como referencia.
// =================================================================

// Crear la opción en el menú contextual
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "calcularCompra",
    title: "Hacer cuenta",
    contexts: ["selection"]
  });
});

// Manejar el clic en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "calcularCompra") {
    // Obtener el precio seleccionado (texto)
    const precioTexto = info.selectionText;
    
    // Limpiar y extraer el precio
    let precioLimpio = precioTexto.replace(/\./g, ''); // Eliminar puntos
    precioLimpio = precioLimpio.replace(/,/g, '.'); // Cambiar comas por puntos
    const precioMatch = precioLimpio.match(/\d+(\.\d+)?/);
    
    if (precioMatch) {
      const precio = parseFloat(precioMatch[0]);
      
      // Obtener el resumen presupuestario
      chrome.storage.sync.get(['resumen'], function(data) {
        if (data.resumen) {
          const disponible = data.resumen.disponible;
          const restante = disponible - precio;
          
          // Guardar el análisis para mostrarlo en el popup
          chrome.storage.local.set({
            analisis: {
              precio: precio,
              disponible: disponible,
              restante: restante,
              puedeComprar: restante >= 0
            }
          });
          
          // Abrir el popup
          chrome.action.openPopup();
        } else {
          // Si no hay datos de presupuesto
          chrome.tabs.sendMessage(tab.id, {
            action: "mostrarAlerta",
            mensaje: "Por favor, configura tu ingreso y gastos primero."
          });
        }
      });
    } else {
      // Si no se pudo extraer un número
      chrome.tabs.sendMessage(tab.id, {
        action: "mostrarAlerta",
        mensaje: "No se pudo detectar un precio válido en la selección."
      });
    }
  }
});