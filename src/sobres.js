// =================================================================
// sobres.js — "Los sobres del arriero": ¿cuánto dinero me queda?
//
// La costumbre de toda la vida: la plata que uno recibe se reparte en sobres y
// cada gasto sale de su sobre. Aquí se hace con el gesto más rápido que existe,
// el de una calculadora de siempre:
//
//     escribo el número  ->  toco el sobre  ->  listo
//
// Ni formularios, ni presupuestos que llenar, ni nada que aprender. Con solo
// apuntar ya queda respondido lo único que la persona vino a preguntar:
//   • ¿Cuánto dinero me queda?
//   • ¿En qué se me está yendo más?
//   • ¿Me alcanza para llegar al próximo pago?
//
// CÓMO SE GUARDA (dos piezas, a propósito):
//   · sobresCiclo = el ciclo de pago en curso: cuánto recibió, cada cuánto le
//     pagan, cuándo arrancó y el TOTAL de cada sobre. Ocupa poquito y es la
//     VERDAD de los números: aunque la cinta se llene y bote los renglones más
//     viejos, los totales siguen cuadrando.
//   · la cinta (calculadora.js) = el detalle, renglón por renglón. Cada gasto
//     queda apuntado con su sobre, así la ✕ de la cinta puede devolverle la
//     plata al sobre del que salió.
//
// El ciclo NO se reinicia solo: lo reinicia la persona con el botón grande
// "Recibí mi pago". Es su plata, ella sabe cuándo le llegó.
// =================================================================

// Los sobres. Pocos y con dibujito, para reconocerlos sin leer.
// `aparte: true` = el Ahorro, que no es un gasto sino plata que se guarda: en la
// rejilla ocupa dos casillas, va acostado y en verde, para que se vea distinto.
const SOBRES = [
  { clave: 'hogar',      ico: '🏠', nombre: 'Hogar',        color: '#7A4A22' },
  { clave: 'comida',     ico: '🍽️', nombre: 'Alimentación', color: '#2E7D40' },
  { clave: 'transporte', ico: '🚗', nombre: 'Transporte',   color: '#1D6F8B' },
  { clave: 'deudas',     ico: '💳', nombre: 'Deudas',       color: '#C0392B' },
  { clave: 'personales', ico: '🛍️', nombre: 'Personales',   color: '#8E5BA6' },
  { clave: 'ocio',       ico: '🎉', nombre: 'Ocio',         color: '#E8742C' },
  { clave: 'ahorro',     ico: '📈', nombre: 'Ahorro',       color: '#E0991C', aparte: true }
];

// Cada cuánto le pagan. `dias` es el largo del ciclo, que es lo que permite
// decir "le faltan 9 días" y "puede gastar ~88.000 por día".
const SOBRES_FREC = {
  semanal:   { dias: 7,  rotulo: 'Cada semana' },
  quincenal: { dias: 15, rotulo: 'Cada quincena' },
  mensual:   { dias: 30, rotulo: 'Cada mes' }
};

const SOBRES_CICLO_KEY = 'sobresCiclo';
const SOBRES_HIST_KEY  = 'sobresHistorial';
const SOBRES_HIST_MAX  = 6;          // guardamos los últimos ciclos, no la vida entera

let sobresCiclo = sobresCicloVacio();
let sobresHistorial = [];
let sobresUltimo = null;             // lo último apuntado, para el "deshacer"
let sobresAvisoTimer = null;

// ----------------------------------------------------------------
// Arranque
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  sobresConstruirRejilla();

  // Los dos datos de la persona se guardan al vuelo mientras escribe, como en
  // el resto de la app: no hay botón de "guardar" que se pueda olvidar.
  const inIngreso = document.getElementById('sob-ingreso');
  if (inIngreso) {
    inIngreso.addEventListener('input', function () {
      sobresCiclo.ingreso = valorNumerico('sob-ingreso');
      if (!sobresCiclo.inicio) sobresCiclo.inicio = sobresHoyISO();
      sobresGuardarCiclo();
      sobresPintar();
    });
    inIngreso.addEventListener('focus', function () { inIngreso.value = soloDigitos(inIngreso.value); });
    inIngreso.addEventListener('blur', function () {
      if (typeof formatearInputMoneda === 'function') formatearInputMoneda(inIngreso);
    });
  }

  const selFrec = document.getElementById('sob-frecuencia');
  if (selFrec) {
    selFrec.addEventListener('change', function () {
      sobresCiclo.frecuencia = SOBRES_FREC[selFrec.value] ? selFrec.value : 'mensual';
      sobresGuardarCiclo();
      sobresPintar();
    });
  }

  // Abrir/cerrar el cuadrito de "mi plata"
  const btnEditar = document.getElementById('sob-editar');
  if (btnEditar) btnEditar.addEventListener('click', sobresToggleConfig);

  const btnPago = document.getElementById('sob-btn-pago');
  if (btnPago) btnPago.addEventListener('click', sobresNuevoPago);

  // El mismo botón, pero el que sale solito en el marcador cuando ya llegó el día
  const btnPagoYa = document.getElementById('sob-btn-pago-ya');
  if (btnPagoYa) btnPagoYa.addEventListener('click', sobresNuevoPago);

  sobresCargar();
});

// ----------------------------------------------------------------
// Persistencia (comparte el almacén con la calculadora: ver calcAlmacen())
// ----------------------------------------------------------------
function sobresCicloVacio() {
  return {
    ingreso: 0,
    frecuencia: 'mensual',
    inicio: null,                    // 'YYYY-MM-DD': cuándo arrancó este ciclo
    totales: sobresTotalesEnCero()
  };
}

function sobresTotalesEnCero() {
  const t = {};
  SOBRES.forEach(function (s) { t[s.clave] = 0; });
  return t;
}

function sobresCargar() {
  const almacen = (typeof calcAlmacen === 'function') ? calcAlmacen() : null;
  if (!almacen) { sobresPintar(); return; }

  almacen.get([SOBRES_CICLO_KEY, SOBRES_HIST_KEY], function (data) {
    const guardado = (data && data[SOBRES_CICLO_KEY]) || null;
    if (guardado) {
      sobresCiclo = {
        ingreso: guardado.ingreso || 0,
        frecuencia: SOBRES_FREC[guardado.frecuencia] ? guardado.frecuencia : 'mensual',
        inicio: guardado.inicio || null,
        // Object.assign sobre los ceros: si mañana agregamos un sobre nuevo, los
        // datos viejos siguen sirviendo y el sobre nuevo arranca en cero.
        totales: Object.assign(sobresTotalesEnCero(), guardado.totales || {})
      };
    }
    sobresHistorial = (data && data[SOBRES_HIST_KEY]) || [];
    sobresPintarConfig();
    sobresPintar();
  });
}

function sobresGuardarCiclo() {
  const almacen = (typeof calcAlmacen === 'function') ? calcAlmacen() : null;
  if (!almacen) return;
  const datos = {};
  datos[SOBRES_CICLO_KEY] = sobresCiclo;
  almacen.set(datos);
}

function sobresGuardarHistorial() {
  const almacen = (typeof calcAlmacen === 'function') ? calcAlmacen() : null;
  if (!almacen) return;
  const datos = {};
  datos[SOBRES_HIST_KEY] = sobresHistorial;
  almacen.set(datos);
}

// ----------------------------------------------------------------
// Cuentas del ciclo
// ----------------------------------------------------------------
function sobresHoyISO() {
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return f.getFullYear() + '-' + mes + '-' + dia;
}

// Días corridos desde una fecha ISO hasta hoy (0 si es hoy mismo).
function sobresDiasDesde(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaISO + 'T00:00:00');
  return Math.max(0, Math.round((hoy - f) / 86400000));
}

// Todo lo que ha salido de los sobres en este ciclo.
function sobresGastado() {
  return SOBRES.reduce(function (suma, s) {
    return suma + (sobresCiclo.totales[s.clave] || 0);
  }, 0);
}

// El largo del ciclo, los días que ya pasaron y los que faltan para el pago.
function sobresDias() {
  const largo = (SOBRES_FREC[sobresCiclo.frecuencia] || SOBRES_FREC.mensual).dias;
  const pasados = sobresCiclo.inicio ? sobresDiasDesde(sobresCiclo.inicio) : 0;
  return { largo: largo, pasados: pasados, restan: Math.max(0, largo - pasados) };
}

// El sobre por donde más se le va la plata (null si todavía no ha apuntado).
function sobresLider() {
  let lider = null;
  SOBRES.forEach(function (s) {
    const v = sobresCiclo.totales[s.clave] || 0;
    if (v > 0 && (!lider || v > (sobresCiclo.totales[lider.clave] || 0))) lider = s;
  });
  return lider;
}

// Datos de un sobre por su clave. La usa la cinta para pintar el dibujito.
function sobresInfo(clave) {
  return SOBRES.find(function (s) { return s.clave === clave; }) || null;
}

// Número sin símbolo de moneda, para los cuadritos de los sobres (donde el
// espacio es contado). El símbolo ya se ve grande en el marcador de arriba.
function sobresNum(valor) {
  return Math.round(valor || 0).toLocaleString('es-CO');
}

function sobresPlata(valor) {
  return (typeof formatearDinero === 'function')
    ? formatearDinero(valor || 0)
    : '$' + sobresNum(valor);
}

// ----------------------------------------------------------------
// LA ACCIÓN PRINCIPAL: escribo el número y toco el sobre
// ----------------------------------------------------------------
function sobresApuntar(clave) {
  const sobre = sobresInfo(clave);
  if (!sobre) return;

  // Si dejó una cuenta a medias, la resolvemos primero: escribir 20.000 + 5.000
  // y tocar el sobre apunta 25.000. Nadie tiene que acordarse del "=".
  if (typeof calcResolverPendiente === 'function') calcResolverPendiente();

  const monto = (typeof calcValorPantalla === 'function') ? calcValorPantalla() : 0;
  if (!(monto > 0)) {
    sobresAviso('Escriba primero el valor, mijo.', 'malo');
    return;
  }

  const campoNombre = document.getElementById('calc-nombre');
  const nombre = campoNombre ? campoNombre.value.trim() : '';

  // 1) El total del sobre (la verdad de los números)
  sobresCiclo.totales[clave] = (sobresCiclo.totales[clave] || 0) + monto;
  if (!sobresCiclo.inicio) sobresCiclo.inicio = sobresHoyISO();
  sobresGuardarCiclo();

  // 2) El renglón en la cinta (el detalle, para poder devolverlo)
  let idCinta = null;
  if (typeof calcCintaAgregar === 'function') {
    idCinta = calcCintaAgregar({
      operacion: (typeof calcOperacionTexto === 'function') ? calcOperacionTexto() : sobresNum(monto),
      resultado: sobresNum(monto),
      nombre: nombre,
      sobre: clave,
      monto: monto,
      fecha: sobresHoyISO()
    });
  }

  sobresUltimo = { id: idCinta, clave: clave, monto: monto };

  // 3) Dejar todo listo para el siguiente gasto: esa es la gracia de que sea
  //    una calculadora. Pantalla en cero y el nombre en blanco.
  if (typeof calcLimpiar === 'function') calcLimpiar();
  if (campoNombre) campoNombre.value = '';

  sobresPintar();
  sobresGuino(clave);
  sobresAviso('Apuntado: ' + sobresPlata(monto) + ' en ' + sobre.ico + ' ' + sobre.nombre, 'bueno', true);
}

// Devolverle la plata a un sobre. La llama la ✕ de la cinta (calculadora.js) y
// el "deshacer" del aviso.
function sobresDevolver(clave, monto) {
  if (!clave || !(monto > 0)) return;
  if (!sobresCiclo.totales) sobresCiclo.totales = sobresTotalesEnCero();
  sobresCiclo.totales[clave] = Math.max(0, (sobresCiclo.totales[clave] || 0) - monto);
  sobresGuardarCiclo();
  sobresPintar();
}

// "Deshacer" del aviso: borrar el renglón de la cinta ya devuelve la plata.
// Si el renglón ya no está (porque lo quitó a mano con la ✕ de la cinta), no
// hacemos nada: devolverlo otra vez sería regalarle plata que ya se gastó.
function sobresDeshacer() {
  if (!sobresUltimo) return;

  let hecho = false;
  if (sobresUltimo.id && typeof calcBorrarDeCinta === 'function') {
    hecho = calcBorrarDeCinta(sobresUltimo.id);   // esta ya llama a sobresDevolver()
  } else {
    sobresDevolver(sobresUltimo.clave, sobresUltimo.monto);
    hecho = true;
  }
  sobresUltimo = null;
  sobresAviso(hecho ? 'Listo, se lo devolví al sobre.' : 'Ese ya lo había quitado, mijo.',
              hecho ? 'bueno' : 'malo');
}

// ----------------------------------------------------------------
// "Recibí mi pago": cierra el ciclo y arranca uno nuevo en ceros
// ----------------------------------------------------------------
function sobresNuevoPago() {
  const ingreso = valorNumerico('sob-ingreso') || sobresCiclo.ingreso;
  if (!(ingreso > 0)) {
    sobresAbrirConfig();
    sobresAviso('Primero dígame cuánto recibió.', 'malo');
    const inIngreso = document.getElementById('sob-ingreso');
    if (inIngreso) inIngreso.focus();
    return;
  }

  // Solo preguntamos si de verdad hay algo que borrar: al primer pago del
  // usuario no tiene sentido pedirle permiso para no borrar nada.
  if (sobresGastado() > 0) {
    if (!confirm('¿Arrancamos de nuevo, mijo?\n\nLos sobres vuelven a cero y le guardo la cuenta del ciclo que terminó.')) return;
  }

  // Archivar el ciclo que termina (solo los totales: ocupa poquito)
  if (sobresCiclo.ingreso > 0 || sobresGastado() > 0) {
    sobresHistorial.unshift({
      ingreso: sobresCiclo.ingreso,
      frecuencia: sobresCiclo.frecuencia,
      inicio: sobresCiclo.inicio,
      fin: sobresHoyISO(),
      totales: Object.assign({}, sobresCiclo.totales)
    });
    if (sobresHistorial.length > SOBRES_HIST_MAX) {
      sobresHistorial = sobresHistorial.slice(0, SOBRES_HIST_MAX);
    }
    sobresGuardarHistorial();
  }

  const frecuencia = sobresCiclo.frecuencia;
  sobresCiclo = {
    ingreso: ingreso,
    frecuencia: frecuencia,
    inicio: sobresHoyISO(),
    totales: sobresTotalesEnCero()
  };
  sobresGuardarCiclo();
  sobresUltimo = null;

  sobresCerrarConfig();
  sobresPintarConfig();
  sobresPintar();
  sobresAviso('¡Buen día de pago! Los sobres están en cero.', 'bueno');
}

// ----------------------------------------------------------------
// El cuadrito de "mi plata" (se abre con el ✎)
// ----------------------------------------------------------------
function sobresConfigAbierta() {
  const c = document.getElementById('sob-config');
  return !!(c && !c.classList.contains('oculto'));
}

function sobresToggleConfig() {
  if (sobresConfigAbierta()) sobresCerrarConfig();
  else sobresAbrirConfig();
}

function sobresAbrirConfig() {
  const c = document.getElementById('sob-config');
  const b = document.getElementById('sob-editar');
  if (c) c.classList.remove('oculto');
  if (b) b.setAttribute('aria-expanded', 'true');
}

function sobresCerrarConfig() {
  const c = document.getElementById('sob-config');
  const b = document.getElementById('sob-editar');
  if (c) c.classList.add('oculto');
  if (b) b.setAttribute('aria-expanded', 'false');
}

// Llena los dos campos del cuadrito con lo que hay guardado.
function sobresPintarConfig() {
  const inIngreso = document.getElementById('sob-ingreso');
  if (inIngreso && inIngreso !== document.activeElement) {
    inIngreso.value = sobresCiclo.ingreso ? sobresNum(sobresCiclo.ingreso) : '';
  }
  const selFrec = document.getElementById('sob-frecuencia');
  if (selFrec) selFrec.value = sobresCiclo.frecuencia;
}

// ----------------------------------------------------------------
// Pintar: el marcador de arriba y los cuadritos de los sobres
// ----------------------------------------------------------------
function sobresPintar() {
  sobresPintarMarcador();
  sobresPintarValores();
}

function sobresPintarMarcador() {
  const ingreso = sobresCiclo.ingreso;
  const gastado = sobresGastado();
  const queda = ingreso - gastado;
  const dias = sobresDias();

  // El número grande. Sin ingreso todavía no hay "me queda": mostramos lo
  // gastado, que igual ya sirve para ver en qué se le va la plata. Y el primer
  // día, cuando no hay ni lo uno ni lo otro, no le decimos "he gastado $0":
  // le decimos "mi plata" y la frase de abajo lo invita a empezar.
  const rot = document.getElementById('sob-rot');
  const num = document.getElementById('sob-queda');
  if (rot) {
    rot.textContent = ingreso > 0 ? 'Me queda' : (gastado > 0 ? 'He gastado' : 'Mi plata');
  }
  if (num) {
    num.textContent = sobresPlata(ingreso > 0 ? Math.max(0, queda) : gastado);
    num.classList.toggle('en-rojo', ingreso > 0 && queda <= 0);
  }

  // La barra se vacía como el tanque de gasolina: llena = tiene toda su plata.
  const barra = document.getElementById('sob-barra');
  const relleno = document.getElementById('sob-barra-relleno');
  if (barra) barra.classList.toggle('oculto', ingreso <= 0);
  if (relleno && ingreso > 0) {
    const pct = Math.max(0, Math.min(100, (queda / ingreso) * 100));
    relleno.style.width = pct.toFixed(0) + '%';
    relleno.className = 'sob-barra-relleno' +
      (pct <= 15 ? ' nivel-bajo' : pct <= 40 ? ' nivel-medio' : ' nivel-alto');
  }

  // Los dos datos que contestan "¿me alcanza para llegar al próximo pago?"
  const elDias = document.getElementById('sob-dias');
  const elPorDia = document.getElementById('sob-pordia');
  if (elDias) {
    if (ingreso <= 0) elDias.textContent = '';
    else if (dias.restan === 0) elDias.textContent = 'Ya es día de pago';
    else elDias.textContent = 'Faltan ' + dias.restan + (dias.restan === 1 ? ' día' : ' días') + ' de pago';
  }
  if (elPorDia) {
    const puede = (ingreso > 0 && queda > 0 && dias.restan > 0) ? queda / dias.restan : 0;
    elPorDia.textContent = puede > 0 ? 'Puede gastar ' + sobresPlata(puede) + ' al día' : '';
  }

  // La frase del arriero: la lectura en palabras, no en números.
  const frase = document.getElementById('sob-frase');
  if (frase) {
    const lectura = sobresLectura(ingreso, queda, dias);
    frase.textContent = lectura.texto;
    frase.className = 'sob-frase ' + lectura.tono;
  }

  // Dónde más se le va. En palabras, aunque abajo ya se vea en la barrita más
  // larga y en la estrellita del cuadrito: para este público la frase manda.
  const elLider = document.getElementById('sob-lider');
  if (elLider) {
    const lider = sobresLider();
    elLider.textContent = lider ? 'Más se le va en: ' + lider.ico + ' ' + lider.nombre : '';
    elLider.classList.toggle('oculto', !lider);
  }

  // El botón de "recibí mi pago" se asoma solo cuando ya llegó el día
  const btnYa = document.getElementById('sob-btn-pago-ya');
  if (btnYa) btnYa.classList.toggle('oculto', !(ingreso > 0 && dias.restan === 0));

  // Cómo le fue el ciclo pasado (un solo renglón, sin abrumar)
  const elAntes = document.getElementById('sob-antes');
  if (elAntes) {
    const previo = sobresHistorial[0];
    if (previo) {
      const gastoPrevio = SOBRES.reduce(function (s, x) { return s + (previo.totales[x.clave] || 0); }, 0);
      elAntes.textContent = 'El ciclo pasado gastó ' + sobresPlata(gastoPrevio);
      elAntes.classList.remove('oculto');
    } else {
      elAntes.textContent = '';
      elAntes.classList.add('oculto');
    }
  }
}

// La frase en palabras. Compara lo que le queda con lo que "debería" quedarle
// si gastara parejito durante todo el ciclo.
function sobresLectura(ingreso, queda, dias) {
  if (ingreso <= 0) {
    return { texto: 'Dígame cuánto recibió y le digo cuánto le queda.', tono: 'tono-neutro' };
  }
  if (queda <= 0) {
    return { texto: 'Ojo, mijo: ya se gastó todo lo que recibió.', tono: 'tono-malo' };
  }
  if (dias.restan === 0) {
    return { texto: 'Se acabó el ciclo y le sobró plata. ¡Bien hecho!', tono: 'tono-bueno' };
  }
  const esperado = ingreso * (dias.restan / dias.largo);
  if (queda >= esperado * 1.15) return { texto: 'Va bien, mijo: le está rindiendo.', tono: 'tono-bueno' };
  if (queda >= esperado * 0.9)  return { texto: 'Va parejo, ni rápido ni lento.', tono: 'tono-neutro' };
  return { texto: 'Va gastando más rápido de lo que le entra.', tono: 'tono-malo' };
}

// Los cuadritos se arman UNA vez (así las animaciones no se pierden al
// repintar) y después solo se les cambian los números.
function sobresConstruirRejilla() {
  const rejilla = document.getElementById('sob-rejilla');
  if (!rejilla) return;
  rejilla.innerHTML = '';

  SOBRES.forEach(function (s) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sob-sobre' + (s.aparte ? ' sob-sobre-ahorro' : '');
    b.dataset.sobre = s.clave;
    b.style.setProperty('--sob-color', s.color);
    b.title = s.aparte
      ? 'Guardar lo de la pantalla en el sobre del ahorro'
      : 'Apuntar lo de la pantalla en ' + s.nombre;
    b.setAttribute('aria-label', 'Apuntar en ' + s.nombre);

    const ico = document.createElement('span');
    ico.className = 'sob-ico';
    ico.textContent = s.ico;
    ico.setAttribute('aria-hidden', 'true');
    b.appendChild(ico);

    const centro = document.createElement('span');
    centro.className = 'sob-centro';

    const nom = document.createElement('span');
    nom.className = 'sob-nom';
    nom.textContent = s.nombre;
    centro.appendChild(nom);

    const val = document.createElement('span');
    val.className = 'sob-val';
    val.textContent = '0';
    centro.appendChild(val);

    b.appendChild(centro);

    // Barrita proporcional: de un vistazo se ve cuál sobre es el más gordo.
    const mini = document.createElement('span');
    mini.className = 'sob-mini';
    const relleno = document.createElement('i');
    mini.appendChild(relleno);
    b.appendChild(mini);

    b.addEventListener('click', function () { sobresApuntar(s.clave); });
    rejilla.appendChild(b);
  });
}

function sobresPintarValores() {
  // El más gordo manda: las barritas se miden contra él.
  let mayor = 0;
  SOBRES.forEach(function (s) {
    mayor = Math.max(mayor, sobresCiclo.totales[s.clave] || 0);
  });
  const lider = sobresLider();

  SOBRES.forEach(function (s) {
    const b = document.querySelector('.sob-sobre[data-sobre="' + s.clave + '"]');
    if (!b) return;
    const valor = sobresCiclo.totales[s.clave] || 0;

    const val = b.querySelector('.sob-val');
    if (val) val.textContent = sobresNum(valor);

    const relleno = b.querySelector('.sob-mini i');
    if (relleno) relleno.style.width = mayor > 0 ? ((valor / mayor) * 100).toFixed(0) + '%' : '0%';

    b.classList.toggle('vacio', valor <= 0);
    b.classList.toggle('lider', !!lider && lider.clave === s.clave && valor > 0);
  });
}

// Guiño verde en el sobre que acaba de recibir plata.
function sobresGuino(clave) {
  const b = document.querySelector('.sob-sobre[data-sobre="' + clave + '"]');
  if (!b) return;
  b.classList.remove('recien');
  // Reiniciar la animación: leer offsetWidth fuerza al navegador a recalcular.
  void b.offsetWidth;
  b.classList.add('recien');
  setTimeout(function () { b.classList.remove('recien'); }, 900);
}

// Renglón de confirmación bajo los sobres. Con `conDeshacer` sale el botoncito
// de arrepentirse, que es lo que da confianza para apuntar rápido.
function sobresAviso(texto, tono, conDeshacer) {
  const caja = document.getElementById('sob-aviso');
  if (!caja) return;

  caja.innerHTML = '';
  caja.className = 'sob-aviso ' + (tono === 'malo' ? 'tono-malo' : 'tono-bueno');

  const t = document.createElement('span');
  t.className = 'sob-aviso-txt';
  t.textContent = texto;
  caja.appendChild(t);

  if (conDeshacer) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sob-aviso-deshacer';
    btn.textContent = '↶ deshacer';
    btn.addEventListener('click', sobresDeshacer);
    caja.appendChild(btn);
  }

  // Los sobres son lo último de la ventana: si el aviso nace justo debajo del
  // filo, que se asome él solito (sobre todo por el "deshacer").
  if (caja.scrollIntoView) caja.scrollIntoView({ block: 'nearest' });

  if (sobresAvisoTimer) clearTimeout(sobresAvisoTimer);
  sobresAvisoTimer = setTimeout(function () {
    caja.innerHTML = '';
    caja.className = 'sob-aviso oculto';
  }, conDeshacer ? 7000 : 3500);
}
