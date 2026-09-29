// =================================================================
// cobro-descargar.js — La cuenta de cobro, en papel que se puede mandar
//
// Lo primero que se hace con una cuenta de cobro es MANDARLA: por WhatsApp,
// al cliente. Por eso baja una IMAGEN, como el recibo de Ahorro: una foto se
// abre en cualquier celular sin instalar nada.
//
// Usa las mismas piezas de dibujo del recibo (src/recibo-descargar.js):
// renglones con puntos, la costura, la orilla arrancada. Aquí no se calcula
// nada: todo sale de la cuenta que ya pintó la pantalla (src/cobrar.js).
//
// SI SE LE AGREGA UN RENGLÓN A LA CUENTA DE PANTALLA, hay que agregarlo aquí.
// =================================================================

function cobdDescargar(c) {
  if (!c) return;
  const boton = document.getElementById('cob-r-descargar');
  if (boton) boton.disabled = true;

  Promise.all([recdLetrasListas(), recdCarriel()])
    .then(function () {
      return recdBajar(cobdDibujar(c), cobdNombreArchivo(c));
    })
    .then(function () {
      if (typeof cobAvisar === 'function') cobAvisar('Listo: la cuenta quedó en sus Descargas. Mándela por WhatsApp.');
    })
    .catch(function (e) {
      console.error('No se pudo bajar la cuenta:', e);
      if (typeof cobAvisar === 'function') cobAvisar('No se pudo bajar la cuenta. Intente otra vez.');
    })
    .then(function () { if (boton) boton.disabled = false; });
}

function cobdNombreArchivo(c) {
  const limpio = String(c.cliente || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const tipo = c.tipo === 'presupuesto' ? 'presupuesto' : 'cuenta-de-cobro';
  return tipo + '-' + String(c.numero).padStart(4, '0') + (limpio ? '-' + limpio : '') + '.png';
}

function cobdDibujar(c) {
  const medir = document.createElement('canvas').getContext('2d');
  const alto = cobdContenido(medir, c, false);

  const lienzo = document.createElement('canvas');
  lienzo.width = RECD_ANCHO * RECD_ESCALA;
  lienzo.height = Math.ceil(alto) * RECD_ESCALA;
  const ctx = lienzo.getContext('2d');
  ctx.scale(RECD_ESCALA, RECD_ESCALA);
  ctx.fillStyle = RECD_COLOR.crema;
  ctx.fillRect(0, 0, RECD_ANCHO, alto);

  cobdContenido(ctx, c, true);
  recdOrillaArrancada(ctx, alto);
  return lienzo;
}

function cobdContenido(ctx, c, pinta) {
  const esPres = c.tipo === 'presupuesto';
  const izq = RECD_MARGEN;
  const der = RECD_ANCHO - RECD_MARGEN;
  const centro = RECD_ANCHO / 2;
  const tenue = 'rgba(43, 33, 24, 0.55)';
  let y = 30;

  // --- La cabecera: quién cobra, qué papel es, número y fecha ---
  if (c.yo) {
    y = recdParrafo(ctx, pinta, c.yo, {
      x: centro, y: y, ancho: der - izq, fuente: 'bold 20px LiberationSans',
      color: RECD_COLOR.texto, centrado: true, alto: 25
    });
    y += 8;
  }
  y = recdLinea(ctx, pinta, (esPres ? 'PRESUPUESTO' : 'CUENTA DE COBRO'), {
    x: centro, y: y, fuente: '17px ScothBrace', color: RECD_COLOR.marron,
    centrado: true, espaciado: 1.7
  });
  y += 6;
  y = recdLinea(ctx, pinta, cobroNumeroBonito(c.numero) + '  ·  ' + cobFecha(c.fecha), {
    x: centro, y: y, fuente: '13px LiberationSans', color: tenue, centrado: true
  });
  y += 14;
  y = recdPuntos(ctx, pinta, izq, der, y);

  // --- A quién y por qué ---
  y += 14;
  y = cobdParte(ctx, pinta, esPres ? 'Para' : 'Señor(a)', c.cliente, izq, der, y);
  if (c.yo) y = cobdParte(ctx, pinta, esPres ? 'De' : 'Debe a', c.yo, izq, der, y);
  if (c.trabajo) y = cobdParte(ctx, pinta, 'Por', c.trabajo, izq, der, y);

  // --- La suma, en números y en letras ---
  y += 10;
  y = recdPuntos(ctx, pinta, izq, der, y);
  y += 16;
  y = recdLinea(ctx, pinta, 'LA SUMA DE', {
    x: centro, y: y, fuente: 'bold 11px LiberationSans', color: 'rgba(43, 33, 24, 0.5)',
    centrado: true, espaciado: 1.1
  });
  y += 6;
  y = recdLinea(ctx, pinta, recdPlata(c.total), {
    x: centro, y: y, fuente: 'bold 35px LiberationSans', color: RECD_COLOR.verdeOscuro, centrado: true
  });
  y += 8;
  y = recdParrafo(ctx, pinta, cobroEnLetras(c.total, cobMoneda()), {
    x: centro, y: y, ancho: der - izq, fuente: 'italic 15px LiberationSans',
    color: 'rgba(43, 33, 24, 0.75)', centrado: true, alto: 20
  });
  y += 18;
  y = recdPuntos(ctx, pinta, izq, der, y);

  // --- Renglón por renglón ---
  y += 14;
  y = recdRotulito(ctx, pinta, 'El detalle', izq, y);
  y += 8;
  c.renglones.forEach(function (r) {
    y = cobdRenglon(ctx, pinta, r.rotulo, recdPlata(r.valor), false, izq, der, y);
  });
  if (c.descuento > 0) {
    y = cobdRenglon(ctx, pinta, 'Descuento (' + cobroCifra(c.descuentoPct) + ' %)',
                    '− ' + recdPlata(c.descuento), false, izq, der, y);
  }
  y += 4;
  if (pinta) {
    ctx.save();
    ctx.strokeStyle = RECD_COLOR.texto;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(izq, y + 0.5);
    ctx.lineTo(der, y + 0.5);
    ctx.stroke();
    ctx.restore();
  }
  y += 8;
  y = recdRenglon(ctx, pinta, 'Total', recdPlata(c.total), '', true, izq, der, y);

  // --- Los abonos ---
  if (c.abonos && c.abonos.length) {
    y += 8;
    y = recdRotulito(ctx, pinta, 'Lo que ha pagado', izq, y);
    y += 8;
    c.abonos.forEach(function (a) {
      y = recdRenglon(ctx, pinta, 'Abono del ' + cobFechaCorta(a.fecha), recdPlata(a.monto),
                      '', false, izq, der, y);
    });
  }

  // --- El sello ---
  y += 14;
  y = cobdSello(ctx, pinta, cobEstadoEnPalabras(c), izq, der, y);

  // --- La firma ---
  y += 34;
  if (pinta) recdPuntosCortos(ctx, centro - 120, centro + 120, y, 'rgba(43, 33, 24, 0.5)', [1, 0]);
  y += 6;
  y = recdLinea(ctx, pinta, 'Firma', {
    x: centro, y: y, fuente: '12px LiberationSans', color: 'rgba(43, 33, 24, 0.5)', centrado: true
  });

  y += 18;
  y = recdPuntos(ctx, pinta, izq, der, y);
  y += 14;
  y = recdLinea(ctx, pinta, 'Cuenta hecha con Arriero’s Wealth', {
    x: centro, y: y, fuente: '12px LiberationSans', color: 'rgba(43, 33, 24, 0.45)', centrado: true
  });
  return y + 16 + RECD_DESGARRO;
}

// "Señor(a): Don Julio". Sin nombre queda la raya, para llenarla a mano.
function cobdParte(ctx, pinta, rot, valor, izq, der, y) {
  const base = y + 16;
  if (pinta) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '15px LiberationSans';
    ctx.fillStyle = 'rgba(43, 33, 24, 0.6)';
    const r = rot + ':';
    ctx.fillText(r, izq, base);
    const x = izq + ctx.measureText(r).width + 8;
    if (valor) {
      ctx.font = 'bold 16px LiberationSans';
      ctx.fillStyle = RECD_COLOR.texto;
      ctx.fillText(recdRecortar(ctx, valor, der - x), x, base);
    } else {
      recdPuntosCortos(ctx, x, der, base, 'rgba(43, 33, 24, 0.45)', [1, 0]);
    }
  }
  return base + 10;
}

// Como recdRenglon, pero el nombre largo se recorta en vez de pisar la cifra.
function cobdRenglon(ctx, pinta, rot, valor, fuerte, izq, der, y) {
  if (pinta) {
    ctx.font = 'bold ' + (fuerte ? 19 : 16) + 'px LiberationSans';
    const ancho = ctx.measureText(valor).width;
    ctx.font = '16px LiberationSans';
    rot = recdRecortar(ctx, rot, der - izq - ancho - 24);
  }
  return recdRenglon(ctx, pinta, rot, valor, '', fuerte, izq, der, y);
}

// El sello del pago: un rectángulo de tinta, torcido como el de un sello de
// caucho. PAGADO en verde; lo demás en su color, siempre con palabras.
function cobdSello(ctx, pinta, e, izq, der, y) {
  const t = RECD_TONO[e.tono] || RECD_TONO.ojo;
  const centro = (izq + der) / 2;
  const ancho = Math.min(der - izq, 330);
  const alto = e.detalle ? 64 : 46;

  if (pinta) {
    ctx.save();
    ctx.translate(centro, y + alto / 2);
    ctx.rotate(e.tono === 'bien' ? -0.06 : -0.025);
    ctx.strokeStyle = t.linea;
    ctx.fillStyle = t.fondo;
    ctx.lineWidth = 3;
    recdCajaRedonda(ctx, -ancho / 2, -alto / 2, ancho, alto, 8);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.letra;
    ctx.font = 'bold 21px LiberationSans';
    ctx.fillText(e.titulo.toUpperCase(), 0, e.detalle ? -11 : 1);
    if (e.detalle) {
      ctx.font = '13px LiberationSans';
      ctx.fillStyle = 'rgba(43, 33, 24, 0.75)';
      ctx.fillText(recdRecortar(ctx, e.detalle, ancho - 20), 0, 15);
    }
    ctx.restore();
  }
  return y + alto + 6;
}
