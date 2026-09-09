// =================================================================
// recibo-descargar.js — El recibo, pero en papel que se puede llevar
//
// POR QUÉ EXISTE
//   El recibo de la pantalla solo se lee. Y lo primero que hace alguien con un
//   recibo que le importa es MOSTRARLO: al hijo, a la señora, al que le va a
//   prestar. Por eso esto baja una IMAGEN y no un PDF ni un texto — una imagen
//   se manda por WhatsApp sin que nadie tenga que abrir nada.
//
//   Es la misma idea del resto de la app: la gente ya sabe qué hacer con la
//   foto de un recibo. No hay que enseñarle nada nuevo.
//
// POR QUÉ SE VUELVE A DIBUJAR A MANO Y NO SE "FOTOGRAFÍA" LA PANTALLA
//   Para retratar el HTML tal cual habría que meter una librería de las gordas
//   (html2canvas y parientes) dentro de la extensión. No hace falta: un recibo
//   son renglones centrados, líneas de puntos y cifras, y todo eso el canvas
//   lo dibuja solo. De paso sale al doble de resolución y SIN el zoom: 0.75
//   del <body>, así que la imagen se ve más grande y más nítida que la
//   pantalla — justo lo que uno quiere cuando se la manda a alguien.
//
// DE DÓNDE SALEN LOS DATOS
//   De recAhora, la misma cuenta que pintó la pantalla (recibo.js). Aquí no se
//   calcula NADA: si una cifra sale mal, está mal en ahorro.js, no aquí.
//
// SI SE LE AGREGA UN RENGLÓN AL RECIBO DE PANTALLA
//   Hay que agregarlo también aquí. Son dos dibujos del mismo recibo y no se
//   enteran el uno del otro; es el precio de no cargar con la librería.
// =================================================================

// El ancho del papel. Es el del recibo de pantalla SIN el zoom del <body>, así
// que los tamaños de letra de abajo son los mismos números de styles.css.
const RECD_ANCHO = 520;
const RECD_MARGEN = 34;
const RECD_ESCALA = 2;          // se dibuja al doble y se baja: letra nítida
const RECD_DESGARRO = 14;       // la orilla arrancada de abajo

const RECD_COLOR = {
  crema:       '#FBF5E2',
  texto:       '#2B2118',
  verdeOscuro: '#14532D',
  marron:      '#7A4A22'
};

// Cada tono del veredicto con su color y su seña. La seña va SIEMPRE: un
// cuadrito de color no le dice nada a quien no distingue bien los colores.
const RECD_TONO = {
  bien:  { linea: '#2E7D40', fondo: 'rgba(46, 125, 64, 0.10)',  letra: '#14532D', sena: '✓' },
  ojo:   { linea: '#C85E1E', fondo: 'rgba(200, 94, 30, 0.10)',  letra: '#8F3F10', sena: '!' },
  no:    { linea: '#C0392B', fondo: 'rgba(192, 57, 43, 0.10)',  letra: '#8E2018', sena: '×' },
  lento: { linea: '#E0991C', fondo: 'rgba(242, 178, 51, 0.16)', letra: '#7A5B04', sena: '!' }
};

// ----------------------------------------------------------------
// El botón
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  const b = document.getElementById('rec-descargar');
  if (b) b.addEventListener('click', recdDescargar);
});

function recdDescargar() {
  const c = (typeof recAhora !== 'undefined') ? recAhora : null;
  if (!c) return;

  const boton = document.getElementById('rec-descargar');
  if (boton) boton.disabled = true;

  // Las letras y el carriel tienen que estar cargados ANTES de dibujar: el
  // canvas no espera a nadie, y si la fuente todavía no llegó pinta con la que
  // haya y sale un recibo con otra cara.
  Promise.all([recdLetrasListas(), recdCarriel()])
    .then(function (r) {
      return recdBajarConRespaldo(c, r[1]);
    })
    .catch(function (e) {
      console.error('No se pudo bajar el recibo:', e);
      if (typeof recAvisar === 'function') {
        recAvisar('No se pudo bajar el recibo. Intente otra vez.');
      }
    })
    .then(function () {
      if (boton) boton.disabled = false;
    });
}

// EL CARRIEL PUEDE MANCHAR EL LIENZO
//   Dibujar una imagen en un canvas y despues exportarlo solo se permite si la
//   imagen es del mismo origen. Dentro de la extension lo es (chrome-extension://
//   es un origen propio) y el carriel sale bien. Pero si algun dia deja de
//   serlo -- se abre el popup como archivo suelto, se mueve la imagen a un
//   CDN -- el navegador marca el lienzo como sucio y toBlob se niega, con
//   SecurityError, DESPUES de haber dibujado todo.
//
//   Antes que quedarse sin recibo, se rehace sin la mula. Un recibo sin
//   carriel sigue diciendo lo que hay que decir; uno que no se baja, no.
function recdBajarConRespaldo(c, carriel) {
  const nombre = recdNombreArchivo(c);
  return recdBajar(recdDibujar(c, carriel), nombre).catch(function (e) {
    if (!carriel) throw e;                 // sin carriel ya iba: el fallo es otro
    console.warn('El carriel manchó el lienzo; el recibo va sin él.', e);
    return recdBajar(recdDibujar(c, null), nombre);
  });
}

// El canvas no usa una fuente por el nombre: la usa si YA está cargada. Hay
// que pedirla explícitamente y esperar.
function recdLetrasListas() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('16px ScothBrace'),
    document.fonts.load('16px LiberationSans'),
    document.fonts.load('bold 16px LiberationSans'),
    document.fonts.load('italic 16px LiberationSans')
  ]).catch(function () { /* sin la fuente se dibuja igual, con la de repuesto */ });
}

function recdCarriel() {
  return new Promise(function (listo) {
    const img = new Image();
    img.onload = function () { listo(img); };
    img.onerror = function () { listo(null); };   // sin carriel el recibo sirve igual
    img.src = 'assets/images/Cirrel Arriero.png';
  });
}

function recdNombreArchivo(c) {
  const quees = c.desglose ? (c.grupo || 'mi grupo') : (c.nombre || 'recibo');
  const limpio = String(quees)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // fuera tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'recibo';
  const h = new Date();
  const dos = function (n) { return String(n).padStart(2, '0'); };
  return 'recibo-' + limpio + '-' +
         h.getFullYear() + dos(h.getMonth() + 1) + dos(h.getDate()) + '.png';
}

// ----------------------------------------------------------------
// Bajar el archivo
// ----------------------------------------------------------------
//
// Sin el permiso "downloads" del manifest: un <a download> con un blob basta,
// y así la extensión no pide un permiso más solo para esto. El clic va
// síncrono a propósito — el popup se cierra apenas pierde el foco, y metido en
// un setTimeout la descarga se perdería.
function recdBajar(lienzo, nombre) {
  return new Promise(function (listo, falla) {
    lienzo.toBlob(function (blob) {
      if (!blob) { falla(new Error('el lienzo salio vacio')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // No se revoca de una: Chrome todavía está leyendo el blob.
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      if (typeof recAvisar === 'function') {
        recAvisar('Listo: el recibo quedó en sus Descargas.');
      }
      listo();
    }, 'image/png');
  });
}

// ----------------------------------------------------------------
// El dibujo
// ----------------------------------------------------------------
//
// Va en DOS pasadas sobre el mismo código: la primera solo mide (pinta=false)
// para saber qué tan largo sale el papel, la segunda dibuja de verdad. Así el
// recibo mide exactamente lo que ocupa su contenido: ni blanco sobrante abajo,
// ni cortarse cuando el nombre se va a tres renglones.
function recdDibujar(c, carriel) {
  const medir = document.createElement('canvas').getContext('2d');
  const alto = recdContenido(medir, c, carriel, false);

  const lienzo = document.createElement('canvas');
  lienzo.width  = RECD_ANCHO * RECD_ESCALA;
  lienzo.height = Math.ceil(alto) * RECD_ESCALA;
  const ctx = lienzo.getContext('2d');
  ctx.scale(RECD_ESCALA, RECD_ESCALA);

  ctx.fillStyle = RECD_COLOR.crema;
  ctx.fillRect(0, 0, RECD_ANCHO, alto);

  recdContenido(ctx, c, carriel, true);
  recdOrillaArrancada(ctx, alto);
  return lienzo;
}

function recdContenido(ctx, c, carriel, pinta) {
  const esGrupo = !!c.desglose;
  const izq = RECD_MARGEN;
  const der = RECD_ANCHO - RECD_MARGEN;
  const centro = RECD_ANCHO / 2;
  let y = 30;

  // --- La cabecera ---
  y = recdLinea(ctx, pinta, 'ARRIERO’S WEALTH', {
    x: centro, y: y, fuente: '17px ScothBrace', color: RECD_COLOR.marron,
    centrado: true, espaciado: 1.7
  });
  y += 5;
  y = recdParrafo(ctx, pinta, esGrupo
        ? c.cuantos + (c.cuantos === 1 ? ' cosa apuntada' : ' cosas en un grupo')
        : '¿cuándo puedo comprarlo, mijo?', {
    x: centro, y: y, ancho: der - izq, fuente: 'italic 13px LiberationSans',
    color: 'rgba(43, 33, 24, 0.55)', centrado: true, alto: 17
  });

  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  // --- Qué es y cuánto cuesta ---
  y += 22;
  y = recdParrafo(ctx, pinta, esGrupo ? (c.grupo || 'Mi grupo')
                                      : (c.nombre || 'Lo que usted quiere'), {
    x: centro, y: y, ancho: der - izq, fuente: 'bold 25px LiberationSans',
    color: RECD_COLOR.texto, centrado: true, alto: 30
  });
  y += 6;
  y = recdLinea(ctx, pinta, recdPlata(esGrupo ? c.total : c.precio), {
    x: centro, y: y, fuente: 'bold 35px LiberationSans',
    color: RECD_COLOR.verdeOscuro, centrado: true
  });

  const donde = esGrupo ? (c.cuantos + ' cosas, todo junto')
                        : (c.link ? recdDominio(c.link) : '');
  if (donde) {
    y += 8;
    y = recdLinea(ctx, pinta, donde, {
      x: centro, y: y, fuente: '13px LiberationSans',
      color: 'rgba(43, 33, 24, 0.5)', centrado: true
    });
  }

  y += 20;
  y = recdPuntos(ctx, pinta, izq, der, y);

  // --- Cosa por cosa (solo el grupal) ---
  if (esGrupo) {
    y += 16;
    y = recdRotulito(ctx, pinta, 'Cosa por cosa', izq, y);
    y += 10;
    // El "en cuanto lo tiene" se mide de una vez para TODAS las filas: si cada
    // fila se acomodara sola, los pesos quedarian en escalera y esto dejaria
    // de parecer un recibo. En una factura los numeros van en columna.
    ctx.font = '13px LiberationSans';
    let anchoCuando = 0;
    c.desglose.forEach(function (d) {
      anchoCuando = Math.max(anchoCuando, ctx.measureText(recdCuandoDe(d)).width);
    });
    c.desglose.forEach(function (d) {
      y = recdFilaDesglose(ctx, pinta, d, izq, der, y, anchoCuando);
    });
    y += 4;
    y = recdRenglon(ctx, pinta, 'Todo junto', recdPlata(c.total), '', true, izq, der, y);
    y += 14;
    y = recdPuntos(ctx, pinta, izq, der, y);
  }

  // --- Cuánto ahorra y cuándo lo tiene ---
  y += 14;
  y = recdRenglon(ctx, pinta, 'Usted ahorra', recdPlata(c.capacidad.alMes),
                  '/ mes', false, izq, der, y);

  if (c.juntado && c.juntado.paraComprar > 0) {
    y = recdRenglon(ctx, pinta, 'Ya tiene', recdPlata(c.juntado.paraComprar),
                    '', false, izq, der, y);
  }

  const rotCuando = esGrupo ? 'Todo junto' : 'Lo tendrá';
  if (c.cuando.yaLoTiene) {
    y = recdRenglon(ctx, pinta, rotCuando, 'ya mismo', '', true, izq, der, y);
  } else if (c.cuando.meses === null) {
    y = recdRenglon(ctx, pinta, rotCuando, 'no se sabe todavía', '', true, izq, der, y);
  } else {
    y = recdRenglon(ctx, pinta, rotCuando, c.cuandoEnPalabras, '', true, izq, der, y);
    y = recdRenglon(ctx, pinta, 'O sea, para', c.fecha, '', false, izq, der, y);
  }

  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  // --- Lo que le pesa ---
  if (c.loQuePesa) {
    y += 16;
    y = recdRotulito(ctx, pinta, 'Lo que le pesa', izq, y);
    y += 12;
    y = recdParrafo(ctx, pinta, c.loQuePesa, {
      x: izq, y: y, ancho: der - izq, fuente: '16px LiberationSans',
      color: RECD_COLOR.texto, alto: 22
    });
  }

  // --- El consejo del arriero ---
  const consejo = recdTextoDe('rec-consejo-txt');
  if (consejo) {
    y += 18;
    const finTexto = recdParrafo(ctx, pinta, consejo, {
      x: izq + 34, y: y, ancho: der - izq - 34,
      fuente: 'italic 15px LiberationSans',
      color: 'rgba(43, 33, 24, 0.82)', alto: 21
    });
    if (pinta && carriel) {
      const ancho = 26;
      ctx.drawImage(carriel, izq, y - 2, ancho, ancho * (carriel.height / carriel.width));
    }
    y = finTexto;
  }

  // --- El veredicto ---
  y += 16;
  y = recdVeredicto(ctx, pinta, c.veredicto, izq, der, y);

  // --- El aviso, cuando la cuenta se hizo con gastos supuestos ---
  if (c.avisoPrellenado) {
    y += 12;
    y = recdParrafo(ctx, pinta, 'Ojo con esta cuenta, mijo: ' + c.avisoPrellenado, {
      x: izq, y: y, ancho: der - izq, fuente: '13px LiberationSans',
      color: 'rgba(43, 33, 24, 0.62)', alto: 18
    });
  }

  // --- El pie ---
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

// ----------------------------------------------------------------
// Las piezas del dibujo
// ----------------------------------------------------------------

// Un renglón de los del recibo: rótulo a la izquierda, línea de puntos que
// estira, y la cifra pegada a la derecha. Es el gesto que hace que esto se lea
// como una factura y no como una tabla.
function recdRenglon(ctx, pinta, rot, valor, chiquito, fuerte, izq, der, y) {
  const tamValor = fuerte ? 19 : 16;
  const base = y + tamValor;

  if (pinta) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.font = '16px LiberationSans';
    ctx.fillStyle = 'rgba(43, 33, 24, 0.72)';
    ctx.fillText(rot, izq, base);
    const finRot = izq + ctx.measureText(rot).width;

    ctx.font = 'bold ' + tamValor + 'px LiberationSans';
    const anchoValor = ctx.measureText(valor).width;
    let anchoChico = 0;
    if (chiquito) {
      ctx.font = '13px LiberationSans';
      anchoChico = ctx.measureText(' ' + chiquito).width;
    }
    const inicioValor = der - anchoValor - anchoChico;

    recdPuntosCortos(ctx, finRot + 8, inicioValor - 8, base - 4);

    ctx.font = 'bold ' + tamValor + 'px LiberationSans';
    ctx.fillStyle = fuerte ? RECD_COLOR.verdeOscuro : RECD_COLOR.texto;
    ctx.fillText(valor, inicioValor, base);
    if (chiquito) {
      ctx.font = '13px LiberationSans';
      ctx.fillStyle = 'rgba(43, 33, 24, 0.6)';
      ctx.fillText(' ' + chiquito, inicioValor + anchoValor, base);
    }
  }
  return base + 10;
}

// Una fila del desglose: la cosa, su precio y en cuánto se tiene.
function recdFilaDesglose(ctx, pinta, d, izq, der, y, anchoCuando) {
  const base = y + 15;
  if (pinta) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Las tres columnas cuelgan del mismo borde derecho, igual en cada fila.
    const bordePlata = der - anchoCuando - 12;

    ctx.font = '13px LiberationSans';
    const cuanto = recdCuandoDe(d);
    ctx.fillStyle = 'rgba(43, 33, 24, 0.55)';
    ctx.fillText(cuanto, der - ctx.measureText(cuanto).width, base);

    ctx.font = 'bold 14px LiberationSans';
    const plata = recdPlata(d.precio);
    ctx.fillStyle = RECD_COLOR.texto;
    ctx.fillText(plata, bordePlata - ctx.measureText(plata).width, base);
    const anchoPlata = ctx.measureText(plata).width;

    ctx.font = '14px LiberationSans';
    ctx.fillStyle = RECD_COLOR.texto;
    const sitio = bordePlata - anchoPlata - 10 - izq;
    ctx.fillText(recdRecortar(ctx, d.nombre || '(sin nombre)', sitio), izq, base);
  }
  return base + 8;
}

function recdCuandoDe(d) {
  return d.meses === null ? '—' : String(d.mesesEnPalabras).replace(/^en /, '');
}

function recdVeredicto(ctx, pinta, v, izq, der, y) {
  const t = RECD_TONO[v.tono] || RECD_TONO.bien;
  const relleno = 12;
  const xTexto = izq + relleno + 28;
  const anchoTexto = der - relleno - xTexto;

  const frase = { ancho: anchoTexto, fuente: 'bold 17px LiberationSans',
                  color: t.letra, alto: 22 };
  const porque = { ancho: anchoTexto, fuente: '14px LiberationSans',
                   color: 'rgba(43, 33, 24, 0.72)', alto: 19 };

  // Primero se mide cuanto ocupa lo que hay que decir, midiendo desde cero.
  let contenido = recdParrafo(ctx, false, v.frase, Object.assign({ x: xTexto, y: 0 }, frase));
  if (v.porque) {
    contenido = recdParrafo(ctx, false, v.porque,
                            Object.assign({ x: xTexto, y: contenido + 3 }, porque));
  }

  // La caja nunca baja de 46: un veredicto de una linea en una caja apretada
  // se ve como un error, no como una respuesta. Y cuando sobra sitio el texto
  // se centra, en vez de quedar colgando del techo.
  const alto = Math.max(contenido + relleno * 2, 46);
  const arriba = y + (alto - contenido) / 2;

  if (pinta) {
    ctx.fillStyle = t.fondo;
    recdCajaRedonda(ctx, izq, y, der - izq, alto, 9);
    ctx.fill();
    ctx.fillStyle = t.linea;
    recdCajaRedonda(ctx, izq, y, 5, alto, 2);
    ctx.fill();

    // La seña, en su redondel, a la altura del primer renglon
    ctx.beginPath();
    ctx.arc(izq + relleno + 11, arriba + 10, 10, 0, Math.PI * 2);
    ctx.fillStyle = t.linea;
    ctx.fill();
    ctx.font = 'bold 12px LiberationSans';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.sena, izq + relleno + 11, arriba + 11);

    const finFrase = recdParrafo(ctx, true, v.frase,
                                 Object.assign({ x: xTexto, y: arriba }, frase));
    if (v.porque) {
      recdParrafo(ctx, true, v.porque,
                  Object.assign({ x: xTexto, y: finFrase + 3 }, porque));
    }
  }
  return y + alto;
}

function recdRotulito(ctx, pinta, txt, x, y) {
  if (pinta) {
    ctx.font = 'bold 11px LiberationSans';
    ctx.fillStyle = 'rgba(43, 33, 24, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    recdConEspaciado(ctx, txt.toUpperCase(), x, y + 11, 1.1);
  }
  return y + 11;
}

// Una sola línea, sin cortes. Devuelve dónde quedó su borde de abajo.
function recdLinea(ctx, pinta, txt, o) {
  const tam = recdTamanoDe(o.fuente);
  if (pinta) {
    ctx.font = o.fuente;
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'alphabetic';
    if (o.espaciado) {
      ctx.textAlign = 'left';
      const ancho = recdAnchoEspaciado(ctx, txt, o.espaciado);
      recdConEspaciado(ctx, txt, o.centrado ? o.x - ancho / 2 : o.x, o.y + tam, o.espaciado);
    } else {
      ctx.textAlign = o.centrado ? 'center' : 'left';
      ctx.fillText(txt, o.x, o.y + tam);
    }
  }
  return o.y + tam;
}

// Texto que se parte solo en varios renglones.
function recdParrafo(ctx, pinta, txt, o) {
  ctx.font = o.fuente;
  const renglones = recdPartir(ctx, String(txt || ''), o.ancho);
  if (pinta) {
    ctx.fillStyle = o.color;
    ctx.textAlign = o.centrado ? 'center' : 'left';
    ctx.textBaseline = 'alphabetic';
    renglones.forEach(function (r, i) {
      ctx.fillText(r, o.x, o.y + o.alto * i + recdTamanoDe(o.fuente));
    });
  }
  return o.y + o.alto * (renglones.length - 1) + recdTamanoDe(o.fuente);
}

function recdPartir(ctx, txt, ancho) {
  const palabras = txt.split(/\s+/).filter(Boolean);
  if (!palabras.length) return [''];
  const salida = [];
  let actual = palabras[0];
  for (let i = 1; i < palabras.length; i++) {
    const prueba = actual + ' ' + palabras[i];
    if (ctx.measureText(prueba).width <= ancho) {
      actual = prueba;
    } else {
      salida.push(actual);
      actual = palabras[i];
    }
  }
  salida.push(actual);
  return salida;
}

function recdRecortar(ctx, txt, ancho) {
  if (ctx.measureText(txt).width <= ancho) return txt;
  let t = txt;
  while (t.length > 1 && ctx.measureText(t + '…').width > ancho) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

// La costura del recibo, de orilla a orilla.
function recdPuntos(ctx, pinta, izq, der, y) {
  if (pinta) recdPuntosCortos(ctx, izq, der, y, 'rgba(43, 33, 24, 0.45)', [3, 4]);
  return y + 1;
}

function recdPuntosCortos(ctx, x1, x2, y, color, patron) {
  if (x2 <= x1) return;
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(patron || [2, 4]);
  ctx.strokeStyle = color || 'rgba(43, 33, 24, 0.35)';
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

// La orilla de abajo: el recibo de la tienda sale de un rollo y la cajera lo
// ARRANCA. Sin esto la imagen parece una tarjeta, no un recibo.
function recdOrillaArrancada(ctx, alto) {
  const base = alto - RECD_DESGARRO;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, alto);
  ctx.lineTo(0, base);
  let x = 0;
  let arriba = true;
  while (x < RECD_ANCHO) {
    x = Math.min(x + 11, RECD_ANCHO);
    ctx.lineTo(x, base + (arriba ? RECD_DESGARRO * 0.75 : RECD_DESGARRO * 0.15));
    arriba = !arriba;
  }
  ctx.lineTo(RECD_ANCHO, alto);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function recdCajaRedonda(ctx, x, y, ancho, alto, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, r);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, r);
  ctx.arcTo(x, y + alto, x, y, r);
  ctx.arcTo(x, y, x + ancho, y, r);
  ctx.closePath();
}

// El canvas no sabe de letter-spacing: hay que poner letra por letra.
function recdConEspaciado(ctx, txt, x, y, espacio) {
  let cx = x;
  for (const letra of txt) {
    ctx.fillText(letra, cx, y);
    cx += ctx.measureText(letra).width + espacio;
  }
}

function recdAnchoEspaciado(ctx, txt, espacio) {
  let ancho = 0;
  for (const letra of txt) ancho += ctx.measureText(letra).width + espacio;
  return ancho - espacio;
}

// ----------------------------------------------------------------
// Cosas chiquitas
// ----------------------------------------------------------------

function recdTamanoDe(fuente) {
  const m = /(\d+(?:\.\d+)?)px/.exec(fuente);
  return m ? parseFloat(m[1]) : 16;
}

// La plata se escribe EXACTAMENTE como en la pantalla: misma moneda, mismos
// puntos. Si la imagen dijera otra cifra que el recibo, no serviría de nada.
function recdPlata(n) {
  if (typeof recPlata === 'function') return recPlata(n);
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

function recdDominio(link) {
  if (typeof recDominio === 'function') return recDominio(link);
  try { return new URL(link).hostname.replace(/^www\./, ''); }
  catch (e) { return String(link).slice(0, 40); }
}

// El consejo se saca de la PANTALLA, no de la bolsa de frases: la imagen tiene
// que traer la misma frase que la persona está leyendo, no otra al azar.
function recdTextoDe(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.trim() : '';
}

function recdHoy() {
  try {
    return new Date().toLocaleDateString('es-CO',
      { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return new Date().toLocaleDateString();
  }
}
