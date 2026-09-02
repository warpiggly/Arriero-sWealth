// =================================================================
// recibo.js — El recibo de dos caras
//
// Fase 4 del rediseño: la cara de todo lo que ya funcionaba por debajo.
// Es lo ÚNICO de la vista de Ahorro que toca la pantalla; las cuentas viven
// en src/ahorro.js, la libreta en src/db.js y los datos de la persona en
// src/ajustes.js — ninguno de los tres sabe que existe una pantalla.
//
// POR QUÉ UN RECIBO
//   La app no inventa metáforas nuevas: se apoya en las dos cosas que la gente
//   ya domina de toda la vida. La calculadora, para el gesto de escribir un
//   número. Y la factura de tienda, para la respuesta: todo el mundo ha
//   recibido un recibo y sabe leerlo. Lo que trae de más es lo que ninguna
//   tienda le dice — si le alcanza, cuánto le pesa, y el consejo.
//
// LAS DOS CARAS
//   Adelante, el recibo. Se le da la vuelta y aparece la hoja tipo Excel para
//   corregir los precios y los nombres. El reverso muestra SOLO las filas de
//   ese recibo: dar la vuelta siempre es "corregir lo que estoy viendo", nunca
//   "abrir el archivo completo de mi vida".
//
// OJO CON EL TAMAÑO DE LA LETRA
//   El <body> lleva zoom: 0.75 — todo nace 25 % más chico de lo que se
//   escribe aquí. Los tamaños del recibo (styles.css, sección EL RECIBO) están
//   puestos contando con eso. Si algún día se cambia ese zoom, hay que volver
//   a mirar el recibo con el brazo estirado.
// =================================================================

// Lo que se está mirando ahora mismo
let recAhora = null;        // la cuenta pintada (unitaria o grupal)
let recAjustes = null;      // los datos de la persona
let recCapturado = null;    // lo que trajo el clic derecho
let recViendo = null;       // { tipo: 'suelto'|'grupo'|'nuevo', id?, grupo? }
let recAvisoTimer = null;

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('ah-recibo')) return;   // no es esta vista

  recArmarGastos();

  // --- Lo que gana ---
  recAtar('ah-ingreso', 'input', function (el) {
    ajustesGuardar({ ingreso: recNumero(el.value) }).then(recTrasGuardar);
  });
  recAtar('ah-frecuencia', 'change', function (el) {
    ajustesGuardar({ frecuencia: el.value }).then(recTrasGuardar);
  });
  recAtar('ah-juntado', 'input', function (el) {
    ajustesGuardar({ ahorroJuntado: recNumero(el.value) }).then(recTrasGuardar);
  });
  recAtar('ah-colchon-juntado', 'input', function (el) {
    ajustesGuardar({ colchonJuntado: recNumero(el.value) }).then(recTrasGuardar);
  });
  recAtar('ah-usa-colchon', 'change', function (el) {
    ajustesGuardar({ usaColchon: el.checked }).then(recTrasGuardar);
  });

  // Los campos de dinero, con el mismo comportamiento del resto de la app
  ['ah-ingreso', 'ah-precio', 'ah-juntado', 'ah-colchon-juntado']
    .forEach(function (id) { recAtarMoneda(document.getElementById(id)); });

  // --- Abrir y cerrar los pliegues ---
  recAtar('ah-yo-resumen', 'click', function () { recAbrirYo(true); });
  recAtar('ah-gastos-tit', 'click', recPlegarGastos);
  recAtar('ah-libreta-tit', 'click', recPlegarLibreta);

  // --- La pregunta ---
  recAtar('ah-nombre', 'input', recCalcularDeLaPregunta);
  recAtar('ah-precio', 'input', recCalcularDeLaPregunta);

  // --- El giro ---
  document.querySelectorAll('[data-voltear]').forEach(function (b) {
    b.addEventListener('click', recVoltear);
  });

  // --- Los tres botones del final ---
  recAtar('rec-g-suelto', 'click', recGuardarSuelto);
  recAtar('rec-g-grupo', 'click', recMostrarGrupos);
  recAtar('rec-g-dejar', 'click', recDejarloAsi);
  recAtar('rec-grupo-crear', 'click', function () {
    const el = document.getElementById('rec-grupo-nuevo');
    if (el && el.value.trim()) recGuardarEnGrupo(el.value.trim());
  });
  const nuevo = document.getElementById('rec-grupo-nuevo');
  if (nuevo) {
    nuevo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (nuevo.value.trim()) recGuardarEnGrupo(nuevo.value.trim());
      }
    });
  }

  // Arranque
  ajustesCargar().then(function (a) {
    recAjustes = a;
    recPintarYo();
    recAbrirYo(!ajustesTieneIngreso(a));   // la primera vez, abierto
    recPintarLibreta();
    recRevisarCapturado();
  });
});

// Si los datos de la persona cambian por fuera de esta pantalla -- en otro de
// sus computadores, porque storage.sync viaja, o en otra ventana de la
// extension --, ajustes.js llama esto. La pantalla tiene que repintarse: si no,
// se quedaria mostrando una cuenta hecha con datos viejos, que es peor que no
// mostrar nada.
function ajustesCambiaronDeAfuera(a) {
  recAjustes = a;
  recPintarYo();
  if (recAhora) recRehacerLoQueSeEstaViendo();
  recPintarLibreta();
}

function recAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function () { hacer(el); });
}

// Los números entran como la gente los escribe: "1.200.000" o "1200000".
function recNumero(txt) {
  if (typeof txt === 'number') return txt;
  const limpio = String(txt || '').replace(/[^\d,.-]/g, '');
  if (!limpio) return 0;
  // Punto = miles (es-CO). La coma es el decimal.
  const n = parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
}

// La plata, en la moneda que la persona escogió arriba. Si la función de la
// app no está cargada, pesos colombianos (ver ahorroPlata, misma idea).
function recPlata(n) {
  if (typeof formatearDineroLimpio === 'function') {
    return formatearDineroLimpio(Number(n) || 0);
  }
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

// Rehacer TODO lo que se está viendo. Lo llama refrescarTodo() de
// logic_quotation.js cuando la persona cambia la moneda: no basta con
// repintar, porque las frases del veredicto llevan las cifras metidas por
// dentro y quedarían en la moneda vieja.
function recRefrescar() {
  recPintarJornal();
  recPintarYo();
  if (recAhora) recRehacerLoQueSeEstaViendo();
  recPintarLibreta();
}

// Los campos de dinero se comportan como en TODA la app: al enfocarlos se ven
// solo los dígitos (para poder editar sin pelear con los puntos) y al salir se
// les ponen los puntos de miles, para leerlos como en una factura.
//
// El patrón y las funciones son de src/logic_quotation.js, que ya lo hacía con
// los campos de Cobrar. Se reutiliza en vez de inventar otro: así la app se
// siente igual en todas sus pantallas, que con este público es lo que más
// pesa. Se atan a mano (y no con la clase .input-money) porque varios de estos
// campos se crean después de que logic_quotation.js ya pasó por el DOM.
function recAtarMoneda(el) {
  if (!el) return;
  if (typeof soloDigitos !== 'function' || typeof formatearInputMoneda !== 'function') return;
  el.addEventListener('focus', function () { el.value = soloDigitos(el.value); });
  el.addEventListener('blur', function () { formatearInputMoneda(el); });
}

// ----------------------------------------------------------------
// 1. Lo que usted gana
// ----------------------------------------------------------------
function recArmarGastos() {
  const cont = document.getElementById('ah-gastos-campos');
  if (!cont) return;

  cont.innerHTML = '';
  RENGLONES.forEach(function (r) {
    const fila = document.createElement('div');
    fila.className = 'ah-par ah-par-chico';

    const rot = document.createElement('label');
    rot.className = 'ah-rot';
    rot.setAttribute('for', 'ah-g-' + r.clave);
    rot.textContent = r.rotulo;
    fila.appendChild(rot);

    const campo = document.createElement('input');
    campo.type = 'text';
    campo.inputMode = 'numeric';
    campo.className = 'ah-campo';
    campo.id = 'ah-g-' + r.clave;
    campo.placeholder = '0';
    campo.addEventListener('input', function () {
      const cambio = { gastos: {} };
      cambio.gastos[r.clave] = recNumero(campo.value);
      ajustesGuardar(cambio).then(recTrasGuardar);
    });
    recAtarMoneda(campo);
    fila.appendChild(campo);

    cont.appendChild(fila);
  });
}

function recTrasGuardar(a) {
  recAjustes = a;
  recPintarYo();
  // La cuenta cambia con los datos: que el recibo se repinte solo.
  if (recAhora) recRehacerLoQueSeEstaViendo();
  recPintarLibreta();
}

function recAbrirYo(abierto) {
  const cuerpo = document.getElementById('ah-yo-cuerpo');
  const resumen = document.getElementById('ah-yo-resumen');
  if (!cuerpo || !resumen) return;

  cuerpo.classList.toggle('oculto', !abierto);
  resumen.classList.toggle('oculto', abierto);
  resumen.setAttribute('aria-expanded', abierto ? 'true' : 'false');

  // Con el ingreso puesto, la pregunta de verdad pasa al frente.
  const preg = document.getElementById('ah-pregunta');
  if (preg) preg.classList.toggle('ah-pregunta-lejos', abierto);
}

function recPintarYo() {
  const a = recAjustes;
  if (!a) return;

  recPonerValor('ah-ingreso', a.ingreso);
  recPonerValor('ah-juntado', a.ahorroJuntado);
  recPonerValor('ah-colchon-juntado', a.colchonJuntado);

  const frec = document.getElementById('ah-frecuencia');
  if (frec) frec.value = a.frecuencia;

  const usa = document.getElementById('ah-usa-colchon');
  if (usa) usa.checked = a.usaColchon !== false;

  RENGLONES.forEach(function (r) {
    recPonerValor('ah-g-' + r.clave, a.gastos[r.clave]);
  });

  const cap = ahorroCapacidad(a);

  // El renglón plegado. Dice lo que la app sabe, en una frase.
  const txt = document.getElementById('ah-yo-resumen-txt');
  if (txt) {
    if (!ajustesTieneIngreso(a)) {
      txt.textContent = 'Todavía no me ha dicho cuánto gana';
    } else {
      txt.textContent = 'Gana ' + recPlata(a.ingreso) + ' ' +
                        ajustesRotuloFrecuencia(a) + ' · puede guardar ' +
                        recPlata(cap.alMes) + ' al mes';
    }
  }

  // El resumencito de los gastos, para no tener que abrirlos solo por mirar
  const gr = document.getElementById('ah-gastos-resumen');
  if (gr) {
    gr.textContent = cap.faltaPrellenado
      ? 'sin llenar'
      : recPlata(cap.gastosAlMes + cap.colchonAlMes) + ' al mes';
  }

  // La cabecera de la app: el número grande de arriba
  recPintarJornal();
}

// EL NÚMERO GRANDE DE LA CABECERA, en la vista de Ahorro.
//
// Lo llama src/logic_quotation.js cada vez que se cambia de vista (es decir,
// cada vez que se toca la mula de AHORRO), y también esta pantalla cuando los
// datos cambian. Tiene que existir con este nombre: si no, la cabecera se
// queda con el guion del marcador temporal.
//
// Qué muestra:
//   · todavía no ha dicho cuánto gana  ->  un guion, porque no sabemos
//   · no le queda nada, o está en rojo ->  $0, que es la respuesta honesta a
//     "cuánto puede guardar". Que le falta plata lo explica el recibo, con
//     todas sus palabras: la caja dorada no es el lugar para un número
//     negativo que nadie sabe leer
//   · el caso normal                   ->  lo que puede guardar al mes
function recPintarJornal() {
  if (typeof pintarJornal !== 'function') return;

  const a = recAjustes;
  if (!a || !ajustesTieneIngreso(a)) {
    pintarJornal('Puede guardar:', '—');
    return;
  }

  const cap = ahorroCapacidad(a);
  pintarJornal('Puede guardar:', recPlata(Math.max(0, cap.alMes)));
}

function recPonerValor(id, valor) {
  const el = document.getElementById(id);
  if (!el || document.activeElement === el) return;
  // Se muestra con puntos de miles, como la gente lo lee.
  el.value = valor ? Math.round(valor).toLocaleString('es-CO') : '';
}

function recPlegarGastos() {
  const caja = document.getElementById('ah-gastos');
  const btn = document.getElementById('ah-gastos-tit');
  if (!caja) return;
  const cerrado = caja.classList.toggle('cerrado');
  if (btn) btn.setAttribute('aria-expanded', cerrado ? 'false' : 'true');
}

function recPlegarLibreta() {
  const caja = document.getElementById('ah-libreta');
  const btn = document.getElementById('ah-libreta-tit');
  if (!caja) return;
  const cerrado = caja.classList.toggle('cerrado');
  if (btn) btn.setAttribute('aria-expanded', cerrado ? 'false' : 'true');
}

// ----------------------------------------------------------------
// 2. Lo que trajo el clic derecho
// ----------------------------------------------------------------
function recRevisarCapturado() {
  try {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
  } catch (e) { return; }

  chrome.storage.local.get(['precioCapturado'], function (data) {
    const cap = data && data.precioCapturado;
    if (!cap || !cap.precio) return;

    recCapturado = cap;

    const precio = document.getElementById('ah-precio');
    const nombre = document.getElementById('ah-nombre');
    if (precio) precio.value = Math.round(cap.precio).toLocaleString('es-CO');
    if (nombre && !nombre.value) {
      // El título de la página sirve de nombre sugerido. Se recorta: los
      // títulos de las tiendas traen la marca, el envío y medio catálogo.
      nombre.value = String(cap.titulo || cap.texto || '').split('|')[0].trim().slice(0, 60);
    }

    // Se consume: si no, cada vez que abra el popup le sale lo mismo.
    chrome.storage.local.remove(['precioCapturado']);

    recCalcularDeLaPregunta();
  });
}

// ----------------------------------------------------------------
// 3. Calcular y pintar el recibo
// ----------------------------------------------------------------
function recCalcularDeLaPregunta() {
  const campoPrecio = document.getElementById('ah-precio');
  const campoNombre = document.getElementById('ah-nombre');
  const precio = recNumero(campoPrecio ? campoPrecio.value : 0);
  const nombre = campoNombre ? campoNombre.value.trim() : '';

  if (!precio) {
    recEsconderRecibo();
    return;
  }

  recViendo = { tipo: 'nuevo' };
  recAhora = ahorroCuentaUnitaria({
    nombre: nombre,
    precio: precio,
    link: (recCapturado && recCapturado.link) || ''
  }, recAjustes || ajustesVacios());

  recPintarRecibo();
}

function recEsconderRecibo() {
  const caja = document.getElementById('ah-recibo');
  if (caja) {
    caja.classList.add('oculto');
    caja.classList.remove('volteado');
  }
  recAhora = null;
  recViendo = null;
}

// Vuelve a hacer la cuenta de lo que se está viendo, con los datos de ahora.
function recRehacerLoQueSeEstaViendo() {
  if (!recViendo) return;

  if (recViendo.tipo === 'nuevo') {
    recCalcularDeLaPregunta();
  } else if (recViendo.tipo === 'grupo') {
    recVerGrupo(recViendo.grupo);
  } else if (recViendo.tipo === 'suelto') {
    recVerItem(recViendo.id);
  }
}

function recPintarRecibo() {
  const c = recAhora;
  const caja = document.getElementById('ah-recibo');
  if (!c || !caja) return;

  const esGrupo = !!c.desglose;

  caja.classList.remove('oculto');
  // Siempre se muestra por adelante: nadie quiere volver a un recibo volteado.
  caja.classList.remove('volteado');

  // --- Cabecera y qué es ---
  recTexto('rec-sub', esGrupo
    ? c.cuantos + (c.cuantos === 1 ? ' cosa apuntada' : ' cosas en un grupo')
    : '¿cuándo puedo comprarlo, mijo?');
  recTexto('rec-nombre', esGrupo ? (c.grupo || 'Mi grupo')
                                 : (c.nombre || 'Lo que usted quiere'));
  recTexto('rec-precio', recPlata(esGrupo ? c.total : c.precio));

  const donde = document.getElementById('rec-donde');
  if (donde) {
    if (esGrupo) {
      donde.textContent = c.cuantos + ' cosas, todo junto';
    } else if (c.link) {
      donde.textContent = recDominio(c.link);
    } else {
      donde.textContent = '';
    }
  }

  // --- El desglose, solo en el grupal ---
  recPintarDesglose(esGrupo ? c : null);

  // --- Cuánto ahorra y cuándo lo tiene ---
  recPintarRenglones(c, esGrupo);

  // --- El veredicto ---
  recPintarVeredicto(c.veredicto);

  // --- El aviso de los gastos sin llenar ---
  const aviso = document.getElementById('rec-aviso');
  if (aviso) {
    if (c.avisoPrellenado) {
      aviso.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = 'Ojo con esta cuenta, mijo';
      aviso.appendChild(b);
      aviso.appendChild(document.createTextNode(c.avisoPrellenado));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rec-btn-g';
      btn.textContent = 'Dígame mis gastos';
      btn.addEventListener('click', function () {
        recAbrirYo(true);
        const g = document.getElementById('ah-gastos');
        if (g) g.classList.remove('cerrado');
        const primero = document.getElementById('ah-g-casa');
        if (primero) primero.focus();
      });
      aviso.appendChild(btn);
      aviso.classList.remove('oculto');
    } else {
      aviso.classList.add('oculto');
    }
  }

  // --- Lo que le pesa ---
  const afecta = document.getElementById('rec-afecta');
  if (afecta) {
    afecta.innerHTML = '';
    const rot = document.createElement('span');
    rot.className = 'rec-rot-chico';
    rot.textContent = 'Lo que le pesa';
    afecta.appendChild(rot);
    const p = document.createElement('p');
    p.textContent = c.loQuePesa;
    afecta.appendChild(p);
  }

  // --- Los plazos ---
  recPintarPlazos(c);

  // --- El consejo ---
  recTexto('rec-consejo-txt', recConsejo(c.veredicto.caso));

  // --- Los botones de guardar: solo si esto todavía no está apuntado ---
  const guardar = document.getElementById('rec-guardar');
  const grupos = document.getElementById('rec-grupos');
  if (guardar) guardar.classList.toggle('oculto', recViendo.tipo !== 'nuevo');
  if (grupos) grupos.classList.add('oculto');

  // --- La cara de atrás ---
  recPintarHoja(c, esGrupo);

  recTexto('rec-voltear-txt', esGrupo
    ? 'Voltear para corregir los precios'
    : 'Voltear para corregir el precio');
}

function recTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

// De un link largo, solo la tienda: "tienda.com". Lo demás no le dice nada a
// nadie y no cabe.
function recDominio(link) {
  try {
    const u = new URL(link);
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return String(link).slice(0, 40);
  }
}

function recPintarRenglones(c, esGrupo) {
  const cont = document.getElementById('rec-renglones');
  if (!cont) return;
  cont.innerHTML = '';

  const cap = c.capacidad;

  cont.appendChild(recRenglon('Usted ahorra', recPlata(cap.alMes), '/ mes'));

  if (c.juntado && c.juntado.paraComprar > 0) {
    cont.appendChild(recRenglon('Ya tiene', recPlata(c.juntado.paraComprar)));
  }

  if (c.cuando.yaLoTiene) {
    cont.appendChild(recRenglon(esGrupo ? 'Todo junto' : 'Lo tendrá', 'ya mismo', '', true));
  } else if (c.cuando.meses === null) {
    // Sin capacidad no hay plazo. No se deja el renglón vacío: se dice.
    cont.appendChild(recRenglon(esGrupo ? 'Todo junto' : 'Lo tendrá',
                                'no se sabe todavía', '', true));
  } else {
    cont.appendChild(recRenglon(esGrupo ? 'Todo junto' : 'Lo tendrá',
                                c.cuandoEnPalabras.replace(/^en /, 'en '), '', true));
    cont.appendChild(recRenglon('O sea, para', c.fecha));
  }
}

function recRenglon(rot, valor, chiquito, fuerte) {
  const d = document.createElement('div');
  d.className = 'rec-renglon' + (fuerte ? ' rec-renglon-fuerte' : '');

  const r = document.createElement('span');
  r.className = 'rec-rot';
  r.textContent = rot;
  d.appendChild(r);

  const lin = document.createElement('span');
  lin.className = 'rec-lin';
  d.appendChild(lin);

  const v = document.createElement('span');
  v.className = 'rec-val';
  v.textContent = valor;
  if (chiquito) {
    const em = document.createElement('em');
    em.textContent = ' ' + chiquito;
    v.appendChild(em);
  }
  d.appendChild(v);

  return d;
}

function recPintarVeredicto(v) {
  const cont = document.getElementById('rec-veredicto');
  if (!cont) return;

  // El color ACOMPAÑA; la frase MANDA. Un semáforo no le dice nada a quien no
  // distingue bien los colores, así que el tono nunca va solo.
  cont.className = 'rec-veredicto rec-v-' + (v.tono || 'bien');
  cont.innerHTML = '';

  const ico = document.createElement('span');
  ico.className = 'rec-v-ico';
  ico.setAttribute('aria-hidden', 'true');
  ico.textContent = ({ bien: '✓', ojo: '!', no: '×', lento: '⏳' })[v.tono] || '✓';
  cont.appendChild(ico);

  const dice = document.createElement('span');
  dice.className = 'rec-v-dice';

  const frase = document.createElement('span');
  frase.className = 'rec-v-frase';
  frase.textContent = v.frase;
  dice.appendChild(frase);

  const porque = document.createElement('span');
  porque.className = 'rec-v-porque';
  porque.textContent = v.porque;
  dice.appendChild(porque);

  cont.appendChild(dice);
}

function recPintarDesglose(c) {
  const cont = document.getElementById('rec-desglose');
  if (!cont) return;

  if (!c) { cont.classList.add('oculto'); cont.innerHTML = ''; return; }

  cont.classList.remove('oculto');
  cont.innerHTML = '';

  const rot = document.createElement('span');
  rot.className = 'rec-rot-chico';
  rot.textContent = 'Cosa por cosa';
  cont.appendChild(rot);

  c.desglose.forEach(function (d) {
    const fila = document.createElement('div');
    fila.className = 'rec-desglose-fila';

    const cosa = document.createElement('span');
    cosa.className = 'rec-d-cosa';
    cosa.textContent = d.nombre || '(sin nombre)';
    fila.appendChild(cosa);

    const plata = document.createElement('span');
    plata.className = 'rec-d-plata';
    plata.textContent = recPlata(d.precio);
    fila.appendChild(plata);

    const cuanto = document.createElement('span');
    cuanto.className = 'rec-d-cuanto';
    cuanto.textContent = d.meses === null ? '—' : d.mesesEnPalabras.replace(/^en /, '');
    fila.appendChild(cuanto);

    cont.appendChild(fila);
  });

  const total = document.createElement('div');
  total.className = 'rec-desglose-total';
  const t1 = document.createElement('span');
  t1.textContent = 'Todo junto';
  const t2 = document.createElement('span');
  t2.className = 'rec-d-plata';
  t2.textContent = recPlata(c.total);
  total.appendChild(t1);
  total.appendChild(t2);
  cont.appendChild(total);
}

function recPintarPlazos(c) {
  const fila = document.getElementById('rec-plazos-fila');
  const dice = document.getElementById('rec-plazo-dice');
  if (!fila) return;

  fila.innerHTML = '';
  if (dice) dice.textContent = 'Toque un plazo y le digo cuánto tendría que guardar.';

  c.plazos.forEach(function (p) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rec-plazo-btn';
    b.setAttribute('aria-pressed', 'false');
    b.textContent = p.meses + ' meses';
    b.addEventListener('click', function () {
      fila.querySelectorAll('.rec-plazo-btn').forEach(function (o) {
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
      });
      if (dice) {
        dice.textContent = p.dice;
        dice.classList.toggle('rec-plazo-malo', !p.alcanza);
      }
    });
    fila.appendChild(b);
  });
}

// El Consejo Arriero. Va con el veredicto: no es un refrán al azar, es lo que
// le diría alguien que acabó de ver su cuenta.
const REC_CONSEJOS = {
  alcanza: [
    'El que guarda siempre tiene, mijo. Pero el que guarda con fecha, llega.',
    'Vaya parejo, que el camino corto no siempre es el más rápido.'
  ],
  colchon: [
    'La reserva es para la tormenta, no para el antojo. Piénselo dos veces.',
    'Mula sin descanso no llega al puerto. Deje algo guardado para el susto.'
  ],
  'no-alcanza': [
    'Antes de cargar la mula hay que darle de comer. Primero cuadre el mes.',
    'De a poquito se llena el costal, mijo. Empiece por lo que sí puede.'
  ],
  lento: [
    'No cargue la mula con todo de una. De a bulto se llega igual, y sin lastimarla.',
    'Camino largo se hace corto si se sale temprano.'
  ]
};

function recConsejo(caso) {
  const lista = REC_CONSEJOS[caso] || REC_CONSEJOS.alcanza;
  return '“' + lista[Math.floor(Math.random() * lista.length)] + '”';
}

// ----------------------------------------------------------------
// 4. La cara de atrás: la hoja para corregir
// ----------------------------------------------------------------
function recPintarHoja(c, esGrupo) {
  const cuerpo = document.getElementById('rec-hoja-cuerpo');
  if (!cuerpo) return;

  cuerpo.innerHTML = '';

  const filas = esGrupo
    ? c.desglose.map(function (d) {
        return { id: d.id, nombre: d.nombre, precio: d.precio };
      })
    : [{ id: (recViendo && recViendo.id) || null, nombre: c.nombre, precio: c.precio }];

  recTexto('rec-atras-cuantas', filas.length === 1
    ? 'la fila de este recibo'
    : 'las ' + filas.length + ' filas de este grupo');

  filas.forEach(function (f, i) {
    const tr = document.createElement('tr');

    const num = document.createElement('td');
    num.className = 'rec-hoja-num';
    num.textContent = String(i + 1);
    tr.appendChild(num);

    tr.appendChild(recCelda(f, 'nombre', 'text'));
    tr.appendChild(recCelda(f, 'precio', 'numeric'));

    cuerpo.appendChild(tr);
  });

  if (esGrupo && filas.length > 1) {
    const tr = document.createElement('tr');
    tr.className = 'rec-hoja-total';
    const vacio = document.createElement('td');
    vacio.className = 'rec-hoja-num';
    tr.appendChild(vacio);
    const rot = document.createElement('td');
    rot.textContent = 'Todo junto';
    tr.appendChild(rot);
    const val = document.createElement('td');
    val.className = 'rec-hoja-plata';
    val.textContent = recPlata(c.total);
    tr.appendChild(val);
    cuerpo.appendChild(tr);
  }

  // El link, abajo: es de dónde salió el precio, y sirve para volver a mirar.
  const link = document.getElementById('rec-atras-link');
  if (link) {
    link.innerHTML = '';
    if (!esGrupo && c.link) {
      const a = document.createElement('a');
      a.href = c.link;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = 'Volver a ver el precio en ' + recDominio(c.link);
      link.appendChild(a);
    }
  }
}

function recCelda(fila, campo, modo) {
  const td = document.createElement('td');
  // El estilo de la celda lo dan `.rec-hoja td` y `.rec-hoja-input`; aqui solo
  // hace falta marcar la del precio, que va alineada a la derecha.
  td.className = (campo === 'precio' ? 'rec-hoja-plata' : '');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rec-hoja-input';
  if (modo === 'numeric') input.inputMode = 'numeric';
  input.value = campo === 'precio'
    ? Math.round(fila.precio).toLocaleString('es-CO')
    : (fila.nombre || '');
  input.setAttribute('aria-label', campo === 'precio' ? 'Cuánto cuesta' : 'Qué es');
  if (campo === 'precio') recAtarMoneda(input);

  input.addEventListener('change', function () {
    const valor = campo === 'precio' ? recNumero(input.value) : input.value.trim();
    recCorregir(fila.id, campo, valor);
  });

  td.appendChild(input);
  return td;
}

// Corregir desde el reverso. Si la cosa ya está en la libreta, se corrige
// allá; si es un cálculo que todavía no se ha guardado, se corrige el cálculo
// en curso. En los dos casos, al voltear, la cara de adelante ya sale
// corregida — que es lo único que la persona espera.
function recCorregir(id, campo, valor) {
  if (id) {
    const cambio = {};
    cambio[campo] = valor;
    dbActualizarItem(id, cambio).then(function () {
      recRehacerLoQueSeEstaViendo();
      recPintarLibreta();
    });
    return;
  }

  // Todavía no está guardado: se corrige el formulario de arriba.
  const cual = campo === 'precio' ? 'ah-precio' : 'ah-nombre';
  const el = document.getElementById(cual);
  if (el) {
    el.value = campo === 'precio'
      ? Math.round(valor).toLocaleString('es-CO')
      : valor;
  }
  recCalcularDeLaPregunta();
}

function recVoltear() {
  const caja = document.getElementById('ah-recibo');
  if (caja) caja.classList.toggle('volteado');
}

// ----------------------------------------------------------------
// 5. Guardar: los tres caminos del final del cálculo
// ----------------------------------------------------------------
function recDatosParaGuardar(grupo) {
  const c = recAhora;
  if (!c) return null;
  return {
    nombre: c.nombre,
    precio: c.precio,
    link: c.link || '',
    titulo: (recCapturado && recCapturado.titulo) || '',
    grupo: grupo || ''
  };
}

function recGuardarSuelto() {
  const d = recDatosParaGuardar('');
  if (!d) return;
  dbGuardarItem(d).then(function () {
    recAvisar('Quedó apuntado, mijo.');
    recLimpiarPregunta();
  });
}

// Escoger de los que ya tiene, o escribir uno nuevo ahí mismo. Sirve igual la
// primera vez, cuando no hay ninguno. Decidido por David el 2 de septiembre.
function recMostrarGrupos() {
  const zona = document.getElementById('rec-grupos');
  const lista = document.getElementById('rec-grupos-lista');
  if (!zona || !lista) return;

  dbGrupos().then(function (grupos) {
    lista.innerHTML = '';
    grupos.forEach(function (g) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rec-grupo-btn';
      b.textContent = g.nombre;
      const cuantos = document.createElement('span');
      cuantos.className = 'rec-grupo-btn-cuantos';
      cuantos.textContent = g.cuantos + (g.cuantos === 1 ? ' cosa' : ' cosas');
      b.appendChild(cuantos);
      b.addEventListener('click', function () { recGuardarEnGrupo(g.nombre); });
      lista.appendChild(b);
    });
    zona.classList.remove('oculto');
    const nuevo = document.getElementById('rec-grupo-nuevo');
    if (nuevo && !grupos.length) nuevo.focus();
  });
}

function recGuardarEnGrupo(nombre) {
  const d = recDatosParaGuardar(nombre);
  if (!d) return;
  dbGuardarItem(d).then(function () {
    recAvisar('Quedó apuntado en "' + nombre + '".');
    const nuevo = document.getElementById('rec-grupo-nuevo');
    if (nuevo) nuevo.value = '';
    recLimpiarPregunta();
  });
}

function recDejarloAsi() {
  recAvisar('Listo: no guardé nada. Ahí tenía su cuenta.');
  recLimpiarPregunta();
}

function recLimpiarPregunta() {
  const precio = document.getElementById('ah-precio');
  const nombre = document.getElementById('ah-nombre');
  if (precio) precio.value = '';
  if (nombre) nombre.value = '';
  recCapturado = null;
  recEsconderRecibo();
  recPintarLibreta();
}

function recAvisar(texto) {
  const av = document.getElementById('ah-aviso');
  if (!av) return;
  av.textContent = texto;
  av.classList.remove('oculto');
  if (recAvisoTimer) clearTimeout(recAvisoTimer);
  recAvisoTimer = setTimeout(function () { av.classList.add('oculto'); }, 4000);
}

// ----------------------------------------------------------------
// 6. La libreta — el "Ver" del diagrama
// ----------------------------------------------------------------
function recPintarLibreta() {
  const cont = document.getElementById('ah-libreta-lista');
  const cuenta = document.getElementById('ah-libreta-cuenta');
  if (!cont) return;

  Promise.all([dbTodosLosItems(), dbGrupos()]).then(function (r) {
    const items = r[0];
    const grupos = r[1];
    const sueltos = items.filter(function (i) { return i.grupo === '(suelto)'; });

    if (cuenta) {
      cuenta.textContent = items.length
        ? items.length + (items.length === 1 ? ' cosa' : ' cosas')
        : '';
    }

    cont.innerHTML = '';

    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'ah-guia';
      p.textContent = 'Todavía no ha apuntado nada, mijo. Escriba un precio ' +
                      'arriba, o señale uno en cualquier página con el clic derecho.';
      cont.appendChild(p);
      return;
    }

    grupos.forEach(function (g) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ah-lib-item ah-lib-grupo';

      const nom = document.createElement('span');
      nom.className = 'ah-lib-nombre';
      nom.textContent = g.nombre;
      b.appendChild(nom);

      const det = document.createElement('span');
      det.className = 'ah-lib-det';
      det.textContent = g.cuantos + (g.cuantos === 1 ? ' cosa' : ' cosas');
      b.appendChild(det);

      const plata = document.createElement('span');
      plata.className = 'ah-lib-plata';
      plata.textContent = recPlata(g.total);
      b.appendChild(plata);

      b.addEventListener('click', function () { recVerGrupo(g.nombre); });
      cont.appendChild(b);
    });

    sueltos.forEach(function (it) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ah-lib-item';

      const nom = document.createElement('span');
      nom.className = 'ah-lib-nombre';
      nom.textContent = it.nombre || '(sin nombre)';
      b.appendChild(nom);

      const plata = document.createElement('span');
      plata.className = 'ah-lib-plata';
      plata.textContent = recPlata(it.precio);
      b.appendChild(plata);

      const x = document.createElement('span');
      x.className = 'ah-lib-x';
      x.textContent = '✕';
      x.title = 'Quitar de la libreta';
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        dbBorrarItem(it.id).then(function () {
          if (recViendo && recViendo.tipo === 'suelto' && recViendo.id === it.id) {
            recEsconderRecibo();
          }
          recPintarLibreta();
        });
      });
      b.appendChild(x);

      b.addEventListener('click', function () { recVerItem(it.id); });
      cont.appendChild(b);
    });
  }).catch(function (e) {
    cont.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'ah-guia';
    p.textContent = 'No pude abrir la libreta: ' + e.message;
    cont.appendChild(p);
  });
}

function recVerItem(id) {
  dbItem(id).then(function (it) {
    if (!it) return;
    recViendo = { tipo: 'suelto', id: it.id };
    recAhora = ahorroCuentaUnitaria(it, recAjustes || ajustesVacios());
    recPintarRecibo();
    recIrAlRecibo();
  });
}

function recVerGrupo(nombre) {
  dbItemsDelGrupo(nombre).then(function (items) {
    recViendo = { tipo: 'grupo', grupo: nombre };
    recAhora = ahorroCuentaGrupal(nombre, items, recAjustes || ajustesVacios());
    recPintarRecibo();
    recIrAlRecibo();
  });
}

// Que el recibo quede a la vista: si la libreta está abajo, la persona tocó
// algo y espera ver la respuesta, no quedarse mirando la lista.
function recIrAlRecibo() {
  const caja = document.getElementById('ah-recibo');
  if (caja && caja.scrollIntoView) {
    caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
