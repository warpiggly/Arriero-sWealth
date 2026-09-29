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

  recCargarConsejos();

  // --- Lo que gana ---
  recAtar('ah-ingreso', 'input', function (el) {
    ajustesGuardar({ ingreso: recNumero(el.value) }).then(recTrasGuardar);
  });
  recAtar('ah-juntado', 'input', function (el) {
    ajustesGuardar({ ahorroJuntado: recNumero(el.value) }).then(recTrasGuardar);
  });
  recAtar('ah-colchon-juntado', 'input', function (el) {
    ajustesGuardar({ colchonJuntado: recNumero(el.value) }).then(recTrasGuardar);
  });

  // Los campos de dinero, con el mismo comportamiento del resto de la app
  ['ah-ingreso', 'ah-precio', 'ah-juntado', 'ah-colchon-juntado']
    .forEach(function (id) { recAtarMoneda(document.getElementById(id)); });

  // --- Abrir y cerrar los pliegues ---
  recAtar('ah-yo-resumen', 'click', function () { recAbrirYo(true); });
  recAtar('ah-libreta-tit', 'click', recPlegarLibreta);

  // --- La pregunta ---
  // El recibo sale con el botón. Ya afuera, sigue la escritura sin esperar.
  recAtar('ah-nombre', 'input', recPreguntaCambio);
  recAtar('ah-precio', 'input', recPreguntaCambio);
  recAtar('ah-hacer-cuenta', 'click', recHacerLaCuenta);
  ['ah-nombre', 'ah-precio'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); recHacerLaCuenta(); }
    });
  });

  // --- Los dos desplegables del recibo ---
  recAtar('rec-aviso-tit', 'click', function () { recPlegar('rec-aviso'); });
  recAtar('rec-plazos-tit', 'click', function () { recPlegar('rec-plazos'); });

  // El boton del aviso lleva a llenar los gastos. Se ata UNA vez, aqui, y no
  // cada vez que se pinta el recibo: si no, se le irian amontonando oyentes.
  recAtar('rec-aviso-btn', 'click', function () {
    recAbrirYo(true);
    const primero = document.getElementById('cua-g-mercado');
    if (primero) primero.focus();
  });

  // --- El giro ---
  document.querySelectorAll('[data-voltear]').forEach(function (b) {
    b.addEventListener('click', recVoltear);
  });

  // --- Los tres botones del final ---
  recAtar('rec-g-suelto', 'click', recGuardarSuelto);
  recAtar('rec-g-grupo', 'click', recMostrarGrupos);
  recAtar('rec-g-dejar', 'click', recDejarloAsi);
  recAtar('rec-quitar', 'click', recQuitarDeLaLibreta);
  recAtar('rec-cerrar', 'click', recEsconderRecibo);
  document.addEventListener('keydown', function (e) {
    const caja = document.getElementById('ah-recibo');
    if (e.key === 'Escape' && caja && !caja.classList.contains('oculto')) recEsconderRecibo();
  });
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
  if (typeof credRepintar === 'function') credRepintar();
}

function recAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function () { hacer(el); });
}

// Los números entran como la gente los escribe: "1.200.000" o "1200000".
//
// A PROPÓSITO NO USA leerPrecio(): son dos trabajos distintos. leerPrecio
// adivina el formato de una página web desconocida, que puede venir en
// cualquier país. Aquí la persona escribe en la convención de la app —
// el punto es de miles y la coma es el decimal, como en es-CO — y eso es lo
// mismo que muestra el campo cuando uno sale de él (formatearInputMoneda).
// Si esto usara leerPrecio, "49.99" se calcularía como 49,99 y el campo lo
// mostraría como 4.999 al salir: dos números distintos para lo mismo.
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
// src/app.js cuando la persona cambia la moneda: no basta con
// repintar, porque las frases del veredicto llevan las cifras metidas por
// dentro y quedarían en la moneda vieja.
function recRefrescar() {
  recPintarJornal();
  recPintarYo();
  if (recAhora) recRehacerLoQueSeEstaViendo();
  recPintarLibreta();
  if (typeof credRepintar === 'function') credRepintar();
}

// Los campos de dinero se comportan como en TODA la app: al enfocarlos se ven
// solo los dígitos (para poder editar sin pelear con los puntos) y al salir se
// les ponen los puntos de miles, para leerlos como en una factura.
//
// El patrón y las funciones son de src/app.js, que ya lo hacía con
// los campos de Cobrar. Se reutiliza en vez de inventar otro: así la app se
// siente igual en todas sus pantallas, que con este público es lo que más
// pesa. Se atan a mano (y no con la clase .input-money) porque varios de estos
// campos se crean después de que src/app.js ya pasó por el DOM.
function recAtarMoneda(el) {
  if (!el) return;
  if (typeof soloDigitos !== 'function' || typeof formatearInputMoneda !== 'function') return;
  el.addEventListener('focus', function () { el.value = soloDigitos(el.value); });
  el.addEventListener('blur', function () { formatearInputMoneda(el); });
}

// ----------------------------------------------------------------
// 1. Lo que usted gana
// ----------------------------------------------------------------
function recTrasGuardar(a) {
  recAjustes = a;
  recPintarYo();
  // La cuenta cambia con los datos: que el recibo se repinte solo.
  if (recAhora) recRehacerLoQueSeEstaViendo();
  recPintarLibreta();
  if (typeof credRepintar === 'function') credRepintar();
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

  // La hoja del mes: renglones, reglas y totales (src/cuaderno.js)
  if (typeof cuaPintar === 'function') cuaPintar(a);

  const cap = ahorroCapacidad(a);

  // El renglón plegado. Dice lo que la app sabe, en una frase.
  const txt = document.getElementById('ah-yo-resumen-txt');
  if (txt) {
    if (!ajustesTieneIngreso(a)) {
      txt.textContent = 'Todavía no me ha dicho cuánto gana';
    } else {
      // Lo que puede guardar no se repite: ya está grande en la cabecera.
      txt.textContent = 'Usted gana ' + recPlata(a.ingreso) + ' al mes';
    }
  }

  // La cabecera de la app: el número grande de arriba
  recPintarJornal();
}

// EL NÚMERO GRANDE DE LA CABECERA, en la vista de Ahorro.
//
// Lo llama src/app.js cada vez que se cambia de vista (es decir,
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

    // Si vino del clic derecho, el recibo se muestra SOLO: la persona ya
    // preguntó desde la tienda y no tiene que volver a pedir la respuesta
    // tocando la mula de Ahorro.
    recAbrirAhorroDeUna();
  });
}

// Deja la vista de Ahorro al frente y su panel abierto, con el recibo a la
// vista. Las dos funciones son de src/app.js (que ya cargó antes
// que este archivo); se llaman sueltas y no activarMula() a propósito, porque
// esa alterna --- si el panel ya estaba abierto, lo cerraría.
function recAbrirAhorroDeUna() {
  if (typeof cambiarVista === 'function') {
    cambiarVista('metas', document.querySelector('.estrella[data-view="metas"]'));
  }
  if (typeof ponerPanel === 'function') ponerPanel('metas', true);
  recIrAlRecibo();
}

// ----------------------------------------------------------------
// 3. Calcular y pintar el recibo
// ----------------------------------------------------------------
function recHacerLaCuenta() {
  const campo = document.getElementById('ah-precio');
  if (!recNumero(campo ? campo.value : 0)) {
    recAvisar('Escríbame cuánto cuesta, mijo.');
    if (campo) campo.focus();
    return;
  }
  recCalcularDeLaPregunta();
  recIrAlRecibo();
}

function recPreguntaCambio() {
  if (recViendo && recViendo.tipo === 'nuevo') recCalcularDeLaPregunta();
}

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
  document.body.classList.remove('rec-hoja-abierta');
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

  // Los desplegables se cierran cuando el recibo APARECE, no en cada
  // repintado: si la persona abrio los plazos y despues corrigio un gasto, el
  // recibo se rehace y seria muy molesto que se le cerraran en la cara.
  const apareceAhora = caja.classList.contains('oculto');
  if (apareceAhora) {
    ['rec-aviso', 'rec-plazos'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('cerrado');
      recMarcarPlegable(id, false);
    });
  }

  // Un recibo a la vez: si estaba abierto el de un crédito, se va.
  if (typeof credEsconder === 'function') credEsconder();
  caja.classList.remove('oculto');
  // Siempre se muestra por adelante: nadie quiere volver a un recibo volteado.
  caja.classList.remove('volteado');
  document.body.classList.remove('rec-hoja-abierta');

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
    recTexto('rec-aviso-txt', c.avisoPrellenado);
    aviso.classList.toggle('oculto', !c.avisoPrellenado);
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
  recPintarConsejo(c.veredicto.caso);

  // --- Los botones de guardar: solo si esto todavía no está apuntado ---
  const guardar = document.getElementById('rec-guardar');
  const grupos = document.getElementById('rec-grupos');
  if (guardar) guardar.classList.toggle('oculto', recViendo.tipo !== 'nuevo');
  const quitar = document.getElementById('rec-quitar');
  if (quitar) quitar.classList.toggle('oculto', recViendo.tipo !== 'suelto');
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

  // El porque solo se pinta si hay algo que decir. Cuando la respuesta ya
  // quedo dicha arriba ("lo tendra en 5 meses"), repetirla aqui solo alarga el
  // recibo.
  if (v.porque) {
    const porque = document.createElement('span');
    porque.className = 'rec-v-porque';
    porque.textContent = v.porque;
    dice.appendChild(porque);
  }

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

// ----------------------------------------------------------------
// El Consejo Arriero
// ----------------------------------------------------------------
//
// Las frases NO viven aquí: viven en data/consejos.json y en
// data/consejos_masivos.json, que se pueden ampliar sin tocar código. Los dos
// archivos se juntan en una sola bolsa por color y de ahí se saca una al azar.
//
// EL COLOR NUNCA SE MEZCLA: solo se sortea entre las frases de ESE color.
//   verde     le alcanza y sin apretarse
//   amarillo  le alcanza, pero se come la reserva
//   rojo      se pasa de lo que tiene: mejor no
//   negro     no puede juntar nada, lo más extremo
const REC_COLOR_DEL_CASO = {
  alcanza: 'verde',
  colchon: 'amarillo',
  lento: 'rojo',
  'no-alcanza': 'negro'
};

const REC_ARCHIVOS_CONSEJOS = ['data/consejos.json', 'data/consejos_masivos.json'];

// La bolsa cargada: { verde: [...], amarillo: [...], rojo: [...], negro: [...] }
let recConsejos = null;
let recConsejoClave = null;    // qué recibo + color tiene la frase que está puesta
let recConsejoTimer = null;    // el tecleo en curso
const REC_MS_POR_LETRA = 18;   // el consejo es largo, va más rápido que el refrán

// Red de seguridad: si los JSON no cargan, el recibo no se queda mudo.
const REC_CONSEJO_DE_EMERGENCIA = {
  verde: 'El que guarda siempre tiene, mijo. Pero el que guarda con fecha, llega.',
  amarillo: 'La reserva es para la tormenta, no para el antojo. Piénselo dos veces.',
  rojo: 'No cargue la mula con todo de una. De a bulto se llega igual, y sin lastimarla.',
  negro: 'Antes de cargar la mula hay que darle de comer. Primero cuadre el mes.'
};

function recCargarConsejos() {
  const ruta = function (r) {
    return (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL(r) : r;
  };
  Promise.all(REC_ARCHIVOS_CONSEJOS.map(function (r) {
    return fetch(ruta(r)).then(function (res) { return res.json(); })
                         .catch(function () { return null; });
  })).then(function (archivos) {
    const bolsa = { verde: [], amarillo: [], rojo: [], negro: [] };
    archivos.forEach(function (data) {
      const grupo = recColoresDe(data);
      if (!grupo) return;
      Object.keys(bolsa).forEach(function (color) {
        if (Array.isArray(grupo[color])) bolsa[color] = bolsa[color].concat(grupo[color]);
      });
    });
    recConsejos = bolsa;
    // Si el recibo ya estaba pintado con la frase de emergencia, se cambia por
    // una de verdad ahora que sí hay de dónde escoger.
    if (recAhora && recAhora.veredicto) {
      recConsejoClave = null;
      recPintarConsejo(recAhora.veredicto.caso);
    }
  });
}

// Saca el objeto de colores del JSON sin depender de cómo se llame la llave de
// arriba ("frases_calidad_refinadas", "frases_version_mijo_completa"...): así
// se pueden pegar más archivos sin venir a cambiar nombres aquí.
function recColoresDe(data) {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data.verde)) return data;
  const llaves = Object.keys(data);
  for (let i = 0; i < llaves.length; i++) {
    const v = data[llaves[i]];
    if (v && typeof v === 'object' && Array.isArray(v.verde)) return v;
  }
  return null;
}

function recPintarConsejo(caso) {
  const p = document.getElementById('rec-consejo-txt');
  if (!p) return;
  const color = REC_COLOR_DEL_CASO[caso] || 'verde';

  // La frase se queda QUIETA mientras la persona escribe en los campos: el
  // recibo se repinta con cada tecla y no se puede estar reescribiendo el
  // consejo debajo de sus manos. Solo cambia si cambia el color o el recibo.
  const clave = color + '|' + recConsejoDeQuien();
  if (clave === recConsejoClave) return;
  recConsejoClave = clave;

  recEscribirConsejo(p, '“' + recConsejoDe(color) + '”');
}

function recConsejoDeQuien() {
  if (!recViendo) return 'nada';
  return recViendo.tipo + ':' + (recViendo.id || recViendo.grupo ||
    (recAhora && (recAhora.nombre || recAhora.grupo)) || '');
}

function recConsejoDe(color) {
  const lista = (recConsejos && recConsejos[color]) || [];
  if (lista.length === 0) return REC_CONSEJO_DE_EMERGENCIA[color];
  return lista[Math.floor(Math.random() * lista.length)];
}

// Se escribe letra por letra, como el refrán de la portada (src/refranes.js):
// la app CONTESTA, no despliega un cartel.
function recEscribirConsejo(p, frase) {
  if (recConsejoTimer) clearInterval(recConsejoTimer);   // corta un tecleo previo

  const caja = p.closest('.rec-consejo');
  if (caja) caja.classList.add('escribiendo');           // muestra el cursor

  p.textContent = '';
  let i = 0;
  recConsejoTimer = setInterval(function () {
    p.textContent += frase.charAt(i);
    i++;
    if (i >= frase.length) {
      clearInterval(recConsejoTimer);
      recConsejoTimer = null;
      if (caja) caja.classList.remove('escribiendo');
    }
  }, REC_MS_POR_LETRA);
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
        return { id: d.id, nombre: d.nombre, precio: d.precio, link: d.link || '' };
      })
    : [{ id: (recViendo && recViendo.id) || null, nombre: c.nombre,
         precio: c.precio, link: c.link || '' }];

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
    tr.appendChild(recCeldaDonde(f));

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
    tr.appendChild(document.createElement('td'));
    cuerpo.appendChild(tr);
  }
}

// La celda de "dónde lo vio": la tienda, y se puede tocar para volver al
// precio. No es un cuadrito blanco porque no se escribe: el link no se
// corrige a mano, viene de donde se capturó.
function recCeldaDonde(fila) {
  const td = document.createElement('td');
  td.className = 'rec-hoja-donde';
  if (fila.link) {
    const a = document.createElement('a');
    a.href = fila.link;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.title = fila.link;
    a.textContent = recDominio(fila.link);
    td.appendChild(a);
  } else {
    td.className += ' rec-hoja-sin';
    td.textContent = 'a mano';
  }
  return td;
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
  // El nombre completo, para el que no cabe en la columna.
  if (campo === 'nombre' && input.value) input.title = input.value;
  if (campo === 'precio') recAtarMoneda(input);

  input.addEventListener('change', function () {
    const valor = campo === 'precio' ? recNumero(input.value) : input.value.trim();
    if (campo === 'nombre') input.title = valor;
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

// Abre y cierra un desplegable del recibo. Los dos ("ojo con esta cuenta" y
// "y si lo quiero en...") arrancan cerrados para que el recibo quepa de un
// golpe de vista; el titulo se queda visible, que es lo que no se puede
// perder.
// Convencion: el titulo de un desplegable lleva el id de la caja mas "-tit"
// (rec-aviso / rec-aviso-tit). Se busca por id y no por clase porque asi no
// depende de como este armado el HTML por dentro.
function recPlegar(id) {
  const caja = document.getElementById(id);
  if (!caja) return;
  const cerrado = caja.classList.toggle('cerrado');
  recMarcarPlegable(id, !cerrado);
}

function recMarcarPlegable(id, abierto) {
  const btn = document.getElementById(id + '-tit');
  if (btn) btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
}

function recVoltear() {
  const caja = document.getElementById('ah-recibo');
  if (!caja) return;
  recPonerVolteado(caja, !caja.classList.contains('volteado'));
}

// Voltear no es solo girar el papel: la hoja de correcciones necesita ancho
// (nombre, precio y de dónde salió no caben en el ancho de un recibo), así
// que mientras está volteado la VENTANA ENTERA se ensancha -- lo hace el CSS
// al ver la clase en el <body>. Al volver, el recibo queda exactamente como
// era: un recibo normal, que es lo que la persona espera ver.
function recPonerVolteado(caja, volteado) {
  caja.classList.toggle('volteado', volteado);
  document.body.classList.toggle('rec-hoja-abierta', volteado);
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

function recAvisar(texto, accion) {
  const av = document.getElementById('ah-aviso');
  if (!av) return;
  av.textContent = texto;
  if (accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ah-aviso-btn';
    b.textContent = accion.texto;
    b.addEventListener('click', function () {
      av.classList.add('oculto');
      accion.hacer();
    });
    av.appendChild(b);
  }
  av.classList.remove('oculto');
  if (recAvisoTimer) clearTimeout(recAvisoTimer);
  recAvisoTimer = setTimeout(function () { av.classList.add('oculto'); },
    accion ? 7000 : 4000);
}

// ----------------------------------------------------------------
// 6. La libreta — el "Ver" del diagrama
// ----------------------------------------------------------------
//
// Cada renglón responde solo la pregunta que la persona trae: ¿cuándo me
// alcanza? Antes había que tocar la cosa y leer el recibo para saberlo; ahora
// se lee de un vistazo, y el recibo queda para el que quiera el detalle.
//
// No hay equis de borrar en el renglón: un dedo tembloroso borraba sin querer.
// Borrar vive dentro del recibo ("Ya no lo quiero"), y con deshacer.
function recPintarLibreta() {
  const cont = document.getElementById('ah-libreta-lista');
  const cuenta = document.getElementById('ah-libreta-cuenta');
  if (!cont) return;

  const creditos = typeof dbTodosLosCreditos === 'function'
    ? dbTodosLosCreditos() : Promise.resolve([]);

  Promise.all([dbTodosLosItems(), dbGrupos(), creditos]).then(function (r) {
    const items = r[0];
    const grupos = r[1].slice();
    const deudas = r[2] || [];
    const sueltos = items.filter(function (i) { return i.grupo === '(suelto)'; });
    const a = recAjustes || ajustesVacios();
    const conIngreso = ajustesTieneIngreso(a);

    const total = items.length + deudas.length;
    if (cuenta) {
      cuenta.textContent = total ? String(total) : '';
      cuenta.classList.toggle('oculto', !total);
      cuenta.title = total + (total === 1 ? ' cosa' : ' cosas');
    }

    cont.innerHTML = '';

    // Las deudas van de primeras: una cuota que se vence pesa más que algo
    // que se quiere comprar (src/credito.js).
    if (typeof credPintarEnLibreta === 'function') credPintarEnLibreta(cont, deudas);

    if (!items.length && deudas.length) return;
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'ah-guia';
      p.textContent = 'Todavía no ha apuntado nada, mijo. Escriba un precio ' +
                      'arriba, o señale uno en cualquier página con el clic derecho.';
      cont.appendChild(p);
      return;
    }

    // Lo que alcanza primero va arriba: la libreta es una fila de espera.
    grupos.sort(function (x, y) { return x.total - y.total; });
    sueltos.sort(function (x, y) { return x.precio - y.precio; });

    if (grupos.length) {
      cont.appendChild(recLibTitulo('Grupos'));
      grupos.forEach(function (g) {
        const b = recLibRenglon({
          grupo: true,
          nombre: g.nombre,
          sub: g.cuantos + (g.cuantos === 1 ? ' cosa' : ' cosas'),
          precio: g.total,
          plazo: conIngreso ? recLibPlazo(g.total, a) : null
        });
        b.addEventListener('click', function () { recVerGrupo(g.nombre); });
        cont.appendChild(b);
      });
    }

    if (sueltos.length) {
      if (grupos.length || deudas.length) cont.appendChild(recLibTitulo('Sueltas'));
      sueltos.forEach(function (it) {
        const b = recLibRenglon({
          nombre: recNombreCorto(it.nombre) || '(sin nombre)',
          sub: recTienda(it.link),
          precio: it.precio,
          plazo: conIngreso ? recLibPlazo(it.precio, a) : null
        });
        b.title = it.nombre || '';
        b.addEventListener('click', function () { recVerItem(it.id); });
        cont.appendChild(b);
      });
    }
  }).catch(function (e) {
    cont.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'ah-guia';
    p.textContent = 'No pude abrir la libreta: ' + e.message;
    cont.appendChild(p);
  });
}

function recLibTitulo(texto) {
  const h = document.createElement('p');
  h.className = 'ah-lib-seccion';
  h.textContent = texto;
  return h;
}

// d = { grupo?, nombre, sub, precio, plazo: { tono, texto } | null }
function recLibRenglon(d) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ah-lib-item' + (d.grupo ? ' ah-lib-grupo' : '');

  if (d.grupo) {
    const ico = document.createElement('span');
    ico.className = 'ah-lib-ico';
    ico.setAttribute('aria-hidden', 'true');
    b.appendChild(ico);
  }

  const izq = document.createElement('span');
  izq.className = 'ah-lib-izq';

  const nom = document.createElement('span');
  nom.className = 'ah-lib-nombre';
  nom.textContent = d.nombre;
  izq.appendChild(nom);

  if (d.sub) {
    const sub = document.createElement('span');
    sub.className = 'ah-lib-sub';
    sub.textContent = d.sub;
    izq.appendChild(sub);
  }
  b.appendChild(izq);

  const der = document.createElement('span');
  der.className = 'ah-lib-der';

  const plata = document.createElement('span');
  plata.className = 'ah-lib-plata';
  plata.textContent = recPlata(d.precio);
  der.appendChild(plata);

  if (d.plazo) {
    const pz = document.createElement('span');
    pz.className = 'ah-lib-plazo ah-lib-plazo-' + d.plazo.tono;
    pz.textContent = d.plazo.texto;
    der.appendChild(pz);
  }
  b.appendChild(der);

  const ir = document.createElement('span');
  ir.className = 'ah-lib-ir';
  ir.setAttribute('aria-hidden', 'true');
  ir.textContent = '›';
  b.appendChild(ir);

  return b;
}

// La respuesta corta, en la misma voz del recibo.
function recLibPlazo(precio, ajustes) {
  const v = ahorroCuentaUnitaria({ precio: precio }, ajustes);
  const c = v.cuando;
  if (c.yaLoTiene) return { tono: 'bien', texto: 'Ya lo puede comprar' };
  if (!c.alcanzable) return { tono: 'no', texto: 'Todavía no alcanza' };
  const dicho = ahorroPlazoEnPalabras(c.meses);
  return {
    tono: v.veredicto.caso === 'lento' ? 'lento' : 'bien',
    texto: dicho.charAt(0).toUpperCase() + dicho.slice(1)
  };
}

// Los nombres que vienen de una tienda traen de todo: "Amazon.com: MARCA -
// Reloj automático para hombre, correa de cuero, 42 mm...". En la libreta se
// muestra hasta la primera coma y sin el nombre de la tienda. Lo guardado no
// se toca: el recibo y la hoja siguen con el nombre entero.
const REC_TIENDAS = /amazon|mercado ?libre|falabella|[eé]xito|alkosto|ktronix|temu|shein|aliexpress|walmart|ebay/i;

function recNombreCorto(nombre) {
  let n = String(nombre || '').trim();
  n = n.replace(/^[\w-]+(\.[\w-]+)+\s*:\s*/, '');
  n = n.split(/\s+[|:–—-]\s+/).filter(function (parte) {
    return !REC_TIENDAS.test(parte) || parte.split(/\s+/).length > 3;
  }).join(' - ');
  return n.split(',')[0].trim();
}

function recTienda(link) {
  if (!link) return '';
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    const m = host.match(REC_TIENDAS);
    if (!m) return host;
    const t = m[0].toLowerCase().replace(/\s/g, '');
    if (t === 'mercadolibre') return 'Mercado Libre';
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch (e) { return ''; }
}

// "Ya no lo quiero": se borra, y por unos segundos se puede echar para atrás.
function recQuitarDeLaLibreta() {
  if (!recViendo || recViendo.tipo !== 'suelto') return;
  const id = recViendo.id;
  dbItem(id).then(function (it) {
    if (!it) return;
    return dbBorrarItem(id).then(function () {
      recEsconderRecibo();
      recViendo = null;
      recAhora = null;
      recPintarLibreta();
      recAvisar('Lo quité de la libreta.', {
        texto: 'Deshacer',
        hacer: function () {
          dbGuardarItem(it).then(function () {
            recAvisar('Listo, volvió a la libreta.');
            recPintarLibreta();
          });
        }
      });
    });
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
