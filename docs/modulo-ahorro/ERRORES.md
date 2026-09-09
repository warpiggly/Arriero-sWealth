# Errores del módulo de Ahorro

Encontrados el 9 de septiembre de 2026 en dos pasadas: la primera sobre las
cuentas (`src/ahorro.js`, `src/ajustes.js`, las casillas de `popup.html`), la
segunda sobre el código mismo. **Todos están probados**, no son
sospechas: cada uno trae el caso con el que se comprobó, para que al arreglarlo
se pueda volver a correr y ver que ya no pasa.

**Nada de esto está arreglado todavía.** David dijo el 9 de septiembre: primero
el diagnóstico, después se toca. Este documento es la lista de pendientes.

## Cómo se probaron

Sin navegador ni extensión: `src/ahorro.js` no toca la pantalla ni el almacén,
así que se puede correr solo.

```bash
node -e "eval(require('fs').readFileSync('src/ahorro.js','utf8')); /* … */"
```

---

## LO GRAVE — la app da números falsos

### 1. Los gastos se multiplican por la frecuencia del sueldo

**Dónde:** `ahorroCapacidad()` en `src/ahorro.js`. Los gastos, el colchón y "lo
que ya aparta" se multiplican por el mismo `porMes` que el ingreso.

**Qué pasa:** si la persona dice que le pagan *cada quincena*, la app da por
hecho que TODOS sus gastos también son quincenales. El arriendo se le duplica.

**El caso:**

| | |
|---|---|
| Gana | 1.000.000 cada quincena |
| Gastos de la casa | 800.000 (al mes, como lo piensa cualquiera) |
| La app resta | **1.600.000** |
| La app dice que puede guardar | **400.000** |
| Lo cierto | 2.000.000 − 800.000 = **1.200.000** |

Le está diciendo que puede guardar tres veces menos de lo que puede. Y como de
ahí sale el plazo, el veredicto y todo lo demás, **este error se le riega a todo
el recibo**.

**DECIDIDO (David, 9 de septiembre de 2026): los gastos son SIEMPRE AL MES.**
No son quincenales ni semanales, aunque a la persona le paguen así. El ingreso
sí conserva su frecuencia — esa parte está bien.

Entonces el arreglo es: quitarle el `* porMes` a los gastos y al colchón.
El ingreso lo conserva.

### 2. "Lo que ya aparta" también se multiplica

**Dónde:** la misma función, la línea de `declarada`.

**Qué pasa:** el camino corto del README es *"yo aparto 200 mil al mes"*. Si a la
persona le pagan quincenal, la app entiende 400.000.

**El caso:** gana 1.000.000 quincenal, escribe 200.000 en "Lo que ya aparta" →
la app dice que guarda **400.000 al mes**.

Se arregla con el mismo cambio del error 1: es al mes, y punto.

### 3. En un grupo, la plata guardada se cuenta varias veces

**Dónde:** `ahorroCuentaGrupal()`. El desglose calcula cada cosa "como si fuera
la única", y a cada una le descuenta TODO lo que la persona tiene guardado.

**El caso:** tiene 500.000 guardados y un grupo con tres cosas de 500.000 cada
una. El desglose dice que las tres las tiene **"ya mismo"**. Solo alcanza para
una.

**Ojo:** el total del grupo sí sale bien (1.500.000, y descuenta los 500.000 una
sola vez). El que miente es el desglose, renglón por renglón.

**YA SE DECIDIÓ CÓMO ARREGLARLO** — ver la última sección de este documento.

---

## LO MEDIANO — la app queda hablando raro

Ninguno de estos daña la cuenta, pero sí la voz de la app. Y para este público
(gente mayor, gente del campo) una frase rara pesa igual que un número malo.

### 4. Le sale un número negativo en pantalla

**Dónde:** `ahorroPorPlazo()`, dentro de la frase que arma.

**El caso:** gana 1.000.000, gasta 1.500.000. Toca el botón de "3 meses" y lee:

> *"…y hoy guarda **$-500.000**."*

La cabecera dorada sí sabe taparlo (`recPintarJornal()` usa `Math.max(0, …)`),
pero las frases de los plazos no. Un número negativo con guion adelante es justo
lo que este público no sabe leer.

### 5. Le habla de la reserva cuando no hacía falta

**Dónde:** `ahorroVeredicto()`. El caso del colchón se revisa ANTES que el caso
normal, así que gana siempre que la persona tenga colchón.

**El caso:** guarda 1.000.000 al mes, tiene 5.000.000 de colchón, quiere algo de
500.000 — o sea que lo tiene en medio mes sin tocar nada. La app le contesta:

> *"Le alcanza, pero se gasta la reserva"* — con la alerta amarilla puesta.

Debería decirle simplemente que sí. El aviso del colchón es para cuando **no
alcanza de otra forma**, no para cuando alcanza de sobra.

### 6. Los días no cuadran con los meses

**Dónde:** `ahorroCuandoLoTiene()`. Los meses se redondean para arriba y los días
se sacan aparte del número sin redondear.

**El caso:** precio 1.000.000, guarda 900.000 al mes → devuelve **2 meses** y
**34 días**. Dos meses son sesenta días.

Hoy el recibo no muestra los días, así que no se ve. Pero el número está mal y
el día que alguien lo pinte, va a mentir.

### 7. Cuando le falta poquito, el consejo es absurdo

**Dónde:** `ahorroVeredicto()`, el caso `no-alcanza`. Siempre reparte lo que
falta a doce meses, sin mirar si es mucho o poquito.

**El caso:** ya tiene 990.000 guardados, quiere algo de 1.000.000 — le faltan
**10.000** — y no puede guardar nada al mes. La app le dice:

> *"Para tenerlo en un año le tocaría juntar **$834 al mes**."*

Por 10.000 pesos lo manda a esperar un año.

### 8. Cuando está en rojo, el consejo se queda corto

**Dónde:** el mismo caso `no-alcanza`. Cuando la capacidad es negativa, la cuenta
del "cuánto juntar" ignora el hueco.

**El caso:** gasta 500.000 más de lo que gana y quiere algo de 2.000.000. La app
le dice *"junte 166.667 al mes"*, sin decirle que primero tiene que tapar el
hueco de 500.000. Lo real serían 666.667.

---

## LO DEL CÓDIGO — no es la cuenta, es cómo está escrito

Segunda pasada, **9 de septiembre de 2026**, mirando el código como código y no
como app. Estos tres no cambian ningún número del recibo: cambian qué tan
confiable es la app y qué tanto va a costar arreglarla después.

### 9. Nadie revisa si el guardado funcionó

**Dónde:** en todo el proyecto. `chrome.runtime.lastError` **no aparece ni una
sola vez**.

**Qué pasa:** `chrome.storage.sync` no truena cuando falla — **deja de guardar
callado**. Falla así cuando un dato pasa de 8 KB, cuando todo junto pasa de
100 KB, o cuando se escribe más de unas 120 veces por minuto. El callback se
ejecuta igual, como si todo hubiera salido bien. La única forma de enterarse es
mirar `chrome.runtime.lastError`, y nadie lo mira.

**Lo irónico:** `src/ajustes.js` tiene un comentario largo explicando ese mismo
límite de 120 escrituras por minuto y por qué se agrupan las escrituras. El
problema estaba visto — solo faltó comprobar que la escritura de verdad entró.

**Y lo mismo con lo demás:** hay **34 promesas y solo 8 con salida de error**.
Si IndexedDB falla (ventana de incógnito, disco lleno, base corrupta), no se
pinta nada y nadie dice nada.

**Cómo se ve desde el lado de la persona:** llena sus gastos, cierra el popup,
lo vuelve a abrir y está vacío. O guarda una cosa y no aparece en la libreta.
Sin un mensaje, sin una pista.

Es de la misma familia que los ocho errores de arriba: **la app da por hecho
que todo salió bien.**

### 10. El nombre que teclea la persona se pega como HTML

**Dónde:** `src/logic_quotation.js:467` y `src/biblioteca.js:161`. El nombre
que la persona escribió entra directo con `innerHTML`:

```js
info.innerHTML = `<div class="nombre">${p.nombre}</div>` + …
```

**Hoy no es una puerta abierta:** las reglas de seguridad de las extensiones
modernas (MV3) impiden que algo pegado así se ejecute. Pero es el patrón
equivocado, y **sí se rompe**: basta un `<` en el nombre de un presupuesto para
que la fila salga desconfigurada.

**Lo bueno:** el código nuevo ya lo hace bien. `src/recibo.js` arma todo con
`textContent` — 44 veces — y no mete HTML con datos ni una vez. Esto es
solamente del cotizador viejo, y se arregla copiando lo que ya hace el recibo.

### 11. Hay comentarios que ya mienten

**Dos encontrados:**

- **`README.md`** describe la app como un cotizador y lista 4 archivos de
  `src/`. Hay 13, y el corazón de la app hoy es el módulo de Ahorro, que no
  aparece por ningún lado.
- **`styles/styles.css:1061`** dice que los tamaños de letra del recibo están
  puestos grandes *"a propósito, contando con"* el `zoom: 0.75`. No lo están:
  con el zoom aplicado quedan por debajo de 10 px.

**Por qué esto va en la lista de errores y no en la de gustos:** la mejor
cualidad de este proyecto es que los comentarios explican **el porqué** y no el
qué. Eso solo sirve mientras sean ciertos. Un comentario viejo hace más daño
que ninguno, porque uno le cree y no va a comprobarlo.

### Deuda, que no es lo mismo que error

Esto no está mal, pero encarece cada pantalla nueva. Se anota para que la
decisión sea a propósito y no por inercia:

- **156 búsquedas al DOM por id**, ninguna guardada. Se vuelve a buscar el mismo
  elemento cada vez que se repinta.
- **Un solo espacio global** repartido en 11 archivos sueltos, con 47 nombres
  globales. Hoy no se pisa ninguno — se revisó — pero nada lo impide.
- **Cada función de pintado borra y rehace** en vez de actualizar lo que cambió.

Nada de esto se toca hoy. Si algún día se mete mano al cotizador viejo, ese es
el momento.

### Lo que se revisó del código y estaba BIEN

Para que no se pierda de vista lo que no hay que romper:

- **La lógica está separada de la pantalla, de verdad.** `src/ahorro.js` no toca
  el DOM ni el almacén, y por eso los 8 errores de este documento se
  encontraron corriéndolo solo, sin abrir el navegador. `src/db.js` cumple lo
  que promete en su comentario: ni un `getElementById`.
- **63 listeners y ninguno duplicado.** Las funciones que repintan destruyen
  antes de volver a atar. Eso casi siempre está mal en proyectos así, y aquí no.
- **El JavaScript es conservador a propósito** — sin `?.`, sin `async/await`.
  Corre en cualquier navegador. No hay que modernizarlo.

---

## LO QUE SE REVISÓ Y NO ERA ERROR

**El colchón se resta todos los meses, para siempre**, aunque la persona ya tenga
la reserva llena. Se preguntó si debía parar al llegar a una meta.

**DECIDIDO (David, 9 de septiembre de 2026): es un aporte de por vida.** No es
una meta que se llena y se cierra: es plata que se aparta siempre, para
cualquier cosa. Queda como está.

**Queda un cabo suelto de esa decisión, para pensarlo aparte:** la app le resta
el aporte al colchón todos los meses, pero la casilla de *"Tengo de colchón"* no
sube sola — solo cambia si la persona la corrige a mano. O sea que la app
descuenta plata para una reserva que, en sus cuentas, nunca crece. No es un
error de fórmula, es un renglón que falta.

---

## CÓMO QUEDA EL DESGLOSE DE UN GRUPO (era la pregunta del error 3)

**DECIDIDO (David, 9 de septiembre de 2026).** Dos reglas:

**1. El grupo se calcula TODO JUNTO.** El plazo, el veredicto y lo que le pesa
salen del total, con la plata guardada descontada UNA sola vez. Eso ya está
bien hoy — es lo único del grupo que no miente.

**2. Lo de cada cosa por separado se muestra SOLO SI LA PERSONA LA TOCA.**
No se le pone al frente, porque al frente parecería una promesa de que las tres
se pueden. Se le da cuando la pide, y se dice con todas sus palabras que es un
"y si fuera solo esta".

### Qué hay que cambiar

Hoy `recPintarDesglose()` (`src/recibo.js`) pinta tres columnas por fila:

```
Nevera          $2.000.000     un mes
Estufa          $1.000.000     un mes
Mesa              $500.000    ya mismo
─────────────────────────────────────
Todo junto      $3.500.000
```

**Esa tercera columna es el error.** Cada plazo está calculado como si esa fuera
la única cosa del mundo, descontándole a cada una los mismos 1.000.000
guardados. Leídas en fila parecen un plan que se puede cumplir, y no se puede.

Quitarla. La fila queda con lo que sí es cierto de cada cosa — su nombre y su
precio — y el plazo, que es lo que depende de las demás, se queda arriba, en el
del grupo completo:

```
Cosa por cosa
Nevera          $2.000.000   ›
Estufa          $1.000.000   ›
Mesa              $500.000   ›
─────────────────────────────────────
Todo junto      $3.500.000
```

### Al tocar una fila

Se abre un renglón DEBAJO de esa fila, dentro del mismo recibo. No es otra
pantalla, no es una ventana, no se va a ningún lado: el recibo crece un poquito
y se vuelve a cerrar al tocar otra vez. Es el mismo gesto que ya usan "¿Y si lo
quiero en…?" y "Ojo con esta cuenta", así que no hay nada nuevo que aprender.

Adentro va lo de ESA cosa sola, empezando por la advertencia:

```
  Mesa                          $500.000   ⌄
  ┌─────────────────────────────────────────
  │ Ella sola, sin las otras:
  │ la tendría en un mes.
  │ Se le lleva casi la mitad de lo que
  │ guarda cada quincena.
  └─────────────────────────────────────────
```

**"Ella sola, sin las otras" no se puede quitar.** Es la frase que evita que la
persona sume los plazos de las tres filas y crea que ese es su plan.

Una abierta a la vez: al tocar otra, la anterior se cierra. Así el recibo no se
estira sin control y siempre se ve el "Todo junto" del final.

### Lo que NO cambia

- El recibo sigue siendo uno solo, con sus dos caras. Esto no agrega vistas.
- La cara de atrás (corregir nombres y precios) se queda igual.
- El recibo de UNA cosa suelta no se toca: ahí no hay desglose que abrir.
- Sigue sin haber prioridad ni orden dentro del grupo. No hizo falta: como el
  plan de verdad es el del total, no hay que decidir cuál va primero.
