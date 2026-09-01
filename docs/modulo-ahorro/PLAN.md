# Plan de trabajo — Módulo de Ahorro

**Qué es esto:** el orden en que se va a construir lo que está en
[README.md](README.md). Cuatro fases, en el orden que pidió David.

**Cómo se usa:** cada fase termina con una **prueba que usted hace con las
manos**. Si esa prueba no pasa, no se sigue a la fase siguiente. Las casillas
`[ ]` se van marcando a medida que se avanza, así usted siempre sabe dónde
estamos sin preguntar.

**La regla de oro:** nada se borra ni se cambia sin que usted lo haya visto
escrito antes. Este documento es ese "antes".

> **Estado al 1 de septiembre de 2026: ninguna fase ha empezado.** El plan está
> aprobado y quieto, esperando la orden de arrancar. No se ha borrado ni una
> línea de código.

**Una condición del proyecto que aligera todo:** David es el único que usa la
app y todavía no está publicada en ninguna parte. No hay datos de nadie que
proteger, ni versiones anteriores con las que haya que seguir cuadrando. Se
puede romper con confianza.

---

## Antes de arrancar — la red de seguridad (2 minutos)

Esto se hace **una sola vez** y es lo que permite volver atrás si algo no gusta.
Sin esto, borrar da miedo; con esto, borrar es reversible.

```
git tag antes-del-rediseno        ← una foto de cómo está todo hoy
git switch -c rediseno-ahorro     ← se trabaja aparte, sin tocar lo bueno
```

Con eso, en cualquier momento se puede volver a como estaba hoy con un solo
comando, y lo que está funcionando hoy sigue intacto en su rama.

- [ ] Foto tomada y rama de trabajo creada

---

## FASE 1 — Borrar lo que hay hoy en Ahorro

**La idea:** dejar el terreno limpio. Al final de esta fase el módulo de Ahorro
no hace nada, y eso está bien: es lo que se busca.

### Lo que muere

| Qué | Dónde |
|---|---|
| La vista de Ahorro completa | `src/metas.js`, y en `popup.html` los bloques `#metas-sencilla` y `#metas-hoja` |
| Los sobres | `src/sobres.js` y su parte del `popup.html` |
| La cinta de la calculadora y su guardado | La parte de apuntar renglones de `src/calculadora.js` |
| Los estilos de todo lo anterior | La parte que les corresponde en `styles/styles.css` |
| La cuenta de dos datos tecleados a mano | `ahorroMensual` y `ahorrosActuales` |

### Lo que se queda, quieto y sin conectar

- **El botón de la calculadora** y su ventana: cabecera, pantalla y teclado.
  Suma, resta y multiplica como una calculadora de siempre. No guarda nada.
- **El menú contextual** sigue existiendo (se rehace en la Fase 2).
- **Las otras vistas no se tocan:** Cobrar (el cotizador), Mi Despensa y En
  construcción quedan exactamente como están.

### Un detalle que apareció al revisar el código

Los sobres **no viven en una pantalla aparte: viven dentro de la ventana de la
calculadora**. Por eso caen junto con ella. Lo que queda de esa ventana, cuando
se les quita a los sobres, es un teclado limpio — que es justo lo que usted
quería que quedara.

### Lo que hay que poner en su lugar

Un **letrero temporal** donde estaba la vista de Ahorro:

```
   Estamos arreglando esto, mijo.
   Vuelva pronto.
```

Es solo para que la vista no quede en blanco mientras se trabaja. La vista "En
construcción" ya existe en la app y sirve tal cual, así que sale en un minuto.

**Y lo que hay guardado hoy se bota.** El ingreso, las metas y los sobres que
estén en la app se van con el borrado y no se trasladan a nada. Está decidido:
David es el único que usa la app.

- [ ] Se borró la vista de Ahorro
- [ ] Se borraron los sobres
- [ ] Se borró la cinta y el guardado de la calculadora
- [ ] La ventana de la calculadora abre y hace cuentas
- [ ] Está el letrero temporal
- [ ] Cobrar, Mi Despensa y En construcción siguen funcionando igual

### 👀 Prueba que usted hace al final de la Fase 1

1. Recargar la extensión y abrirla.
2. Toca la mula de Ahorro → sale el letrero, no un hueco blanco.
3. Toca el botón de la calculadora → abre, y `2 + 2 =` da `4`.
4. Toca la mula de Cobrar → el cotizador funciona como siempre.
5. En la app no queda ni un rastro de los sobres ni de la hoja vieja.

---

## FASE 2 — El menú contextual y la base de datos

**La idea:** que la app pueda **guardar y recordar** cosas, aunque todavía no
sepa hacer cuentas con ellas. Es la plomería: no se ve, pero todo lo demás se
para encima.

### Lo que se hace

1. **La base de datos nueva (IndexedDB).** Reemplaza la forma de guardar de
   antes, que se llenaba y fallaba en silencio. Guarda de cada cosa: el nombre,
   el precio, el link, el grupo (o vacío si es una cosa suelta) y la fecha en
   que se apuntó.
2. **Lo que se le pregunta a la persona** (cuánto gana, cada cuánto, el
   prellenado de gastos) se guarda aparte, en el lugar que viaja entre sus
   computadores.
3. **El menú contextual, rehecho.** Hoy, cuando alguien señala un precio en una
   página y hace clic derecho, la app se queda con el precio y **tira a la basura
   la dirección de la página**. Ahora se queda también con el link y con el
   título, que sirve de nombre sugerido del producto. Es casi gratis y es lo que
   pide el diagrama.

### Lo que NO se hace todavía

Ninguna cuenta, ningún recibo, ninguna pantalla bonita. Solo guardar y recordar.

### El problema de esta fase, y cómo lo resolvemos

Esta fase **es invisible**: todo pasa por debajo, y usted no tendría nada que
mirar. Para que la pueda supervisar se hace una **ventanita de pruebas** — una
lista pelada, fea a propósito, que muestra lo que hay guardado y un botón para
borrarlo todo. Se bota en la Fase 4.

Sin esa ventanita, la única forma de revisar esta fase sería abrirle las
tripas al navegador. Con ella, usted mira una lista y ya.

- [ ] La base de datos guarda y recuerda
- [ ] El clic derecho guarda precio + link + título
- [ ] Los datos de la persona se guardan aparte
- [ ] Está la ventanita de pruebas

### 👀 Prueba que usted hace al final de la Fase 2

1. Entrar a cualquier tienda por internet.
2. Señalar un precio → clic derecho → *"Arriero: ¿cuándo puedo comprarlo?"*.
3. Abrir la ventanita de pruebas: **ahí tiene que aparecer** el precio, el link
   de la tienda y el nombre sugerido.
4. Cerrar el navegador, volver a abrirlo: **la cosa sigue ahí**.
5. Repetir con tres tiendas distintas: las tres quedan guardadas.

---

## FASE 3 — La funcionalidad: las cuentas y las respuestas

**La idea:** que la app ya sepa responder. Todavía fea, pero **diciendo la
verdad**.

### Lo que se hace, en este orden

1. **La cuenta base:** con lo que gana menos lo que gasta, cuánto le queda para
   ahorrar, dejando el colchón aparte.
2. **El prellenado que se llena solo:** los gastos llegan ya puestos a partir de
   lo que gana, y la persona corrige solo si quiere.
3. **Las respuestas:** en cuántos meses o días lo consigue, y qué pasa si el
   ingreso es 0 (que es un caso normal, no un error).
4. **El veredicto:** los cuatro casos, cada uno con su frase — le alcanza · le
   alcanza pero se gasta la reserva · no le alcanza todavía y le falta tanto ·
   le alcanza pero se demora.
5. **Los botones de plazo** (3, 6 y 12 meses).
6. **"Cuánto le va a afectar en su economía"**, dicho en palabras que la persona
   vive y no en porcentajes.
7. **Guardar al final de cada cálculo:** cosa suelta, en un grupo, o dejarlo así.
8. **Las cuentas del grupo:** cada cosa por separado y todo junto.

### Lo que NO se hace todavía

Nada de diseño. Los números salen en pantalla pelados, sin recibo y sin colores.

### Antes de arrancar esta fase hay que decidir cinco cosas

Están en el punto 11 del [README.md](README.md) y **son de usted, no mías**:
cuánto es "se demora muchísimo", con qué proporciones llega el prellenado, las
frases exactas de cada caso, si la moneda es una sola o una por cosa, y si la
calculadora hace cuentas.

Si se arranca la fase sin decidirlas, se van a inventar solas y después toca
rehacerlas.

- [ ] Las cinco decisiones tomadas
- [ ] La cuenta base
- [ ] El prellenado que se llena solo
- [ ] Cuándo lo consigue (y el caso de ingreso 0)
- [ ] El veredicto, los cuatro casos
- [ ] Los botones de plazo
- [ ] "Cuánto le afecta"
- [ ] Guardar suelto / en grupo / dejarlo así
- [ ] Las cuentas del grupo

### 👀 Prueba que usted hace al final de la Fase 3

Con lápiz y papel al lado, para ver si la app dice la verdad:

1. Gana 2.000.000 al mes, gasta 1.500.000 → quiere algo de 1.000.000.
   La app tiene que decir **2 meses**. Compruébelo a mano.
2. Ponerle 0 de ingreso → la app **no se queda muda**: dice cuánto tendría que
   ahorrar.
3. Algo carísimo → sale el aviso de que se demora, no un número absurdo.
4. Algo que solo alcanza tocando el colchón → sale ese aviso, no el de "sí le
   alcanza".
5. Tocar los tres botones de plazo → tres respuestas distintas y coherentes.
6. Guardar dos cosas en un grupo → las cuentas del grupo cuadran con la suma.

---

## FASE 4 — La cara: el recibo y la calculadora

**La idea:** ponerle la cara a todo lo que ya funciona.

### Lo que se hace

1. **El recibo, cara de adelante:** que se lea como una factura de tienda —
   qué es, cuánto cuesta, cuánto ahorra, cuándo lo tiene, si le sirve, y el
   consejo del arriero.
2. **El recibo, cara de atrás:** darle la vuelta y encontrar el Excel con **solo
   las filas de ese recibo**, para corregir precios y nombres.
3. **El giro:** la animación de voltear el recibo, que es lo que hace que se
   entienda sin explicación.
4. **Los dos recibos:** el de una cosa sola y el de un grupo, con su desglose.
5. **La calculadora:** su cara definitiva, botones gordos y números grandes.
6. **Botar la ventanita de pruebas** de la Fase 2.

### Ojo con el tamaño de las letras

El `<body>` de la app lleva un `zoom: 0.75`. **Todo nace 25 % más chico de lo
que se escribe.** Si el recibo se diseña sin tener eso en cuenta, en la pantalla
real va a quedar ilegible para quien no ve bien.

- [ ] El recibo por delante
- [ ] El recibo por detrás (el Excel de sus filas)
- [ ] El giro
- [ ] Recibo de una cosa y recibo de grupo
- [ ] La cara de la calculadora
- [ ] Se botó la ventanita de pruebas
- [ ] Se quitó el letrero temporal de la Fase 1

### 👀 Prueba que usted hace al final de la Fase 4

**La prueba de verdad no la hace usted: la hace otra persona.**

Siente a alguien mayor frente a la app, sin decirle nada, y mírelo. Si tiene que
explicarle algo, eso que tuvo que explicar está mal diseñado y hay que
arreglarlo. Esa es la única prueba que importa.

Y usted, aparte:

1. Que el recibo se lea de lejos, con el brazo estirado.
2. Que darle la vuelta se le ocurra sin que nadie se lo diga.
3. Que al corregir un precio atrás, la cara de adelante ya salga corregida.

---

## 5. Cómo supervisar todo esto

Diez recomendaciones, de la que más sirve a la que menos.

### 1. Que ninguna fase pase de una semana sin algo que mirar

Una fase que dura tres semanas sin nada visible es una fase donde usted perdió
el control. Si una se está alargando, se parte en dos.

### 2. Un cambio, un guardado con su nombre

Cada pedazo termina en un `commit` con un mensaje en español que diga qué se
hizo. Así, cuando algo se dañe, se ve exactamente en qué paso fue — y se puede
devolver solo ese paso, sin botar el resto.

### 3. Revise con la app en la mano, no leyendo código

Usted no tiene que leer JavaScript para supervisar. La forma de revisar es:
recargar la extensión, abrirla y hacer la prueba que está escrita al final de
cada fase. Si la prueba pasa, la fase está bien.

### 4. Las casillas de este documento son su tablero

Se van marcando a medida que se avanza. Abrir este archivo tiene que ser
suficiente para saber dónde estamos, sin preguntarle a nadie.

### 5. Vea el recibo antes de que funcione

Esta es la recomendación que más plata le ahorra. El recibo es lo más importante
y lo más fácil de errar. **Al empezar la Fase 3, se hace un recibo de mentiras**
— dibujado, con datos inventados, sin nada por debajo — solo para que usted lo
mire y diga "así sí" o "así no".

Cuesta un rato. Descubrir en la Fase 4 que el recibo no se entiende cuesta
rehacer la Fase 4 completa.

### 6. Decida las seis cosas antes de la Fase 3, no durante

Las frases, los porcentajes, el "se demora demasiado". Si no están decididas
cuando arranque la fase, se van a inventar y después toca deshacerlas.

### 7. Guarde el "antes" de cada pantalla

Una foto de pantalla antes de tocar algo. Cuando lleven tres semanas, la memoria
engaña y uno ya no se acuerda de cómo era — ni de si mejoró.

### 8. Pruebe siempre con los números feos

No pruebe con 1.000.000 redondito. Pruebe con lo que pasa de verdad: ingreso 0,
un precio de 50 pesos, un precio de 900 millones, un nombre larguísimo, una cosa
sin precio. Ahí es donde las apps se rompen.

### 9. No junte "borrar" con "construir" en el mismo paso

Cuando en un mismo cambio se borra lo viejo y se hace lo nuevo, y algo se daña,
no hay forma de saber cuál de los dos fue. Primero borrar y verlo funcionando
roto pero limpio; después construir.

### 10. La rama es su seguro

Todo pasa en `rediseno-ahorro`. Lo que hoy funciona sigue intacto en `main`.
Si a mitad de camino usted decide que no le gusta, se vuelve a `main` y no se
perdió nada más que el tiempo.

### Mi recomendación de fondo sobre el orden

El orden que usted pidió (borrar → plomería → cuentas → cara) es el más limpio
para construir, y así queda escrito. Tiene un solo costo: **de la Fase 1 a la
Fase 4 la app no tiene cara**, y usted queda supervisando cosas que no se ven.

Ese costo se paga con dos cosas baratas, y por eso están metidas en el plan: el
**letrero temporal** de la Fase 1 y la **ventanita de pruebas** de la Fase 2.
Con esas dos, cada fase tiene algo que usted puede abrir y mirar.

Si en algún momento quiere ver antes cómo va a quedar, la palanca es la
recomendación 5: adelantar el recibo de mentiras. Es lo único que yo movería de
orden.

---

## 6. Dudas

### Ya resueltas — 1 de septiembre de 2026

| Duda | Respuesta |
|---|---|
| ¿Qué pasa con lo que ya está guardado? | **Se bota.** David es el único que usa la app. No hay que trasladar nada ni mantener compatibilidad con nada. |
| ¿Se toca alguna otra vista? | **No. Solo Ahorro.** Cobrar (el cotizador), Mi Despensa y En construcción quedan intactas. |
| ¿Hay usuarios a los que avisarle? | **No.** La app todavía no está publicada en ninguna parte. |

Estas tres respuestas destraban la Fase 1 y además aflojan todo el plan: **se
puede romper con confianza.** No hay nadie a quien dañarle sus datos, y la red
de seguridad de git alcanza y sobra.

El **letrero temporal** de la Fase 1 se mantiene, pero cambia de razón: ya no es
para que ningún usuario se asuste, sino simplemente para que la vista no quede
en blanco mientras se trabaja. Con reutilizar la vista "En construcción" que ya
existe, queda hecho en un minuto.

### Todavía abiertas

Ninguna traba la Fase 1. Se pueden responder cuando lleguemos a su fase.

1. **(Fase 2) El clic derecho, ¿sigue abriendo la ventanita de la extensión?**
   O el recibo aparece **sobre la misma página** de la tienda, sin cambiar de
   ventana. Lo segundo es más cómodo y ya estaba anotado como idea futura en la
   visión del proyecto, pero es más trabajo. Para la Fase 2 me sirve saber a
   dónde apuntamos.
2. **(Fase 3) ¿Cómo se mete algo en un grupo?** Al final del cálculo sale el
   botón "guardar ítem grupal", y ahí no sé qué pasa: ¿escoge un grupo de una
   lista de los que ya tiene, escribe un nombre nuevo, o las dos cosas?
3. **(Fase 4) Los cuatro atajos de la calculadora** — *÷ 12 al mes*, *÷ 30 al
   día*, *× 12 al año* y *10 % de esto* — son cuentas puras, no tienen nada que
   ver con los sobres ni con el guardado. ¿Se quedan? A mí me parece que sí: son
   justamente el tipo de cuenta que su público hace a mano.
4. **(Fase 4) ¿Dónde va a vivir el botón de la calculadora** ahora que la vista
   de Ahorro se rehace? ¿Arriba, como está hoy, o en otra parte?
