// =================================================================
// cuaderno.js — La hoja del mes: "¿Cuánto gana, mijo?"
//
// POR QUÉ EXISTE
//   Rehecha el 24 de septiembre de 2026 desde el dibujo de David. Es la hoja
//   de cuaderno donde uno anota lo que gana y lo que gasta, escrita con
//   lapicero y cortada como un recibo. La gente mayor ya lleva sus cuentas
//   así: la app no le enseña nada nuevo, solo le suma las columnas.
//
// QUÉ HAY EN LA HOJA, DE ARRIBA ABAJO
//   1. lo que gana al mes .......... el único dato obligatorio
//   2. las dos reglas .............. 70 / 30 y 10 %: se prenden y se apagan,
//                                    y solo MUESTRAN topes
//   3. lo necesario ................ renglones fijos, cada uno con su dibujito
//                                    que explica qué va ahí
//   4. otros gastos ................ los "gustos": se agregan con el +
//   5. la raya y los totales ....... con color Y con palabras
//   6. ¿cómo voy? .................. plegado: solo quien quiera lo abre
//   7. total restante .............. en plata y en porcentaje
//   8. el ahorro, ¿se toca o no? ... la casilla
//
// LAS CUENTAS NO VIVEN AQUÍ: salen de ahorroHoja() y ahorroCapacidad(), en
// src/ahorro.js. Esto solo pinta y guarda.
// =================================================================

// Los dibujitos de cada renglón, trazados como a lapicero (24 × 24, solo
// línea). La misma lista sirve para la pantalla y para la imagen que se baja:
// el canvas entiende estos trazos con Path2D.
const CUA_ICONOS = {
  mercado:    'M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2 M10.5 19.5a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0 M18 19.5a1.2 1.2 0 1 1-2.4 0a1.2 1.2 0 1 1 2.4 0',
  casa:       'M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6',
  servicios:  'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  transporte: 'M6 4h12a2 2 0 0 1 2 2v11H4V6a2 2 0 0 1 2-2z M4 11h16 M7 17v3 M17 17v3 M8 14h.01 M16 14h.01',
  deudas:     'M6 3h9l3 3v15H6z M9 9h6 M9 13h6 M9 17h4',
  ahorro:     'M4 7a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7 M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  gym:        'M6 7v10 M18 7v10 M3 9.5v5 M21 9.5v5 M6 12h12',
  mascotas:   'M12 13c-3 0-5 2.5-5 4.5 0 1.5 1.3 2.5 3 2 1-.3 1.4-.5 2-.5s1 .2 2 .5c1.7.5 3-.5 3-2 0-2-2-4.5-5-4.5z M5 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0 M16 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0 M8.5 6a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0 M12.5 6a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0',
  celular:    'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2',
  tele:       'M4 6h16v11H4z M9 21h6 M12 17v4',
  salidas:    'M7 3v18 M5 3v5a2 2 0 0 0 4 0V3 M17 21V3c-2 0-3 2.5-3 6h3',
  ropa:       'M8 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z',
  cuidado:    'M3.5 6a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M3.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M8 7.5L20 18 M8 16.5L20 6',
  regalos:    'M4 10h16v10H4z M3 7h18v3H3z M12 7v13 M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1',
  estudio:    'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z M4 19a2 2 0 0 0 2 2h13v-3',
  familia:    'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  chance:     'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z M14 7v10',
  otra:       'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4'
};

// La tinta del lapicero y los tres tonos. El color ACOMPAÑA, la palabra manda.
const CUA_TINTA = '#1F3C88';
const CUA_TONO = {
  bien: { color: '#2E7D40', sena: '✓' },
  ojo:  { color: '#C85E1E', sena: '!' },
  no:   { color: '#C0392B', sena: '×' },
  nada: { color: '#2B2118', sena: '' }
};

let cuaArmada = false;
let cuaFirmaOtros = null;

document.addEventListener('DOMContentLoaded', function () {
  cuaArmar();

  cuaAtar('cua-regla7030', 'click', function () {
    ajustesGuardar({ regla7030: !recAjustes.regla7030 }).then(recTrasGuardar);
  });
  cuaAtar('cua-regla10', 'click', function () {
    ajustesGuardar({ regla10: !recAjustes.regla10 }).then(recTrasGuardar);
  });
  cuaAtar('cua-ahorro-disponible', 'change', function (el) {
    ajustesGuardar({ ahorroDisponible: el.checked }).then(recTrasGuardar);
  });
  cuaAtar('cua-mas', 'click', function (el) {
    const cat = document.getElementById('cua-catalogo');
    const abierto = cat.classList.toggle('oculto') === false;
    el.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) cuaPintarCatalogo();
  });
  cuaAtar('cua-como-tit', 'click', function (el) {
    const caja = document.getElementById('cua-como');
    const cerrado = caja.classList.toggle('cerrado');
    el.setAttribute('aria-expanded', cerrado ? 'false' : 'true');
  });
  ['cua-cerrar', 'cua-x'].forEach(function (id) {
    cuaAtar(id, 'click', function () {
      ajustesEscribirYa();
      recAbrirYo(false);
    });
  });
  cuaAtar('cua-descargar', 'click', cuaDescargar);
});

function cuaAtar(id, evento, hacer) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, function () { hacer(el); });
}

// ----------------------------------------------------------------
// Los renglones
// ----------------------------------------------------------------

function cuaArmar() {
  if (cuaArmada) return;
  const cont = document.getElementById('cua-necesarios');
  if (!cont) return;
  cuaArmada = true;

  NECESARIOS.forEach(function (r) {
    const campo = cuaCampoMonto('cua-g-' + r.clave, r.rotulo);
    campo.addEventListener('input', function () {
      const cambio = { gastos: {} };
      cambio.gastos[r.clave] = recNumero(campo.value);
      ajustesGuardar(cambio).then(recTrasGuardar);
    });
    const rot = document.createElement('label');
    rot.className = 'cua-fila-rot';
    rot.htmlFor = campo.id;
    rot.textContent = r.rotulo;
    if (r.guarda) {
      const tag = document.createElement('small');
      tag.className = 'cua-tag';
      tag.textContent = 'se guarda';
      rot.appendChild(tag);
    }
    cuaRenglon(cont, r.clave, r.rotulo, r.ayuda, rot, campo, null, r.guarda);
  });
}

function cuaCampoMonto(id, rotulo) {
  const campo = document.createElement('input');
  campo.type = 'text';
  campo.inputMode = 'numeric';
  campo.autocomplete = 'off';
  campo.className = 'cua-tinta cua-monto';
  campo.id = id;
  campo.placeholder = '$ 0';
  campo.setAttribute('aria-label', rotulo + ', cuánto al mes');
  recAtarMoneda(campo);
  return campo;
}

// Un renglón de cuaderno: dibujito (que explica), nombre, puntos, plata.
// Debajo, escondida, la explicación que sale al tocar el dibujito.
function cuaRenglon(cont, clave, rotulo, ayuda, rot, campo, quitar, guarda) {
  const fila = document.createElement('div');
  fila.className = 'cua-fila' + (guarda ? ' cua-fila-guarda' : '');

  const nota = document.createElement('p');
  nota.className = 'cua-ayuda oculto';
  nota.textContent = ayuda;

  const ico = document.createElement('button');
  ico.type = 'button';
  ico.className = 'cua-ico';
  ico.title = ayuda;
  ico.setAttribute('aria-label', '¿Qué va en ' + rotulo + '?');
  ico.setAttribute('aria-expanded', 'false');
  ico.appendChild(cuaSvg(clave));
  ico.addEventListener('click', function () {
    const abierta = nota.classList.toggle('oculto') === false;
    ico.setAttribute('aria-expanded', abierta ? 'true' : 'false');
  });

  const lin = document.createElement('span');
  lin.className = 'rec-lin';

  fila.appendChild(ico);
  fila.appendChild(rot);
  fila.appendChild(lin);
  fila.appendChild(campo);
  if (quitar) fila.appendChild(quitar);

  cont.appendChild(fila);
  cont.appendChild(nota);
}

function cuaSvg(clave) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', CUA_ICONOS[cuaBase(clave)] || CUA_ICONOS.otra);
  svg.appendChild(path);
  return svg;
}

function cuaBase(clave) { return String(clave || '').split('-')[0]; }

// Los otros gastos se rearman solo cuando cambia la LISTA (se agrega o se
// quita uno). Si solo cambió una cifra no se toca nada: rearmar mientras la
// persona escribe le robaría el cursor.
function cuaPintarOtros(a) {
  const firma = a.otros.map(function (o) { return o.clave; }).join('|');
  const cont = document.getElementById('cua-otros');
  if (!cont) return;

  if (firma !== cuaFirmaOtros) {
    cuaFirmaOtros = firma;
    cont.innerHTML = '';
    a.otros.forEach(function (o, i) { cuaRenglonOtro(cont, o, i); });
  }

  a.otros.forEach(function (o, i) {
    recPonerValor('cua-o-' + i, o.monto);
    const nom = document.getElementById('cua-on-' + i);
    if (nom && document.activeElement !== nom) nom.value = o.nombre;
  });

  const rot = document.getElementById('cua-otros-rot');
  if (rot) rot.classList.toggle('oculto', !a.otros.length);
}

function cuaRenglonOtro(cont, o, i) {
  const cat = ajustesDelCatalogo(o.clave) || { rotulo: 'Otra cosa', ayuda: '' };
  const esOtra = cuaBase(o.clave) === 'otra';
  const rotulo = esOtra ? (o.nombre || 'Otra cosa') : cat.rotulo;

  const campo = cuaCampoMonto('cua-o-' + i, rotulo);
  campo.addEventListener('input', function () {
    cuaCambiarOtro(i, { monto: recNumero(campo.value) });
  });

  let rot;
  if (esOtra) {
    // "Otra cosa": el nombre lo escribe la persona, en la misma tinta.
    rot = document.createElement('input');
    rot.type = 'text';
    rot.id = 'cua-on-' + i;
    rot.className = 'cua-tinta cua-nombre';
    rot.placeholder = '¿Qué es?';
    rot.maxLength = 40;
    rot.setAttribute('aria-label', 'Nombre del gasto');
    rot.addEventListener('input', function () { cuaCambiarOtro(i, { nombre: rot.value }); });
  } else {
    rot = document.createElement('label');
    rot.className = 'cua-fila-rot';
    rot.htmlFor = campo.id;
    rot.textContent = cat.rotulo;
  }

  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'cua-quitar';
  quitar.textContent = '×';
  quitar.title = 'Borrar este renglón';
  quitar.setAttribute('aria-label', 'Borrar ' + rotulo);
  quitar.addEventListener('click', function () {
    const lista = recAjustes.otros.slice();
    lista.splice(i, 1);
    ajustesGuardar({ otros: lista }).then(recTrasGuardar);
  });

  cuaRenglon(cont, o.clave, rotulo, cat.ayuda, rot, campo, quitar, false);
}

function cuaCambiarOtro(i, cambio) {
  const lista = recAjustes.otros.map(function (o) { return Object.assign({}, o); });
  if (!lista[i]) return;
  Object.assign(lista[i], cambio);
  ajustesGuardar({ otros: lista }).then(recTrasGuardar);
}

// La lista del +: lo que todavía no está anotado. "Otra cosa" siempre está,
// porque se puede poner varias veces.
function cuaPintarCatalogo() {
  const cat = document.getElementById('cua-catalogo');
  if (!cat || !recAjustes) return;
  const ya = recAjustes.otros.map(function (o) { return o.clave; });
  cat.innerHTML = '';

  OTROS_CATALOGO.forEach(function (c) {
    if (c.clave !== 'otra' && ya.indexOf(c.clave) !== -1) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cua-opcion';
    b.title = c.ayuda;
    b.appendChild(cuaSvg(c.clave));
    b.appendChild(document.createTextNode(c.rotulo));
    b.addEventListener('click', function () { cuaAgregar(c); });
    cat.appendChild(b);
  });
}

function cuaAgregar(c) {
  const clave = c.clave === 'otra' ? 'otra-' + Date.now().toString(36) : c.clave;
  const lista = recAjustes.otros.concat([{ clave: clave, nombre: '', monto: 0 }]);
  document.getElementById('cua-catalogo').classList.add('oculto');
  document.getElementById('cua-mas').setAttribute('aria-expanded', 'false');
  ajustesGuardar({ otros: lista }).then(function (a) {
    recTrasGuardar(a);
    const i = a.otros.length - 1;
    const foco = document.getElementById(c.clave === 'otra' ? 'cua-on-' + i : 'cua-o-' + i);
    if (foco) foco.focus();
  });
}

// ----------------------------------------------------------------
// Pintar la hoja. Lo llama recPintarYo() cada vez que algo cambia.
// ----------------------------------------------------------------

function cuaPintar(a) {
  cuaArmar();
  NECESARIOS.forEach(function (r) { recPonerValor('cua-g-' + r.clave, a.gastos[r.clave]); });
  cuaPintarOtros(a);

  const h = ahorroHoja(a);
  const cap = ahorroCapacidad(a);

  cuaPrender('cua-regla7030', a.regla7030);
  cuaPrender('cua-regla10', a.regla10);
  cuaPintarTopes(h);

  // Total lo necesario
  cuaTotal('cua-total-nec', recPlata(h.necesarios), h.tonoNecesarios);
  cuaTexto('cua-total-nec-sello', cuaSelloNecesarios(h));
  cuaTono('cua-total-nec-sello', h.tonoNecesarios);

  const otros = document.getElementById('cua-total-otros');
  if (otros) otros.classList.toggle('oculto', !a.otros.length);
  cuaTexto('cua-total-otros-val', recPlata(h.otros) + cuaPct(h.pctOtros, ' · '));

  cuaPintarComoVoy(h);

  // Total restante
  cuaTotal('cua-restante', cuaPlataConSigno(h.restante), h.tonoRestante);
  cuaTexto('cua-restante-sello', cuaSelloRestante(h));
  cuaTono('cua-restante-sello', h.tonoRestante);

  const check = document.getElementById('cua-ahorro-disponible');
  if (check) check.checked = a.ahorroDisponible === true;
  cuaTexto('cua-ahorro-nota', cuaNotaAhorro(a, h, cap));

  if (!document.getElementById('cua-catalogo').classList.contains('oculto')) {
    cuaPintarCatalogo();
  }
}

function cuaPrender(id, si) {
  const b = document.getElementById(id);
  if (!b) return;
  b.classList.toggle('prendida', !!si);
  b.setAttribute('aria-pressed', si ? 'true' : 'false');
}

function cuaPintarTopes(h) {
  const caja = document.getElementById('cua-topes');
  if (!caja) return;
  caja.classList.toggle('oculto', !h.reglas.length);
  caja.innerHTML = '';
  if (!h.reglas.length) return;

  const tit = document.createElement('p');
  tit.className = 'cua-topes-tit';
  tit.textContent = 'Según la regla, le toca';
  caja.appendChild(tit);

  h.reglas.forEach(function (r) {
    const fila = document.createElement('div');
    fila.className = 'cua-tope';

    const rot = document.createElement('span');
    rot.className = 'cua-tope-rot';
    rot.textContent = r.rotulo + (r.esTecho ? ' hasta' : '') + ' (' + r.pct + ' %)';
    const val = document.createElement('span');
    val.className = 'cua-tope-val';
    val.textContent = recPlata(r.tope);
    const como = document.createElement('span');
    como.className = 'cua-tope-como';

    if (h.ingreso > 0) {
      const tono = r.cumple ? CUA_TONO.bien : CUA_TONO.ojo;
      como.style.color = tono.color;
      como.textContent = tono.sena + ' ' + cuaComoVaLaRegla(r);
    }

    fila.appendChild(rot);
    fila.appendChild(val);
    fila.appendChild(como);
    caja.appendChild(fila);
  });
}

function cuaComoVaLaRegla(r) {
  if (r.esTecho) {
    return r.cumple ? 'le quedan ' + recPlata(r.diferencia)
                    : 'se pasa ' + recPlata(-r.diferencia);
  }
  return r.cumple ? 'ya lo aparta' : 'le faltan ' + recPlata(-r.diferencia);
}

function cuaSelloNecesarios(h) {
  if (h.pctNecesarios === null) return 'Anote lo que gana y le digo cuánto es.';
  const p = h.pctNecesarios;
  const palabra = h.tonoNecesarios === 'bien' ? 'va bien'
    : h.tonoNecesarios === 'ojo' ? 'va justo'
    : p >= 100 ? 'es más de lo que gana' : 'es muy alto';
  return CUA_TONO[h.tonoNecesarios].sena + ' Es el ' + cuaNum(p) + ' % de lo que gana: ' + palabra + '.';
}

function cuaSelloRestante(h) {
  if (h.ingreso <= 0) {
    return h.gastado > 0 ? '× Sin lo que gana no hay de dónde salga esto.' : '';
  }
  const gasta = 'Se gasta el ' + cuaNum(h.pctGastado) + ' % (' + recPlata(h.gastado) + ')';
  const aparta = h.ahorro > 0 ? ', aparta el ' + cuaNum(h.pctAhorro) + ' %' : '';
  if (h.restante > 0) return '✓ ' + gasta + aparta + ' y le queda el ' + cuaNum(h.pctRestante) + ' %.';
  if (h.restante === 0) return '! ' + gasta + aparta + '. No le sobra nada.';
  return '× ' + gasta + aparta + '. Le faltan ' + recPlata(-h.restante) + ' cada mes.';
}

function cuaPintarComoVoy(h) {
  const cuerpo = document.getElementById('cua-como-cuerpo');
  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  const renglon = function (txt) {
    const p = document.createElement('p');
    p.className = 'cua-como-renglon';
    p.textContent = txt;
    cuerpo.appendChild(p);
  };

  if (h.ingreso > 0) {
    renglon('Gasta el ' + cuaNum(h.pctGastado) + ' % de lo que gana: ' + recPlata(h.gastado) + '.');
    if (h.ahorro > 0) renglon('Aparta el ' + cuaNum(h.pctAhorro) + ' % para guardar: ' + recPlata(h.ahorro) + '.');
    if (h.restante > 0) {
      renglon('Le sobra el ' + cuaNum(h.pctRestante) + ' %: ' + recPlata(h.restante) + '.');
    } else if (h.restante === 0) {
      renglon('No le sobra nada: toda la plata tiene dueño.');
    } else {
      renglon('Le faltan ' + recPlata(-h.restante) + ' (' + cuaNum(-h.pctRestante) +
              ' %): está gastando más de lo que gana.');
    }
  }

  const consejo = document.createElement('div');
  consejo.className = 'rec-consejo';
  const carriel = document.createElement('span');
  carriel.className = 'rec-carriel';
  carriel.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img');
  img.src = 'assets/images/Cirrel Arriero.png';
  img.alt = '';
  carriel.appendChild(img);
  const txt = document.createElement('p');
  txt.className = 'rec-consejo-txt';
  txt.textContent = h.consejo;
  consejo.appendChild(carriel);
  consejo.appendChild(txt);
  cuerpo.appendChild(consejo);
}

function cuaNotaAhorro(a, h, cap) {
  const comprar = 'Para comprar cosas le quedan ' + recPlata(Math.max(0, cap.alMes)) + ' al mes.';
  if (!h.ahorro) return comprar;
  return (a.ahorroDisponible
    ? 'Su ahorro de ' + recPlata(h.ahorro) + ' cuenta para comprar. '
    : 'Su ahorro de ' + recPlata(h.ahorro) + ' es su colchón: no se toca. ') + comprar;
}

function cuaTotal(id, valor, tono) {
  const fila = document.getElementById(id);
  if (!fila) return;
  const val = fila.querySelector('.cua-total-val');
  if (val) {
    val.textContent = valor;
    val.style.color = CUA_TONO[tono].color;
  }
}

function cuaTono(id, tono) {
  const el = document.getElementById(id);
  if (el) el.style.color = CUA_TONO[tono].color;
}

function cuaTexto(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function cuaNum(p) {
  if (p === null || p === undefined) return '—';
  if (p > 0 && p < 1) return 'menos del 1';
  return String(Math.round(p));
}

function cuaPct(p, antes) {
  return p === null ? '' : (antes || '') + cuaNum(p) + ' %';
}

function cuaPlataConSigno(n) {
  return n < 0 ? '− ' + recPlata(-n) : recPlata(n);
}

// ----------------------------------------------------------------
// Bajarla como imagen
//
// Mismo papel y mismas piezas que el recibo (src/recibo-descargar.js): se
// reutilizan sus funciones de dibujo. Si se agrega un renglón a la hoja de
// pantalla, hay que agregarlo aquí también.
// ----------------------------------------------------------------

function cuaDescargar() {
  if (!recAjustes) return;
  const boton = document.getElementById('cua-descargar');
  if (boton) boton.disabled = true;

  Promise.all([recdLetrasListas(), recdCarriel()])
    .then(function (r) {
      const hoy = new Date();
      const dos = function (n) { return String(n).padStart(2, '0'); };
      const nombre = 'hoja-del-mes-' + hoy.getFullYear() + dos(hoy.getMonth() + 1) +
                     dos(hoy.getDate()) + '.png';
      return recdBajar(cuaDibujar(recAjustes, r[1]), nombre).catch(function (e) {
        if (!r[1]) throw e;
        return recdBajar(cuaDibujar(recAjustes, null), nombre);
      });
    })
    .catch(function (e) {
      console.error('No se pudo bajar la hoja:', e);
      recAvisar('No se pudo bajar la hoja. Intente otra vez.');
    })
    .then(function () { if (boton) boton.disabled = false; });
}

function cuaDibujar(a, carriel) {
  const medir = document.createElement('canvas').getContext('2d');
  const alto = cuaContenido(medir, a, carriel, false);

  const lienzo = document.createElement('canvas');
  lienzo.width = RECD_ANCHO * RECD_ESCALA;
  lienzo.height = Math.ceil(alto) * RECD_ESCALA;
  const ctx = lienzo.getContext('2d');
  ctx.scale(RECD_ESCALA, RECD_ESCALA);
  ctx.fillStyle = RECD_COLOR.crema;
  ctx.fillRect(0, 0, RECD_ANCHO, alto);

  cuaContenido(ctx, a, carriel, true);
  recdOrillaArrancada(ctx, alto);
  return lienzo;
}

function cuaContenido(ctx, a, carriel, pinta) {
  const h = ahorroHoja(a);
  const cap = ahorroCapacidad(a);
  const izq = RECD_MARGEN;
  const der = RECD_ANCHO - RECD_MARGEN;
  const centro = RECD_ANCHO / 2;
  const conIcono = izq + 30;
  let y = 30;

  y = recdLinea(ctx, pinta, 'ARRIERO’S WEALTH', {
    x: centro, y: y, fuente: '17px ScothBrace', color: RECD_COLOR.marron,
    centrado: true, espaciado: 1.7
  });
  y += 5;
  y = recdLinea(ctx, pinta, 'mis cuentas del mes', {
    x: centro, y: y, fuente: 'italic 13px LiberationSans',
    color: 'rgba(43, 33, 24, 0.55)', centrado: true
  });
  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  y += 18;
  y = recdLinea(ctx, pinta, 'Lo que gano al mes', {
    x: centro, y: y, fuente: '14px LiberationSans',
    color: 'rgba(43, 33, 24, 0.6)', centrado: true
  });
  y += 8;
  y = recdLinea(ctx, pinta, recPlata(h.ingreso), {
    x: centro, y: y, fuente: 'bold 33px LiberationSans', color: CUA_TINTA, centrado: true
  });
  y += 18;
  y = recdPuntos(ctx, pinta, izq, der, y);

  if (h.reglas.length) {
    y += 14;
    y = recdRotulito(ctx, pinta, 'Según la regla, le toca', izq, y);
    y += 8;
    h.reglas.forEach(function (r) {
      y = recdRenglon(ctx, pinta, r.rotulo + (r.esTecho ? ' hasta' : '') + ' (' + r.pct + ' %)',
                      recPlata(r.tope), '', false, izq, der, y);
    });
    y += 6;
    y = recdPuntos(ctx, pinta, izq, der, y);
  }

  y += 14;
  y = recdRotulito(ctx, pinta, 'Lo necesario', izq, y);
  y += 8;
  NECESARIOS.forEach(function (r) {
    cuaIcono(ctx, pinta, r.clave, izq, y);
    y = recdRenglon(ctx, pinta, r.rotulo + (r.guarda ? ' (se guarda)' : ''),
                    recPlata(a.gastos[r.clave] || 0), '', false, conIcono, der, y, CUA_TINTA);
  });

  if (a.otros.length) {
    y += 10;
    y = recdRotulito(ctx, pinta, 'Otros gastos', izq, y);
    y += 8;
    a.otros.forEach(function (o) {
      const cat = ajustesDelCatalogo(o.clave);
      const nombre = cuaBase(o.clave) === 'otra' ? (o.nombre || 'Otra cosa') : cat.rotulo;
      cuaIcono(ctx, pinta, o.clave, izq, y);
      y = recdRenglon(ctx, pinta, nombre, recPlata(o.monto), '', false, conIcono, der, y, CUA_TINTA);
    });
  }

  // La raya de la cuenta, firme como la haría el lapicero
  y += 8;
  y = cuaRaya(ctx, pinta, izq, der, y, false);
  y += 10;
  y = recdRenglon(ctx, pinta, 'Total lo necesario', recPlata(h.necesarios), '', true,
                  izq, der, y, CUA_TONO[h.tonoNecesarios].color);
  y = cuaSello(ctx, pinta, cuaSelloNecesarios(h), h.tonoNecesarios, izq, der, y);
  if (a.otros.length) {
    y += 4;
    y = recdRenglon(ctx, pinta, 'Total otros gastos', recPlata(h.otros),
                    cuaPct(h.pctOtros), false, izq, der, y);
  }

  y += 8;
  y = cuaRaya(ctx, pinta, izq, der, y, true);
  y += 10;
  y = recdRenglon(ctx, pinta, 'Total restante', cuaPlataConSigno(h.restante), '', true,
                  izq, der, y, CUA_TONO[h.tonoRestante].color);
  y = cuaSello(ctx, pinta, cuaSelloRestante(h), h.tonoRestante, izq, der, y);

  y += 10;
  y = recdParrafo(ctx, pinta, (a.ahorroDisponible ? '☑ ' : '☐ ') +
                  'Mi ahorro lo puedo usar para comprar cosas. ' + cuaNotaAhorro(a, h, cap), {
    x: izq, y: y, ancho: der - izq, fuente: '14px LiberationSans',
    color: 'rgba(43, 33, 24, 0.75)', alto: 19
  });

  if (h.consejo) {
    y += 18;
    const fin = recdParrafo(ctx, pinta, h.consejo, {
      x: izq + 34, y: y, ancho: der - izq - 34, fuente: 'italic 15px LiberationSans',
      color: 'rgba(43, 33, 24, 0.82)', alto: 21
    });
    if (pinta && carriel) {
      ctx.drawImage(carriel, izq, y - 2, 26, 26 * (carriel.height / carriel.width));
    }
    y = fin;
  }

  y += 20;
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

function cuaIcono(ctx, pinta, clave, x, y) {
  if (!pinta || typeof Path2D !== 'function') return;
  ctx.save();
  ctx.translate(x, y + 1);
  ctx.scale(20 / 24, 20 / 24);
  ctx.strokeStyle = CUA_TINTA;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(CUA_ICONOS[cuaBase(clave)] || CUA_ICONOS.otra));
  ctx.restore();
}

function cuaRaya(ctx, pinta, izq, der, y, doble) {
  if (pinta) {
    ctx.save();
    ctx.strokeStyle = RECD_COLOR.texto;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(izq, y + 0.5);
    ctx.lineTo(der, y + 0.5);
    if (doble) {
      ctx.moveTo(izq, y + 4.5);
      ctx.lineTo(der, y + 4.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  return y + (doble ? 5 : 1);
}

function cuaSello(ctx, pinta, txt, tono, izq, der, y) {
  if (!txt) return y;
  return recdParrafo(ctx, pinta, txt, {
    x: izq, y: y, ancho: der - izq, fuente: 'bold 13px LiberationSans',
    color: CUA_TONO[tono].color, alto: 18
  }) + 6;
}
