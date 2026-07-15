// =================================================================
// contentScript.js — corre dentro de cada página web
//
// Hoy solo muestra avisos simples que le manda el background (ej: "no pude
// leer un precio").
//
// TODO (futuro, ver docs/NUEVA_VISION.md — Fase 2):
//   Aquí vivirá la TARJETA FLOTANTE. En vez de abrir el popup, al hacer clic
//   derecho sobre un precio se inyectará una tarjetita sobre la misma página
//   con el cálculo al instante ("Te demoras ~X · ahorra $Y/día"), leyendo la
//   economía guardada en chrome.storage. Más rápido, sin cambiar de ventana.
// =================================================================

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "mostrarAlerta") {
    alert(request.mensaje);
  }
});
