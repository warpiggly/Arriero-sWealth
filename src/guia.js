// =================================================================
// guia.js — Estrella 2: "¿Cómo se usa, mijo?"
//
// POR QUÉ EXISTE
//   Hecha el 29 de septiembre de 2026. Es el manual de la app, pero no suena
//   a manual: habla el abuelo arriero, que le enseña al nieto con cariño y
//   sin alcahuetería. Cada tarea va en pasos cortos, y el botón "Muéstreme"
//   lleva a la persona al sitio exacto y se lo marca brillando: aprender
//   haciendo, no leyendo.
//
// QUÉ HAY
//   · el saludo del abuelo, que se escribe letra por letra
//   · la letra más grande (ponerLetra, src/app.js)
//   · los pasos, cada uno con su "Muéstreme"
//   · practicar con un ejemplo de mentiras (cobCargarEjemplo, src/cobrar.js)
//   · lo que la gente pregunta
//   · de dónde sale la app
//
// guiaMostrar() también la usa la escuela (src/escuela.js).
// =================================================================

const GUIA_SALUDOS = [
  'Siéntese aquí, mijo, que le voy a enseñar. Esto no es difícil: es el mismo cuaderno de toda la vida, pero que suma solito.',
  'Pregunte sin pena, mijo. El que pregunta no se pierde; el que no pregunta termina pagando dos veces.',
  'Vamos despacio, que de afán no queda sino el cansancio. Un paso, y después el otro.'
];

// Los sitios de la app a los que "Muéstreme" sabe llevar.
const GUIA_DESTINOS = {
  'ahorro-hoja':    { vista: 'metas',   el: '#ah-yo',            antes: function () { if (typeof recAbrirYo === 'function') recAbrirYo(true); } },
  'ahorro-comprar': { vista: 'metas',   el: '#ah-pregunta',      antes: function () { if (typeof credPestana === 'function') credPestana('compra'); } },
  'ahorro-credito': { vista: 'metas',   el: '#ah-pregunta',      antes: function () { if (typeof credPestana === 'function') credPestana('credito'); } },
  'clic-derecho':   { vista: 'metas',   el: '.ah-pista',         antes: function () { if (typeof credPestana === 'function') credPestana('compra'); } },
  'calculadora':    { vista: 'metas',   el: '#abrir-calculadora' },
  'cobrar-dia':     { vista: 'cotizar', el: '#cob-yo',           antes: function () { if (typeof cobAbrirYo === 'function') cobAbrirYo(true); } },
  'cobrar-hoja':    { vista: 'cotizar', el: '.cob-hoja' },
  'cobrar-cuenta':  { vista: 'cotizar', el: '#cob-hacer' },
  'cobrar-fiados':  { vista: 'cotizar', el: '#cob-libreta' }
};

const GUIA_PASOS = [
  {
    tit: 'Saber cuánto le queda al mes',
    dice: 'Primero lo primero, mijo: uno no puede guardar lo que no sabe que tiene.',
    pasos: [
      'Toque la mula de Ahorro.',
      'Escriba lo que gana al mes.',
      'Anote en cada renglón lo que gasta: mercado, casa, servicios, transporte.',
      'Abajo, en "Total restante", está lo que le queda.'
    ],
    ir: 'ahorro-hoja'
  },
  {
    tit: '¿Cuándo puedo comprar algo?',
    dice: 'Antojarse no es pecado. Comprar sin saber si le alcanza, sí.',
    pasos: [
      'En Ahorro, escriba qué es y cuánto cuesta.',
      'Toque "Hágame la cuenta".',
      'El recibo le dice en cuántos meses lo tiene y cuánto le pesa.',
      'Si le gusta, "Guárdemelo" y queda en su libreta.'
    ],
    ir: 'ahorro-comprar'
  },
  {
    tit: '¿Me conviene este crédito?',
    dice: 'La plata prestada se paga dos veces: con plata y con sueño. Mire bien antes de firmar.',
    pasos: [
      'En Ahorro, toque "Sacar un crédito".',
      'Escriba cuánto le prestan, en cuántos meses y el interés que dice el papel del banco.',
      'La app le dice si la cuota le cabe en lo que le sobra.',
      'Si lo saca, guárdelo y chulee cada cuota cuando la pague.'
    ],
    ir: 'ahorro-credito'
  },
  {
    tit: 'Un precio que vio en internet',
    dice: 'En internet todo se ve baratico. Haga la cuenta antes de darle "comprar".',
    pasos: [
      'En la página de la tienda, señale el precio con el mouse.',
      'Haga clic derecho y escoja "Arriero: ¿cuándo puedo comprarlo?".',
      'Abra la app: el precio ya está puesto y el recibo sale solo.'
    ],
    ir: 'clic-derecho'
  },
  {
    tit: 'Cuánto vale su día de trabajo',
    dice: 'Su tiempo vale, mijo. El que no le pone precio a su trabajo, lo regala.',
    pasos: [
      'Toque la mula de Cobrar.',
      'Escriba cuánto se quiere ganar al mes y cuántos días trabaja.',
      'Mire su hora al lado del básico. Si sale en rojo, súbale: está trabajando barato.'
    ],
    ir: 'cobrar-dia'
  },
  {
    tit: 'Cuánto cobrar por un trabajo',
    dice: 'Cuente todo, hasta el pasaje del bus. Lo que no se anota, se pierde.',
    pasos: [
      'En la hoja del trabajo, escriba para quién es y qué trabajo va a hacer.',
      'Diga cuántos días u horas le lleva.',
      'Anote lo que tiene que comprar y los otros gastos.',
      'Escoja su ganancia. Abajo sale grande: "Cóbrele".'
    ],
    ir: 'cobrar-hoja'
  },
  {
    tit: 'Mandarle la cuenta al cliente',
    dice: 'Cuentas claras, amistades largas. Hasta al compadre se le pasa la cuenta por escrito.',
    pasos: [
      'Toque "Hágame la cuenta de cobro".',
      'Revísela tranquilo: el cliente no ve su ganancia.',
      'Toque "Guárdemela" y después "Descárguemela como imagen".',
      'Mándela por WhatsApp como si fuera una foto.'
    ],
    ir: 'cobrar-cuenta'
  },
  {
    tit: 'Anotar lo que le van pagando',
    dice: 'Al que fía y no anota, se le olvida hasta a quién le fió.',
    pasos: [
      'En "Mis cuentas de cobro", toque la cuenta del cliente.',
      'Escriba lo que le pagaron y toque "Anotar abono".',
      'Cuando le paguen todo, la cuenta sale con el sello PAGADO.'
    ],
    ir: 'cobrar-fiados'
  },
  {
    tit: 'La calculadora',
    dice: 'Para esas cuentas de cabeza que ya no salen como antes. A todos nos pasa.',
    pasos: [
      'En Ahorro, al fondo, toque "Saque la calculadora".',
      'Funciona como la de siempre.',
      'Los botones de arriba hacen las cuentas del arriero: al mes, al día, al año.'
    ],
    ir: 'calculadora'
  }
];

const GUIA_PREGUNTAS = [
  ['¿El cliente ve mi ganancia?',
   'No, mijo. En la cuenta de cobro la ganancia va dentro de la mano de obra, que es como cobra cualquier maestro. Los materiales salen a lo que le costaron.'],
  ['¿Dónde quedan mis datos?',
   'En este computador. No se mandan a ninguna parte. Lo que gana y su hoja del mes viajan con su cuenta de Chrome; las cosas apuntadas y las cuentas de cobro se quedan aquí.'],
  ['¿Necesito internet?',
   'No. La app hace todas las cuentas sin internet.'],
  ['¿Qué es el básico?',
   'Lo menos que debería valer una hora de trabajo: el salario mínimo repartido en las horas del mes. Si su hora sale por debajo, la app se lo dice en rojo.'],
  ['¿Por qué mi hora sale en ese número?',
   'Porque es lo que se quiere ganar al mes, dividido en los días que trabaja, dividido en 8 horas. Si quiere ganar más por hora, súbale a lo que se quiere ganar o trabaje menos días.'],
  ['¿Y si me equivoco?',
   'Todo se corrige. El recibo se voltea para cambiar el precio, la cuenta de cobro se vuelve a abrir en la hoja, y lo que borra trae un botón de "Deshacer".'],
  ['¿Puedo usar otra moneda?',
   'Sí: arriba, al lado del número grande, escoja la suya. La app no convierte de una moneda a otra: el número que usted escribe es el que vale.'],
  ['¿Cómo mando la cuenta por WhatsApp?',
   'Descárguela como imagen: queda en la carpeta de Descargas. En WhatsApp toque el clip, escoja la foto y listo.']
];

let guiaEscribiendo = null;

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('guia')) return;
  guiaPintarPasos();
  guiaPintarPreguntas();

  const ej = document.getElementById('guia-ejemplo');
  if (ej) {
    ej.addEventListener('click', function () {
      if (typeof cobCargarEjemplo === 'function') cobCargarEjemplo();
      guiaMostrar('cobrar-hoja');
    });
  }

  const ver = document.getElementById('guia-version');
  if (ver) {
    let v = '';
    try { v = chrome.runtime.getManifest().version; } catch (e) { /* abierta suelta */ }
    ver.textContent = v ? 'Versión ' + v : '';
  }

  // El abuelo saluda cada vez que se abre su estrella.
  document.querySelectorAll('.estrella[data-view="guia"], .estrella[data-view="escuela"]').forEach(function (b) {
    b.addEventListener('click', function () {
      const esGuia = b.dataset.view === 'guia';
      const lista = esGuia ? GUIA_SALUDOS : (typeof ESCUELA_SALUDOS !== 'undefined' ? ESCUELA_SALUDOS : GUIA_SALUDOS);
      guiaEscribir(document.getElementById(esGuia ? 'guia-globo' : 'escuela-globo'),
                   lista[Math.floor(Math.random() * lista.length)]);
    });
  });
});

// El globo se escribe letra por letra, como el refrán de arriba: da tiempo de
// leer y se siente que alguien está hablando.
function guiaEscribir(globo, frase) {
  if (!globo) return;
  if (guiaEscribiendo) clearInterval(guiaEscribiendo);
  globo.textContent = '';
  globo.classList.add('escribiendo');
  let i = 0;
  guiaEscribiendo = setInterval(function () {
    i += 1;
    globo.textContent = frase.slice(0, i);
    if (i >= frase.length) {
      clearInterval(guiaEscribiendo);
      guiaEscribiendo = null;
      globo.classList.remove('escribiendo');
    }
  }, 22);
}

function guiaPintarPasos() {
  const cont = document.getElementById('guia-pasos');
  if (!cont) return;
  GUIA_PASOS.forEach(function (p, n) {
    const d = document.createElement('details');
    d.className = 'abu-plegable';
    // Uno abierto a la vez: así la lista no se vuelve un testamento.
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
    tit.textContent = p.tit;
    s.appendChild(num);
    s.appendChild(tit);
    d.appendChild(s);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'abu-plegable-cuerpo';
    cuerpo.appendChild(guiaDice(p.dice));

    const ol = document.createElement('ol');
    ol.className = 'abu-pasos';
    p.pasos.forEach(function (txt) {
      const li = document.createElement('li');
      li.textContent = txt;
      ol.appendChild(li);
    });
    cuerpo.appendChild(ol);

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'abu-muestreme';
    b.textContent = 'Muéstreme dónde es';
    b.addEventListener('click', function () { guiaMostrar(p.ir); });
    cuerpo.appendChild(b);

    d.appendChild(cuerpo);
    cont.appendChild(d);
  });
}

function guiaPintarPreguntas() {
  const cont = document.getElementById('guia-preguntas');
  if (!cont) return;
  GUIA_PREGUNTAS.forEach(function (q) {
    const d = document.createElement('details');
    d.className = 'abu-plegable abu-pregunta';
    const s = document.createElement('summary');
    const tit = document.createElement('span');
    tit.className = 'abu-plegable-tit';
    tit.textContent = q[0];
    s.appendChild(tit);
    d.appendChild(s);
    const p = document.createElement('p');
    p.className = 'abu-plegable-cuerpo abu-respuesta';
    p.textContent = q[1];
    d.appendChild(p);
    cont.appendChild(d);
  });
}

// La frase del abuelo dentro de una tarjeta: comillas grandes, letra cursiva.
function guiaDice(txt) {
  const p = document.createElement('p');
  p.className = 'abu-dice';
  p.textContent = txt;
  return p;
}

// "Muéstreme": va a la vista, abre lo que haya que abrir, baja hasta el sitio
// y lo hace brillar un momentico.
function guiaMostrar(destino) {
  const d = GUIA_DESTINOS[destino];
  if (!d) return;
  const estrella = document.querySelector('.estrella[data-view="metas"]');
  cambiarVista(d.vista, estrella);
  ponerPanel(d.vista, true);
  if (d.antes) d.antes();
  setTimeout(function () {
    const el = document.querySelector(d.el);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('abu-brillo');
    void el.offsetWidth;
    el.classList.add('abu-brillo');
    setTimeout(function () { el.classList.remove('abu-brillo'); }, 2800);
  }, 380);
}
