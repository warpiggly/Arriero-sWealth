# Idea rescatada — Módulo de Deudas

> Origen: rama `NewFeatures` (commit `1c1101f`, 13 de junio de 2025).
> Esa rama quedó congelada en GitHub porque es de **antes de la reestructuración**:
> tenía `popup.js`, `styles.css` y `debt.js` sueltos en la raíz, y hoy el código vive
> en [src/](../src/) y [styles/](../styles/). Fusionarla habría duplicado archivos viejos.
> Este documento guarda lo que valía la pena. La rama se puede borrar sin perder nada.

---

## Qué existía realmente

Muy poco. Una pestaña nueva llamada **"Deuda"** al lado de Ingresos / Gastos / Análisis,
con un solo elemento vivo:

```
┌─ Cuanto Es Mi Deuda ─────────────────────┐
│  Categoría: [ Selecciona una ▾ ]         │
│             [ Mostrar Descripción ]      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Deuda respaldada por un activo,    │  │
│  │ como una casa o vehículo.          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Un desplegable de 7 categorías y un botón que mostraba la definición de la
categoría elegida. **No calculaba nada, no guardaba nada.** Era el esqueleto de
una idea, no una funcionalidad.

## Lo único que vale la pena conservar: las 7 categorías

Esta clasificación sí es buena y está bien pensada. Es el material rescatable:

| Categoría | Definición (texto original) |
|---|---|
| Garantizada | Deuda respaldada por un activo, como una casa o vehículo. |
| No garantizada | No necesita garantía. Ej: tarjetas de crédito, préstamos personales. |
| Consumo | Deuda usada para bienes/servicios: electrodomésticos, viajes, etc. |
| Hipoteca | Préstamo a largo plazo con una vivienda como garantía. |
| Subsistencia | Para cubrir necesidades básicas. Señal de urgencia financiera. |
| Estudiantil | Préstamos para estudios: matrículas, manutención, transporte. |
| Apalancamiento | Deuda usada para invertir y multiplicar ingresos. |

La distinción importante que hace esta lista, y que conviene no perder:
**deuda de subsistencia** (alarma: se está endeudando para comer) frente a
**deuda de apalancamiento** (la deuda está trabajando a favor). Son extremos
opuestos y la app debería tratarlos distinto.

---

## Si algún día se reimplementa

Advertencia de diseño, según el público de la app — gente mayor y del campo que
sobre todo quiere saber **cuánto le queda**:

- Un desplegable con siete tecnicismos financieros y un botón "Mostrar Descripción"
  es exactamente lo que ese usuario no necesita. Pedirle que se autoclasifique en
  "deuda de apalancamiento" es pedirle que hable un idioma que no es el suyo.
- Mejor camino: que escriba **a quién le debe y cuánto**, en sus palabras
  ("al banco", "a la cooperativa", "a don Julio"). Que la app deduzca la categoría
  por detrás si le sirve para algo, y que nunca se la muestre como etiqueta.
- La respuesta que esa persona busca es una sola línea: *cuánto debe en total* y
  *cuánto le queda después de pagar la cuota de este mes*. Todo lo demás es adorno.
- Si se construye, debe usar [src/db.js](../src/db.js) para persistir, como el resto
  del proyecto actual, no `localStorage` suelto.

Encaja como extensión natural del módulo de Ahorro
(ver [docs/modulo-ahorro/README.md](modulo-ahorro/README.md)): ahorro y deuda son la
misma pregunta vista por los dos lados.

---

*Nota: el código original se puede consultar en cualquier momento con*
`git show origin/NewFeatures:debt.js`
