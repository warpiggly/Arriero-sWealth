// =================================================================
// ahorro.js — Las cuentas del arriero
//
// Fase 3 del rediseño (docs/modulo-ahorro/PLAN.md). Aquí la app aprende a
// RESPONDER. Todavía sin cara: esto solo saca números y frases; el recibo que
// los muestra es la Fase 4.
//
// ESTE ARCHIVO NO TOCA LA PANTALLA NI EL ALMACÉN. Todas las funciones son
// puras: uno les pasa los datos y devuelven la respuesta. Así se pueden probar
// con lápiz y papel al lado, que es como se revisó la Fase 3.
//
// LAS CUATRO REGLAS QUE MANDAN AQUÍ
//
//   1. NUNCA DEJARLO EN "NO". Si algo no es válido, hay que decir qué haría
//      falta para que sí lo fuera (README, punto 7). Ningún camino de este
//      archivo termina en un "no" pelado.
//
//   2. SIEMPRE EN PALABRAS, no solo en color. Cada veredicto trae su frase.
//      Un semáforo verde o rojo no le dice nada a quien no distingue bien los
//      colores, y una frase sí.
//
//   3. REDONDEAR HACIA ARRIBA. Si la cuenta da 4,25 meses, se dicen 5 — porque
//      a los 4 meses todavía le falta plata, y decirle 4 sería mentirle. El
//      README traía "~4 meses" para ese ejemplo; la cuenta honesta da 5.
//
//   4. EL INGRESO 0 NO ES UN ERROR. Es un caso normal (README, punto 3.1):
//      la app no se queda muda, dice cuánto tendría que juntar.
// =================================================================

// Más de esto es "se va a demorar muchísimo". Decidido por David el 2 de
// septiembre de 2026: año y medio. Se escogió sobre los 24 meses de la
// propuesta original para que la app sea franca temprano, en vez de dejar a
// alguien meses guardando para algo que no va a llegar.
const AHORRO_SE_DEMORA = 18;

// Los plazos de los botones. No hay calendario: nadie tiene que escribir una
// fecha (README, punto 6).
const AHORRO_PLAZOS = [3, 6, 12];

// Cuántos de cada periodo caben en un mes. Sirve para decirle lo que le pesa
// en la moneda de tiempo que la persona vive: a quien le pagan por quincena,
// "3 quincenas" le dice más que "un mes y medio".
// `un`, `entero` y `medio` van por separado porque el español no perdona:
// "una quincena entera" y "un mes entero". Sin esto la app decía "seis
// quincenas enteros", que a este público le suena a que la escribió una
// máquina — y es justo lo que no puede pasar.
const AHORRO_PERIODOS = {
  dia:      { uno: 'día',      varios: 'días',      un: 'un',  entero: 'entero', enteros: 'enteros', medio: 'medio', alMes: 30 },
  semana:   { uno: 'semana',   varios: 'semanas',   un: 'una', entero: 'entera', enteros: 'enteras', medio: 'media', alMes: 52 / 12 },
  quincena: { uno: 'quincena', varios: 'quincenas', un: 'una', entero: 'entera', enteros: 'enteras', medio: 'media', alMes: 2 },
  mes:      { uno: 'mes',      varios: 'meses',     un: 'un',  entero: 'entero', enteros: 'enteros', medio: 'medio', alMes: 1 }
};

// ----------------------------------------------------------------
// 1. La hoja del mes: ¿cuánto gasta y cuánto le queda?
// ----------------------------------------------------------------
//
// Rehecha el 24 de septiembre de 2026 con el cuaderno de David:
//
//   restante = lo que gana − lo necesario − los otros gastos − el ahorro
//
//   · lo necesario (mercado, casa, servicios, transporte, deudas) -> se RESTA
//   · los otros gastos (gym, mascotas… = los "gustos" del 70/30)   -> se RESTAN
//   · el ahorro -> se APARTA. No es gasto: no entra al porcentaje gastado.
//     Si la persona marca "mi ahorro lo puedo usar", esa plata vuelve a contar
//     para comprar cosas; si no, es un colchón y no se toca.
//
// Los porcentajes van sobre lo que gana. Con ingreso 0 no hay porcentaje que
// dar: van en null y la pantalla pone una raya.
// En porcentajes enteros: 0,3 − 0,1 en decimales da 0,19999… y el tope salía
// con centavos de más.
const AHORRO_REGLA = { necesarios: 70, gustos: 30, ahorro: 10 };

function ahorroHoja(ajustes) {
  const a = ajustes || {};
  const g = a.gastos || {};
  const ingreso = Math.max(0, a.ingreso || 0);

  // Las cuotas de los créditos entran solas con las deudas (src/credito.js).
  const necesarios = ['mercado', 'casa', 'servicios', 'transporte', 'deudas']
    .reduce(function (t, k) { return t + (g[k] || 0); }, 0) + (a.cuotasCreditos || 0);
  const otros = (a.otros || []).reduce(function (t, o) { return t + (o.monto || 0); }, 0);
  const ahorro = g.ahorro || 0;
  const gastado = necesarios + otros;
  const restante = ingreso - gastado - ahorro;

  const pct = function (n) { return ingreso > 0 ? n / ingreso * 100 : null; };
  const pctNecesarios = pct(necesarios);
  const pctRestante = pct(restante);

  return {
    ingreso: ingreso,
    necesarios: necesarios,
    otros: otros,
    ahorro: ahorro,
    gastado: gastado,
    restante: restante,
    pctNecesarios: pctNecesarios,
    pctOtros: pct(otros),
    pctAhorro: pct(ahorro),
    pctGastado: pct(gastado),
    pctRestante: pctRestante,
    // El color de lo necesario: < 70 % bien · 70–80 % ojo · 80 % o más, no.
    tonoNecesarios: pctNecesarios === null ? 'nada'
      : pctNecesarios < 70 ? 'bien' : pctNecesarios < 80 ? 'ojo' : 'no',
    tonoRestante: ingreso <= 0 && !gastado ? 'nada'
      : restante > 0 ? 'bien' : restante === 0 ? 'ojo' : 'no',
    reglas: ahorroTopes(a, ingreso, necesarios, otros, ahorro),
    consejo: ahorroConsejoDeLaHoja(ingreso, necesarios, otros, ahorro, restante,
                                   ajustesFaltaElPrellenado(a))
  };
}

// Lo que le toca según las reglas que tenga prendidas. Solo MUESTRA topes: no
// cambia ningún número de la persona. Con las dos juntas, el 10 % del ahorro
// sale de los gustos: 70 / 20 / 10.
function ahorroTopes(a, ingreso, necesarios, otros, ahorro) {
  const lista = [];
  const tope = function (pct) { return Math.round(ingreso * pct / 100); };
  if (a.regla7030) {
    const pGustos = a.regla10 ? AHORRO_REGLA.gustos - AHORRO_REGLA.ahorro : AHORRO_REGLA.gustos;
    lista.push({ que: 'necesarios', rotulo: 'Lo necesario', pct: AHORRO_REGLA.necesarios,
                 tope: tope(AHORRO_REGLA.necesarios), lleva: necesarios, esTecho: true });
    lista.push({ que: 'gustos', rotulo: 'Sus gustos', pct: pGustos,
                 tope: tope(pGustos), lleva: otros, esTecho: true });
  }
  if (a.regla10) {
    lista.push({ que: 'ahorro', rotulo: 'Para guardar', pct: AHORRO_REGLA.ahorro,
                 tope: tope(AHORRO_REGLA.ahorro), lleva: ahorro, esTecho: false });
  }
  // esTecho: el tope es "hasta" (no pasarse). El ahorro es "por lo menos".
  lista.forEach(function (r) {
    r.diferencia = r.esTecho ? r.tope - r.lleva : r.lleva - r.tope;
    r.cumple = ingreso > 0 && r.diferencia >= 0;
  });
  return lista;
}

function ahorroConsejoDeLaHoja(ingreso, necesarios, otros, ahorro, restante, vacio) {
  if (ingreso <= 0) return 'Cuando me diga cuánto gana al mes, le digo cómo va.';
  if (vacio) return 'Anote en qué se le va la plata y le digo cómo va, mijo.';
  if (restante < 0) {
    return otros > 0
      ? 'Está gastando más de lo que gana. Empiece por los otros gastos: ahí es donde más fácil se recorta.'
      : 'Está gastando más de lo que gana. Mire las deudas y los servicios: son los que más se pueden bajar.';
  }
  const pNec = necesarios / ingreso;
  if (pNec >= 0.8) return 'Lo necesario se le lleva casi todo. Mire si alguna deuda o servicio se puede bajar.';
  if (pNec >= 0.7) return 'Va justo, mijo. Un recorte chiquito en los otros gastos le da aire.';
  if (ahorro < ingreso * AHORRO_REGLA.ahorro / 100) {
    return 'Va bien. Si puede, aparte el 10 % de lo que gana: poquito a poco se vuelve su colchón.';
  }
  return 'Va muy bien, mijo. Siga así y no le meta mano a lo que guarda.';
}

// ----------------------------------------------------------------
// 1b. La cuenta base: ¿cuánto puede juntar al mes para comprar?
// ----------------------------------------------------------------
//
// Es lo que le sobra de la hoja, más el ahorro si la persona dijo que lo puede
// usar. Si no, el ahorro va al colchón y no cuenta.
//
// Devuelve { alMes, ingresoAlMes, gastosAlMes, colchonAlMes, faltaPrellenado }
function ahorroCapacidad(ajustes) {
  const a = ajustes || {};
  const h = ahorroHoja(a);
  const disponible = a.ahorroDisponible === true;

  return {
    alMes: h.restante + (disponible ? h.ahorro : 0),
    ingresoAlMes: h.ingreso,
    gastosAlMes: h.gastado,
    colchonAlMes: disponible ? 0 : h.ahorro,
    // Todo en cero: la cuenta va a asumir que puede guardar TODO lo que gana.
    // Es verdad aritméticamente y mentira en la vida real, así que la pantalla
    // tiene que avisarlo (README, punto 3.2). Aquí solo se marca.
    faltaPrellenado: ajustesFaltaElPrellenado(a)
  };
}

// Lo que tiene juntado HOY para comprar cosas, y su reserva aparte.
function ahorroJuntado(ajustes) {
  const a = ajustes || {};
  return {
    paraComprar: a.ahorroJuntado || 0,
    colchon: a.colchonJuntado || 0
  };
}

// ----------------------------------------------------------------
// 2. ¿En cuánto tiempo lo consigue?
// ----------------------------------------------------------------
//
// Devuelve { alcanzable, meses, dias, yaLoTiene, falta }
// `meses` va redondeado HACIA ARRIBA (regla 3).
function ahorroCuandoLoTiene(precio, capacidadAlMes, yaJuntado) {
  const p = Math.max(0, precio || 0);
  const cap = capacidadAlMes || 0;
  const ya = Math.max(0, yaJuntado || 0);
  const falta = Math.max(0, p - ya);

  if (falta === 0) {
    return { alcanzable: true, meses: 0, dias: 0, yaLoTiene: true, falta: 0 };
  }
  if (cap <= 0) {
    // No puede juntar nada: no hay plazo que dar. Quien pregunte por el plazo
    // se queda sin número, pero el veredicto sí tiene qué decirle.
    return { alcanzable: false, meses: null, dias: null, yaLoTiene: false, falta: falta };
  }

  const mesesExactos = falta / cap;
  return {
    alcanzable: true,
    meses: Math.ceil(mesesExactos),
    dias: Math.ceil(mesesExactos * 30),
    yaLoTiene: false,
    falta: falta
  };
}

// Los meses, dichos como los diría una persona.
function ahorroPlazoEnPalabras(meses) {
  if (meses === null || meses === undefined) return 'no se sabe';
  if (meses <= 0) return 'ya mismo';
  if (meses === 1) return 'en un mes';
  if (meses < 12) return 'en ' + meses + ' meses';

  const anios = Math.floor(meses / 12);
  const sobran = meses % 12;
  const parteAnios = anios === 1 ? 'un año' : anios + ' años';
  if (!sobran) return 'en ' + parteAnios;
  const parteMeses = sobran === 1 ? 'un mes' : sobran + ' meses';
  return 'en ' + parteAnios + ' y ' + parteMeses;
}

// La fecha, para el renglón de "o sea, para…".
function ahorroFechaTexto(meses, desde) {
  if (meses === null || meses === undefined) return '';
  const hoy = desde ? new Date(desde) : new Date();
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return MESES[d.getMonth()] + ' de ' + d.getFullYear();
}

// ----------------------------------------------------------------
// 3. El veredicto: ¿es válido para él?
// ----------------------------------------------------------------
//
// Cuatro casos, cada uno con su frase (README, punto 7). Devuelve
// { caso, frase, porque, tono } donde `caso` es:
//   'alcanza'    le alcanza con lo que le sobra, sin tocar el colchón
//   'colchon'    solo le alcanza metiéndole mano a la reserva
//   'no-alcanza' no le alcanza de ninguna manera — y cuánto le falta
//   'lento'      le alcanza pero se demora muchísimo
//
// El tono es para que la pantalla escoja el color. El COLOR ACOMPAÑA, LA FRASE
// MANDA: el tono nunca reemplaza al texto.
function ahorroVeredicto(datos) {
  const precio = Math.max(0, (datos && datos.precio) || 0);
  const cap = (datos && datos.capacidadAlMes) || 0;
  const ya = Math.max(0, (datos && datos.juntado) || 0);
  const colchon = Math.max(0, (datos && datos.colchon) || 0);

  const cuando = ahorroCuandoLoTiene(precio, cap, ya);

  // Ya lo tiene juntado: no hay nada que esperar.
  if (cuando.yaLoTiene) {
    return {
      caso: 'alcanza',
      tono: 'bien',
      frase: 'Sí le alcanza, mijo',
      porque: 'Con lo que ya tiene guardado.'
    };
  }

  // No puede juntar nada. Aquí es donde la regla de oro pesa más: en vez de un
  // "no", se le dice cuánto necesitaría guardar para llegar en un año.
  if (!cuando.alcanzable) {
    const porMes = Math.ceil(cuando.falta / 12);
    return {
      caso: 'no-alcanza',
      tono: 'no',
      frase: 'Todavía no le alcanza',
      porque: 'Para tenerlo en un año le tocaría juntar ' +
              ahorroPlata(porMes) + ' al mes, o ' +
              ahorroPlata(Math.ceil(porMes / 30)) + ' al día.',
      necesitaAlMes: porMes
    };
  }

  // Con la reserva alcanza YA, pero se la gasta. Se dice, y se dice también
  // cuánto tendría que esperar para no tocarla.
  if (colchon > 0 && (ya + colchon) >= precio) {
    const delColchon = precio - ya;
    const queda = colchon - delColchon;
    return {
      caso: 'colchon',
      tono: 'ojo',
      frase: 'Le alcanza, pero se gasta la reserva',
      porque: 'Saca ' + ahorroPlata(delColchon) + ' y le quedan ' +
              ahorroPlata(queda) + '. Esperando ' +
              ahorroPlazoEnPalabras(cuando.meses).replace(/^en /, '') +
              ' no lo toca.',
      delColchon: delColchon,
      quedaDeColchon: queda
    };
  }

  // Le alcanza, pero se va a demorar muchísimo. Otra vez: no se deja en el
  // aviso, se dice cuánto habría que guardar para que no se demore tanto.
  if (cuando.meses > AHORRO_SE_DEMORA) {
    const paraElTope = Math.ceil(cuando.falta / AHORRO_SE_DEMORA);
    return {
      caso: 'lento',
      tono: 'lento',
      frase: 'Le alcanza, pero se va a demorar',
      porque: 'Con ' + ahorroPlata(paraElTope) +
              ' al mes lo tendría en año y medio.',
      meses: cuando.meses,
      paraNoDemorarse: paraElTope
    };
  }

  // Le alcanza y en un plazo sensato.
  //
  // Aquí el porqué va CORTO, y si no hay nada que agregar va VACÍO: el plazo
  // ya quedó dicho arriba, en el renglón de "lo tendrá". Repetirlo debajo del
  // veredicto solo alargaba el recibo sin decir nada nuevo.
  return {
    caso: 'alcanza',
    tono: 'bien',
    frase: 'Sí le alcanza, mijo',
    porque: colchon > 0 ? 'Sin tocar su colchón.' : '',
    meses: cuando.meses
  };
}

// ----------------------------------------------------------------
// 4. Cuánto le va a afectar en su economía
// ----------------------------------------------------------------
//
// La casilla que hoy no existe en el código y que convierte un precio en algo
// que se siente. La regla: DECIRLO EN ALGO QUE LA PERSONA VIVE, no en un
// porcentaje (README, punto 8).
//
//    mal  ->  "representa el 41,3 % de su capacidad de ahorro mensual"
//    bien ->  "esto se le lleva casi la mitad de lo que guarda cada mes"
//    bien ->  "son 3 quincenas completas de lo que le sobra"
//
// Se dice en la moneda de tiempo de la persona: si le pagan por quincena, en
// quincenas. Por eso recibe la frecuencia.
function ahorroLoQuePesa(precio, capacidadAlMes, frecuencia) {
  const p = Math.max(0, precio || 0);
  const cap = capacidadAlMes || 0;

  if (p === 0) return 'No cuesta nada, mijo.';
  if (cap <= 0) {
    return 'Hoy no le queda nada para guardar, así que todo esto es cuesta arriba.';
  }

  const per = AHORRO_PERIODOS[frecuencia] || AHORRO_PERIODOS.mes;
  // Lo que guarda en un periodo de los suyos
  const porPeriodo = cap / per.alMes;
  const veces = p / porPeriodo;

  if (veces < 0.2) {
    return 'Es un pedacito de lo que usted guarda cada ' + per.uno + ': no lo va a sentir.';
  }
  if (veces < 0.4) {
    return 'Es como la cuarta parte de lo que guarda cada ' + per.uno + '.';
  }
  if (veces < 0.7) {
    return 'Se le lleva casi la mitad de lo que guarda cada ' + per.uno + '.';
  }
  if (veces < 0.95) {
    return 'Se le lleva casi todo lo que guarda en ' + per.un + ' ' + per.uno + '.';
  }
  if (veces < 1.3) {
    return 'Es ' + per.un + ' ' + per.uno + ' ' + per.entero +
           ' de todo lo que usted guarda.';
  }

  return 'Son ' + ahorroCantidadEnPalabras(veces, per) + ' de todo lo que usted guarda.';
}

// 2 -> "dos meses" · 4,25 -> "cuatro meses y medio" · 43 -> "43 meses"
// Se redondea a medios: la gente no piensa en cuartos de quincena.
function ahorroCantidadEnPalabras(cantidad, periodo) {
  const NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
               'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
  const medios = Math.round(cantidad * 2) / 2;
  const entero = Math.floor(medios);
  const conMedio = medios - entero >= 0.5;

  if (entero > 12) {
    return Math.round(medios) + ' ' + periodo.varios + ' ' + periodo.enteros;
  }

  const palabra = entero === 1 ? periodo.un : NUM[entero];
  const cuantos = entero === 1 ? periodo.uno : periodo.varios;

  if (!conMedio) {
    return palabra + ' ' + cuantos + ' ' +
           (entero === 1 ? periodo.entero : periodo.enteros);
  }
  return palabra + ' ' + cuantos + ' y ' + periodo.medio;
}

// ----------------------------------------------------------------
// 5. Los botones de plazo
// ----------------------------------------------------------------
//
// "¿Y si lo quiero en 3 / 6 / 12 meses?" Devuelve qué tendría que guardar y,
// si no le da, cuánto le faltaría — nunca un "no" pelado.
function ahorroPorPlazo(precio, meses, capacidadAlMes, yaJuntado) {
  const falta = Math.max(0, (precio || 0) - Math.max(0, yaJuntado || 0));
  const cap = capacidadAlMes || 0;
  const porMes = meses > 0 ? Math.ceil(falta / meses) : 0;

  if (falta === 0) {
    return {
      meses: meses, porMes: 0, alcanza: true, faltaAlMes: 0,
      dice: 'Ya lo tiene, mijo. No hay que guardar nada más.'
    };
  }

  if (porMes <= cap) {
    return {
      meses: meses, porMes: porMes, alcanza: true, faltaAlMes: 0,
      dice: 'Para tenerlo en ' + meses + ' meses tendría que guardar ' +
            ahorroPlata(porMes) + ' al mes. Usted ya guarda ' +
            ahorroPlata(cap) + ': le sobra.'
    };
  }

  const faltaAlMes = porMes - cap;
  return {
    meses: meses, porMes: porMes, alcanza: false, faltaAlMes: faltaAlMes,
    dice: 'Para tenerlo en ' + meses + ' meses tendría que guardar ' +
          ahorroPlata(porMes) + ' al mes, y hoy guarda ' + ahorroPlata(cap) +
          '. Le faltarían ' + ahorroPlata(faltaAlMes) + ' cada mes — serían ' +
          ahorroPlata(Math.ceil(faltaAlMes / 30)) + ' al día.'
  };
}

// Los tres plazos de una, para pintar los tres botones.
function ahorroTodosLosPlazos(precio, capacidadAlMes, yaJuntado) {
  return AHORRO_PLAZOS.map(function (m) {
    return ahorroPorPlazo(precio, m, capacidadAlMes, yaJuntado);
  });
}

// ----------------------------------------------------------------
// 6. La cuenta completa de UNA cosa
// ----------------------------------------------------------------
//
// Es lo que el recibo unitario necesita, todo junto: las cinco cosas del
// punto 5 del README.
function ahorroCuentaUnitaria(item, ajustes) {
  const cap = ahorroCapacidad(ajustes);
  const jun = ahorroJuntado(ajustes);
  const precio = Math.max(0, (item && item.precio) || 0);

  const cuando = ahorroCuandoLoTiene(precio, cap.alMes, jun.paraComprar);
  const veredicto = ahorroVeredicto({
    precio: precio,
    capacidadAlMes: cap.alMes,
    juntado: jun.paraComprar,
    colchon: jun.colchon
  });

  return {
    nombre: (item && item.nombre) || '',
    precio: precio,
    link: (item && item.link) || '',
    capacidad: cap,
    juntado: jun,
    cuando: cuando,
    cuandoEnPalabras: ahorroPlazoEnPalabras(cuando.meses),
    fecha: ahorroFechaTexto(cuando.meses),
    veredicto: veredicto,
    loQuePesa: ahorroLoQuePesa(precio, cap.alMes, 'mes'),
    plazos: ahorroTodosLosPlazos(precio, cap.alMes, jun.paraComprar),
    // La pantalla usa esto para poner el aviso de "estoy contando con que todo
    // lo que gana lo puede guardar".
    avisoPrellenado: cap.faltaPrellenado
      ? 'Estoy contando con que todo lo que gana lo puede guardar. Dígame en ' +
        'qué se le va la plata y le hago la cuenta de verdad.'
      : ''
  };
}

// ----------------------------------------------------------------
// 7. La cuenta de un GRUPO
// ----------------------------------------------------------------
//
// Lo mismo, y además el desglose: cuánto cuesta cada cosa por separado, cuánto
// es todo junto, y cuánto le pesa cada una y el conjunto.
//
// Por ahora NO hay orden de prioridad dentro del grupo (README, punto 10). Lo
// que sí hace es señalar lo más barato, para que el aviso de "se demora" nunca
// se quede sin salida: "la mesa la tiene en 2 meses, arranque por ahí".
function ahorroCuentaGrupal(nombreGrupo, items, ajustes) {
  const cap = ahorroCapacidad(ajustes);
  const jun = ahorroJuntado(ajustes);
  const lista = (items || []).slice();

  const total = lista.reduce(function (a, i) { return a + Math.max(0, i.precio || 0); }, 0);

  // Cada cosa, por separado, como si fuera la única
  const desglose = lista.map(function (i) {
    const precio = Math.max(0, i.precio || 0);
    const c = ahorroCuandoLoTiene(precio, cap.alMes, jun.paraComprar);
    return {
      id: i.id,
      nombre: i.nombre || '',
      precio: precio,
      // De dónde salió el precio: la hoja del reverso lo muestra por fila.
      link: i.link || '',
      meses: c.meses,
      mesesEnPalabras: ahorroPlazoEnPalabras(c.meses),
      // Cuánto pesa dentro del grupo, dicho en palabras y no en porcentaje
      pesaEnElGrupo: ahorroParteDelGrupo(precio, total),
      loQuePesa: ahorroLoQuePesa(precio, cap.alMes, 'mes')
    };
  });

  const cuando = ahorroCuandoLoTiene(total, cap.alMes, jun.paraComprar);
  const veredicto = ahorroVeredicto({
    precio: total,
    capacidadAlMes: cap.alMes,
    juntado: jun.paraComprar,
    colchon: jun.colchon
  });

  // La más barata que sí se alcance pronto, para el "arranque por ahí"
  const alcanzables = desglose
    .filter(function (d) { return d.meses !== null && d.precio > 0; })
    .sort(function (a, b) { return a.precio - b.precio; });
  const porDondeArrancar = alcanzables.length ? alcanzables[0] : null;

  if (porDondeArrancar && (veredicto.caso === 'lento' || veredicto.caso === 'no-alcanza')) {
    veredicto.frase = 'Todo junto se va a demorar';
    veredicto.porque = veredicto.porque +
      ' Pero ' + (porDondeArrancar.nombre || 'la más barata') + ' la tiene ' +
      porDondeArrancar.mesesEnPalabras + ': arranque por ahí.';
  }

  return {
    grupo: nombreGrupo || '',
    cuantos: lista.length,
    total: total,
    capacidad: cap,
    juntado: jun,
    desglose: desglose,
    cuando: cuando,
    cuandoEnPalabras: ahorroPlazoEnPalabras(cuando.meses),
    fecha: ahorroFechaTexto(cuando.meses),
    veredicto: veredicto,
    loQuePesa: ahorroLoQuePesa(total, cap.alMes, 'mes'),
    plazos: ahorroTodosLosPlazos(total, cap.alMes, jun.paraComprar),
    porDondeArrancar: porDondeArrancar,
    avisoPrellenado: cap.faltaPrellenado
      ? 'Estoy contando con que todo lo que gana lo puede guardar. Dígame en ' +
        'qué se le va la plata y le hago la cuenta de verdad.'
      : ''
  };
}

// Qué parte del grupo es una cosa, en palabras. Otra vez: nada de porcentajes.
function ahorroParteDelGrupo(precio, total) {
  if (!total || !precio) return '';
  const parte = precio / total;
  if (parte >= 0.9) return 'es casi todo el grupo';
  if (parte >= 0.7) return 'se lleva siete de cada diez pesos del grupo';
  if (parte >= 0.55) return 'se lleva tres de cada cinco pesos del grupo';
  if (parte >= 0.45) return 'es como la mitad del grupo';
  if (parte >= 0.28) return 'es como la tercera parte del grupo';
  if (parte >= 0.18) return 'es como la quinta parte del grupo';
  return 'es una parte chiquita del grupo';
}

// ----------------------------------------------------------------
// Formato de plata
//
// Las cifras van METIDAS DENTRO de las frases del veredicto ("tendría que
// sacar $800.000 del colchón"), así que este archivo necesita saber escribir
// dinero. Pero no tiene por qué saber de monedas: si la app le presta su
// función, la usa — y así el recibo respeta la moneda que la persona escogió
// arriba. Si no está (por ejemplo cuando se prueba este archivo solo, sin
// cargar media app), se arregla con pesos colombianos.
// ----------------------------------------------------------------
function ahorroPlata(n) {
  if (typeof formatearDineroLimpio === 'function') {
    return formatearDineroLimpio(Number(n) || 0);
  }
  const num = Math.round(Number(n) || 0);
  return '$' + num.toLocaleString('es-CO');
}
