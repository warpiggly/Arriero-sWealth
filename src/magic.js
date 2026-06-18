/* ===========================================================
   ARRIERO'S WEALTH — magic.js
   Mariposas amarillas (estilo Encanto / mariposas de Macondo)
   volando por el popup, más chispas doradas de magia.
   100% decorativo. Si quieres quitarlo, borra magic.css y
   magic.js de popup.html.
   =========================================================== */

(function () {
  "use strict";

  // Mariposa PLANA estilo Memphis: color sólido (currentColor) + contorno
  // marcado. El color de las alas se asigna por mariposa desde el CSS
  // (m.style.color), para tener variedad. El grupo .alas aletea por CSS.
  const SVG_MARIPOSA = `
    <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- antenas -->
      <path d="M60 30 C 56 16, 50 12, 46 8" stroke="#3D2814" stroke-width="2.5"
            fill="none" stroke-linecap="round"/>
      <path d="M60 30 C 64 16, 70 12, 74 8" stroke="#3D2814" stroke-width="2.5"
            fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="7" r="2.6" fill="#3D2814"/>
      <circle cx="74" cy="7" r="2.6" fill="#3D2814"/>

      <g class="alas">
        <!-- ala superior izquierda -->
        <path d="M60 40 C 38 6, 4 18, 16 46 C 26 58, 50 52, 60 47 Z"
              fill="currentColor" stroke="#3D2814" stroke-width="2.5"/>
        <!-- ala inferior izquierda -->
        <path d="M60 52 C 44 60, 22 66, 28 86 C 34 98, 54 74, 60 60 Z"
              fill="currentColor" stroke="#3D2814" stroke-width="2.5"/>
        <!-- ala superior derecha -->
        <path d="M60 40 C 82 6, 116 18, 104 46 C 94 58, 70 52, 60 47 Z"
              fill="currentColor" stroke="#3D2814" stroke-width="2.5"/>
        <!-- ala inferior derecha -->
        <path d="M60 52 C 76 60, 98 66, 92 86 C 86 98, 66 74, 60 60 Z"
              fill="currentColor" stroke="#3D2814" stroke-width="2.5"/>

        <!-- lunares planos (detalle Memphis) -->
        <circle cx="26" cy="32" r="4" fill="#FBF5E2"/>
        <circle cx="94" cy="32" r="4" fill="#FBF5E2"/>
        <circle cx="38" cy="78" r="3" fill="#FBF5E2"/>
        <circle cx="82" cy="78" r="3" fill="#FBF5E2"/>
      </g>

      <!-- cuerpo plano -->
      <ellipse cx="60" cy="52" rx="4" ry="22" fill="#3D2814"/>
    </svg>`;

  // Paleta plana (tu identidad paisa) para variar el color de cada mariposa
  const COLORES_ALA = ["#F2B233", "#E8742C", "#E0991C", "#C0392B", "#2E7D40"];

  const aleatorio = (min, max) => min + Math.random() * (max - min);

  let capa = null;

  function crearCapa() {
    capa = document.createElement("div");
    capa.id = "capa-magica";
    document.body.appendChild(capa);
  }

  // ---------- Mariposas ----------
  function lanzarMariposa() {
    const ancho = window.innerWidth || 480;
    const alto = window.innerHeight || 600;

    const m = document.createElement("div");
    m.className = "mariposa";
    // .cuerpo: capa interna que se mece (vida propia). Así el balanceo no
    // pelea con la animación de vuelo, que vive en .mariposa (exterior).
    m.innerHTML = `<div class="cuerpo">${SVG_MARIPOSA}</div>`;

    // Tamaño, color plano y velocidad de aleteo variados (pequeñas, discretas)
    const escala = aleatorio(0.7, 1.1);
    m.style.width = 22 * escala + "px";
    m.style.height = 18 * escala + "px";
    m.style.color = COLORES_ALA[Math.floor(Math.random() * COLORES_ALA.length)];
    const alas = m.querySelector(".alas");
    if (alas) alas.style.animationDuration = aleatorio(0.2, 0.4).toFixed(2) + "s";
    // El cuerpo se mece a su propio ritmo -> cada mariposa se siente distinta
    const cuerpo = m.querySelector(".cuerpo");
    if (cuerpo) cuerpo.style.animationDuration = aleatorio(1.2, 2.0).toFixed(2) + "s";

    capa.appendChild(m);

    // Vuela en diagonal (izq->der o der->izq) con oscilación suave
    const haciaDerecha = Math.random() > 0.5;
    const xIni = haciaDerecha ? -50 : ancho + 50;
    const xFin = haciaDerecha ? ancho + 50 : -50;
    const yBase = aleatorio(40, alto - 80);
    const onda = aleatorio(28, 70);   // amplitud del vaivén vertical
    const giro = haciaDerecha ? 0 : -1; // espejo cuando va a la izquierda

    const keyframes = [];
    const pasos = 12;                       // más pasos -> trayecto más suave y vivo
    const fase = aleatorio(0, Math.PI * 2); // cada mariposa empieza su onda distinto
    const ciclos = aleatorio(2.2, 3.6);     // nº de subidas/bajadas, irregular
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const x = xIni + (xFin - xIni) * t;
      // vaivén vertical + pequeño "ruido" orgánico (no es una onda perfecta)
      const y =
        yBase +
        Math.sin(fase + t * Math.PI * ciclos) * onda +
        Math.sin(t * Math.PI * 8) * 5;
      // se ladea hacia donde va (banca en las subidas y bajadas)
      const inclina = Math.cos(fase + t * Math.PI * ciclos) * 10;
      keyframes.push({
        transform: `translate(${x}px, ${y}px) rotate(${inclina}deg) scaleX(${giro || 1})`,
      });
    }

    const animacion = m.animate(keyframes, {
      duration: aleatorio(9000, 16000),
      easing: "ease-in-out",
    });

    animacion.onfinish = () => {
      m.remove();
      // Reaparece más tarde para mantener el flujo
      setTimeout(lanzarMariposa, aleatorio(800, 4000));
    };
  }

  // ---------- Chispas de magia ----------
  function lanzarChispa() {
    const ancho = window.innerWidth || 480;
    const alto = window.innerHeight || 600;

    const c = document.createElement("div");
    c.className = "chispa";
    const tam = aleatorio(3, 7);
    c.style.width = tam + "px";
    c.style.height = tam + "px";
    c.style.left = aleatorio(10, ancho - 10) + "px";
    c.style.top = aleatorio(40, alto - 30) + "px";
    capa.appendChild(c);

    c.addEventListener("animationend", () => c.remove());
  }

  function iniciar() {
    crearCapa();

    // Pocas mariposas, escalonadas (discreto y profesional)
    const cuantas = 3;
    for (let i = 0; i < cuantas; i++) {
      setTimeout(lanzarMariposa, i * aleatorio(700, 2000));
    }

    // Brasas esporádicas (de una en una, sin saturar)
    setInterval(lanzarChispa, 1900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
