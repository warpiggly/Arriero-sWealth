// Inglés de: credito. Llave = frase exacta en español (ver src/i18n.js).
// Incluye src/credito.js (el recibo del crédito) y src/cobro.js (las cuentas
// de Cobrar: el sello de la hoja y los renglones que ve el cliente).
Object.assign(EN, {
  // ---------------- src/cobro.js: la frase de la hoja (solo la ve la persona)
  'Anote el trabajo y le digo cuánto cobrar.':
    "Write down the job, sugar, and I'll tell you what to charge.",
  '× Con ese descuento pierde {plata}: le estaría regalando su trabajo.':
    "× With that discount you lose {plata}: you'd be givin' your work away for free.",
  '! Su tiempo no se está cobrando: dígame arriba cuánto vale su día.':
    "! Your time isn't bein' charged: tell me up top what your day is worth.",
  '! Sin ganancia: cobra lo que le cuesta y nada más.':
    '! No profit: you only charge what it costs you, nothin’ more.',
  '✓ Por su trabajo se lleva {lleva}, y de eso {limpio} son ganancia limpia.':
    '✓ For your work you take home {lleva}, and {limpio} of that is clean profit.',
  '✓ Se gana {limpio} limpios.': '✓ You make {limpio} clean.',

  // ---------------- src/cobro.js: lo que ve el cliente (inglés limpio)
  'Mano de obra': 'Labor',
  'Servicio': 'Service',
  'Material': 'Material',
  'Transporte': 'Transportation',
  'Otro gasto': 'Other expense',
  '{n} hora': '{n} hour',
  '{n} horas': '{n} hours',
  'medio día': 'half a day',
  '{n} día': '{n} day',
  '{n} días': '{n} days',
  'N°': 'No.',
  'hoy': 'today',
  'ayer': 'yesterday',
  'hace {n} días': '{n} days ago',
  'hace {n} meses': '{n} months ago',

  // ---------------- src/credito.js: avisos
  'Escríbame cuánto le prestan, mijo.': "Write down how much they're lendin' you, mijo.",
  '¿En cuántos meses lo va a pagar?': 'How many months will you take to pay it?',
  'Escriba el interés al mes. Si no le cobran nada, ponga 0.':
    "Write the monthly interest. If they charge you nothin', put 0.",
  'Quedó apuntado en sus deudas, mijo.': "It's written down in your debts now, kiddo.",
  'Lo quité de sus deudas.': 'I took it off your debts.',
  'Deshacer': 'Undo',
  'Listo, volvió a sus deudas.': "There you go, it's back in your debts.",

  // ---------------- src/credito.js: la sugerencia de meses
  'Dígame cuánto gana (arriba) y le digo en cuántos meses le conviene.':
    "Tell me how much you earn (up top) and I'll tell you how many months suit you best.",
  'Hoy no le sobra nada al mes, mijo. Cualquier cuota lo pondría en aprietos: mire primero sus gastos en la hoja del mes.':
    "Right now you've got nothin' left over each month, sugar. Any payment would put you in a tight spot: look over your expenses on the month's sheet first.",
  'Ni a 10 años le cabe la cuota con lo que le sobra ({margen}). Pida menos plata: a 24 meses, hasta {hasta}.':
    "Not even over 10 years does the payment fit in what you have left ({margen}). Ask for less money: over 24 months, up to {hasta}.",
  'Le sobran {plata} al mes. ': 'You have {plata} left over each month. ',
  'Le recomiendo mínimo {n} mes': 'I recommend at least {n} month',
  'Le recomiendo mínimo {n} meses': 'I recommend at least {n} months',
  ': cuota de {plata}.': ': a payment of {plata}.',
  ': cuota de {plata} (sin contar interés: escríbalo para que la cuenta sea de verdad).':
    ': a payment of {plata} (not countin’ interest: write it in so the math is the real deal).',
  'Usar {n} mes': 'Use {n} month',
  'Usar {n} meses': 'Use {n} months',

  // ---------------- src/credito.js: el recibo del crédito
  'Mi crédito': 'My loan',
  'al {pct} mensual · {n} mes': 'at {pct} a month · {n} month',
  'al {pct} mensual · {n} meses': 'at {pct} a month · {n} months',
  'Cuota al mes': 'Monthly payment',
  'Plata prestada': 'Money borrowed',
  'Intereses': 'Interest',
  'Total a pagar': 'Total to pay',
  'Al sacarlo era': 'When you took it out',
  '(se ahorra {plata})': '(you save {plata})',
  '(paga {plata} más)': '(you pay {plata} more)',
  'Termina': 'Ends',
  'no termina nunca': 'never ends',
  'Ya lo pagué: quitarlo de mis deudas': 'I paid it off: remove it from my debts',
  'Lleva pagado': 'Paid so far',
  ' de {total}': ' of {total}',
  'Pagó todas las cuotas.': 'You paid every last payment. Well done, kiddo!',
  'Le falta {n} cuota: {plata}': '{n} payment left: {plata}',
  'Le faltan {n} cuotas: {plata}': '{n} payments left: {plata}',
  ' · la próxima, el {fecha}': ' · next one on {fecha}',

  // ---------------- src/credito.js: las cuotas para chulear
  'La {n} cuota': 'The {n} payment',
  'Las {n} cuotas': 'The {n} payments',
  ' · {n} pagadas': ' · {n} paid',
  'Ya pagué la cuota {n}': 'I already paid payment {n}',
  'Cuota {n}': 'Payment {n}',
  ' · pagada': ' · paid',
  ' · ¡vencida!': ' · overdue!',
  ' · faltaron {plata}': ' · {plata} short',
  ' · pagó de más': ' · paid extra',
  'Lo que pagó en la cuota {n}': 'What you paid on payment {n}',
  '{n} cuota': '{n} payment',
  '{n} cuotas': '{n} payments',
  'Total': 'Total',

  // ---------------- src/credito.js: en la libreta
  'Deudas': 'Debts',
  'Pagado ✓': 'Paid ✓',
  'En mora': 'Behind on payments',
  'No le cabe': "Doesn't fit",
  'Próxima: {fecha}': 'Next: {fecha}',
  '{pagadas} de {total} cuotas pagadas': '{pagadas} of {total} payments made',
  'Le falta por pagar {plata}': 'Still left to pay: {plata}',

  // ---------------- src/credito.js: la imagen que se baja
  'credito': 'loan',
  'su crédito, mijo': 'your loan, kiddo',
  'Le prestan|recibo': 'Loan amount',
  'Para no quedar en mora': 'To keep from falling behind',
  'Las cuotas': 'The payments',
  'Cuenta hecha con Arriero’s Wealth|credito': 'Figured with Arriero’s Wealth'
});
