// =================================================================
// escuela.js — Estrella 3: "La escuela del arriero"
//
// POR QUÉ EXISTE
//   Hecha el 29 de septiembre de 2026. La guía (src/guia.js) enseña a usar
//   la app; la escuela enseña de PLATA. Habla el mismo abuelo, que cuenta lo
//   que aprendió a punta de golpes para que el nieto no se los tenga que dar:
//   con cariño, pero en serio. Cada lección trae un cuento corto, la regla en
//   una línea, y un botón para ponerla en práctica en la app.
//
// OJO CON LAS CIFRAS DEL MÍNIMO: son las de 2026 (salario $1.750.905,
// auxilio de transporte $249.095). Cambian cada año: hay que revisarlas en
// enero, con el decreto en la mano.
// =================================================================

const ESCUELA_SALUDOS = [
  t('Lo que yo aprendí a punta de golpes, usted lo puede aprender aquí sentado. Se lo digo con cariño, pero se lo digo en serio.'),
  t('Mijo, la plata no se hace sola: se cuida. Y el que no la cuida, la ve pasar.'),
  t('Póngame cuidado, que esto no se lo enseñan en la escuela y lo va a necesitar toda la vida.')
];

const ESCUELA_LECCIONES = [
  {
    tit: t('Primero se paga usted'),
    cuento: t('Cuando yo era joven me pagaban el sábado, y el lunes ya no tenía nada. Mi papá me dijo: mijo, antes de pagarle al tendero, págate a vos. Aparte un pedacito apenas le paguen, así sea poquito. Lo que "sobra" al final del mes nunca llega.'),
    regla: t('Apenas le paguen, aparte el 10 %. Primero usted, después los demás.'),
    hazlo: { txt: t('Prenda la regla del 10 % en su hoja'), ir: 'ahorro-hoja' }
  },
  {
    tit: t('La regla 70 / 30'),
    cuento: t('Con 7 de cada 10 pesos se cubre lo que no puede faltar: la comida, la casa, los servicios, el transporte. Los otros 3 son para lo demás: los gustos, los regalos, la salida del domingo. Si lo necesario se le come más de 7, algo hay que apretar.'),
    regla: t('Lo necesario, máximo el 70 % de lo que gana.'),
    hazlo: { txt: t('Mire cómo va en su hoja del mes'), ir: 'ahorro-hoja' }
  },
  {
    tit: t('Su trabajo vale'),
    cuento: t('Una empresa que le paga el mínimo a alguien no gasta solo el mínimo: paga pensión, prima, cesantías y vacaciones. En 2026 eso le sale como a $12.900 la hora. Usted que trabaja solo paga todo eso de su bolsillo. Si cobra como si fuera el sueldo pelado, está regalando la diferencia.'),
    regla: t('Nunca cobre la hora por debajo del básico. Y el básico no es lo justo: es lo mínimo.'),
    hazlo: { txt: t('Revise cuánto vale su día'), ir: 'cobrar-dia' }
  },
  {
    tit: t('Fiar sin perder'),
    cuento: t('Fiar no es malo; fiar sin anotar, sí. La palabra se la lleva el viento, el papel no. Hágale la cuenta de cobro hasta al compadre, y anote cada abono. Y si pasa un mes y no le han pagado, cobre con respeto, pero cobre.'),
    regla: t('Todo fiado va por escrito. A los 30 días, se cobra.'),
    hazlo: { txt: t('Vea lo que le deben'), ir: 'cobrar-fiados' }
  },
  {
    tit: t('Antes de firmar un crédito'),
    cuento: t('Un crédito no es plata que le regalan: es plata que se devuelve con intereses. Una moto de $5.000.000 al 2 % mensual, a 24 meses, termina costando más de $6.300.000. La cuota tiene que caber en lo que le sobra hoy, no en lo que le gustaría que le sobrara.'),
    regla: t('Si la cuota no le cabe en lo que le sobra, todavía no es para usted.'),
    hazlo: { txt: t('Haga la cuenta de un crédito'), ir: 'ahorro-credito' }
  },
  {
    tit: t('El colchón'),
    cuento: t('La vida da sorpresas: una enfermedad, la nevera que se daña, un mes sin trabajo. El colchón es la plata que se guarda para eso y para nada más. Al colchón no se le mete la mano por un antojo.'),
    regla: t('Tenga guardados, por lo menos, tres meses de sus gastos.'),
    hazlo: { txt: t('Anote su colchón en la hoja'), ir: 'ahorro-hoja' }
  },
  {
    tit: t('Los gastos hormiga'),
    cuento: t('Un tinto de $2.000 cada día no se siente. Pero son $60.000 al mes y $720.000 al año. Así se va la plata: de a poquito y sin hacer ruido. No le digo que no se lo tome; le digo que sepa cuánto le cuesta.'),
    regla: t('Lo chiquito, multiplicado por 30, ya no es chiquito.'),
    hazlo: { txt: t('Haga la cuenta en la calculadora'), ir: 'calculadora' }
  },
  {
    tit: t('La plata prometida no es plata'),
    cuento: t('Cuántos conocí que se endeudaron por un pago que nunca llegó. Hasta que no la tenga en la mano, esa plata no existe. No la gaste, no la preste, no la cuente.'),
    regla: t('Se gasta lo que se tiene, no lo que le van a pagar.'),
    hazlo: null
  }
];

// Las cuentas de verdad. Van en pesos colombianos a propósito, sea cual sea
// la moneda escogida arriba: son cifras de Colombia.
const ESCUELA_CUENTAS = [
  {
    tit: t('Lo que le cuesta a una empresa un trabajador de mínimo (2026)'),
    renglones: [
      [t('Salario mínimo'), 1750905],
      [t('Auxilio de transporte'), 249095],
      [t('Pensión (12 %)'), 210109],
      [t('Riesgos laborales'), 9140],
      [t('Caja de compensación (4 %)'), 70036],
      [t('Cesantías e intereses'), 186667],
      [t('Prima'), 166667],
      [t('Vacaciones'), 72954]
    ],
    total: [t('Al mes'), 2715573],
    nota: t('Eso es como $12.900 la hora. El trabajador recibe en la mano unos $1.860.000. Cifras de 2026: cambian cada año.')
  },
  {
    tit: t('Una moto de $5.000.000 a crédito'),
    renglones: [
      [t('Le prestan'), 5000000],
      [t('Interés'), t('2 % al mes')],
      [t('Plazo'), t('24 meses')],
      [t('Cuota de cada mes'), 264355]
    ],
    total: [t('Paga en total'), 6344532],
    nota: t('De eso, $1.344.532 son intereses: la moto le sale un 27 % más cara.')
  },
  {
    tit: t('El tinto de cada día'),
    renglones: [
      [t('Un tinto'), 2000],
      [t('Al mes (× 30)'), 60000]
    ],
    total: [t('Al año (× 12)'), 720000],
    nota: t('Eso es más de un tercio de un salario mínimo, ido en tintos.')
  }
];

const ESCUELA_PALABRAS = [
  [t('Interés'), t('Lo que se paga por usar plata prestada. Es el alquiler de la plata.')],
  [t('Interés mensual (M.V.)'), t('El interés de cada mes. Si el papel dice 2 % M.V., cada mes se paga el 2 % de lo que debe.')],
  [t('Cuota'), t('Lo que se paga cada mes de un crédito.')],
  [t('Abono|glosario'), t('Un pedazo de lo que se debe. Abonar es pagar una parte.')],
  [t('Saldo'), t('Lo que todavía falta por pagar.')],
  [t('Mora'), t('Cuando una cuota se pasó de la fecha sin pagar. La mora cobra más intereses.')],
  [t('Cuenta de cobro'), t('El papel donde uno le dice a alguien cuánto le debe y por qué.')],
  [t('Presupuesto'), t('Lo que va a costar un trabajo, antes de hacerlo.')],
  [t('Colchón'), t('La plata guardada para emergencias. No se toca para antojos.')],
  [t('Salario mínimo'), t('Lo menos que la ley deja pagar por un mes de trabajo.')],
  [t('Prestaciones'), t('Lo que una empresa paga además del sueldo: prima, cesantías y vacaciones.')],
  [t('Ganancia'), t('Lo que le queda a usted después de pagar todo lo que costó el trabajo.')]
];

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('escuela')) return;
  escuelaPintarLecciones();
  escuelaPintarCuentas();
  escuelaPintarPalabras();
});

function escuelaPintarLecciones() {
  const cont = document.getElementById('escuela-lecciones');
  if (!cont) return;
  ESCUELA_LECCIONES.forEach(function (l, n) {
    const d = document.createElement('details');
    d.className = 'abu-plegable abu-leccion';
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      cont.querySelectorAll('details[open]').forEach(function (o) { if (o !== d) o.open = false; });
    });

    const s = document.createElement('summary');
    const num = document.createElement('span');
    num.className = 'abu-num';
    num.textContent = String(n + 1);
    const tit = document.createElement('span');
    tit.className = 'abu-plegable-tit';
    tit.textContent = l.tit;
    s.appendChild(num);
    s.appendChild(tit);
    d.appendChild(s);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'abu-plegable-cuerpo';
    cuerpo.appendChild(guiaDice(l.cuento));

    const regla = document.createElement('p');
    regla.className = 'abu-regla';
    const r = document.createElement('strong');
    r.textContent = t('La regla: ');
    regla.appendChild(r);
    regla.appendChild(document.createTextNode(l.regla));
    cuerpo.appendChild(regla);

    if (l.hazlo) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'abu-muestreme';
      b.textContent = l.hazlo.txt;
      b.addEventListener('click', function () { guiaMostrar(l.hazlo.ir); });
      cuerpo.appendChild(b);
    }

    d.appendChild(cuerpo);
    cont.appendChild(d);
  });
}

function escuelaPintarCuentas() {
  const cont = document.getElementById('escuela-cuentas');
  if (!cont) return;
  ESCUELA_CUENTAS.forEach(function (c) {
    const d = document.createElement('details');
    d.className = 'abu-plegable abu-cuenta';
    const s = document.createElement('summary');
    const tit = document.createElement('span');
    tit.className = 'abu-plegable-tit';
    tit.textContent = c.tit;
    s.appendChild(tit);
    d.appendChild(s);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'abu-plegable-cuerpo';
    c.renglones.forEach(function (r) { cuerpo.appendChild(escuelaRenglon(r[0], r[1], false)); });
    cuerpo.appendChild(escuelaRenglon(c.total[0], c.total[1], true));
    const nota = document.createElement('p');
    nota.className = 'abu-cuenta-nota';
    nota.textContent = c.nota;
    cuerpo.appendChild(nota);

    d.appendChild(cuerpo);
    cont.appendChild(d);
  });
}

function escuelaRenglon(rot, valor, fuerte) {
  const d = document.createElement('div');
  d.className = 'rec-renglon' + (fuerte ? ' rec-renglon-fuerte abu-total' : '');
  const r = document.createElement('span');
  r.className = 'rec-rot';
  r.textContent = rot;
  const l = document.createElement('span');
  l.className = 'rec-lin';
  const v = document.createElement('span');
  v.className = 'rec-val';
  v.textContent = typeof valor === 'number' ? escuelaPesos(valor) : valor;
  d.appendChild(r);
  d.appendChild(l);
  d.appendChild(v);
  return d;
}

function escuelaPesos(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n);
}

function escuelaPintarPalabras() {
  const cont = document.getElementById('escuela-palabras');
  if (!cont) return;
  const dl = document.createElement('dl');
  dl.className = 'abu-glosario';
  ESCUELA_PALABRAS.forEach(function (p) {
    const dt = document.createElement('dt');
    dt.textContent = p[0];
    const dd = document.createElement('dd');
    dd.textContent = p[1];
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  cont.appendChild(dl);
}
