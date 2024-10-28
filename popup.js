// popup.js
document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("toggleButton");
  const countdownDisplay = document.getElementById("countdownDisplay");

  // Obtener el estado actual y ajustar el botón y cuenta regresiva
  chrome.storage.local.get(["isActive", "countdownTime"], (data) => {
    updateButton(data.isActive);
    updateCountdown(data.countdownTime);
  });

  // Maneja el clic en el botón de activación
  toggleButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggleReload" }, (response) => {
      updateButton(response.isActive);
    });
  });

  // Actualiza el estado visual del botón
  function updateButton(isActive) {
    if (isActive) {
      toggleButton.textContent = "Desactivar Recarga";
      toggleButton.classList.remove("off");
    } else {
      toggleButton.textContent = "Activar Recarga";
      toggleButton.classList.add("off");
    }
  }

  // Actualizar cuenta regresiva en el popup
  function updateCountdown(seconds) {
    countdownDisplay.textContent = `Siguiente recarga en: ${seconds} segundos`;
  }

  // Escuchar cambios en el tiempo de cuenta regresiva en almacenamiento local
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.countdownTime) {
      updateCountdown(changes.countdownTime.newValue);
    }
  });
});

