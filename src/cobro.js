// =================================================================
// cobro.js — Las cuentas de Cobrar
//
// Hecho el 29 de septiembre de 2026, cuando Cobrar se rehízo con la cara de
// Ahorro: una hoja de cuaderno para la persona y una cuenta de cobro para el
// cliente. Aquí solo van las cuentas: ni pantalla ni almacén (igual que
// src/ahorro.js y src/deudas.js).
//
// LA CUENTA
//   su día vale     = lo que quiere ganarse al mes ÷ los días que trabaja
//   mano de obra    = los días del trabajo × lo que vale su día
//                     (en horas: un día son 8 horas)
//   le cuesta       = mano de obra + materiales + otros gastos
//   ganancia        = le cuesta × el % de ganancia
//   descuento       = (le cuesta + ganancia) × el % de descuento
//   cóbrele         = le cuesta + ganancia − descuento
//
// EL CLIENTE NUNCA VE LA GANANCIA — decidido por David el 29 de septiembre.
//   En la cuenta de cobro la ganancia va DENTRO de la mano de obra, que es
//   como lo cobra cualquier maestro de obra. Los materiales salen a lo que
//   costaron: si el cliente pide la factura de la ferretería, cuadra.
//   Si no hubo mano de obra, la ganancia sale como "Servicio".
// =================================================================

const COBRO_HORAS_DIA = 8;
const COBRO_DIAS_MES = 22;      // si no dice cuántos días trabaja al mes
const COBRO_VALE_DIAS = 15;     // cuánto vale un presupuesto

// ----------------------------------------------------------------
// Lo que vale su día
// ----------------------------------------------------------------
function cobroDiasMes(perfil) {
  const d = Number(perfil && perfil.diasMes);
  return d > 0 ? d : COBRO_DIAS_MES;
}

function cobroJornal(perfil) {
  const ganar = Number(perfil && perfil.ganarMes) || 0;
  return ganar > 0 ? ganar / cobroDiasMes(perfil) : 0;
}

// ----------------------------------------------------------------
// El básico: la hora más barata a la que se debería trabajar
//
// Pedido por David el 29 de septiembre de 2026: que la persona vea qué tan
// lejos está su hora del básico y que se ponga en ROJO si queda por debajo.
// En pesos colombianos arranca en $8.338 la hora; en otras monedas no hay
// uno puesto (la app no se inventa el básico de otro país) y la persona lo
// escribe si quiere compararse.
// ----------------------------------------------------------------
const COBRO_BASICO_HORA = { COP: 8338 };

function cobroBasicoHora(perfil, moneda) {
  const propio = Number(perfil && perfil.basicoHora);
  if (propio > 0) return propio;
  return COBRO_BASICO_HORA[moneda || 'COP'] || 0;
}

// { hora, basico, diferencia (por hora), pct (cuánto más o menos, en %),
//   tono: 'bien' | 'no' | 'nada' }
function cobroFrenteAlBasico(perfil, moneda) {
  const hora = cobroJornal(perfil) / COBRO_HORAS_DIA;
  const basico = cobroBasicoHora(perfil, moneda);
  if (!(hora > 0) || !(basico > 0)) {
    return { hora: hora, basico: basico, diferencia: 0, pct: 0, tono: 'nada' };
  }
  const diferencia = hora - basico;
  return {
    hora: hora,
    basico: basico,
    diferencia: diferencia,
    pct: Math.round(diferencia / basico * 100),
    tono: diferencia < 0 ? 'no' : 'bien'
  };
}

// ----------------------------------------------------------------
// La cuenta del trabajo
// ----------------------------------------------------------------
function cobroNumero(v) {
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : 0;
}

function cobroTrabajoVacio() {
  return {
    cliente: '',
    trabajo: '',
    unidad: 'dias',
    tiempo: 0,
    materiales: [],      // [{ nombre, cantidad, precio }]  precio = de a uno
    transporte: 0,
    otros: [],           // [{ clave, nombre, monto }]
    margen: 30,
    descuento: 0,
    tipo: 'cobro'
  };
}

function cobroCuenta(t, perfil) {
  const jornal = cobroJornal(perfil);
  const tiempo = cobroNumero(t.tiempo);
  const dias = t.unidad === 'horas' ? tiempo / COBRO_HORAS_DIA : tiempo;
  const manoObra = dias * jornal;

  const materiales = (t.materiales || []).reduce(function (s, m) {
    return s + cobroNumero(m.precio) * (cobroNumero(m.cantidad) || 1);
  }, 0);
  const otros = cobroNumero(t.transporte) + (t.otros || []).reduce(function (s, o) {
    return s + cobroNumero(o.monto);
  }, 0);

  const costo = manoObra + materiales + otros;
  const margen = Math.min(500, cobroNumero(t.margen));
  const ganancia = costo * margen / 100;
  const bruto = costo + ganancia;
  const descPct = Math.min(100, cobroNumero(t.descuento));

  // Lo que se cobra por el trabajo (mano de obra + ganancia) es lo único que
  // se redondea, y el redondeo lo absorbe ese mismo renglón: así los
  // renglones de la cuenta de cobro suman EXACTO el total, sin un peso suelto.
  const trabajoBruto = manoObra + ganancia;
  let descuento = bruto * descPct / 100;
  let total = bruto - descuento;
  if (trabajoBruto > 0) {
    descuento = cobroRedondo(descuento);
    total = Math.max(0, cobroRedondo(total));
  }
  const manoCliente = trabajoBruto > 0 ? total + descuento - materiales - otros : 0;

  // Lo que la persona se lleva por su trabajo: su día + lo que le quedó de
  // ganancia después del descuento.
  const paraUsted = manoCliente - descuento;
  const limpio = paraUsted - manoObra;

  const c = {
    jornal: jornal,
    tiempo: tiempo,
    dias: dias,
    manoObra: manoObra,
    materiales: materiales,
    otros: otros,
    costo: costo,
    margen: margen,
    ganancia: ganancia,
    descuentoPct: descPct,
    descuento: descuento,
    total: total,
    manoCliente: manoCliente,
    paraUsted: paraUsted,
    limpio: limpio
  };
  c.tono = cobroTono(c, t);
  c.sello = cobroSello(c, t);
  c.renglones = cobroRenglonesCliente(c, t);
  return c;
}

// Se cobra en plata redonda: nadie le cobra a un vecino $871.243. Por debajo
// de mil se deja como está (monedas de otros países, cosas chiquitas).
function cobroRedondo(n) {
  if (!(n > 0)) return 0;
  if (n < 1000) return Math.round(n * 100) / 100;
  return Math.round(n / 100) * 100;
}

function cobroTono(c, t) {
  if (c.costo <= 0) return 'nada';
  if (c.limpio < 0) return 'no';
  if (c.tiempo > 0 && c.jornal <= 0) return 'ojo';
  if (c.margen <= 0) return 'ojo';
  return 'bien';
}

// La frase de abajo del total. El color acompaña, la frase manda.
function cobroSello(c, t) {
  if (c.costo <= 0) return 'Anote el trabajo y le digo cuánto cobrar.';
  if (c.limpio < 0) {
    return '× Con ese descuento pierde ' + cobroPlata(-c.limpio) +
           ': le estaría regalando su trabajo.';
  }
  if (c.tiempo > 0 && c.jornal <= 0) {
    return '! Su tiempo no se está cobrando: dígame arriba cuánto vale su día.';
  }
  if (c.margen <= 0) return '! Sin ganancia: cobra lo que le cuesta y nada más.';
  if (c.manoObra > 0) {
    return '✓ Por su trabajo se lleva ' + cobroPlata(c.paraUsted) +
           ', y de eso ' + cobroPlata(c.limpio) + ' son ganancia limpia.';
  }
  return '✓ Se gana ' + cobroPlata(c.limpio) + ' limpios.';
}

// Lo que ve el cliente. La ganancia va dentro de la mano de obra.
function cobroRenglonesCliente(c, t) {
  const r = [];
  if (c.manoCliente > 0) {
    r.push({
      rotulo: c.manoObra > 0 ? 'Mano de obra' + cobroTiempoEntreParentesis(t) : 'Servicio',
      valor: c.manoCliente
    });
  }
  (t.materiales || []).forEach(function (m) {
    const cant = cobroNumero(m.cantidad) || 1;
    const valor = cobroNumero(m.precio) * cant;
    if (valor <= 0) return;
    r.push({ rotulo: (m.nombre || 'Material') + (cant !== 1 ? ' × ' + cobroCifra(cant) : ''), valor: valor });
  });
  if (cobroNumero(t.transporte) > 0) r.push({ rotulo: 'Transporte', valor: cobroNumero(t.transporte) });
  (t.otros || []).forEach(function (o) {
    if (cobroNumero(o.monto) <= 0) return;
    r.push({ rotulo: o.nombre || 'Otro gasto', valor: cobroNumero(o.monto) });
  });
  return r;
}

function cobroTiempoEntreParentesis(t) {
  const txt = cobroTiempoEnPalabras(t);
  return txt ? ' (' + txt + ')' : '';
}

function cobroTiempoEnPalabras(t) {
  const n = cobroNumero(t.tiempo);
  if (!n) return '';
  if (t.unidad === 'horas') return cobroCifra(n) + (n === 1 ? ' hora' : ' horas');
  if (n === 0.5) return 'medio día';
  return cobroCifra(n) + (n === 1 ? ' día' : ' días');
}

function cobroCifra(n) {
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

// En las frases de la hoja: pesos enteros en cifras grandes, sin "$ 32.709,09".
function cobroPlata(n) {
  const v = Number(n) || 0;
  n = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
  if (typeof formatearDineroLimpio === 'function') return formatearDineroLimpio(n);
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

// ----------------------------------------------------------------
// Lo que le deben: abonos y saldo
// ----------------------------------------------------------------
function cobroAbonado(cobro) {
  return (cobro.abonos || []).reduce(function (s, a) { return s + cobroNumero(a.monto); }, 0);
}

function cobroSaldo(cobro) {
  return Math.max(0, cobroNumero(cobro.total) - cobroAbonado(cobro));
}

// 'presupuesto' · 'pagada' · 'abonada' · 'debe'
function cobroEstado(cobro) {
  if (cobro.tipo === 'presupuesto') return 'presupuesto';
  if (cobroSaldo(cobro) <= 0.004) return 'pagada';
  return cobroAbonado(cobro) > 0 ? 'abonada' : 'debe';
}

function cobroDiasDesde(fecha, hoy) {
  const ms = (hoy || Date.now()) - Number(fecha || 0);
  return Math.max(0, Math.floor(ms / 86400000));
}

function cobroHaceCuanto(fecha, hoy) {
  const d = cobroDiasDesde(fecha, hoy);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 60) return 'hace ' + d + ' días';
  const m = Math.floor(d / 30);
  return 'hace ' + m + ' meses';
}

// El siguiente número de cuenta: uno más que el más alto que haya.
function cobroSiguienteNumero(lista) {
  return (lista || []).reduce(function (max, c) {
    return Math.max(max, Number(c.numero) || 0);
  }, 0) + 1;
}

function cobroNumeroBonito(n) {
  return 'N° ' + String(Math.max(1, Math.round(n || 1))).padStart(4, '0');
}

// ----------------------------------------------------------------
// La plata en letras
//
// Así es la cuenta de cobro de toda la vida: "la suma de setecientos mil
// pesos". La gente mayor le cree más al papel que lo dice en letras, y de paso
// nadie le puede agregar un cero a mano.
// ----------------------------------------------------------------
const COBRO_MONEDA_NOMBRE = {
  COP: ['peso', 'pesos'], MXN: ['peso', 'pesos'], ARS: ['peso', 'pesos'],
  CLP: ['peso', 'pesos'], USD: ['dólar', 'dólares'], EUR: ['euro', 'euros'],
  PEN: ['sol', 'soles'], BRL: ['real', 'reales'], GBP: ['libra', 'libras'],
  CNY: ['yuan', 'yuanes'], JPY: ['yen', 'yenes']
};

const COBRO_UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
  'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
  'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const COBRO_DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa'];
const COBRO_CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function cobroMenosDeMil(n) {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let txt = COBRO_CENTENAS[c];
  let dec;
  if (r < 30) {
    dec = COBRO_UNIDADES[r];
  } else {
    dec = COBRO_DECENAS[Math.floor(r / 10)] + (r % 10 ? ' y ' + COBRO_UNIDADES[r % 10] : '');
  }
  if (dec) txt += (txt ? ' ' : '') + dec;
  return txt;
}

// "uno" pierde la o delante de un sustantivo: un peso, veintiún mil, un millón.
function cobroApocope(txt) {
  return txt.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
}

function cobroMenosDeMillon(n) {
  const miles = Math.floor(n / 1000);
  const r = n % 1000;
  let txt = '';
  if (miles) txt = miles === 1 ? 'mil' : cobroApocope(cobroMenosDeMil(miles)) + ' mil';
  if (r) txt += (txt ? ' ' : '') + cobroMenosDeMil(r);
  return txt;
}

function cobroEntero(n) {
  if (n === 0) return 'cero';
  const millones = Math.floor(n / 1000000);
  const r = n % 1000000;
  let txt = '';
  if (millones) {
    txt = millones === 1 ? 'un millón' : cobroApocope(cobroMenosDeMillon(millones)) + ' millones';
  }
  if (r) txt += (txt ? ' ' : '') + cobroMenosDeMillon(r);
  return txt;
}

function cobroEnLetras(valor, codigo) {
  const n = Math.max(0, Number(valor) || 0);
  if (n >= 1e15) return '';
  const entero = Math.floor(n + 0.000001);
  const centavos = Math.round((n - entero) * 100);
  const nombre = COBRO_MONEDA_NOMBRE[codigo || 'COP'] || COBRO_MONEDA_NOMBRE.COP;

  let txt = cobroApocope(cobroEntero(entero));
  if (/mill(ón|ones)$/.test(txt)) txt += ' de';
  txt += ' ' + (entero === 1 ? nombre[0] : nombre[1]);
  if (centavos > 0) {
    txt += ' con ' + cobroApocope(cobroEntero(centavos)) + (centavos === 1 ? ' centavo' : ' centavos');
  }
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
