<p align="center">
  <img src="assets/images/arriero-banner.png" alt="Arriero's Wealth" width="600">
</p>

<h1 align="center">🐴 Arriero's Wealth — Of Mules and Coins</h1>

<p align="center">
  <em>"La plata es como las mulas: si no las arreas, te lleva entre las patas. ¡Eso sí, mijo!"</em>
</p>

---

## ¿Qué es esto?

**Arriero's Wealth** es una extensión de Chrome que ayuda a profesionales
independientes y microempresarios a calcular **cuánto cobrar por su trabajo, sin
regalarse**.

No es solo una calculadora: es como tener al lado a un abuelo paisa que ya vivió,
ya se equivocó y ahora te aconseja con cariño para que no te tumben.

> **El problema que resuelve:** mucha gente regala su trabajo porque no sabe
> calcular su precio. Esta app le pone número a su tiempo.

## ✨ Qué hace hoy

- **Calcula tu tarifa por hora** a partir del ingreso que quieres al mes y tus
  horas facturables.
- **Cotiza un trabajo completo**: mano de obra + materiales + desgaste de
  herramientas + transporte + otros costos + tu margen de ganancia.
- **Guarda presupuestos** con nombre para reutilizarlos ("DJ set 4 horas", etc.).
- **Multi-moneda** (COP, USD, EUR, MXN, ARS, CLP, PEN, BRL, GBP, CNY, JPY) sin
  depender de internet ni de APIs externas — usa el formateo nativo del navegador.
- **Detalle bonito**: mariposas y chispas estilo Encanto, 100 % decorativas.

## 🚀 Cómo instalarla (modo desarrollador)

1. Clona o descarga este repositorio.
2. Abre Chrome y ve a `chrome://extensions/`.
3. Activa el **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. ¡Listo! El ícono del arriero aparece en tu barra de extensiones.

## 📁 Estructura del proyecto

La idea es que cualquiera abra el repo y entienda dónde está cada cosa:

```
arrieros-wealth/
├── manifest.json          Configuración de la extensión (Chrome MV3)
├── popup.html             La ventana que se abre al pulsar el ícono
│
├── src/                   El código JavaScript
│   ├── logic_quotation.js   Cerebro: cálculo de cotización + interfaz
│   ├── magic.js             Mariposas y chispas decorativas
│   ├── background.js        Menú contextual (⚠️ pendiente de migrar, ver abajo)
│   └── contentScript.js     Mensajes en la página (⚠️ pendiente de migrar)
│
├── styles/                Las hojas de estilo (CSS)
│   ├── styles.css           Estética costumbrista (colores tierra, tipografía)
│   └── magic.css            Animaciones de la magia
│
├── assets/                Recursos estáticos
│   ├── icons/               Íconos de la extensión
│   ├── images/              Logos, fondos, estrellas
│   └── fonts/               Tipografías (ScothBrace, LemonMilk)
│
└── docs/                  La visión y el alma del proyecto
    ├── NUEVA_VISION.md      Qué es, a quién sirve y hacia dónde va
    └── IDIOMA.md            Cómo queremos que hable la app en cada idioma
```

### Una regla simple para entender el código

- **`src/logic_quotation.js`** es el corazón. Las fórmulas están comentadas arriba
  del archivo: `Precio de venta = Costo total × (1 + Margen)`.
- **`styles/`** solo decide cómo se ve, nunca cómo se calcula.
- Nada se guarda en servidores: todo vive en `chrome.storage` del usuario.

## 🛠️ Tecnología

Vanilla **JavaScript + HTML + CSS**. Sin frameworks, sin build, sin npm. Se clona
y se carga. Esto es a propósito: queremos que **cualquiera pueda leer y entender**
el código.

## 🗺️ Estado y hoja de ruta

- ✅ **Fase 1** — Cotizador (tarifa por hora + costos + margen) y presupuestos guardados.
- ✅ **Fase 1** — Multi-moneda sin APIs externas.
- 🚧 **Fase 2 (pendiente)** — Menú contextual *"¿Vale la pena este encargo, mijo?"*.
  Los archivos `src/background.js` y `src/contentScript.js` todavía apuntan a una
  versión anterior de la app y deben reescribirse para el modelo de cotización.
- 🔜 **Fase 3** — Idiomas con alma (ver [`docs/IDIOMA.md`](docs/IDIOMA.md)) y
  exportar cotizaciones.

Ver la visión completa en [`docs/NUEVA_VISION.md`](docs/NUEVA_VISION.md).

## 🤝 Contribuir

¿Quieres ayudar? Especialmente buscamos **traductores nativos** que rescaten las
frases de los abuelos de cada idioma (ver la filosofía en
[`docs/IDIOMA.md`](docs/IDIOMA.md)). Mientras tanto, los *issues* y *pull requests*
son bienvenidos.

## 📄 Licencia

Por definir (se planea **MIT**).

---

<p align="center"><em>"El que siembra con cariño, cosecha con orgullo, mijo." 🐴</em></p>
