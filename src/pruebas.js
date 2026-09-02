// =================================================================
// pruebas.js — La ventanita de pruebas de la Fase 2
//
// ESTO SE BOTA EN LA FASE 4. Es fea a propósito y no es para nadie más que
// para David: la Fase 2 es invisible (toda la plomería pasa por debajo) y sin
// esto la única forma de supervisarla sería abrirle las tripas al navegador.
// Con esto se mira una lista y ya. Ver docs/modulo-ahorro/PLAN.md, Fase 2.
//
// Lo que deja revisar, que son justo las cuatro casillas de la fase:
//   · que la libreta (IndexedDB) guarda y recuerda
//   · que el clic derecho se quedó con el precio, el link y el título
//   · que lo de la persona (cuánto gana) se guarda aparte, en storage.sync
//   · que hay un botón para botar todo y volver a empezar
//
// Además tiene un botón para apuntar cosas de mentiras, y así se puede probar
// sin tener que ir a una tienda por internet.
// =================================================================

document.addEventListener('DOMContentLoaded', function () {
  const caja = document.getElementById('pruebas');
  if (!caja) return;   // no está en el HTML: nada que hacer

  const btnRefrescar = document.getElementById('pruebas-refrescar');
  const btnInventar = document.getElementById('pruebas-inventar');
  const btnBorrar = document.getElementById('pruebas-borrar');
  const campoIngreso = document.getElementById('pruebas-ingreso');
  const campoFrecuencia = document.getElementById('pruebas-frecuencia');

  if (btnRefrescar) btnRefrescar.addEventListener('click', pruebasPintar);
  if (btnInventar) btnInventar.addEventListener('click', pruebasInventar);
  if (btnBorrar) btnBorrar.addEventListener('click', pruebasBorrarTodo);

  // Los dos datos de la persona se guardan mientras escribe, sin botón.
  if (campoIngreso) {
    campoIngreso.addEventListener('input', function () {
      ajustesGuardar({ ingreso: campoIngreso.value }).then(pruebasPintarAjustes);
    });
  }
  if (campoFrecuencia) {
    campoFrecuencia.addEventListener('change', function () {
      ajustesGuardar({ frecuencia: campoFrecuencia.value }).then(pruebasPintarAjustes);
    });
  }

  pruebasPintar();
});

// ----------------------------------------------------------------
// Pintar
// ----------------------------------------------------------------
function pruebasPintar() {
  pruebasPintarAjustes();
  pruebasPintarLista();
}

function pruebasPintarAjustes() {
  ajustesCargar().then(function (a) {
    const campoIngreso = document.getElementById('pruebas-ingreso');
    const campoFrecuencia = document.getElementById('pruebas-frecuencia');
    const eco = document.getElementById('pruebas-eco');

    // No le pisamos lo que está escribiendo
    if (campoIngreso && document.activeElement !== campoIngreso) {
      campoIngreso.value = a.ingreso ? String(a.ingreso) : '';
    }
    if (campoFrecuencia) campoFrecuencia.value = a.frecuencia;

    if (eco) {
      const alMes = ajustesIngresoMensual(a);
      eco.textContent =
        'guardado en storage.sync → gana ' + pruebasPlata(a.ingreso) + ' ' +
        ajustesRotuloFrecuencia(a) +
        (a.frecuencia === 'mes' ? '' : ' (= ' + pruebasPlata(alMes) + ' al mes)') +
        (ajustesFaltaElPrellenado(a) ? ' · prellenado en cero' : ' · con prellenado');
    }
  });
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
      const vacio = document.createElement('p');
      vacio.className = 'pruebas-vacio';
      vacio.textContent = 'La libreta está vacía. Señale un precio en una tienda ' +
        'con el clic derecho, o toque "apuntar algo de mentiras".';
      cont.appendChild(vacio);
      return;
    }

    items.forEach(function (it) {
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
        dbBorrarItem(it.id).then(pruebasPintar);
      });
      arriba.appendChild(x);

      fila.appendChild(arriba);

      const abajo = document.createElement('div');
      abajo.className = 'pruebas-fila-abajo';
      abajo.textContent =
        'id ' + it.id +
        ' · grupo: ' + it.grupo +
        ' · ' + pruebasFecha(it.creado);
      fila.appendChild(abajo);

      // El link, que es lo que hay que comprobar en esta fase
      const link = document.createElement('div');
      link.className = 'pruebas-link';
      link.textContent = it.link ? ('link: ' + it.link) : 'link: (no vino)';
      link.title = it.link || '';
      fila.appendChild(link);

      cont.appendChild(fila);
    });
  }).catch(function (e) {
    cont.innerHTML = '';
    const err = document.createElement('p');
    err.className = 'pruebas-vacio';
    err.textContent = 'La libreta no abrió: ' + e.message;
    cont.appendChild(err);
  });
}

// ----------------------------------------------------------------
// Los botones
// ----------------------------------------------------------------

// Cosas de mentiras, para probar sin ir a una tienda. A propósito con los
// números feos que pide la recomendación 8 del plan: un precio de 50 pesos,
// uno de 900 millones, un nombre larguísimo, algo sin precio.
const PRUEBAS_INVENTADAS = [
  { nombre: 'Bicicleta', precio: 850000, link: 'https://tienda.com/bici', grupo: '' },
  { nombre: 'Nevera', precio: 2300000, link: 'https://otratienda.co/nevera-grande', grupo: 'La casa' },
  { nombre: 'Estufa', precio: 1150000, link: 'https://otratienda.co/estufa', grupo: 'La casa' },
  { nombre: 'Un dulce', precio: 50, link: 'https://tienda.com/dulce', grupo: '' },
  { nombre: 'Una finca en el altiplano con marranera y todo', precio: 900000000, link: 'https://fincaraiz.com/x', grupo: '' },
  { nombre: 'Algo sin precio', precio: 0, link: '', grupo: '' }
];

let pruebasSiguiente = 0;

function pruebasInventar() {
  const d = PRUEBAS_INVENTADAS[pruebasSiguiente % PRUEBAS_INVENTADAS.length];
  pruebasSiguiente++;
  dbGuardarItem(d).then(pruebasPintar);
}

function pruebasBorrarTodo() {
  if (!confirm('¿Boto TODO lo que hay en la libreta, mijo?\n\n' +
               'Lo que usted nos dijo que gana no se toca.')) return;
  dbBorrarTodo().then(pruebasPintar);
}

// ----------------------------------------------------------------
// Formato (pelado: esta ventanita es fea a propósito)
// ----------------------------------------------------------------
function pruebasPlata(n) {
  const num = Number(n) || 0;
  return '$' + Math.round(num).toLocaleString('es-CO');
}

function pruebasFecha(ms) {
  if (!ms) return 'sin fecha';
  const d = new Date(ms);
  return d.toLocaleDateString('es-CO') + ' ' +
         d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
