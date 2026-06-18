// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "mostrarAlerta") {
      alert(request.mensaje);
    }
  });