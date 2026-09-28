// =================================================================
// deudas.js — Las cuentas del crédito
//
// Lo mismo que ahorro.js, pero para el otro lado de la pregunta: en vez de
// "¿cuándo lo junto?", "¿cuánto me va a costar deberlo?". Ahorro y deuda son
// la misma pregunta vista por los dos lados (docs/idea-modulo-deudas.md).
//
// ESTE ARCHIVO NO TOCA LA PANTALLA NI EL ALMACÉN. Funciones puras: se les pasa
// el crédito y devuelven la respuesta. La cara vive en src/credito.js.
//
// LO QUE DECIDIÓ DAVID EL 28 DE SEPTIEMBRE DE 2026
//   · Cuota fija con tasa MENSUAL, como la da el banco o la cooperativa: la
//     persona escribe "2" y es el 2 % al mes sobre lo que todavía debe.
//   · Si un mes paga MÁS, la cuota sigue igual y el crédito TERMINA ANTES.
//     Si paga menos, termina después — y además queda en mora.
//   · La próxima cuota de cada crédito se suma sola al renglón de deudas de la
//     hoja del mes, y por eso baja el número dorado de arriba.
//   · El recibo se pone rojo por cualquiera de tres cosas: pasó la fecha de
//     una cuota y no la chuleó, pagó menos de la cuota, o la cuota no le cabe.
//
// LAS MISMAS REGLAS DE ahorro.js
//   Nunca dejarlo en "no" (siempre se dice qué haría falta), siempre en
//   palabras y no solo en color, y los pesos redondos.
// =================================================================

// Más meses que esto ya no es un crédito de consumo, y además la cuenta
// tiene que parar en alguna parte si alguien pone cuotas en cero.
const DEUDA_MAX_MESES = 120;
const DEUDA_TOPE_FILAS = 600;

// ----------------------------------------------------------------
// 1. La cuota fija
// ----------------------------------------------------------------
function deudaTasa(tasaPct) {
  const t = Number(tasaPct) || 0;
  return t > 0 ? t / 100 : 0;
}

// La fórmula del banco (sistema francés): la misma cuota todos los meses; al
// principio casi toda se va en intereses y al final casi toda en abonar.
function deudaCuota(monto, tasaPct, meses) {
  const p = Math.max(0, Number(monto) || 0);
  const n = Math.max(1, Math.round(Number(meses) || 1));
  const i = deudaTasa(tasaPct);
  if (!p) return 0;
  if (!i) return Math.ceil(p / n);
  return Math.ceil(p * i / (1 - Math.pow(1 + i, -n)));
}

// Lo máximo que le pueden prestar para que la cuota no pase de `cuota`.
function deudaMontoParaCuota(cuota, tasaPct, meses) {
  const i = deudaTasa(tasaPct);
  const n = Math.max(1, meses);
  if (cuota <= 0) return 0;
  if (!i) return Math.floor(cuota * n);
  return Math.floor(cuota * (1 - Math.pow(1 + i, -n)) / i);
}

// ¿En cuántos meses, como mínimo, la cuota le cabe en lo que le sobra?
// Devuelve { meses, cuota } o null si ni a 10 años le cabe.
function deudaMesesSugeridos(monto, tasaPct, margen) {
  if (!(monto > 0) || !(margen > 0)) return null;
  for (let n = 1; n <= DEUDA_MAX_MESES; n++) {
    const c = deudaCuota(monto, tasaPct, n);
    if (c <= margen) return { meses: n, cuota: c };
  }
  return null;
}

// ----------------------------------------------------------------
// 2. Las fechas
// ----------------------------------------------------------------
// Sumar meses sin que el 31 de enero se vuelva 3 de marzo: si el mes no tiene
// ese día, se queda en el último.
function deudaSumarMeses(ts, k) {
  const d = new Date(ts);
  const destino = new Date(d.getFullYear(), d.getMonth() + k, 1);
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(d.getDate(), ultimo));
  return destino.getTime();
}

// La primera cuota, si nadie dice otra cosa: el mismo día, el mes que viene.
function deudaPrimeraPorDefecto(desde) {
  const h = new Date(desde || Date.now());
  return deudaSumarMeses(new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime(), 1);
}

function deudaInicioDelDia(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function deudaFechaCorta(ts) {
  try {
    return new Date(ts).toLocaleDateString('es-CO',
      { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  } catch (e) { return new Date(ts).toLocaleDateString(); }
}

// ----------------------------------------------------------------
// 3. El plan de pagos, mes por mes
// ----------------------------------------------------------------
//
// credito = { monto, tasa, meses, primera, pagos: {k: monto}, pagados: {k: true} }
// `pagos` guarda SOLO los meses que la persona corrigió; los demás pagan la
// cuota. Por eso, al pagar de más un mes, las filas de abajo se recalculan
// solas y la lista se acorta.
function deudaPlan(credito, hoy) {
  const c = credito || {};
  const monto = Math.max(0, Number(c.monto) || 0);
  const i = deudaTasa(c.tasa);
  const meses = Math.max(1, Math.round(Number(c.meses) || 1));
  const cuota = deudaCuota(monto, c.tasa, meses);
  const primera = c.primera || deudaPrimeraPorDefecto();
  const pagos = c.pagos || {};
  const pagados = c.pagados || {};
  const inicioHoy = deudaInicioDelDia(hoy || Date.now());

  const filas = [];
  let saldo = monto;
  let k = 0;

  while (saldo > 0.5 && k < DEUDA_TOPE_FILAS) {
    k++;
    const interes = Math.round(saldo * i);
    const debe = saldo + interes;
    const planeado = Math.min(cuota, Math.ceil(debe));
    const corregido = pagos[k] !== undefined && pagos[k] !== null;
    const pago = corregido ? Math.min(Math.max(0, Number(pagos[k]) || 0), Math.ceil(debe)) : planeado;
    const abono = pago - interes;
    const fecha = deudaSumarMeses(primera, k - 1);
    const pagado = pagados[k] === true;

    saldo = Math.max(0, saldo - abono);
    filas.push({
      n: k,
      fecha: fecha,
      cuota: planeado,
      pago: pago,
      corregido: corregido,
      interes: interes,
      abono: abono,
      saldo: Math.round(saldo),
      pagado: pagado,
      corto: corregido && pago < planeado ? planeado - pago : 0,
      atrasada: !pagado && fecha < inicioHoy
    });
  }

  const suma = function (lista, campo) {
    return lista.reduce(function (t, f) { return t + f[campo]; }, 0);
  };
  const pagadas = filas.filter(function (f) { return f.pagado; });
  const pendientes = filas.filter(function (f) { return !f.pagado; });
  const totalPagar = suma(filas, 'pago');

  return {
    monto: monto,
    tasa: Number(c.tasa) || 0,
    mesesPedidos: meses,
    cuota: cuota,
    filas: filas,
    mesesReales: filas.length,
    // Sin tocar nada: lo que el banco le dijo al firmar.
    totalOriginal: deudaTotalSinCambios(monto, c.tasa, meses),
    totalPagar: totalPagar,
    intereses: totalPagar - monto,
    pagado: suma(pagadas, 'pago'),
    falta: suma(pendientes, 'pago'),
    cuotasPagadas: pagadas.length,
    proxima: pendientes[0] || null,
    ultima: filas[filas.length - 1] || null,
    terminado: filas.length > 0 && !pendientes.length,
    // Si nunca termina (cuotas en cero), se dice: no se inventa un final.
    sinFin: saldo > 0.5
  };
}

function deudaTotalSinCambios(monto, tasa, meses) {
  const i = deudaTasa(tasa);
  const cuota = deudaCuota(monto, tasa, meses);
  let saldo = monto;
  let total = 0;
  for (let k = 0; k < meses && saldo > 0.5; k++) {
    const debe = saldo + Math.round(saldo * i);
    const pago = Math.min(cuota, Math.ceil(debe));
    total += pago;
    saldo = Math.max(0, debe - pago);
  }
  return total;
}

// Lo que este crédito le pesa ESTE mes: su próxima cuota sin chulear. Es lo
// que se suma solo a las deudas de la hoja del mes.
function deudaCuotaDelMes(plan) {
  return plan && plan.proxima ? plan.proxima.pago : 0;
}

// ----------------------------------------------------------------
// 4. El veredicto: ¿va bien o va para mora?
// ----------------------------------------------------------------
//
// `margen` es lo que le sobra al mes para pagar la cuota (ya contando la de
// este crédito si estaba guardado). Devuelve el tono, la frase, el porqué y
// las sugerencias. Rojo si hay cualquiera de las tres causas de mora.
function deudaVeredicto(plan, margen, plata) {
  const $ = plata || function (n) { return '$' + Math.round(n).toLocaleString('es-CO'); };
  const causas = [];
  const sugerencias = [];

  if (plan.terminado) {
    return {
      tono: 'bien', mora: false, causas: causas, sugerencias: sugerencias,
      frase: '¡Ya terminó de pagar, mijo!',
      porque: 'Pagó ' + $(plan.totalPagar) + ' en ' + plan.mesesReales +
              (plan.mesesReales === 1 ? ' cuota.' : ' cuotas.')
    };
  }

  // 1. Pasó la fecha y no chuleó
  const atrasadas = plan.filas.filter(function (f) { return f.atrasada; });
  if (atrasadas.length) {
    const debe = atrasadas.reduce(function (t, f) { return t + f.pago; }, 0);
    causas.push(atrasadas.length === 1
      ? 'La cuota del ' + deudaFechaCorta(atrasadas[0].fecha) + ' ya pasó y no está chuleada.'
      : 'Tiene ' + atrasadas.length + ' cuotas vencidas sin chulear (' + $(debe) + ').');
    sugerencias.push('Si ya las pagó, chulee las cuotas abajo. Si no, páguelas cuanto antes: ' +
                     'cada día de atraso el banco cobra intereses de mora.');
    sugerencias.push('Si no alcanza, llame al banco ANTES de que pase más tiempo y pida un ' +
                     'acuerdo de pago: casi siempre sale más barato que la mora.');
  }

  // 2. Pagó menos de la cuota
  const cortas = plan.filas.filter(function (f) { return f.corto > 0; });
  if (cortas.length) {
    const falto = cortas.reduce(function (t, f) { return t + f.corto; }, 0);
    causas.push(cortas.length === 1
      ? 'En la cuota ' + cortas[0].n + ' pagó ' + $(cortas[0].corto) + ' menos de lo que tocaba.'
      : 'En ' + cortas.length + ' cuotas pagó menos: le faltaron ' + $(falto) + '.');
    sugerencias.push('Póngale esos ' + $(falto) + ' a la próxima cuota para quedar al día. ' +
                     'Pagar incompleto también es mora para el banco.');
  }

  // 3. La cuota no le cabe
  if (margen < plan.cuota) {
    causas.push(margen <= 0
      ? 'Hoy no le sobra nada al mes para pagar la cuota de ' + $(plan.cuota) + '.'
      : 'La cuota de ' + $(plan.cuota) + ' es más de lo que le sobra al mes (' + $(margen) + ').');
    const sug = deudaMesesSugeridos(plan.monto, plan.tasa, margen);
    if (sug && sug.meses > plan.mesesPedidos) {
      sugerencias.push('Pídalo a ' + sug.meses + ' meses: la cuota baja a ' + $(sug.cuota) +
                       ' y sí le cabe.');
    }
    if (margen > 0) {
      const puede = deudaMontoParaCuota(margen, plan.tasa, plan.mesesPedidos);
      sugerencias.push('O pida menos plata: a ' + plan.mesesPedidos + ' meses, hasta ' +
                       $(puede) + ' le cabe.');
      sugerencias.push('O libere ' + $(plan.cuota - margen) + ' al mes en sus gastos antes de firmar.');
    } else {
      sugerencias.push('Antes de sacar el crédito, mire sus gastos en la hoja del mes: ' +
                       'hoy lo que gana no alcanza para una cuota más.');
    }
  }

  if (causas.length) {
    return {
      tono: 'no', mora: true, causas: causas, sugerencias: sugerencias,
      frase: atrasadas.length || cortas.length ? 'Ojo, mijo: va en mora' : 'Ojo, mijo: va para mora',
      porque: causas.join(' ')
    };
  }

  const queda = margen - plan.cuota;
  return {
    tono: 'bien', mora: false, causas: causas, sugerencias: sugerencias,
    frase: 'La cuota le cabe, mijo',
    porque: 'Después de pagarla le quedan ' + $(queda) + ' al mes.'
  };
}

// Cuánto cambió el final por lo que la persona pagó de más o de menos.
function deudaCambioDelFinal(plan) {
  const d = plan.mesesReales - plan.mesesPedidos;
  if (plan.sinFin) return 'Con estos pagos no termina nunca';
  if (d === 0) return '';
  const cuantos = Math.abs(d) === 1 ? 'un mes' : Math.abs(d) + ' meses';
  return d < 0 ? 'termina ' + cuantos + ' antes' : 'se demora ' + cuantos + ' más';
}
