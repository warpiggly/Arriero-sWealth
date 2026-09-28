// =================================================================
// credito.js — La cara del crédito
//
// La otra pestaña de la pregunta: "¿Va a sacar un crédito?". Hace con un
// crédito lo que recibo.js hace con una compra: pregunta, responde en un
// recibo de dos caras, y lo apunta en la libreta (en "Deudas").
//
// Las cuentas NO viven aquí: están en src/deudas.js, que es puro. Aquí solo
// se lee lo que la persona escribe y se pinta lo que deudas.js responde.
//
// LO QUE EL RECIBO DEL CRÉDITO TRAE DE MÁS
//   · Las cuotas, del mes 1 al último, para ir CHULEANDO. Con más de 6 van en
//     un desplegable.
//   · Cada cuota se puede corregir: si un mes pagó de más, el crédito termina
//     antes; si pagó de menos, se demora más y queda en mora. Todo el recibo
//     se vuelve a hacer.
//   · El total con intereses.
//   · Rojo si va en mora, con qué hacer para salir.
//   · Por detrás, la hoja de cuotas: fecha, pago, interés, abono y saldo.
//
// Y LO QUE LE HACE AL NÚMERO DE ARRIBA
//   La próxima cuota sin chulear de cada crédito se suma sola a lo necesario
//   de la hoja del mes (ajustes.cuotasCreditos). Así el "puede guardar" de la
//   cabecera baja cuando saca un crédito y sube cuando lo termina de pagar.
// =================================================================

let credAhora = null;        // el crédito que se está mirando (id null = sin guardar)
let credCuotasAbiertas = null;

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('cre-recibo')) return;

  // --- Las dos pestañas de la pregunta ---
  credAtar('ah-pest-compra', 'click', function () { credPestana('compra'); });
  credAtar('ah-pest-credito', 'click', function () { credPestana('credito'); });

  // --- El formulario ---
  if (typeof recAtarMoneda === 'function') recAtarMoneda(document.getElementById('cre-monto'));
  ['cre-nombre', 'cre-monto', 'cre-meses', 'cre-tasa'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', credFormularioCambio);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); credHacerLaCuenta(); }
    });
  });
  credAtar('cre-hacer-cuenta', 'click', credHacerLaCuenta);

  // --- El recibo ---
  credAtar('cre-cerrar', 'click', credEsconder);
  credAtar('cre-cuotas-caja-tit', 'click', function () {
    credCuotasAbiertas = !credCuotasAbiertas;
    credMarcarCuotas();
  });
  credAtar('cre-g-guardar', 'click', credGuardar);
  credAtar('cre-g-dejar', 'click', function () {
    credEsconder();
    credLimpiarFormulario();
    recAvisar('Listo: no guardé nada. Ahí tenía su cuenta.');
  });
  credAtar('cre-quitar', 'click', credQuitar);
  credAtar('cre-descargar', 'click', credDescargar);
  document.querySelectorAll('.cre-voltear').forEach(function (b) {
    b.addEventListener('click', function () {
      const caja = document.getElementById('cre-recibo');
      recPonerVolteado(caja, !caja.classList.contains('volteado'));
    });
  });
  document.addEventListener('keydown', function (e) {
    const caja = document.getElementById('cre-recibo');
    if (e.key === 'Escape' && caja && !caja.classList.contains('oculto')) credEsconder();
  });

  // --- La cara de atrás ---
  if (typeof recAtarMoneda === 'function') recAtarMoneda(document.getElementById('cre-a-monto'));
  credAtar('cre-a-monto', 'change', function (el) {
    credCambiar(function (c) { c.monto = recNumero(el.value); });
  });
  credAtar('cre-a-meses', 'change', function (el) {
    credCambiar(function (c) { c.meses = Math.max(1, parseInt(el.value, 10) || c.meses); });
  });
  credAtar('cre-a-tasa', 'change', function (el) {
    credCambiar(function (c) { c.tasa = credTasaDe(el.value); });
  });
  credAtar('cre-a-primera', 'change', function (el) {
    if (!el.value) return;
    const p = el.value.split('-');
    credCambiar(function (c) {
      c.primera = new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    });
  });

  // Al abrir: que la cuota de este mes esté al día en la hoja. Cambia sola
  // cuando empieza un mes nuevo o cuando una cuota se vence.
  ajustesCargar().then(credSincronizarCuotas);
});

function credAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function () { hacer(el); });
}

// ----------------------------------------------------------------
// 1. Las pestañas
// ----------------------------------------------------------------
function credPestana(cual) {
  const esCredito = cual === 'credito';
  [['ah-pest-compra', 'ah-preg-compra', !esCredito],
   ['ah-pest-credito', 'ah-preg-credito', esCredito]].forEach(function (t) {
    const pest = document.getElementById(t[0]);
    const cara = document.getElementById(t[1]);
    if (pest) {
      pest.classList.toggle('activa', t[2]);
      pest.setAttribute('aria-selected', t[2] ? 'true' : 'false');
    }
    if (cara) cara.classList.toggle('oculto', !t[2]);
  });
  if (esCredito) credSugerir();
}

// ----------------------------------------------------------------
// 2. El formulario y la sugerencia de meses
// ----------------------------------------------------------------
function credTasaDe(txt) {
  const n = parseFloat(String(txt || '').replace('%', '').replace(',', '.'));
  return isFinite(n) && n >= 0 ? Math.min(n, 100) : 0;
}

function credLeerFormulario() {
  const v = function (id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };
  return {
    nombre: v('cre-nombre').trim(),
    monto: recNumero(v('cre-monto')),
    meses: parseInt(soloLosDigitos(v('cre-meses')), 10) || 0,
    tasaTexto: v('cre-tasa').trim(),
    tasa: credTasaDe(v('cre-tasa'))
  };
}

function soloLosDigitos(t) { return String(t || '').replace(/\D/g, ''); }

// Lo que le sobra al mes para pagar una cuota. Si el crédito ya está
// guardado, su propia cuota ya se restó en la hoja: se le devuelve para no
// contarla dos veces.
function credMargen(plan) {
  const a = recAjustes || ajustesVacios();
  let margen = ahorroCapacidad(a).alMes;
  if (credAhora && credAhora.id && plan) margen += deudaCuotaDelMes(plan);
  return margen;
}

function credSugerir() {
  const caja = document.getElementById('cre-sugerencia');
  if (!caja) return;
  const f = credLeerFormulario();
  caja.innerHTML = '';

  if (!f.monto) { caja.classList.add('oculto'); return; }
  caja.classList.remove('oculto');

  const a = recAjustes || ajustesVacios();
  if (!ajustesTieneIngreso(a)) {
    caja.textContent = 'Dígame cuánto gana (arriba) y le digo en cuántos meses le conviene.';
    return;
  }

  const margen = ahorroCapacidad(a).alMes;
  const sug = deudaMesesSugeridos(f.monto, f.tasa, margen);

  const p = document.createElement('p');
  if (margen <= 0) {
    p.textContent = 'Hoy no le sobra nada al mes, mijo. Cualquier cuota lo pondría en ' +
                    'aprietos: mire primero sus gastos en la hoja del mes.';
    caja.appendChild(p);
    return;
  }
  if (!sug) {
    p.textContent = 'Ni a 10 años le cabe la cuota con lo que le sobra (' + recPlata(margen) +
                    '). Pida menos plata: a 24 meses, hasta ' +
                    recPlata(deudaMontoParaCuota(margen, f.tasa, 24)) + '.';
    caja.appendChild(p);
    return;
  }

  p.innerHTML = '';
  p.appendChild(document.createTextNode('Le sobran ' + recPlata(margen) + ' al mes. '));
  const fuerte = document.createElement('strong');
  fuerte.textContent = 'Le recomiendo mínimo ' + sug.meses + (sug.meses === 1 ? ' mes' : ' meses');
  p.appendChild(fuerte);
  p.appendChild(document.createTextNode(': cuota de ' + recPlata(sug.cuota) +
    (f.tasaTexto ? '.' : ' (sin contar interés: escríbalo para que la cuenta sea de verdad).')));
  caja.appendChild(p);

  if (f.meses !== sug.meses) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ah-sug-usar';
    b.textContent = 'Usar ' + sug.meses + (sug.meses === 1 ? ' mes' : ' meses');
    b.addEventListener('click', function () {
      const m = document.getElementById('cre-meses');
      if (m) m.value = String(sug.meses);
      credFormularioCambio();
    });
    caja.appendChild(b);
  }
}

// Mientras escribe: la sugerencia sigue la escritura, y si el recibo de un
// crédito nuevo ya está afuera, también.
function credFormularioCambio() {
  credSugerir();
  if (credAhora && !credAhora.id && credVisible()) {
    const f = credLeerFormulario();
    if (f.monto && f.meses) {
      credAhora.nombre = f.nombre;
      credAhora.monto = f.monto;
      credAhora.meses = f.meses;
      credAhora.tasa = f.tasa;
      credPintar();
    }
  }
}

function credHacerLaCuenta() {
  const f = credLeerFormulario();
  const falta = !f.monto ? ['cre-monto', 'Escríbame cuánto le prestan, mijo.']
    : !f.meses ? ['cre-meses', '¿En cuántos meses lo va a pagar?']
    : !f.tasaTexto ? ['cre-tasa', 'Escriba el interés al mes. Si no le cobran nada, ponga 0.']
    : null;
  if (falta) {
    recAvisar(falta[1]);
    const el = document.getElementById(falta[0]);
    if (el) el.focus();
    return;
  }

  credAhora = {
    id: null,
    nombre: f.nombre,
    monto: f.monto,
    tasa: f.tasa,
    meses: f.meses,
    primera: deudaPrimeraPorDefecto(),
    pagos: {},
    pagados: {},
    creado: Date.now()
  };
  credCuotasAbiertas = null;
  credMostrar();
}

function credLimpiarFormulario() {
  ['cre-nombre', 'cre-monto', 'cre-meses', 'cre-tasa'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  credSugerir();
}

// ----------------------------------------------------------------
// 3. Mostrar, esconder y cambiar
// ----------------------------------------------------------------
function credVisible() {
  const caja = document.getElementById('cre-recibo');
  return !!caja && !caja.classList.contains('oculto');
}

function credMostrar() {
  // Un recibo a la vez: dos papeles abiertos confunden.
  if (typeof recEsconderRecibo === 'function') recEsconderRecibo();
  const caja = document.getElementById('cre-recibo');
  if (!caja) return;
  caja.classList.remove('oculto');
  recPonerVolteado(caja, false);
  credPintar();
  if (caja.scrollIntoView) caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function credEsconder() {
  const caja = document.getElementById('cre-recibo');
  if (!caja || caja.classList.contains('oculto')) return;
  caja.classList.add('oculto');
  recPonerVolteado(caja, false);
  credAhora = null;
}

// Lo llama recibo.js cuando cambian los datos de la persona: la cuenta del
// crédito depende de lo que le sobra al mes.
function credRepintar() {
  if (credAhora && credVisible()) credPintar();
}

// Todo cambio pasa por aquí: se cambia, se guarda si ya estaba apuntado, y se
// vuelve a hacer la cuenta (y el número de arriba).
function credCambiar(hacer) {
  if (!credAhora) return;
  hacer(credAhora);
  if (!credAhora.id) {
    credPintar();
    return;
  }
  dbActualizarCredito(credAhora.id, credAhora)
    .then(credSincronizarCuotas)
    .then(function () {
      credPintar();
      recPintarLibreta();
    });
}

function credVer(id) {
  dbCredito(id).then(function (c) {
    if (!c) return;
    credAhora = c;
    credCuotasAbiertas = null;
    credMostrar();
  });
}

function credGuardar() {
  if (!credAhora || credAhora.id) return;
  dbGuardarCredito(credAhora).then(function (id) {
    credAhora.id = id;
    credLimpiarFormulario();
    recAvisar('Quedó apuntado en sus deudas, mijo.');
    return credSincronizarCuotas();
  }).then(function () {
    credPintar();
    recPintarLibreta();
  });
}

function credQuitar() {
  if (!credAhora || !credAhora.id) return;
  const copia = JSON.parse(JSON.stringify(credAhora));
  dbBorrarCredito(credAhora.id).then(function () {
    credEsconder();
    return credSincronizarCuotas();
  }).then(function () {
    recPintarLibreta();
    recAvisar('Lo quité de sus deudas.', {
      texto: 'Deshacer',
      hacer: function () {
        delete copia.id;
        dbGuardarCredito(copia).then(credSincronizarCuotas).then(function () {
          recAvisar('Listo, volvió a sus deudas.');
          recPintarLibreta();
        });
      }
    });
  });
}

// La suma de las cuotas de este mes, puesta en la hoja del mes. Solo escribe
// si cambió: cada escritura repinta toda la vista.
function credSincronizarCuotas() {
  return dbTodosLosCreditos().then(function (lista) {
    const suma = lista.reduce(function (t, c) {
      return t + deudaCuotaDelMes(deudaPlan(c));
    }, 0);
    const a = recAjustes || ajustesVacios();
    if (Math.round(a.cuotasCreditos || 0) === Math.round(suma)) return a;
    return ajustesGuardar({ cuotasCreditos: suma }).then(function (nuevos) {
      if (typeof recTrasGuardar === 'function') recTrasGuardar(nuevos);
      return nuevos;
    });
  }).catch(function (e) {
    console.warn('No pude sumar las cuotas de los créditos:', e);
  });
}

// ----------------------------------------------------------------
// 4. Pintar el recibo
// ----------------------------------------------------------------
function credPintar() {
  const c = credAhora;
  const caja = document.getElementById('cre-recibo');
  if (!c || !caja) return;

  const plan = deudaPlan(c);
  const margen = credMargen(plan);
  const v = deudaVeredicto(plan, margen, recPlata);

  // Rojo si va en mora. La frase lo dice también: el color solo acompaña.
  caja.classList.toggle('cre-roja', v.mora);

  credTexto('cre-nombre-rec', c.nombre || 'Mi crédito');
  credTexto('cre-monto-rec', recPlata(plan.monto));
  credTexto('cre-condiciones', 'al ' + credPct(plan.tasa) + ' mensual · ' +
            plan.mesesPedidos + (plan.mesesPedidos === 1 ? ' mes' : ' meses'));

  // --- Los renglones ---
  const r = document.getElementById('cre-renglones');
  r.innerHTML = '';
  r.appendChild(recRenglon('Cuota al mes', recPlata(plan.cuota), '', true));
  r.appendChild(recRenglon('Plata prestada', recPlata(plan.monto)));
  r.appendChild(recRenglon('Intereses', recPlata(plan.intereses)));
  r.appendChild(recRenglon('Total a pagar', recPlata(plan.totalPagar), '', true));
  if (plan.totalPagar !== plan.totalOriginal) {
    const d = plan.totalPagar - plan.totalOriginal;
    r.appendChild(recRenglon('Al sacarlo era', recPlata(plan.totalOriginal),
      d < 0 ? '(se ahorra ' + recPlata(-d) + ')' : '(paga ' + recPlata(d) + ' más)'));
  }
  if (plan.sinFin) {
    r.appendChild(recRenglon('Termina', 'no termina nunca', '', false));
  } else if (plan.ultima) {
    r.appendChild(recRenglon('Termina', deudaFechaCorta(plan.ultima.fecha),
                             deudaCambioDelFinal(plan)));
  }

  credPintarAvance(plan);
  credPintarVeredicto(v);

  // --- Qué hacer para no quedar en mora ---
  const mora = document.getElementById('cre-mora');
  const lista = document.getElementById('cre-mora-lista');
  lista.innerHTML = '';
  v.sugerencias.forEach(function (s) {
    const li = document.createElement('li');
    li.textContent = s;
    lista.appendChild(li);
  });
  mora.classList.toggle('oculto', !v.sugerencias.length);

  credPintarCuotas(plan);

  // --- Los botones ---
  document.getElementById('cre-guardar').classList.toggle('oculto', !!c.id);
  const quitar = document.getElementById('cre-quitar');
  quitar.classList.toggle('oculto', !c.id);
  quitar.textContent = plan.terminado ? 'Ya lo pagué: quitarlo de mis deudas'
                                      : 'Quitarlo de mis deudas';

  credPintarHoja(plan);
}

function credTexto(id, t) {
  const el = document.getElementById(id);
  if (el) el.textContent = t;
}

function credPct(n) {
  return String(Math.round((Number(n) || 0) * 100) / 100).replace('.', ',') + ' %';
}

function credPintarAvance(plan) {
  const cont = document.getElementById('cre-avance');
  cont.innerHTML = '';
  const pct = plan.totalPagar > 0 ? Math.min(100, plan.pagado / plan.totalPagar * 100) : 0;

  const dice = document.createElement('p');
  dice.className = 'cre-avance-dice';
  dice.appendChild(document.createTextNode('Lleva pagado '));
  const b = document.createElement('strong');
  b.textContent = recPlata(plan.pagado);
  dice.appendChild(b);
  dice.appendChild(document.createTextNode(' de ' + recPlata(plan.totalPagar)));
  cont.appendChild(dice);

  const barra = document.createElement('div');
  barra.className = 'cre-barra';
  barra.setAttribute('role', 'progressbar');
  barra.setAttribute('aria-valuenow', String(Math.round(pct)));
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  const lleno = document.createElement('span');
  lleno.style.width = pct + '%';
  barra.appendChild(lleno);
  cont.appendChild(barra);

  const falta = document.createElement('p');
  falta.className = 'cre-avance-falta';
  const quedan = plan.mesesReales - plan.cuotasPagadas;
  falta.textContent = plan.terminado
    ? 'Pagó todas las cuotas.'
    : 'Le faltan ' + quedan + (quedan === 1 ? ' cuota' : ' cuotas') + ': ' + recPlata(plan.falta) +
      (plan.proxima ? ' · la próxima, el ' + deudaFechaCorta(plan.proxima.fecha) : '');
  cont.appendChild(falta);
}

// El mismo dibujo del veredicto del recibo de comprar (clases rec-v-*).
function credPintarVeredicto(v) {
  const cont = document.getElementById('cre-veredicto');
  cont.className = 'rec-veredicto rec-v-' + v.tono;
  cont.innerHTML = '';
  const ico = document.createElement('span');
  ico.className = 'rec-v-ico';
  ico.setAttribute('aria-hidden', 'true');
  ico.textContent = v.tono === 'no' ? '!' : '✓';
  cont.appendChild(ico);
  const dice = document.createElement('span');
  dice.className = 'rec-v-dice';
  const frase = document.createElement('span');
  frase.className = 'rec-v-frase';
  frase.textContent = v.frase;
  dice.appendChild(frase);
  if (v.porque) {
    const porque = document.createElement('span');
    porque.className = 'rec-v-porque';
    porque.textContent = v.porque;
    dice.appendChild(porque);
  }
  cont.appendChild(dice);
}

// ----------------------------------------------------------------
// 5. Las cuotas para chulear
// ----------------------------------------------------------------
function credPintarCuotas(plan) {
  const cont = document.getElementById('cre-cuotas');
  cont.innerHTML = '';

  // Con pocas, abiertas de una. Con muchas, plegadas — salvo que la persona
  // ya las haya abierto: no se le cierran en la cara al chulear.
  if (credCuotasAbiertas === null) credCuotasAbiertas = plan.filas.length <= 6;
  credTexto('cre-cuotas-tit-txt', 'Las ' + plan.filas.length +
    (plan.filas.length === 1 ? ' cuota' : ' cuotas') +
    (plan.cuotasPagadas ? ' · ' + plan.cuotasPagadas + ' pagadas' : ''));
  credMarcarCuotas();

  plan.filas.forEach(function (f) {
    const fila = document.createElement('div');
    fila.className = 'cre-cuota' +
      (f.pagado ? ' cre-cuota-pagada' : '') +
      (f.atrasada ? ' cre-cuota-atrasada' : '') +
      (f.corto ? ' cre-cuota-corta' : '');

    const chulo = document.createElement('label');
    chulo.className = 'cre-chulo';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = f.pagado;
    check.setAttribute('aria-label', 'Ya pagué la cuota ' + f.n);
    check.addEventListener('change', function () {
      credCambiar(function (c) {
        c.pagados = c.pagados || {};
        if (check.checked) c.pagados[f.n] = true;
        else delete c.pagados[f.n];
      });
    });
    const caja = document.createElement('span');
    caja.className = 'cre-chulo-caja';
    caja.setAttribute('aria-hidden', 'true');
    chulo.appendChild(check);
    chulo.appendChild(caja);
    fila.appendChild(chulo);

    const que = document.createElement('span');
    que.className = 'cre-cuota-que';
    const n = document.createElement('strong');
    n.textContent = 'Cuota ' + f.n;
    que.appendChild(n);
    const fecha = document.createElement('small');
    fecha.textContent = deudaFechaCorta(f.fecha) + credEstado(f);
    que.appendChild(fecha);
    fila.appendChild(que);

    fila.appendChild(credCampoPago(f, 'cre-cuota-plata'));
    cont.appendChild(fila);
  });
}

function credEstado(f) {
  if (f.pagado) return ' · pagada';
  if (f.atrasada) return ' · ¡vencida!';
  if (f.corto) return ' · faltaron ' + recPlata(f.corto);
  if (f.corregido && f.pago > f.cuota) return ' · pagó de más';
  return '';
}

// El cuadrito de la plata de una cuota. Vacío = vuelve a la cuota normal.
function credCampoPago(f, clase) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = clase;
  input.value = Math.round(f.pago).toLocaleString('es-CO');
  input.setAttribute('aria-label', 'Lo que pagó en la cuota ' + f.n);
  recAtarMoneda(input);
  input.addEventListener('change', function () {
    const txt = input.value.trim();
    credCambiar(function (c) {
      c.pagos = c.pagos || {};
      if (!txt) delete c.pagos[f.n];
      else c.pagos[f.n] = recNumero(txt);
    });
  });
  return input;
}

function credMarcarCuotas() {
  const caja = document.getElementById('cre-cuotas-caja');
  const tit = document.getElementById('cre-cuotas-caja-tit');
  if (!caja) return;
  caja.classList.toggle('cerrado', !credCuotasAbiertas);
  if (tit) tit.setAttribute('aria-expanded', credCuotasAbiertas ? 'true' : 'false');
}

// ----------------------------------------------------------------
// 6. La cara de atrás: la hoja de cuotas
// ----------------------------------------------------------------
function credPintarHoja(plan) {
  const c = credAhora;
  const poner = function (id, valor) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = valor;
  };
  poner('cre-a-monto', Math.round(c.monto).toLocaleString('es-CO'));
  poner('cre-a-meses', String(c.meses));
  poner('cre-a-tasa', String(c.tasa).replace('.', ','));
  const d = new Date(c.primera);
  const dos = function (n) { return String(n).padStart(2, '0'); };
  poner('cre-a-primera', d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()));

  credTexto('cre-atras-cuantas', plan.filas.length + (plan.filas.length === 1 ? ' cuota' : ' cuotas'));

  const cuerpo = document.getElementById('cre-hoja-cuerpo');
  cuerpo.innerHTML = '';
  plan.filas.forEach(function (f) {
    const tr = document.createElement('tr');
    if (f.pagado) tr.className = 'cre-hoja-pagada';
    if (f.atrasada || f.corto) tr.className = 'cre-hoja-mal';

    const celda = function (txt, clase) {
      const td = document.createElement('td');
      if (clase) td.className = clase;
      td.textContent = txt;
      tr.appendChild(td);
      return td;
    };
    celda(String(f.n), 'rec-hoja-num');
    celda(deudaFechaCorta(f.fecha), 'cre-hoja-fecha');
    const tdPago = document.createElement('td');
    tdPago.className = 'rec-hoja-plata';
    tdPago.appendChild(credCampoPago(f, 'rec-hoja-input'));
    tr.appendChild(tdPago);
    celda(recPlata(f.interes), 'rec-hoja-plata cre-hoja-dato');
    celda(recPlata(f.abono), 'rec-hoja-plata cre-hoja-dato');
    celda(recPlata(f.saldo), 'rec-hoja-plata cre-hoja-dato');

    const tdChulo = document.createElement('td');
    tdChulo.className = 'cre-hoja-chulo';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = f.pagado;
    check.setAttribute('aria-label', 'Ya pagué la cuota ' + f.n);
    check.addEventListener('change', function () {
      credCambiar(function (c2) {
        c2.pagados = c2.pagados || {};
        if (check.checked) c2.pagados[f.n] = true;
        else delete c2.pagados[f.n];
      });
    });
    tdChulo.appendChild(check);
    tr.appendChild(tdChulo);
    cuerpo.appendChild(tr);
  });

  const tr = document.createElement('tr');
  tr.className = 'rec-hoja-total';
  [['', 'rec-hoja-num'], ['Total', ''], [recPlata(plan.totalPagar), 'rec-hoja-plata'],
   [recPlata(plan.intereses), 'rec-hoja-plata'], [recPlata(plan.monto), 'rec-hoja-plata'],
   ['', ''], ['', '']].forEach(function (x) {
    const td = document.createElement('td');
    td.className = x[1];
    td.textContent = x[0];
    tr.appendChild(td);
  });
  cuerpo.appendChild(tr);
}

// ----------------------------------------------------------------
// 7. En la libreta: la sección de deudas
// ----------------------------------------------------------------
// La llama recPintarLibreta (recibo.js) con los créditos ya leídos.
function credPintarEnLibreta(cont, creditos) {
  if (!creditos || !creditos.length) return;
  const a = recAjustes || ajustesVacios();
  const alMes = ahorroCapacidad(a).alMes;

  cont.appendChild(recLibTitulo('Deudas'));
  creditos.forEach(function (c) {
    const plan = deudaPlan(c);
    const v = deudaVeredicto(plan, alMes + deudaCuotaDelMes(plan), recPlata);
    const plazo = plan.terminado ? { tono: 'bien', texto: 'Pagado ✓' }
      : v.mora ? { tono: 'no', texto: plan.filas.some(function (f) { return f.atrasada || f.corto; })
                   ? 'En mora' : 'No le cabe' }
      : { tono: 'bien', texto: 'Próxima: ' + deudaFechaCorta(plan.proxima.fecha).replace(/ de \d{4}$/, '') };

    const b = recLibRenglon({
      nombre: c.nombre || 'Mi crédito',
      sub: plan.cuotasPagadas + ' de ' + plan.mesesReales + ' cuotas pagadas',
      precio: plan.falta,
      plazo: plazo
    });
    b.classList.add('ah-lib-deuda');
    b.title = 'Le falta por pagar ' + recPlata(plan.falta);
    b.addEventListener('click', function () { credVer(c.id); });
    cont.appendChild(b);
  });
}

// ----------------------------------------------------------------
// 8. Bajarlo como imagen
// ----------------------------------------------------------------
// Con las mismas piezas de recibo-descargar.js (recd*). Aquí tampoco se
// calcula nada: se dibuja lo que deudas.js respondió.
function credDescargar() {
  if (!credAhora) return;
  const boton = document.getElementById('cre-descargar');
  if (boton) boton.disabled = true;
  const plan = deudaPlan(credAhora);
  const v = deudaVeredicto(plan, credMargen(plan), recPlata);

  recdLetrasListas().then(function () {
    const medir = document.createElement('canvas').getContext('2d');
    const alto = credDibujo(medir, plan, v, false);
    const lienzo = document.createElement('canvas');
    lienzo.width = RECD_ANCHO * RECD_ESCALA;
    lienzo.height = Math.ceil(alto) * RECD_ESCALA;
    const ctx = lienzo.getContext('2d');
    ctx.scale(RECD_ESCALA, RECD_ESCALA);
    ctx.fillStyle = v.mora ? '#FCEDEA' : RECD_COLOR.crema;
    ctx.fillRect(0, 0, RECD_ANCHO, alto);
    credDibujo(ctx, plan, v, true);
    recdOrillaArrancada(ctx, alto);

    const limpio = String(credAhora.nombre || 'credito').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'credito';
    return recdBajar(lienzo, 'credito-' + limpio + '.png');
  }).catch(function (e) {
    console.error('No se pudo bajar el recibo del crédito:', e);
    recAvisar('No se pudo bajar el recibo. Intente otra vez.');
  }).then(function () {
    if (boton) boton.disabled = false;
  });
}

function credDibujo(ctx, plan, v, pinta) {
  const izq = RECD_MARGEN;
  const der = RECD_ANCHO - RECD_MARGEN;
  const centro = RECD_ANCHO / 2;
  const rojo = '#8E2018';
  let y = 30;

  y = recdLinea(ctx, pinta, 'ARRIERO’S WEALTH', {
    x: centro, y: y, fuente: '17px ScothBrace', color: v.mora ? rojo : RECD_COLOR.marron,
    centrado: true, espaciado: 1.7
  });
  y += 5;
  y = recdLinea(ctx, pinta, 'su crédito, mijo', {
    x: centro, y: y, fuente: 'italic 13px LiberationSans',
    color: 'rgba(43, 33, 24, 0.55)', centrado: true
  });
  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  y += 22;
  y = recdParrafo(ctx, pinta, credAhora.nombre || 'Mi crédito', {
    x: centro, y: y, ancho: der - izq, fuente: 'bold 25px LiberationSans',
    color: RECD_COLOR.texto, centrado: true, alto: 30
  });
  y += 8;
  y = recdLinea(ctx, pinta, 'Le prestan', {
    x: centro, y: y, fuente: '13px LiberationSans',
    color: 'rgba(43, 33, 24, 0.6)', centrado: true
  });
  y += 4;
  y = recdLinea(ctx, pinta, recdPlata(plan.monto), {
    x: centro, y: y, fuente: 'bold 35px LiberationSans',
    color: v.mora ? rojo : RECD_COLOR.verdeOscuro, centrado: true
  });
  y += 8;
  y = recdLinea(ctx, pinta, 'al ' + credPct(plan.tasa) + ' mensual · ' + plan.mesesPedidos + ' meses', {
    x: centro, y: y, fuente: '13px LiberationSans',
    color: 'rgba(43, 33, 24, 0.5)', centrado: true
  });
  y += 20;
  y = recdPuntos(ctx, pinta, izq, der, y);

  y += 14;
  y = recdRenglon(ctx, pinta, 'Cuota al mes', recdPlata(plan.cuota), '', true, izq, der, y);
  y = recdRenglon(ctx, pinta, 'Plata prestada', recdPlata(plan.monto), '', false, izq, der, y);
  y = recdRenglon(ctx, pinta, 'Intereses', recdPlata(plan.intereses), '', false, izq, der, y);
  y = recdRenglon(ctx, pinta, 'Total a pagar', recdPlata(plan.totalPagar), '', true, izq, der, y);
  y = recdRenglon(ctx, pinta, 'Lleva pagado', recdPlata(plan.pagado), '', false, izq, der, y);
  if (plan.ultima && !plan.sinFin) {
    y = recdRenglon(ctx, pinta, 'Termina', deudaFechaCorta(plan.ultima.fecha),
                    deudaCambioDelFinal(plan), false, izq, der, y);
  }
  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  y += 16;
  y = recdVeredicto(ctx, pinta, v, izq, der, y);

  if (v.sugerencias.length) {
    y += 14;
    y = recdRotulito(ctx, pinta, 'Para no quedar en mora', izq, y);
    v.sugerencias.forEach(function (s) {
      y += 8;
      y = recdParrafo(ctx, pinta, '• ' + s, {
        x: izq, y: y, ancho: der - izq, fuente: '14px LiberationSans',
        color: RECD_COLOR.texto, alto: 19
      });
    });
  }

  y += 18;
  y = recdRotulito(ctx, pinta, 'Las cuotas', izq, y);
  y += 8;
  plan.filas.forEach(function (f) {
    const marca = f.pagado ? '✓ ' : '☐ ';
    y = recdRenglon(ctx, pinta, marca + 'Cuota ' + f.n + ' · ' + deudaFechaCorta(f.fecha),
                    recdPlata(f.pago), '', false, izq, der, y,
                    f.atrasada || f.corto ? rojo : null);
  });

  y += 16;
  y = recdPuntos(ctx, pinta, izq, der, y);
  y += 16;
  y = recdLinea(ctx, pinta, recdHoy(), {
    x: centro, y: y, fuente: '12px LiberationSans',
    color: 'rgba(43, 33, 24, 0.45)', centrado: true
  });
  y += 6;
  y = recdLinea(ctx, pinta, 'Cuenta hecha con Arriero’s Wealth', {
    x: centro, y: y, fuente: '12px LiberationSans',
    color: 'rgba(43, 33, 24, 0.45)', centrado: true
  });
  return y + 16 + RECD_DESGARRO;
}
