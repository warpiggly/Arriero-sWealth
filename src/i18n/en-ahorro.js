// Inglés de: ahorro. Llave = frase exacta en español (ver src/i18n.js).
// Archivos: src/ahorro.js, src/deudas.js, src/calculadora.js, src/db.js.
// Palabras de la casa: colchón / reserva = "rainy-day fund", cuota = "payment",
// chulear = "check off", mora = "behind on payments".
Object.assign(EN, {
  // --- ahorro.js: las reglas (rótulos) ---
  'Lo necesario': 'The must-haves',
  'Sus gustos': 'Your little treats',
  'Para guardar': 'To save',

  // --- ahorro.js: el consejo de la hoja del mes ---
  'Cuando me diga cuánto gana al mes, le digo cómo va.': 'Once you tell me how much you make a month, I\'ll tell you how you\'re doin\'.',
  'Anote en qué se le va la plata y le digo cómo va, mijo.': 'Jot down where your money goes and I\'ll tell you how you\'re doin\', mijo.',
  'Está gastando más de lo que gana. Empiece por los otros gastos: ahí es donde más fácil se recorta.': 'You\'re spendin\' more than you make, sugar. Start with the other expenses: that\'s the easiest place to trim.',
  'Está gastando más de lo que gana. Mire las deudas y los servicios: son los que más se pueden bajar.': 'You\'re spendin\' more than you make, sugar. Look at your debts and utilities: those are the ones you can bring down the most.',
  'Lo necesario se le lleva casi todo. Mire si alguna deuda o servicio se puede bajar.': 'The must-haves are eatin\' up nearly everything. See if you can bring down a debt or a utility bill.',
  'Va justo, mijo. Un recorte chiquito en los otros gastos le da aire.': 'Things are tight, kiddo. A little trim on the other expenses will give you some breathin\' room.',
  'Va bien. Si puede, aparte el 10 % de lo que gana: poquito a poco se vuelve su colchón.': 'You\'re doin\' fine. If you can, set aside 10 % of what you make: little by little it turns into your rainy-day fund.',
  'Va muy bien, mijo. Siga así y no le meta mano a lo que guarda.': 'You\'re doin\' real good, darlin\'. Keep it up, and keep your hands off what you\'ve saved.',

  // --- ahorro.js: el plazo en palabras ---
  'no se sabe': 'no telling yet',
  'ya mismo': 'right now',
  'en {plazo}': 'in {plazo}',
  'un mes': 'a month',
  '{n} meses': '{n} months',
  'un año': 'a year',
  '{n} años': '{n} years',
  '{anios} y {meses}': '{anios} and {meses}',

  // --- ahorro.js: el veredicto ---
  'Sí le alcanza, mijo': 'Yes, you can afford it, kiddo',
  'Con lo que ya tiene guardado.': 'With what you\'ve already got saved.',
  'Todavía no le alcanza': 'Not enough just yet',
  'Para tenerlo en un año le tocaría juntar {porMes} al mes, o {porDia} al día.': 'To have it in a year, you\'d need to put away {porMes} a month, or {porDia} a day.',
  'Le alcanza, pero se gasta la reserva': 'You can afford it, but it eats your rainy-day fund',
  'Saca {saca} y le quedan {queda}. Esperando {plazo} no lo toca.': 'You\'d take out {saca} and have {queda} left. Wait {plazo} and you won\'t have to touch it.',
  'Le alcanza, pero se va a demorar': 'You can afford it, but it\'s gonna take a while',
  'Con {monto} al mes lo tendría en año y medio.': 'With {monto} a month, you\'d have it in a year and a half.',
  'Sin tocar su colchón.': 'Without touchin\' your rainy-day fund.',
  'Todo junto se va a demorar': 'All together, it\'s gonna take a while',
  'Pero {cosa} la tiene {plazo}: arranque por ahí.': 'But you\'ll have {cosa} {plazo}: start right there.',
  'la más barata': 'the cheapest one',

  // --- ahorro.js: cuánto le pesa ---
  'No cuesta nada, mijo.': 'It doesn\'t cost a thing, kiddo.',
  'Hoy no le queda nada para guardar, así que todo esto es cuesta arriba.': 'Right now there\'s nothin\' left over to save, so all of this is an uphill climb.',
  'Es un pedacito de lo que usted guarda cada {periodo}: no lo va a sentir.': 'That\'s just a little sliver of what you save every {periodo}: you won\'t even feel it.',
  'Es como la cuarta parte de lo que guarda cada {periodo}.': 'That\'s about a quarter of what you save every {periodo}.',
  'Se le lleva casi la mitad de lo que guarda cada {periodo}.': 'That takes near about half of what you save every {periodo}.',
  'Se le lleva casi todo lo que guarda en {unPeriodo}.': 'That takes near about everything you save in {unPeriodo}.',
  'Es {unPeriodoEntero} de todo lo que usted guarda.': 'That\'s {unPeriodoEntero} of everything you save.',
  'Son {cantidad} de todo lo que usted guarda.': 'That\'s {cantidad} of everything you save.',

  // --- ahorro.js: los botones de plazo ---
  'Ya lo tiene, mijo. No hay que guardar nada más.': 'You\'ve already got it, sugar. No need to save another cent.',
  'Para tenerlo en {meses} meses tendría que guardar {porMes} al mes. Usted ya guarda {guarda}: le sobra.': 'To have it in {meses} months, you\'d need to save {porMes} a month. You already save {guarda}: that\'s plenty.',
  'Para tenerlo en {meses} meses tendría que guardar {porMes} al mes, y hoy guarda {guarda}. Le faltarían {falta} cada mes — serían {porDia} al día.': 'To have it in {meses} months, you\'d need to save {porMes} a month, and right now you save {guarda}. You\'d be short {falta} every month — that\'s {porDia} a day.',

  // --- ahorro.js: el aviso del prellenado ---
  'Estoy contando con que todo lo que gana lo puede guardar. Dígame en qué se le va la plata y le hago la cuenta de verdad.': 'I\'m countin\' as if you could save every cent you make. Tell me where your money goes and I\'ll do the real math.',

  // --- ahorro.js: qué parte del grupo es ---
  'es casi todo el grupo': 'is nearly the whole group',
  'se lleva siete de cada diez pesos del grupo': 'takes seven of every ten dollars in the group',
  'se lleva tres de cada cinco pesos del grupo': 'takes three of every five dollars in the group',
  'es como la mitad del grupo': 'is about half the group',
  'es como la tercera parte del grupo': 'is about a third of the group',
  'es como la quinta parte del grupo': 'is about a fifth of the group',
  'es una parte chiquita del grupo': 'is a tiny piece of the group',

  // --- deudas.js: el veredicto del crédito ---
  '¡Ya terminó de pagar, mijo!': '¡Ave María! You\'re all paid off, kiddo!',
  'Pagó {total} en {n} cuota.': 'You paid {total} in {n} payment.',
  'Pagó {total} en {n} cuotas.': 'You paid {total} in {n} payments.',
  'La cuota del {fecha} ya pasó y no está chuleada.': 'The payment due {fecha} has gone by and it isn\'t checked off.',
  'Tiene {n} cuotas vencidas sin chulear ({debe}).': 'You\'ve got {n} overdue payments not checked off ({debe}).',
  'Si ya las pagó, chulee las cuotas abajo. Si no, páguelas cuanto antes: cada día de atraso el banco cobra intereses de mora.': 'If you already paid them, check them off down below. If not, pay them quick as you can: every day late, the bank charges late interest.',
  'Si no alcanza, llame al banco ANTES de que pase más tiempo y pida un acuerdo de pago: casi siempre sale más barato que la mora.': 'If you can\'t cover it, call the bank BEFORE more time goes by and ask for a payment plan: it nearly always comes out cheaper than fallin\' behind.',
  'En la cuota {n} pagó {menos} menos de lo que tocaba.': 'On payment {n} you paid {menos} less than you owed.',
  'En {n} cuotas pagó menos: le faltaron {falto}.': 'On {n} payments you paid less: you came up {falto} short.',
  'Póngale esos {falto} a la próxima cuota para quedar al día. Pagar incompleto también es mora para el banco.': 'Add that {falto} to your next payment to get caught up. To the bank, payin\' short counts as late too.',
  'Hoy no le sobra nada al mes para pagar la cuota de {cuota}.': 'Right now you\'ve got nothin\' left over each month to cover the {cuota} payment.',
  'La cuota de {cuota} es más de lo que le sobra al mes ({margen}).': 'The {cuota} payment is more than you\'ve got left over each month ({margen}).',
  'Pídalo a {meses} meses: la cuota baja a {cuota} y sí le cabe.': 'Ask for it over {meses} months: the payment drops to {cuota} and that fits just fine.',
  'O pida menos plata: a {meses} meses, hasta {puede} le cabe.': 'Or borrow less: over {meses} months, up to {puede} fits.',
  'O libere {monto} al mes en sus gastos antes de firmar.': 'Or free up {monto} a month in your expenses before you sign.',
  'Antes de sacar el crédito, mire sus gastos en la hoja del mes: hoy lo que gana no alcanza para una cuota más.': 'Before you take out the loan, look over your expenses on the monthly sheet: right now what you make won\'t stretch to one more payment.',
  'Ojo, mijo: va en mora': 'Careful now, darlin\': you\'re behind on payments',
  'Ojo, mijo: va para mora': 'Careful now, darlin\': you\'re headed for late payments',
  'La cuota le cabe, mijo': 'The payment fits, kiddo',
  'Después de pagarla le quedan {queda} al mes.': 'After you pay it, you\'ve got {queda} left each month.',

  // --- deudas.js: cuánto cambió el final ---
  'Con estos pagos no termina nunca': 'With these payments it never ends',
  'termina {cuantos} antes': 'ends {cuantos} early',
  'se demora {cuantos} más': 'takes {cuantos} longer',

  // --- calculadora.js ---
  'No se puede': 'Can\'t do that',
  'Muy grande': 'Too big',
  '{n} ÷ 12 (al mes)': '{n} ÷ 12 (per month)',
  '{n} ÷ 30 (al día)': '{n} ÷ 30 (per day)',
  '{n} × 12 (al año)': '{n} × 12 (per year)',
  '10 % de {n}': '10 % of {n}',

  // --- db.js: errores que pueden salir en pantalla ---
  'Este navegador no tiene IndexedDB': 'This browser doesn\'t have IndexedDB',
  'No existe el ítem {id}': 'Item {id} doesn\'t exist'
});
