/* ===========================================================
   ARRIERO'S WEALTH — refranes.js
   Muestra un refrán paisa bajo el recuadro del precio.
   - Carga las frases desde data/refranes.json (fácil de editar/ampliar).
   - Al abrir el popup aparece una al azar.
   - Al tocar el banner (clic, Enter o espacio) cambia a otra distinta.
   =========================================================== */

(function () {
  "use strict";

  let refranes = [];
  let ultimoIndice = -1;   // para no repetir la misma dos veces seguidas
  let timerEscritura = null; // temporizador de la animación de tecleo en curso

  // ¿El usuario prefiere menos movimiento? Entonces no animamos.
  const sinAnimacion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MS_POR_LETRA = 28; // velocidad del tecleo (más bajo = más rápido)

  // Elige un índice al azar distinto del último mostrado
  function indiceAleatorio() {
    if (refranes.length <= 1) return 0;
    let i;
    do {
      i = Math.floor(Math.random() * refranes.length);
    } while (i === ultimoIndice);
    return i;
  }

  // Escribe la frase letra por letra, estilo ChatGPT, con cursor parpadeante.
  function escribir(texto, frase) {
    if (timerEscritura) clearInterval(timerEscritura); // corta una animación previa

    const cont = document.getElementById("refran-arriero");
    if (cont) cont.classList.add("escribiendo"); // muestra el cursor

    // Si se prefiere menos movimiento, mostramos la frase completa de una vez.
    if (sinAnimacion) {
      texto.textContent = frase;
      if (cont) cont.classList.remove("escribiendo");
      return;
    }

    texto.textContent = "";
    let i = 0;
    timerEscritura = setInterval(() => {
      texto.textContent += frase.charAt(i);
      i++;
      if (i >= frase.length) {
        clearInterval(timerEscritura);
        timerEscritura = null;
        if (cont) cont.classList.remove("escribiendo"); // oculta el cursor al terminar
      }
    }, MS_POR_LETRA);
  }

  function mostrarRefran() {
    const cont = document.getElementById("refran-arriero");
    if (!cont || refranes.length === 0) return;
    const texto = cont.querySelector(".refran-texto");
    if (!texto) return;

    ultimoIndice = indiceAleatorio();
    escribir(texto, refranes[ultimoIndice]);
  }

  function iniciar() {
    const cont = document.getElementById("refran-arriero");
    if (!cont) return;

    // Cargar las frases del JSON empaquetado en la extensión
    const url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL("data/refranes.json")
      : "data/refranes.json";

    fetch(url)
      .then(r => r.json())
      .then(data => {
        // Acepta tanto { "refranes": [...] } como un arreglo directo [...]
        refranes = Array.isArray(data) ? data : (data.refranes || []);
        if (refranes.length === 0) { cont.style.display = "none"; return; }
        mostrarRefran();
      })
      .catch(() => {
        // Si por algo no carga el JSON, no estorbamos: ocultamos el banner
        cont.style.display = "none";
      });

    // Tocar el banner -> otra frase
    cont.addEventListener("click", mostrarRefran);
    cont.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        mostrarRefran();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
