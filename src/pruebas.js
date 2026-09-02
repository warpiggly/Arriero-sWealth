// =================================================================
// pruebas.js — La ventanita de pruebas (Fases 2 y 3)
//
// ESTO SE BOTA EN LA FASE 4. Es fea a propósito y no es para nadie más que
// para David. Las fases 2 y 3 son invisibles: la plomería pasa por debajo y
// las cuentas salen en números pelados, sin recibo y sin colores — porque el
// plan dice, con razón, que no se junta "hacer las cuentas" con "ponerle la
// cara" (recomendación 9). Sin esta ventanita, la única forma de supervisar
// esas dos fases sería abrirle las tripas al navegador.
//
// Lo que deja revisar:
//   FASE 2 · que la libreta (IndexedDB) guarda y recuerda
//          · que el clic derecho se quedó con el precio, el link y el título
//          · que lo de la persona se guarda aparte, en storage.sync
//   FASE 3 · que las cuentas dicen la verdad, con lápiz y papel al lado
//          · los cuatro veredictos, los tres plazos y "lo que le pesa"
//          · guardar al final del cálculo: suelto, en un grupo, o dejarlo así
//
// Cuando llegue el recibo (Fase 4), todo esto se bota: el archivo, su bloque
// en popup.html, sus estilos, y el <script> que lo carga.
// =================================================================

let pruebasAjustes = null;      // los últimos ajustes leídos
let pruebasCuenta = null;       // la última cuenta hecha
let pruebasCapturado = null;    // lo que trajo el clic derecho

document.addEventListener('DOMContentLoaded', function () {
  const caja = document.getElementById('pruebas');
  if (!caja) return;

  // --- Lo de la persona ---
  pruebasAtar('pruebas-ingreso', 'input', function (el) {
    ajustesGuardar({ ingreso: el.value }).then(pruebasTrasGuardar);
  });
  pruebasAtar('pruebas-frecuencia', 'change', function (el) {
    ajustesGuardar({ frecuencia: el.value }).then(pruebasTrasGuardar);
  });
  pruebasAtar('pruebas-juntado', 'input', function (el) {
    ajustesGuardar({ ahorroJuntado: el.value }).then(pruebasTrasGuardar);
  });
  pruebasAtar('pruebas-colchon-juntado', 'input', function (el) {
    ajustesGuardar({ colchonJuntado: el.value }).then(pruebasTrasGuardar);
  });
  pruebasAtar('pruebas-usa-colchon', 'change', function (el) {
    ajustesGuardar({ usaColchon: el.checked }).then(pruebasTrasGuardar);
  });

  // --- El prellenado: un campo por renglón, armados desde RENGLONES ---
  pruebasArmarPrellenado();

  // --- La cuenta ---
  pruebasAtar('pruebas-precio', 'input', pruebasRecalcular);
  pruebasAtar('pruebas-nombre', 'input', pruebasRecalcular);

  // --- Los botones ---
  pruebasAtar('pruebas-inventar', 'click', pruebasInventar);
  pruebasAtar('pruebas-refrescar', 'click', pruebasPintar);
  pruebasAtar('pruebas-borrar', 'click', pruebasBorrarTodo);
  pruebasAtar('pruebas-guardar-suelto', 'click', pruebasGuardarSuelto);
  pruebasAtar('pruebas-guardar-grupo', 'click', pruebasGuardarEnGrupo);
  pruebasAtar('pruebas-dejarlo', 'click', pruebasDejarloAsi);

  pruebasRevisarCapturado();
  pruebasPintar();
});

function pruebasAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function () { hacer(el); });
}

// ----------------------------------------------------------------
// El prellenado
// ----------------------------------------------------------------
function pruebasArmarPrellenado() {
  const cont = document.getElementById('pruebas-prellenado');
  if (!cont) return;

  cont.innerHTML = '';
  RENGLONES.forEach(function (r) {
    const fila = document.createElement('div');
    fila.className = 'pruebas-renglon';

    const rot = document.createElement('label');
    rot.className = 'pruebas-rot';
    rot.setAttribute('for', 'pre-' + r.clave);
    // Que se vea qué le hace cada renglón a la cuenta: es la mitad de lo que
    // hay que revisar en esta fase.
    rot.textContent = r.rotulo + (r.resta ? ' (−)' : ' (no resta)');
    fila.appendChild(rot);

    const campo = document.createElement('input');
    campo.type = 'text';
    campo.inputMode = 'numeric';
    campo.className = 'pruebas-campo';
    campo.id = 'pre-' + r.clave;
    campo.placeholder = '0';
    campo.addEventListener('input', function () {
      const cambio = { gastos: {} };
      cambio.gastos[r.clave] = campo.value;
      ajustesGuardar(cambio).then(pruebasTrasGuardar);
    });
    fila.appendChild(campo);

    cont.appendChild(fila);
  });
}

function pruebasTrasGuardar(a) {
  pruebasAjustes = a;
  pruebasPintarAjustes();
  pruebasRecalcular();
}

// ----------------------------------------------------------------
// Lo que trajo el clic derecho
// ----------------------------------------------------------------
function pruebasRevisarCapturado() {
  try {
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
  } catch (e) { return; }

  chrome.storage.local.get(['precioCapturado'], function (data) {
    const cap = data && data.precioCapturado;
    if (!cap) return;
    pruebasCapturado = cap;

    // Se pone en el formulario y se calcula de una: quien señaló un precio en
    // una tienda quiere su respuesta, no llenar campos.
    const precio = document.getElementById('pruebas-precio');
    const nombre = document.getElementById('pruebas-nombre');
    if (precio) precio.value = String(cap.precio || '');
    if (nombre && !nombre.value) nombre.value = cap.titulo || cap.texto || '';

    const eco = document.getElementById('pruebas-capturado');
    if (eco) {
      eco.textContent = 'del clic derecho: ' + (cap.titulo || '(sin título)') +
                        ' · ' + (cap.link || '(sin link)');
      eco.classList.remove('oculto');
    }

    // Se consume: si no, cada vez que abra el popup le vuelve a salir lo mismo.
    chrome.storage.local.remove(['precioCapturado']);
    pruebasRecalcular();
  });
}

// ----------------------------------------------------------------
// La cuenta (Fase 3)
// ----------------------------------------------------------------
function pruebasRecalcular() {
  const cont = document.getElementById('pruebas-cuenta-salida');
  if (!cont) return;

  const campoPrecio = document.getElementById('pruebas-precio');
  const campoNombre = document.getElementById('pruebas-nombre');
  const precio = campoPrecio ? parseFloat(String(campoPrecio.value).replace(/[^\d,.-]/g, '').replace(',', '.')) : 0;
  const nombre = campoNombre ? campoNombre.value : '';

  const botones = document.getElementById('pruebas-guardar-zona');

  if (!precio || !isFinite(precio) || precio <= 0) {
    cont.innerHTML = '';
    cont.appendChild(pruebasLinea('Escriba un precio y le saco la cuenta.'));
    if (botones) botones.classList.add('oculto');
    pruebasCuenta = null;
    return;
  }

  const a = pruebasAjustes || ajustesVacios();
  const c = ahorroCuentaUnitaria({ nombre: nombre, precio: precio }, a);
  pruebasCuenta = c;

  cont.innerHTML = '';

  // El aviso del prellenado vacío va PRIMERO: si la cuenta está asumiendo que
  // no gasta nada, eso hay que saberlo antes de leer el número.
  if (c.avisoPrellenado) {
    cont.appendChild(pruebasLinea('⚠ ' + c.avisoPrellenado, 'pruebas-aviso'));
  }

  cont.appendChild(pruebasDato('puede guardar', pruebasPlata(c.capacidad.alMes) + ' al mes' +
    (c.capacidad.viene === 'declarada' ? '  (lo dijo usted)' : '  (calculado)')));
  cont.appendChild(pruebasDato('la cuenta',
    pruebasPlata(c.capacidad.ingresoAlMes) + ' − ' +
    pruebasPlata(c.capacidad.gastosAlMes) + ' (gastos) − ' +
    pruebasPlata(c.capacidad.colchonAlMes) + ' (colchón)'));
  cont.appendChild(pruebasDato('lo tendrá', c.cuandoEnPalabras +
    (c.cuando.meses ? '  (' + c.cuando.dias + ' días · ' + c.fecha + ')' : '')));
  cont.appendChild(pruebasDato('veredicto', '[' + c.veredicto.caso + '] ' + c.veredicto.frase));
  cont.appendChild(pruebasLinea(c.veredicto.porque, 'pruebas-porque'));
  cont.appendChild(pruebasDato('lo que pesa', c.loQuePesa));

  // Los tres plazos, cada uno con su respuesta
  c.plazos.forEach(function (p) {
    cont.appendChild(pruebasDato(
      p.meses + ' meses',
      (p.alcanza ? '✔ ' : '✗ ') + p.dice
    ));
  });

  if (botones) botones.classList.remove('oculto');
}

function pruebasDato(rot, valor) {
  const d = document.createElement('div');
  d.className = 'pruebas-dato';
  const r = document.createElement('span');
  r.className = 'pruebas-dato-rot';
  r.textContent = rot;
  const v = document.createElement('span');
  v.className = 'pruebas-dato-val';
  v.textContent = valor;
  d.appendChild(r);
  d.appendChild(v);
  return d;
}

function pruebasLinea(texto, clase) {
  const p = document.createElement('p');
  p.className = clase || 'pruebas-vacio';
  p.textContent = texto;
  return p;
}

// ----------------------------------------------------------------
// Guardar: los tres caminos del final del cálculo
//
// README, punto 4: guardar NO es un camino aparte, es el final del primero.
// Y quien solo quería el número se va sin guardar nada y sin haber tenido que
// decidir nada de antemano.
// ----------------------------------------------------------------
function pruebasDatosParaGuardar(grupo) {
  const c = pruebasCuenta;
  if (!c) return null;
  return {
    nombre: c.nombre,
    precio: c.precio,
    link: (pruebasCapturado && pruebasCapturado.link) || '',
    titulo: (pruebasCapturado && pruebasCapturado.titulo) || '',
    grupo: grupo || ''
  };
}

function pruebasGuardarSuelto() {
  const d = pruebasDatosParaGuardar('');
  if (!d) return;
  dbGuardarItem(d).then(function () {
    pruebasAvisar('Quedó apuntado como una cosa suelta.');
    pruebasLimpiarCalculo();
  });
}

// Escoger de la lista o escribir uno nuevo — decidido por David el 2 de
// septiembre de 2026. Aquí sale pelado (un prompt con la lista); el de verdad,
// con botones gordos, es de la Fase 4.
function pruebasGuardarEnGrupo() {
  const d = pruebasDatosParaGuardar('');
  if (!d) return;

  dbGrupos().then(function (grupos) {
    let texto = '¿En qué grupo lo apunto, mijo?\n\n';
    if (grupos.length) {
      texto += 'Los que ya tiene:\n';
      grupos.forEach(function (g) {
        texto += '  · ' + g.nombre + '  (' + g.cuantos + ' cosas)\n';
      });
      texto += '\nEscriba uno de esos, o el nombre de un grupo nuevo:';
    } else {
      texto += 'Todavía no tiene ninguno. Escriba el nombre del primero:';
    }

    const escogido = prompt(texto, grupos.length ? grupos[0].nombre : 'La casa');
    if (escogido === null) return;          // se arrepintió: no se guarda nada
    const nombre = String(escogido).trim();
    if (!nombre) return;

    d.grupo = nombre;
    dbGuardarItem(d).then(function () {
      pruebasAvisar('Quedó apuntado en el grupo "' + nombre + '".');
      pruebasLimpiarCalculo();
    });
  });
}

function pruebasDejarloAsi() {
  pruebasAvisar('Listo: no se guardó nada. Ahí tenía su número y ya.');
  pruebasLimpiarCalculo();
}

function pruebasLimpiarCalculo() {
  const precio = document.getElementById('pruebas-precio');
  const nombre = document.getElementById('pruebas-nombre');
  if (precio) precio.value = '';
  if (nombre) nombre.value = '';
  pruebasCapturado = null;
  const eco = document.getElementById('pruebas-capturado');
  if (eco) eco.classList.add('oculto');
  pruebasRecalcular();
  pruebasPintarLista();
}

function pruebasAvisar(texto) {
  const av = document.getElementById('pruebas-aviso-zona');
  if (!av) return;
  av.textContent = texto;
  av.classList.remove('oculto');
  setTimeout(function () { av.classList.add('oculto'); }, 4000);
}

// ----------------------------------------------------------------
// Pintar
// ----------------------------------------------------------------
function pruebasPintar() {
  ajustesCargar().then(function (a) {
    pruebasAjustes = a;
    pruebasPintarAjustes();
    pruebasRecalcular();
  });
  pruebasPintarLista();
}

function pruebasPintarAjustes() {
  const a = pruebasAjustes;
  if (!a) return;

  pruebasPonerValor('pruebas-ingreso', a.ingreso);
  pruebasPonerValor('pruebas-juntado', a.ahorroJuntado);
  pruebasPonerValor('pruebas-colchon-juntado', a.colchonJuntado);

  const frec = document.getElementById('pruebas-frecuencia');
  if (frec) frec.value = a.frecuencia;

  const usa = document.getElementById('pruebas-usa-colchon');
  if (usa) usa.checked = a.usaColchon !== false;

  RENGLONES.forEach(function (r) {
    pruebasPonerValor('pre-' + r.clave, a.gastos[r.clave]);
  });

  const eco = document.getElementById('pruebas-eco');
  if (eco) {
    const cap = ahorroCapacidad(a);
    eco.textContent =
      'gana ' + pruebasPlata(a.ingreso) + ' ' + ajustesRotuloFrecuencia(a) +
      ' = ' + pruebasPlata(cap.ingresoAlMes) + ' al mes' +
      ' → puede guardar ' + pruebasPlata(cap.alMes) + ' al mes' +
      (cap.faltaPrellenado ? '  ⚠ prellenado en cero' : '');
  }
}

// No le pisamos lo que está escribiendo
function pruebasPonerValor(id, valor) {
  const el = document.getElementById(id);
  if (!el || document.activeElement === el) return;
  el.value = valor ? String(valor) : '';
}

function pruebasPintarLista() {
  const cont = document.getElementById('pruebas-lista');
  const cuenta = document.getElementById('pruebas-cuenta');
  if (!cont) return;

  Promise.all([dbTodosLosItems(), dbGrupos()]).then(function (r) {
    const items = r[0];
    const grupos = r[1];

    if (cuenta) {
      cuenta.textContent = items.length + ' cosa(s) · ' + grupos.length + ' grupo(s)';
    }

    cont.innerHTML = '';

    if (!items.length) {
      cont.appendChild(pruebasLinea('La libreta está vacía. Señale un precio en ' +
        'una tienda con el clic derecho, o toque "apuntar algo de mentiras".'));
      return;
    }

    // Los grupos primero, con su cuenta grupal: es la otra mitad de la Fase 3
    grupos.forEach(function (g) {
      const suyos = items.filter(function (i) { return i.grupo === g.nombre; });
      const cg = ahorroCuentaGrupal(g.nombre, suyos, pruebasAjustes || ajustesVacios());

      const caja = document.createElement('div');
      caja.className = 'pruebas-grupo';

      const tit = document.createElement('div');
      tit.className = 'pruebas-grupo-tit';
      tit.textContent = '▣ ' + g.nombre + ' — ' + pruebasPlata(cg.total) +
                        ' · ' + cg.cuantos + ' cosas · ' + cg.cuandoEnPalabras;
      caja.appendChild(tit);

      caja.appendChild(pruebasLinea('[' + cg.veredicto.caso + '] ' +
        cg.veredicto.frase + ' — ' + cg.veredicto.porque, 'pruebas-porque'));
      caja.appendChild(pruebasLinea(cg.loQuePesa, 'pruebas-porque'));

      cg.desglose.forEach(function (d) {
        caja.appendChild(pruebasLinea(
          '   · ' + (d.nombre || '(sin nombre)') + ' ' + pruebasPlata(d.precio) +
          ' → ' + d.mesesEnPalabras + ' · ' + d.pesaEnElGrupo, 'pruebas-porque'));
      });

      cont.appendChild(caja);
    });

    // Y las cosas sueltas
    items.filter(function (i) { return i.grupo === '(suelto)'; })
         .forEach(function (it) { cont.appendChild(pruebasFila(it)); });
  }).catch(function (e) {
    cont.innerHTML = '';
    cont.appendChild(pruebasLinea('La libreta no abrió: ' + e.message));
  });
}

function pruebasFila(it) {
  const fila = document.createElement('div');
  fila.className = 'pruebas-fila';

  const arriba = document.createElement('div');
  arriba.className = 'pruebas-fila-arriba';

  const nombre = document.createElement('strong');
  nombre.textContent = it.nombre || '(sin nombre)';
  arriba.appendChild(nombre);

  const precio = document.createElement('span');
  precio.className = 'pruebas-precio';
  precio.textContent = pruebasPlata(it.precio);
  arriba.appendChild(precio);

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'pruebas-x';
  x.textContent = '✕';
  x.title = 'Quitar de la libreta';
  x.addEventListener('click', function () {
    dbBorrarItem(it.id).then(pruebasPintarLista);
  });
  arriba.appendChild(x);

  fila.appendChild(arriba);

  // La cuenta de esa cosa, para poder revisarla sin escribirla otra vez
  if (it.precio > 0) {
    const c = ahorroCuentaUnitaria(it, pruebasAjustes || ajustesVacios());
    fila.appendChild(pruebasLinea(
      c.cuandoEnPalabras + ' · [' + c.veredicto.caso + '] ' + c.veredicto.frase,
      'pruebas-porque'));
  }

  const abajo = document.createElement('div');
  abajo.className = 'pruebas-fila-abajo';
  abajo.textContent = 'id ' + it.id + ' · ' + pruebasFecha(it.creado);
  fila.appendChild(abajo);

  const link = document.createElement('div');
  link.className = 'pruebas-link';
  link.textContent = it.link ? ('link: ' + it.link) : 'link: (no vino)';
  link.title = it.link || '';
  fila.appendChild(link);

  return fila;
}

// ----------------------------------------------------------------
// Cosas de mentiras, para probar sin ir a una tienda
//
// A propósito con los números feos de la recomendación 8 del plan: 50 pesos,
// 900 millones, un nombre larguísimo, algo sin precio.
// ----------------------------------------------------------------
const PRUEBAS_INVENTADAS = [
  { nombre: 'Bicicleta', precio: 850000, link: 'https://tienda.com/bici', grupo: '' },
  { nombre: 'Nevera', precio: 2300000, link: 'https://otratienda.co/nevera', grupo: 'La casa' },
  { nombre: 'Estufa', precio: 1150000, link: 'https://otratienda.co/estufa', grupo: 'La casa' },
  { nombre: 'Mesa de comedor', precio: 400000, link: '', grupo: 'La casa' },
  { nombre: 'Un dulce', precio: 50, link: 'https://tienda.com/dulce', grupo: '' },
  { nombre: 'Una finca en el altiplano con marranera y todo', precio: 900000000, link: 'https://fincaraiz.com/x', grupo: '' },
  { nombre: 'Algo sin precio', precio: 0, link: '', grupo: '' }
];

let pruebasSiguiente = 0;

function pruebasInventar() {
  const d = PRUEBAS_INVENTADAS[pruebasSiguiente % PRUEBAS_INVENTADAS.length];
  pruebasSiguiente++;
  dbGuardarItem(d).then(pruebasPintarLista);
}

function pruebasBorrarTodo() {
  if (!confirm('¿Boto TODO lo que hay en la libreta, mijo?\n\n' +
               'Lo que usted nos dijo que gana no se toca.')) return;
  dbBorrarTodo().then(pruebasPintarLista);
}

// ----------------------------------------------------------------
// Formato (pelado: esta ventanita es fea a propósito)
// ----------------------------------------------------------------
function pruebasPlata(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

function pruebasFecha(ms) {
  if (!ms) return 'sin fecha';
  const d = new Date(ms);
  return d.toLocaleDateString('es-CO') + ' ' +
         d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
