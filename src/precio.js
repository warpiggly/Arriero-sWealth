// =================================================================
// precio.js — Leer un precio escrito por humanos
//
// UN SOLO LUGAR donde se decide qué número quiso decir una página web (o una
// persona) cuando escribió un precio. Lo usan el menú contextual
// (src/background.js, con importScripts) y la libreta (src/db.js).
//
// EL PROBLEMA QUE ESTO RESUELVE
//   El punto y la coma significan cosas distintas según el país, y las tiendas
//   escriben como quieren:
//
//     $6.110          Colombia   -> seis mil ciento diez
//     $6,110.00       Amazon     -> seis mil ciento diez
//     US$ 49.99       USA        -> cuarenta y nueve con noventa y nueve
//     49,99 €         España     -> cuarenta y nueve con noventa y nueve
//     $1.999.900      Colombia   -> casi dos millones
//
//   La app leía "6.110" como 6 pesos con 11 centavos, y "$1.999.900" como
//   1,999 — o sea que un precio de dos millones se convertía en dos pesos.
//   Solo acertaba cuando la página traía los centavos completos.
//
// LA REGLA, EN PALABRAS
//   1. Del texto se toma el PRIMER número que aparezca. Así "de $6.110 a
//      $8.500" agarra el primero y no los pega en un número absurdo.
//   2. Si hay puntos Y comas, el que va de ÚLTIMO es el decimal; el otro es
//      separador de miles. ("1.999.900,50" y "1,999,900.50")
//   3. Si hay un solo tipo de separador:
//        · aparece varias veces           -> son miles     (1.999.900)
//        · una vez con TRES dígitos atrás -> son miles     (6.110)
//        · una vez con UNO o DOS atrás    -> es el decimal (49.99 · 6,5)
//        · cualquier otro caso            -> son miles
//
//   El paso clave es el de los tres dígitos: ningún precio del mundo se
//   escribe con tres decimales, pero todos los miles se agrupan de tres en
//   tres. Ahí es donde estaba el error.
//
// ESTE ARCHIVO NO TOCA LA PANTALLA NI EL ALMACÉN.
// =================================================================

// Devuelve un número, o null si en el texto no hay nada que parezca un precio.
function leerPrecio(texto) {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') return isFinite(texto) ? texto : null;

  const crudo = String(texto);

  // --- 1. El primer número del texto ---
  // Se admiten como separadores el punto, la coma, el espacio (formato
  // francés: 1 234 567) y el apóstrofe (formato suizo: 1'234'567).
  const encontrado = crudo.match(/\d[\d.,\s'  ]*\d|\d/);
  if (!encontrado) return null;

  // Fuera los separadores que no deciden nada: espacios y apóstrofes siempre
  // son de miles, en todos los países que los usan.
  let limpio = encontrado[0].replace(/[\s'  ]/g, '');
  if (!limpio) return null;

  const puntos = (limpio.match(/\./g) || []).length;
  const comas = (limpio.match(/,/g) || []).length;

  let normalizado;

  if (puntos && comas) {
    // --- 2. Los dos separadores: el último manda ---
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      normalizado = limpio.replace(/\./g, '').replace(/,/g, '.');
    } else {
      normalizado = limpio.replace(/,/g, '');
    }
  } else if (puntos || comas) {
    // --- 3. Un solo tipo de separador ---
    const sep = puntos ? '.' : ',';
    const veces = puntos || comas;
    const trozos = limpio.split(sep);
    const ultimo = trozos[trozos.length - 1];

    if (veces === 1 && (ultimo.length === 1 || ultimo.length === 2)) {
      // Uno o dos dígitos detrás: son centavos.
      normalizado = trozos[0] + '.' + ultimo;
    } else {
      // Varias veces, o tres dígitos detrás: son miles. Aquí entra el caso que
      // estaba mal: 6.110 son seis mil ciento diez.
      normalizado = trozos.join('');
    }
  } else {
    normalizado = limpio;
  }

  const num = parseFloat(normalizado);
  if (!isFinite(num)) return null;

  // Nada de precios negativos ni de números que se salen de lo creíble: más
  // allá de esto se pierde precisión y seguro fue una selección mala.
  if (num < 0 || num >= 1e15) return null;

  return num;
}
