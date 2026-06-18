# ARRIERO'S WEALTH — Nueva Visión
### "La plata es como las mulas: si no las arreas, te lleva entre las patas. ¡Eso sí, mijo!"

---

## El Problema que Resuelve

Los profesionales independientes y microempresarios (1-2 personas) en todo el mundo
regalan su trabajo porque no saben calcular cuánto cobrar.
No tienen herramienta, no tienen fórmula, no tienen voz que les diga:
**"Mijo, su tiempo vale. No lo regale."**

Arriero's Wealth es esa voz.

---

## Nueva Idea Principal

> **Calculadora de dignidad laboral** — una extensión de Chrome que ayuda a
> profesionales independientes y microempresarios (1-2 personas) a saber
> exactamente cuánto cobrar por sus servicios, sin regalarse.

---

## ¿Qué se CONSERVA del código actual?

| Módulo | Por qué se conserva |
|---|---|
| **Menú contextual** (`background.js`) | Ahora sirve para seleccionar un precio ofrecido y preguntar: "¿Vale la pena este encargo?" |
| **Sistema de monedas** | Esencial — usuarios de Colombia hasta China. TRM manual, sin APIs externas |
| **Gráficos** (canvas charts) | Ahora muestran estructura de costos y márgenes, no solo gastos |

---

## ¿Qué se ELIMINA?

- Pestañas de "Ingresos / Gastos / Análisis" en su forma actual
- Lógica de "¿puedo pagar esto?" (reemplazada por "¿cuánto debo cobrar?")
- Categorías de gastos personales (esencial/importante/opcional)

---

## Nueva Arquitectura de la App

### Pestaña 1 — "Mi Perfil Arriero" (configuración base)

El usuario define su realidad económica **una sola vez** y la guarda:

```
COSTOS FIJOS MENSUALES
├── Arriendo / vivienda
├── Alimentación
├── Transporte mensual
├── Servicios / internet
├── Herramientas / software
└── Otros gastos fijos

CARGA SOCIAL / BENEFICIOS  (% configurable — aplica en cualquier país)
├── Seguridad social / salud
├── Pensión / jubilación
├── Seguros / ARL
└── Vacaciones / días no productivos (días al mes)

EQUIPO
├── Número de personas (1 o 2)
└── Costo mensual por persona adicional

HORAS PRODUCTIVAS AL MES
└── (define cuántas horas reales trabaja al mes)

→ El sistema calcula automáticamente tu TARIFA MÍNIMA POR HORA
→ "Mijo, por debajo de $X/hora, está trabajando pa' la galería"
```

---

### Pestaña 2 — "Calcular Cotización"

El usuario ingresa los datos del proyecto/encargo:

```
TIEMPO
├── Horas de trabajo directo
├── Horas de desplazamiento
└── Días de disponibilidad exclusiva

MATERIALES / INSUMOS
├── Lista de materiales con costo y cantidad
├── Selección de moneda por ítem
└── % de merma / desperdicio esperado

TRANSPORTE
├── Costo de ida y vuelta
└── Número de desplazamientos

EXTRAS
├── Complejidad / expertise premium (% adicional)
├── Urgencia (% adicional)
└── Número de personas del equipo en este encargo

IMPUESTOS (opcional, configurable por país)
└── % de retención / IVA / lo que aplique

→ RESULTADO:
   - Precio mínimo (no trabajar por menos)
   - Precio recomendado (con margen digno)
   - Precio premium (para clientes exigentes)
   - Desglose visual en gráfico de torta
```

---

### Pestaña 3 — "Mis Servicios" (plantillas guardadas)

El usuario guarda cotizaciones frecuentes para reutilizar:

```
EJEMPLOS:
├── "DJ set 4 horas" → $350 USD / $1.400.000 COP
├── "Diseño de logo" → $200 USD
├── "Menú del día para 20 personas" → $180.000 COP
└── [+ Agregar nuevo servicio]

Cada plantilla guarda:
- Nombre del servicio
- Todos los parámetros del cálculo
- Precio resultante
- Fecha de último uso
- Notas del arriero ("este cliente siempre pide descuento, ojo")
```

---

### Menú Contextual — "¿Vale la pena, mijo?"

El usuario selecciona un precio que le ofrecen en una página web y hace clic derecho:

```
Flujo:
1. Selecciona "$5 USD" en una página / mensaje / email
2. Clic derecho → "Arriero: ¿Vale este encargo?"
3. La extensión abre un popup con:
   - El precio detectado
   - "¿Cuántas horas calcula que tomará?"  (input rápido)
   - Resultado inmediato:
     ✅ "¡Ese encargo sí paga, mijo! Gana $X/hora sobre su mínimo"
     ❌ "¡Ni se le ocurra! Estaría ganando $X/hora. Su mínimo es $Y"
     ⚠️  "Raspa, pero alcanza. Negocie el precio o reduzca el tiempo"
```

---

## Sistema de Monedas

- Sin APIs externas. El usuario define sus tasas manualmente.
- Monedas disponibles en la interfaz (las más comunes globalmente):
  COP, USD, EUR, MXN, ARS, BRL, PEN, CLP, GBP, JPY, CNY
- El usuario actualiza la tasa cuando quiera ("hoy el dólar está a $4.200")
- Todos los cálculos se muestran en la moneda base del usuario + conversión opcional

---

## Tono y Cultura

- **Idioma de la interfaz:** Ingles y Español (con opción de inglés en el futuro)
- **Voz de la app:** El Arriero — directo, con cariño, paisa
  - No usa tecnicismos financieros fríos
  - Usa frases como: "¡Ese precio lo ofendería hasta a la mula!"
  - Celebra cuando el profesional cotiza bien: "¡Así se hace, mijo!"
  - Advierte con humor: "Por ese precio, ni le presto la palanca"
- **Estética:** Costumbrista colombiana — colores tierra, tipografía Arriero

---

## Flujo de Usuario (primera vez)

```
1. Instala la extensión
2. La app lo saluda: "Bienvenido, nuevo arriero. Primero, cuénteme de usted."
3. Completa su Perfil Arriero (costos fijos, horas, carga social)
4. La app le muestra su tarifa mínima por hora
5. Puede calcular su primera cotización
6. Puede guardarla como plantilla
7. La próxima vez que alguien le ofrezca un precio, usa el menú contextual
```

---

## Roadmap Sugerido (fases de desarrollo)

```
FASE 1 — El núcleo que duele
├── Perfil Arriero (costos fijos + carga social + horas)
├── Cálculo de tarifa mínima por hora
└── Calculadora de cotización básica (tiempo + materiales + transporte)

FASE 2 — El que guarda, tiene
├── Plantillas de servicios guardados
├── Menú contextual "¿Vale este encargo?"
└── Sistema de monedas multi-divisa sin API

FASE 3 — El que analiza, prospera
├── Gráficos de estructura de costos
├── Historial de cotizaciones
└── Exportar cotización formal en PDF/TXT

FASE 4 — El toque arriero
├── Frases culturales y feedback de voz del arriero
├── Alertas de "está regalando su trabajo"
└── Opción de inglés en la interfaz
```

---

## Decisiones Técnicas Clave

| Decisión | Elección | Razón |
|---|---|---|
| Tipo de app | Chrome Extension (MV3) | Menú contextual es el diferenciador |
| Almacenamiento | Chrome Storage Sync | Persiste entre dispositivos, sin servidor |
| Monedas | Manual (sin API) | Sin dependencias externas, funciona offline |
| Idioma inicial | Ingles y Español | Audiencia principal + identidad cultural |
| Cálculo de impuestos | Configurable por usuario | Sirve para cualquier país del mundo |
| Framework | Vanilla JS + HTML/CSS | Ya establecido, sin overhead innecesario |

---

*Documento de visión — Arriero's Wealth v2.0*
*"Antes de arrearte al código, arrea las ideas."*
