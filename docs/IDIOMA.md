# 🐴 El Idioma del Alma — Arriero's Wealth

> Este documento explica **la visión** detrás de cómo Arriero's Wealth maneja los
> idiomas. No es un manual técnico de traducción: es la idea, el corazón de lo que
> queremos lograr. Aquí se explica *qué* queremos y *por qué*, para que cuando se
> construya, nadie pierda el rumbo.

---

## 🌟 La idea en una frase

> **No queremos traducir la app. Queremos que en cualquier idioma se sienta el amor
> de un abuelo que te aconseja, te cuida y quiere lo mejor para ti.**

Arriero's Wealth no es solo una calculadora de precios. Es como tener al lado a un
abuelo paisa —o al abuelo de uno, sea de donde sea— que ya vivió, que ya se equivocó,
que ya aprendió, y que ahora te dice las cosas con cariño para que a ti te vaya bien
en el negocio.

Ese sentimiento es lo que tiene que viajar entre idiomas. **Las palabras cambian; el
amor no.**

---

## 🎚️ Las dos formas de vivir la app

La idea es que el usuario pueda **elegir** cómo quiere sentir la app. No hay una sola
manera correcta: hay dos sabores, y cada quien escoge el suyo.

### Opción 1 — Con tinte paisa (la esencia colombiana) 🇨🇴

El usuario deja la app con su **sabor original colombiano**, aunque esté en otro
idioma. Se conservan las frases autóctonas, esas que no tienen traducción porque son
puro corazón:

- **"mijo"**, **"mija"**
- **"mi negrit@"**, **"mi monit@"**
- **"pues"**
- **"¡Ave María!"**
- **"guarde pal marrano"**, **"no dé papaya"**, etc.

Esto es para quien ama la cultura paisa, para el que quiere sentir que lo aconseja un
arriero de verdad, aunque no sea colombiano. Es la app llevando un pedacito de
Colombia al mundo. 🐴

### Opción 2 — Full en su idioma, pero con alma de abuelo 🌎

El usuario prefiere que la app le hable **completamente en su propio idioma**, sin
palabras extranjeras... pero **sin perder la calidez**. No es un traductor frío: es
como si el abuelo de esa persona, en su propia tierra y en su propia lengua, le
estuviera dando el consejo.

- En inglés, sonaría como un abuelo cariñoso del sur de Estados Unidos:
  *"Careful now, darlin' — that won't put food on the table."*
- En chino, como un anciano sabio que te llama *"孩子"* (hijo/a) y te suelta un refrán
  de los de antes.

La idea: **cada idioma tiene su propio abuelo, no un abuelo colombiano traducido.**

---

## ❤️ Lo que NUNCA cambia (la esencia)

No importa el idioma ni el sabor que escoja el usuario. Hay tres cosas que tienen que
estar **siempre**, porque son el alma de Arriero's Wealth:

1. **El cariño** — Hablarle a la persona como a alguien querido, no como a un cliente.
2. **La sabiduría** — Consejos de quien ya vivió, ya trabajó, ya aprendió a las malas.
3. **El cuidado** — Todo lo que dice la app busca que a la persona le vaya bien:
   que no se regale, que ahorre, que no lo tumben.

> Lo que viaja entre idiomas **no es la palabra, es el sentimiento.**

---

## 🌱 La promesa a futuro: buscar a los abuelos del mundo

Esto es importante y queremos dejarlo escrito como un compromiso:

> **En un futuro no se descarta buscar a personas nativas de cada idioma para
> preguntarles: "¿Qué decía tu abuelo? ¿Cómo te aconsejaba? ¿Qué frases usaba para
> cuidarte?"**

Porque el alma de un abuelo no se saca de Google Translate. Se saca de la gente, de
sus recuerdos, de las frases que les decían en la cocina o en el campo. Cada cultura
tiene sus dichos, sus apodos cariñosos, sus refranes de sabiduría popular.

La meta es que el día que la app hable chino, japonés, portugués o lo que sea, no
suene a máquina: suene al abuelo **real** de esa tierra. Y para eso, lo mejor es
preguntarle a quien lo vivió.

---

## 🧭 En resumen

| | |
|---|---|
| **Qué cambia** | Las palabras, los apodos, los refranes (nativos de cada cultura) |
| **Qué nunca cambia** | El cariño, la sabiduría y el cuidado de un abuelo que te ama |
| **El usuario elige** | Tinte paisa 🇨🇴 *o* full en su idioma 🌎 — ambos con alma |
| **A futuro** | Buscar nativos de cada idioma para rescatar las frases de sus abuelos |

> *"El que siembra con cariño, cosecha con orgullo, mijo."* 🐴

---

## 🛠️ La parte técnica: cómo se puede construir

Esta sección explica **cómo** se puede hacer realidad todo lo de arriba, en términos de
código. La idea es dejarlo claro para cuando llegue el momento de construirlo.

### Regla de oro

> **Nunca se escribe el texto directo en el HTML o el JS.** En vez de eso, se pone una
> "llave" (key), y los textos viven aparte, en un diccionario.

¿Por qué? Porque así, agregar un idioma nuevo mañana (chino, portugués, lo que sea) es
solo **pegar una columna nueva** en el diccionario, sin tocar ni una línea del código
que ya funciona.

### Paso 1 — El diccionario de textos

Un objeto que guarda cada frase en cada idioma. Fíjese que cada texto lleva una **nota
que explica el sentimiento** que debe transmitir, para que quien traduzca recree la
emoción y no copie las palabras:

```js
const textos = {
  es: { // Español con tinte paisa
    saludo:          "Buenas, mijo",
    margenBajo:      "Ojo mijo, así no se hace plata",  // alerta cariñosa: va a perder
    sinPresupuestos: "Todavía no ha guardado ninguno, mijo."
  },
  en: { // Inglés, como un abuelo cariñoso
    saludo:          "Well now, darlin'",
    margenBajo:      "Careful now — that won't put food on the table",
    sinPresupuestos: "Nothin' saved yet, sweetheart."
  },
  zh: { // Chino, como un anciano sabio
    saludo:          "孩子，你来啦",
    margenBajo:      "小心啊孩子，这样可挣不到钱",
    sinPresupuestos: "还没存东西呢，孩子。"
  }
};
```

### Paso 2 — La función que entrega el texto

Una sola función `t()` ("translate") busca la llave en el idioma activo. Si falta una
traducción, **cae al español** (idioma madre), para que nunca quede un hueco en blanco:

```js
let idioma = 'es';
function t(llave) {
  return (textos[idioma] && textos[idioma][llave]) || textos['es'][llave] || llave;
}
```

### Paso 3 — Marcar los textos en el HTML

En lugar de escribir la frase, se pone un atributo con la llave. Una función recorre la
página al cargar y rellena todo solita:

```html
<span data-i18n="saludo"></span>
<p data-i18n="sinPresupuestos"></p>
```

```js
function aplicarIdioma() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
```

### Paso 4 — El selector de idioma

Unos botones (🇨🇴 🇬🇧 🇨🇳) que cambian el idioma y **recuerdan la elección** del usuario
usando `chrome.storage`, para que la próxima vez que abra la app siga en su idioma:

```js
function cambiarIdioma(nuevo) {
  idioma = nuevo;
  chrome.storage.sync.set({ idioma: nuevo });
  aplicarIdioma();
}

// Al abrir la app, recuperar el idioma guardado
chrome.storage.sync.get(['idioma'], data => {
  idioma = data.idioma || 'es';
  aplicarIdioma();
});
```

### Paso 5 — Las dos formas (tinte paisa vs. full idioma)

Para soportar las **dos formas** de la visión, se puede manejar como dos "sabores" del
mismo idioma. Por ejemplo, el inglés tendría dos variantes:

```js
const textos = {
  en_paisa: { saludo: "Well now, mijo" },        // inglés con tinte paisa
  en_full:  { saludo: "Well now, darlin'" }      // inglés full, abuelo local
};
```

Y un interruptor (un *toggle*) que el usuario prende o apaga: *"¿Quieres el toque
colombiano?"*. Eso solo decide si la app usa la variante `_paisa` o `_full`.

### Por qué este camino y no otro

- Las extensiones de Chrome traen un sistema propio de idiomas (`_locales` +
  `chrome.i18n`), **pero** ese usa el idioma del navegador y no deja al usuario
  cambiarlo fácil con un botón. Como nosotros queremos que el usuario **elija** (y que
  elija entre tinte paisa o full), el diccionario propio con `t()` es más flexible.
- Todo el texto queda en **un solo lugar**, fácil de revisar y de mandar a un nativo
  para que lo corrija.
- Agregar un idioma = agregar una llave nueva. Cero cambios en la lógica del negocio.

### El puente con el alma 🌱

Lo técnico es solo el recipiente. Lo que se mete adentro —las frases, los apodos, los
refranes— es lo que le da vida. Por eso el diccionario está pensado para que, el día que
lleguen los **abuelos nativos** de cada idioma (la promesa de futuro de arriba), solo
haya que sentarse con ellos, escuchar sus frases, y llenar las llaves. El código ya
estará listo y esperando.
