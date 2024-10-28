let refreshTimeout = null;
let countdownInterval = null;
let countdownTime; // Declarar countdownTime sin asignar valor aquí

const numeros = [25, 29, 32];
const indiceAleatorio = Math.floor(Math.random() * numeros.length);
countdownTime = numeros[indiceAleatorio]; // Asignar un valor aleatorio inicial de la lista

// Crear el menú contextual de cuenta regresiva si no existe
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "countdown",
      title: `Siguiente recarga en: ${countdownTime} segundos`,
      contexts: ["all"]
    });
  });
}

// Llama a la función para asegurarse de que el menú está creado al iniciar
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// Función para actualizar el menú contextual con la cuenta regresiva
function updateContextMenu() {
  chrome.contextMenus.update("countdown", {
    title: `Siguiente recarga en: ${countdownTime} segundos`
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error al actualizar el menú contextual:", chrome.runtime.lastError);
    }
  });
}

// Función para recargar la pestaña activa
function refreshActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;
      if (!url.startsWith("chrome://") && !url.startsWith("edge://")) {
        console.log("Recargando página:", url);
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => location.reload()
        });
      }
    }
  });
}

// Función para iniciar la cuenta regresiva y actualizar el menú contextual
function startCountdown() {
  // Asignar un nuevo valor aleatorio de numeros cada vez que se inicia la cuenta regresiva
  countdownTime = numeros[Math.floor(Math.random() * numeros.length)];
  chrome.storage.local.set({ countdownTime });
  updateContextMenu(); // Inicializar el menú contextual con el tiempo actual

  // Actualizar el tiempo cada segundo
  countdownInterval = setInterval(() => {
    countdownTime -= 1;
    chrome.storage.local.set({ countdownTime });
    updateContextMenu(); // Actualizar el menú contextual con el tiempo restante

    if (countdownTime <= 0) {
      clearInterval(countdownInterval); // Detener la cuenta regresiva
      refreshActiveTab(); // Recargar la página

      // Reiniciar el ciclo de espera con 10 segundos adicionales antes de la siguiente cuenta regresiva
      setTimeout(() => {
        startCountdown(); // Reiniciar la cuenta regresiva con un nuevo valor aleatorio
      }, 10000); // Espera de 10 segundos después de recargar
    }
  }, 1000); // Actualiza cada segundo
}

// Función para detener la cuenta regresiva y recarga
function stopAutoReload() {
  if (refreshTimeout) clearTimeout(refreshTimeout);
  if (countdownInterval) clearInterval(countdownInterval);
  chrome.storage.local.set({ countdownTime: 0, isActive: false });
  updateContextMenu(); // Actualizar el menú contextual para reflejar el estado detenido
  console.log("Recarga automática detenida");
}

// Escucha mensajes desde el popup para activar/desactivar la recarga
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleReload") {
    chrome.storage.local.get("isActive", (data) => {
      const newStatus = !data.isActive;
      chrome.storage.local.set({ isActive: newStatus }, () => {
        if (newStatus) {
          startCountdown(); // Inicia la cuenta regresiva y recarga automática
        } else {
          stopAutoReload(); // Detiene la cuenta regresiva y recarga automática
        }
        sendResponse({ isActive: newStatus });
      });
    });
  }
  return true;
});

// Verifica el estado al iniciar el service worker
chrome.storage.local.get("isActive", (data) => {
  if (data.isActive) {
    startCountdown();
  } else {
    createContextMenu(); // Crear el menú contextual en el estado inicial
  }
});
