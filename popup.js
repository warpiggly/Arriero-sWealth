document.addEventListener('DOMContentLoaded', function() { 
  // Cargar datos guardados
  cargarDatos();
  
  // Evento para cambiar pestañas
  const tabLinks = document.querySelectorAll('.tablinks');
  tabLinks.forEach(tab => {
    tab.addEventListener('click', function(e) {
      openTab(e, this.textContent.toLowerCase());
    });
  });
  
  // Llamar la función al cargar la página
  actualizarTotalGastos();

  // Guardar ingreso
  document.getElementById('guardarIngreso').addEventListener('click', function() {
    let ingresoTexto = document.getElementById('ingreso').value;
    ingresoTexto = ingresoTexto.replace(',', '.'); // Eliminar puntos
    const ingreso = parseFloat(ingresoTexto) || 0;
    
    chrome.storage.sync.set({ingreso: ingreso}, function() {
      alert('Ingreso guardado correctamente');
      actualizarResumen();
    });
  });
  
  // Guardar gastos
  document.getElementById('guardarGastos').addEventListener('click', function() {
    const gastos = {};
    const inputs = document.querySelectorAll('.gasto');
    
    inputs.forEach(input => {
      let valor = input.value.replace(/\./g, ''); // Eliminar puntos
      gastos[input.id] = parseFloat(valor) || 0;
    });
    
    // Guardar los gastos personalizados también
    chrome.storage.sync.get(['gastosPersonalizados'], function(data) {
      const gastosPersonalizados = data.gastosPersonalizados || [];
      
      // Guardar todos los gastos
      chrome.storage.sync.set({
        gastos: gastos,
        gastosPersonalizados: gastosPersonalizados
      }, function() {
        alert('Gastos guardados correctamente');
        actualizarResumen();
        actualizarGraficoGastos();
      });
    });
  });
  
  // Evento para agregar gastos personalizados
  document.getElementById('agregar-gasto-personalizado').addEventListener('click', function() {
    const nombre = document.getElementById('nuevo-gasto-nombre').value.trim();
    const montoTexto = document.getElementById('nuevo-gasto-monto').value.replace(/\./g, '');
    const monto = parseFloat(montoTexto) || 0;
    const categoria = document.getElementById('nuevo-gasto-categoria').value;
    
    if (nombre === '') {
      alert('Por favor, ingrese un nombre para el gasto');
      return;
    }
    
    if (monto <= 0) {
      alert('Por favor, ingrese un monto válido');
      return;
    }
    
    // Generar un ID único para el gasto personalizado
    const id = 'gasto_' + Date.now();
    
    // Guardar el nuevo gasto personalizado
    chrome.storage.sync.get(['gastosPersonalizados'], function(data) {
      const gastosPersonalizados = data.gastosPersonalizados || [];
      
      gastosPersonalizados.push({
        id: id,
        nombre: nombre,
        monto: monto,
        categoria: categoria
      });
      
      chrome.storage.sync.set({gastosPersonalizados: gastosPersonalizados}, function() {
        // Limpiar los campos
        document.getElementById('nuevo-gasto-nombre').value = '';
        document.getElementById('nuevo-gasto-monto').value = '';
        
        // Actualizar la interfaz
        mostrarGastosPersonalizados();
        actualizarResumen();
        actualizarGraficoGastos();
      });
    });
  });
  
  // Verificar si hay un análisis pendiente
  chrome.storage.local.get(['analisis'], function(data) {
  if (data.analisis) {
    // Corregimos el precio si es string con formato incorrecto
    if (typeof data.analisis.precio === 'string') {
      data.analisis.precio = limpiarPrecio(data.analisis.precio);
    }
    mostrarAnalisisCompra(data.analisis);
    openTab(null, 'analisis');
    chrome.storage.local.remove(['analisis']);
  }
});


  //Descargar Graficas
  document.getElementById("descargarGrafico").addEventListener("click", function() {
    const canvas = document.getElementById("graficoGastos");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "grafico_gastos.png";
    link.click();


  
});

//Descargar informacion de gastos
document.getElementById("descargarTXT").addEventListener("click", function() {
  let textContent = "Color - Categoría - Monto ($) - Porcentaje (%)\n"; // Encabezados

  const elementosLeyenda = document.querySelectorAll("#leyenda div");

  elementosLeyenda.forEach((elemento) => {
      const texto = elemento.innerText;
      textContent += texto + "\n"; // Agrega cada línea de la leyenda
  });

  // Crear y descargar el archivo TXT
  const blob = new Blob([textContent], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "leyenda_gastos.txt";
  link.click();
});


// Evento para guardar configuración de divisa
  document.getElementById('guardarDivisa').addEventListener('click', guardarConfiguracionDivisa);
  
  // Evento para actualizar la interfaz cuando cambia la divisa
  document.getElementById('divisa').addEventListener('change', actualizarSimboloDivisa);

  // Mostrar gastos personalizados guardados
  // mostrarGastosPersonalizados();
  
  // Actualizar gráfico
  actualizarGraficoGastos();
});

// Función para mostrar los gastos personalizados guardados
function mostrarGastosPersonalizados() {
  const container = document.getElementById('gastos-personalizados-container');
  container.innerHTML = ''; // Limpiar el contenedor
  
  chrome.storage.sync.get(['gastosPersonalizados'], function(data) {
    const gastosPersonalizados = data.gastosPersonalizados || [];
    
    if (gastosPersonalizados.length === 0) {
      container.innerHTML = '<p>No hay gastos personalizados. Agrega uno nuevo.</p>';
      return;
    }
    
    gastosPersonalizados.forEach(gasto => {
      const gastoElement = document.createElement('div');
      gastoElement.className = 'gasto-item';
      gastoElement.dataset.id = gasto.id;
      
      gastoElement.innerHTML = `
        <label>${gasto.nombre}:</label>
        <input type="number" value="${gasto.monto}" class="gasto-personalizado" data-id="${gasto.id}" data-categoria="${gasto.categoria}" min="0">
        <button class="eliminar-gasto" data-id="${gasto.id}">Delete</button>
      `;
      
      container.appendChild(gastoElement);
    });
    
    // Agregar evento para eliminar gastos
    const botonesEliminar = document.querySelectorAll('.eliminar-gasto');
    botonesEliminar.forEach(boton => {
      boton.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        eliminarGastoPersonalizado(id);
      });
    });
    
    // Agregar evento para actualizar montos
    const inputsGastos = document.querySelectorAll('.gasto-personalizado');
    inputsGastos.forEach(input => {
      input.addEventListener('change', function() {
        const id = this.getAttribute('data-id');
        const nuevoMonto = parseFloat(this.value) || 0;
        actualizarMontoGastoPersonalizado(id, nuevoMonto);
      });
    });
  });
}

// Función para eliminar un gasto personalizado
function eliminarGastoPersonalizado(id) {
  chrome.storage.sync.get(['gastosPersonalizados'], function(data) {
    let gastosPersonalizados = data.gastosPersonalizados || [];
    
    // Filtrar el gasto a eliminar
    gastosPersonalizados = gastosPersonalizados.filter(gasto => gasto.id !== id);
    
    chrome.storage.sync.set({gastosPersonalizados: gastosPersonalizados}, function() {
      // Actualizar la interfaz
      mostrarGastosPersonalizados();
      actualizarResumen();
      actualizarGraficoGastos();
    });
  });
}

// Función para actualizar el monto de un gasto personalizado
function actualizarMontoGastoPersonalizado(id, nuevoMonto) {
  chrome.storage.sync.get(['gastosPersonalizados'], function(data) {
    let gastosPersonalizados = data.gastosPersonalizados || [];
    
    // Buscar y actualizar el gasto
    gastosPersonalizados = gastosPersonalizados.map(gasto => {
      if (gasto.id === id) {
        return { ...gasto, monto: nuevoMonto };
      }
      return gasto;
    });
    
    chrome.storage.sync.set({gastosPersonalizados: gastosPersonalizados}, function() {
      // Actualizar la interfaz sin necesidad de recargar todos los gastos
      actualizarResumen();
      actualizarGraficoGastos(); 
    });
  });
}

// Función para actualizar el total de gastos
function actualizarTotalGastos() {
  chrome.storage.sync.get(["gastos", "gastosPersonalizados"], function(data) {
    let totalGastos = 0;
    
    // Sumar gastos predefinidos
    if (data.gastos) {
      for (const key in data.gastos) {
        totalGastos += data.gastos[key]; // Sumando los valores de los gastos
      }
    }
    
    // Sumar gastos personalizados
    if (data.gastosPersonalizados) {
      data.gastosPersonalizados.forEach(gasto => {
        totalGastos += gasto.monto;
      });
    }
    
    document.getElementById("totalGastos").textContent = `Total Gastado: $${formatearNumero(totalGastos.toFixed(0))}`;
  });
}

// Función para abrir pestañas
function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove('active');
  }
  
  const tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }
  
  document.getElementById(tabName).classList.add('active');
  
  if (evt) {
    evt.currentTarget.classList.add('active');
  } else {
    // Si no hay evento, buscar el botón correspondiente
    for (let i = 0; i < tablinks.length; i++) {
      if (tablinks[i].textContent.toLowerCase() === tabName) {
        tablinks[i].classList.add('active');
        break;
      }
    }
  }
}

// Modificamos la función cargarDatos para que también cargue la configuración de divisa
function cargarDatos() {
  chrome.storage.sync.get(['ingreso', 'gastos', 'gastosPersonalizados', 'divisa', 'tasaCambio'], function(data) {
    if (data.ingreso) {
    let ingreso = data.ingreso;
  if (data.divisa === 'usd') {
    ingreso = ingreso.toString().replace('.', '');
  }
  document.getElementById('ingreso').value = ingreso;
}
    
    if (data.gastos) {
      for (const [categoria, valor] of Object.entries(data.gastos)) {
        const input = document.getElementById(categoria);
        if (input) {
          input.value = valor;
        }
      }
    }
    
    // Cargar y mostrar gastos personalizados
    if (data.gastosPersonalizados && data.gastosPersonalizados.length > 0) {
      mostrarGastosPersonalizados();
    }
    
    // Cargar configuración de divisa
    if (data.divisa) {
      document.getElementById('divisa').value = data.divisa;
    }
    
    if (data.tasaCambio) {
      document.getElementById('tasaCambio').value = data.tasaCambio;
    }
    
    actualizarResumen();
    actualizarSimboloDivisa();
  });
}

// Función para guardar la configuración de divisa
function guardarConfiguracionDivisa() {
  const nuevaDivisa = document.getElementById('divisa').value;
  let tasaCambio = document.getElementById('tasaCambio').value;
  tasaCambio = tasaCambio.replace(/\./g, '').replace(',', '.');
  tasaCambio = parseFloat(tasaCambio) || 1;

  chrome.storage.sync.get(['divisa', 'ingreso', 'gastos', 'gastosPersonalizados'], function(data) {
    const divisaAnterior = data.divisa || 'local';
    let nuevoIngreso = data.ingreso || 0;
    let nuevosGastos = { ...data.gastos };
    let nuevosGastosPersonalizados = [...(data.gastosPersonalizados || [])];

    // Solo convertir si la divisa cambió
    if (divisaAnterior !== nuevaDivisa) {
      if (nuevaDivisa === 'usd') {
        // Convertir de pesos a dólares
        nuevoIngreso = (nuevoIngreso / tasaCambio).toFixed(2);
        nuevoIngreso = parseFloat(nuevoIngreso); // Para que no se guarde como string
        for (let key in nuevosGastos) {
          nuevosGastos[key] = parseFloat((nuevosGastos[key] / tasaCambio).toFixed(2));
        }
        nuevosGastosPersonalizados = nuevosGastosPersonalizados.map(gasto => ({
          ...gasto,
          monto: parseFloat((gasto.monto / tasaCambio).toFixed(2))
        }));
      } else if (nuevaDivisa === 'local') {
        // Convertir de dólares a pesos
        nuevoIngreso = Math.round(nuevoIngreso * tasaCambio);
          for (let key in nuevosGastos) {
            nuevosGastos[key] = Math.round(nuevosGastos[key] * tasaCambio);
          }
          nuevosGastosPersonalizados = nuevosGastosPersonalizados.map(gasto => ({
            ...gasto,
            monto: Math.round(gasto.monto * tasaCambio)
          }));
      }
    }

    // Guardar nueva configuración y valores convertidos
    chrome.storage.sync.set({
      divisa: nuevaDivisa,
      tasaCambio: tasaCambio,
      ingreso: nuevoIngreso,
      gastos: nuevosGastos,
      gastosPersonalizados: nuevosGastosPersonalizados
    }, function () {
      alert('Configuración de divisa guardada correctamente');
      cargarDatos();
      actualizarResumen();
      actualizarGraficoGastos();
    });
  });
}


// Función para convertir valores según la divisa seleccionada
function convertirValor(valor, aDolares = false) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['divisa', 'tasaCambio'], function(data) {
      const divisa = data.divisa || 'local'; // Por defecto usar moneda local
      const tasaCambio = data.tasaCambio || 1; // Por defecto 1:1
      
      if (divisa === 'usd' && !aDolares) {
        // Convertir de USD a moneda local
        resolve(valor * tasaCambio);
      } else if (divisa === 'local' && aDolares) {
        // Convertir de moneda local a USD
        resolve(valor / tasaCambio);
      } else {
        // No hay conversión necesaria
        resolve(valor);
      }
    });
  });
}

// Función para actualizar el símbolo de divisa en la interfaz
function actualizarSimboloDivisa() {
  chrome.storage.sync.get(['divisa'], function(data) {
    const divisa = data.divisa || 'local';
    const simbolo = divisa === 'usd' ? '$' : '$';
    const labelDivisa = divisa === 'usd' ? 'USD' : 'COP';
    
    // Actualizar todos los elementos que muestran el símbolo de divisa
    document.querySelectorAll('.simbolo-divisa').forEach(element => {
      element.textContent = simbolo;
    });
    
    document.querySelectorAll('.label-divisa').forEach(element => {
      element.textContent = labelDivisa;
    });
  });
}

// Modificamos la función actualizarResumen para manejar la conversión de divisa
function actualizarResumen() {
  chrome.storage.sync.get(['ingreso', 'gastos', 'gastosPersonalizados', 'divisa', 'tasaCambio'], function(data) {
    const ingreso = data.ingreso || 0;
    const gastos = data.gastos || {};
    const gastosPersonalizados = data.gastosPersonalizados || [];
    const divisa = data.divisa || 'local';
    
    // Calcular totales por categoría
    let totalEsencial = 0;
    let totalImportante = 0;
    let totalOpcional = 0;
    
    // Sumar gastos predefinidos por categoría
    const inputs = document.querySelectorAll('.gasto');
    inputs.forEach(input => {
      const categoria = input.getAttribute('data-categoria');
      const valor = gastos[input.id] || 0;
      
      if (categoria === 'esencial') {
        totalEsencial += valor;
      } else if (categoria === 'importante') {
        totalImportante += valor;
      } else if (categoria === 'opcional') {
        totalOpcional += valor;
      }
    });
    
    // Sumar gastos personalizados por categoría
    gastosPersonalizados.forEach(gasto => {
      if (gasto.categoria === 'esencial') {
        totalEsencial += gasto.monto;
      } else if (gasto.categoria === 'importante') {
        totalImportante += gasto.monto;
      } else if (gasto.categoria === 'opcional') {
        totalOpcional += gasto.monto;
      }
    });
    
    const totalGastos = totalEsencial + totalImportante + totalOpcional;
    const disponible = ingreso - totalGastos;
    
    // Si la divisa seleccionada es USD, convertir los valores
    if (divisa === 'usd') {
      const tasaCambio = data.tasaCambio || 1;
      
      // Convertir los valores a USD
      const ingresoUSD = ingreso / tasaCambio;
      const totalEsencialUSD = totalEsencial / tasaCambio;
      const totalImportanteUSD = totalImportante / tasaCambio;
      const totalOpcionalUSD = totalOpcional / tasaCambio;
      const totalGastosUSD = totalGastos / tasaCambio;
      const disponibleUSD = disponible / tasaCambio;
      
      // Formatear y mostrar los valores en USD
      document.getElementById('total-ingreso').textContent = '$' + formatearNumero(ingresoUSD.toFixed(2));
      document.getElementById('total-esencial').textContent = '$' + formatearNumero(totalEsencialUSD.toFixed(2));
      document.getElementById('total-importante').textContent = '$' + formatearNumero(totalImportanteUSD.toFixed(2));
      document.getElementById('total-opcional').textContent = '$' + formatearNumero(totalOpcionalUSD.toFixed(2));
      document.getElementById('total-gastos').textContent = '$' + formatearNumero(totalGastosUSD.toFixed(2));
      document.getElementById('dinero-disponible').textContent = '$' + formatearNumero(disponibleUSD.toFixed(2));
      
      // Actualizar el total mostrado en la pestaña de gastos
      document.getElementById("totalGastos").textContent = `Total Gastado: $${formatearNumero(totalGastosUSD.toFixed(2))} USD`;
    } else {
      // Formatear y mostrar los valores en moneda local
      document.getElementById('total-ingreso').textContent = '$' + formatearNumero(ingreso);
      document.getElementById('total-esencial').textContent = '$' + formatearNumero(totalEsencial);
      document.getElementById('total-importante').textContent = '$' + formatearNumero(totalImportante);
      document.getElementById('total-opcional').textContent = '$' + formatearNumero(totalOpcional);
      document.getElementById('total-gastos').textContent = '$' + formatearNumero(totalGastos);
      document.getElementById('dinero-disponible').textContent = '$' + formatearNumero(disponible);
      
      // Actualizar el total mostrado en la pestaña de gastos
      document.getElementById("totalGastos").textContent = `Total Gastado: $${formatearNumero(totalGastos.toFixed(0))}`;
    }
    
    // Guardar resumen para usar en el análisis de compras
    chrome.storage.sync.set({
      resumen: {
        ingreso: ingreso,
        totalGastos: totalGastos,
        disponible: disponible,
        divisa: divisa,
        tasaCambio: data.tasaCambio || 1
      }
    });
  });
}

// =================================================================
// FUNCIÓN PRINCIPAL QUE DECIDE QUÉ ANÁLISIS USAR
// =================================================================
function mostrarAnalisisCompra(datos) {
  chrome.storage.sync.get(['divisa'], function(config) {
    const divisa = config.divisa || 'local';
    
    if (divisa === 'usd') {
      mostrarAnalisisCompraUSD(datos);
    } else {
      mostrarAnalisisCompraLocal(datos);
    }
  });
}

// =================================================================
// ANÁLISIS PARA DIVISA LOCAL (PESOS COLOMBIANOS)
// =================================================================
function mostrarAnalisisCompraLocal(datos) {
  const resultadoDiv = document.getElementById('resultado-compra');
  const mensajeP = document.getElementById('mensaje-compra');
  
  // Limpiar elementos previos
  const tiempoExistente = document.getElementById('tiempo-estimado');
  if (tiempoExistente) tiempoExistente.remove();
  const ahorroExistente = document.getElementById('ahorro-estimado');
  if (ahorroExistente) ahorroExistente.remove();

  const precio = typeof datos.precio === 'string' ? limpiarPrecio(datos.precio) : datos.precio;
  const restante = datos.restante;
  
  const precioFormateado = formatearNumeroLocal(precio);
  const restanteFormateado = formatearNumeroLocal(Math.abs(restante));

  resultadoDiv.classList.remove('oculto');

  if (datos.puedeComprar) {
    mensajeP.innerHTML = `¡Puedes comprar este producto de $${precioFormateado}!<br>
                          Te quedarán $${restanteFormateado} de tu presupuesto disponible.`;
    mensajeP.className = 'verde';
  } else {
    mensajeP.innerHTML = `No tienes presupuesto suficiente para comprar este producto de $${precioFormateado}.<br>
                          Te faltan $${restanteFormateado}.`;
    mensajeP.className = 'rojo';

    // Crear opciones de ahorro para moneda local
    chrome.storage.sync.get(['resumen'], function(data) {
      if (data.resumen) {
        const ingreso = data.resumen.ingreso || 0;
        const totalGastos = data.resumen.totalGastos || 0;
        const ahorroMensual = ingreso - totalGastos;

        // Crear elemento para tiempo estimado
        const tiempoP = document.createElement('p');
        tiempoP.id = 'tiempo-estimado';

        // Crear elemento para opciones de ahorro
        const ahorroP = document.createElement('p');
        ahorroP.id = 'ahorro-estimado';

        // Calcular opciones de ahorro
        const ahorro3Meses = Math.ceil(precio / 3);
        const ahorro6Meses = Math.ceil(precio / 6);
        const ahorro12Meses = Math.ceil(precio / 12);

        const porcentaje3Meses = ((ahorro3Meses / ingreso) * 100).toFixed(1);
        const porcentaje6Meses = ((ahorro6Meses / ingreso) * 100).toFixed(1);
        const porcentaje12Meses = ((ahorro12Meses / ingreso) * 100).toFixed(1);

        ahorroP.innerHTML = '<strong>Opciones para ahorrar para este producto:</strong><br>';
        ahorroP.innerHTML += `• En 3 meses: $${formatearNumeroLocal(ahorro3Meses)} mensuales (${porcentaje3Meses}% de tus ingresos)<br>`;
        ahorroP.innerHTML += `• En 6 meses: $${formatearNumeroLocal(ahorro6Meses)} mensuales (${porcentaje6Meses}% de tus ingresos)<br>`;
        ahorroP.innerHTML += `• En 12 meses: $${formatearNumeroLocal(ahorro12Meses)} mensuales (${porcentaje12Meses}% de tus ingresos)`;

        // Recomendaciones
        let recomendacion = '';
        if (porcentaje12Meses > 20) {
          recomendacion = '<br><span class="alerta">⚠️ Este producto requiere un ahorro significativo. Considera revisar si es una compra prioritaria.</span>';
        } else if (porcentaje6Meses <= 10) {
          recomendacion = '<br><span class="verde">✓ En 6 meses podrías comprarlo sin afectar significativamente tu presupuesto.</span>';
        } else if (porcentaje12Meses <= 10) {
          recomendacion = '<br><span class="verde">✓ En 12 meses podrías comprarlo sin afectar significativamente tu presupuesto.</span>';
        }
        ahorroP.innerHTML += recomendacion;
        ahorroP.className = 'ahorro-estimado';

        // Calcular tiempo necesario
        if (ahorroMensual > 0) {
          const mesesNecesarios = Math.abs(restante) / ahorroMensual;
          const anos = Math.floor(mesesNecesarios / 12);
          const mesesRestantes = Math.floor(mesesNecesarios % 12);
          const diasTotales = Math.ceil((mesesNecesarios % 1) * 30);
          const semanas = Math.floor(diasTotales / 7);
          const dias = diasTotales % 7;

          let mensajeTiempo = '<strong>Con tu ahorro mensual actual podrías comprar este producto en:</strong><br>';

          if (anos > 0) {
            mensajeTiempo += `${anos} año${anos !== 1 ? 's' : ''}`;
            if (mesesRestantes > 0 || semanas > 0 || dias > 0) mensajeTiempo += ', ';
          }
          if (mesesRestantes > 0) {
            mensajeTiempo += `${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`;
            if (semanas > 0 || dias > 0) mensajeTiempo += ', ';
          }
          if (semanas > 0) {
            mensajeTiempo += `${semanas} semana${semanas !== 1 ? 's' : ''}`;
            if (dias > 0) mensajeTiempo += ' y ';
          }
          if (dias > 0) {
            mensajeTiempo += `${dias} día${dias !== 1 ? 's' : ''}`;
          }

          tiempoP.innerHTML = mensajeTiempo;
          tiempoP.className = 'tiempo-estimado';
        } else {
          tiempoP.innerHTML = 'Con tu presupuesto actual no estás ahorrando dinero cada mes. Necesitarías reducir gastos para poder comprar este producto.';
          tiempoP.className = 'tiempo-estimado alerta';
        }

        resultadoDiv.appendChild(tiempoP);
        resultadoDiv.appendChild(ahorroP);
      }
    });
  }

  // Llamar análisis avanzado para moneda local
  mostrarAnalisisCompraAvanzadoLocal(datos);
}

// =================================================================
// ANÁLISIS PARA DIVISA USD (DÓLARES)
// =================================================================
function mostrarAnalisisCompraUSD(datos) {
  const resultadoDiv = document.getElementById('resultado-compra');
  const mensajeP = document.getElementById('mensaje-compra');
  
  // Limpiar elementos previos
  const tiempoExistente = document.getElementById('tiempo-estimado');
  if (tiempoExistente) tiempoExistente.remove();
  const ahorroExistente = document.getElementById('ahorro-estimado');
  if (ahorroExistente) ahorroExistente.remove();

  const precio = typeof datos.precio === 'string' ? limpiarPrecio(datos.precio) : parseFloat(datos.precio);
  const restante = typeof datos.restante === 'string' ? limpiarPrecio(datos.restante) : parseFloat(datos.restante);

  
  // Usar el formateo corregido
  const precioFormateado = formatearNumeroUSD(precio);
  const restanteFormateado = formatearNumeroUSD(Math.abs(restante));

  resultadoDiv.classList.remove('oculto');

  if (datos.puedeComprar) {
    mensajeP.innerHTML = `¡Puedes comprar este producto de $${precioFormateado} USD!<br>
                          Te quedarán $${restanteFormateado} USD de tu presupuesto disponible.`;
    mensajeP.className = 'verde';
  } else {
    mensajeP.innerHTML = `No tienes presupuesto suficiente para comprar este producto de $${precioFormateado} USD.<br>
                          Te faltan $${restanteFormateado} USD.`;
    mensajeP.className = 'rojo';

    // Crear opciones de ahorro para USD
    chrome.storage.sync.get(['resumen'], function(data) {
      if (data.resumen) {
        const ingreso = parseFloat(data.resumen.ingreso) || 0;
        const totalGastos = parseFloat(data.resumen.totalGastos) || 0;
        const ahorroMensual = ingreso - totalGastos;

        // Crear elemento para tiempo estimado
        const tiempoP = document.createElement('p');
        tiempoP.id = 'tiempo-estimado';

        // Crear elemento para opciones de ahorro
        const ahorroP = document.createElement('p');
        ahorroP.id = 'ahorro-estimado';

        // Calcular opciones de ahorro (sin redondear, mantener decimales)
        const ahorro3Meses = precio / 3;
        const ahorro6Meses = precio / 6;
        const ahorro12Meses = precio / 12;

        const porcentaje3Meses = ((ahorro3Meses / ingreso) * 100).toFixed(1);
        const porcentaje6Meses = ((ahorro6Meses / ingreso) * 100).toFixed(1);
        const porcentaje12Meses = ((ahorro12Meses / ingreso) * 100).toFixed(1);

        ahorroP.innerHTML = '<strong>Opciones para ahorrar para este producto:</strong><br>';
        ahorroP.innerHTML += `• En 3 meses: $${formatearNumeroUSD(ahorro3Meses)} USD mensuales (${porcentaje3Meses}% de tus ingresos)<br>`;
        ahorroP.innerHTML += `• En 6 meses: $${formatearNumeroUSD(ahorro6Meses)} USD mensuales (${porcentaje6Meses}% de tus ingresos)<br>`;
        ahorroP.innerHTML += `• En 12 meses: $${formatearNumeroUSD(ahorro12Meses)} USD mensuales (${porcentaje12Meses}% de tus ingresos)`;

        // Recomendaciones
        let recomendacion = '';
        if (parseFloat(porcentaje12Meses) > 20) {
          recomendacion = '<br><span class="alerta">⚠️ Este producto requiere un ahorro significativo. Considera revisar si es una compra prioritaria.</span>';
        } else if (parseFloat(porcentaje6Meses) <= 10) {
          recomendacion = '<br><span class="verde">✓ En 6 meses podrías comprarlo sin afectar significativamente tu presupuesto.</span>';
        } else if (parseFloat(porcentaje12Meses) <= 10) {
          recomendacion = '<br><span class="verde">✓ En 12 meses podrías comprarlo sin afectar significativamente tu presupuesto.</span>';
        }
        ahorroP.innerHTML += recomendacion;
        ahorroP.className = 'ahorro-estimado';

        // Calcular tiempo necesario
        if (ahorroMensual > 0) {
          const mesesNecesarios = Math.abs(restante) / ahorroMensual;
          const anos = Math.floor(mesesNecesarios / 12);
          const mesesRestantes = Math.floor(mesesNecesarios % 12);
          const diasTotales = Math.ceil((mesesNecesarios % 1) * 30);
          const semanas = Math.floor(diasTotales / 7);
          const dias = diasTotales % 7;

          let mensajeTiempo = '<strong>Con tu ahorro mensual actual podrías comprar este producto en:</strong><br>';

          if (anos > 0) {
            mensajeTiempo += `${anos} año${anos !== 1 ? 's' : ''}`;
            if (mesesRestantes > 0 || semanas > 0 || dias > 0) mensajeTiempo += ', ';
          }
          if (mesesRestantes > 0) {
            mensajeTiempo += `${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`;
            if (semanas > 0 || dias > 0) mensajeTiempo += ', ';
          }
          if (semanas > 0) {
            mensajeTiempo += `${semanas} semana${semanas !== 1 ? 's' : ''}`;
            if (dias > 0) mensajeTiempo += ' y ';
          }
          if (dias > 0) {
            mensajeTiempo += `${dias} día${dias !== 1 ? 's' : ''}`;
          }

          tiempoP.innerHTML = mensajeTiempo;
          tiempoP.className = 'tiempo-estimado';
        } else {
          tiempoP.innerHTML = 'Con tu presupuesto actual no estás ahorrando dinero cada mes. Necesitarías reducir gastos para poder comprar este producto.';
          tiempoP.className = 'tiempo-estimado alerta';
        }

        resultadoDiv.appendChild(tiempoP);
        resultadoDiv.appendChild(ahorroP);
      }
    });
  }

  // Llamar análisis avanzado para USD
  mostrarAnalisisCompraAvanzadoUSD(datos);
}

// =================================================================
// FUNCIONES DE FORMATEO CORREGIDAS
// =================================================================

// Función mejorada para formatear números en USD
function formatearNumeroUSD(numero) {
  let num = parseFloat(numero);
  if (isNaN(num)) return "0.00";
  
  // Convertir de centavos a dólares
  // Si el número es mayor a 100 y no tiene decimales significativos, probablemente está en centavos
  if (num >= 100 && (num % 1 === 0 || num.toString().split('.')[1]?.length <= 1)) {
    num = num / 100;
  }
  
  if (Math.abs(num) < 1000) {
    return num.toFixed(2);
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Función mejorada para formatear números locales
function formatearNumeroLocal(numero) {
  const num = parseFloat(numero);
  if (isNaN(num)) return "0";
  
  return Math.round(num).toLocaleString('es-CO');
}

// Función general para formatear números (la que ya usas en otras partes)
function formatearNumero(numero) {
  const num = parseFloat(numero);
  if (isNaN(num)) return "0";
  
  return Math.round(num).toLocaleString('es-CO');
}


// =================================================================
// ANÁLISIS AVANZADO PARA MONEDA LOCAL
// =================================================================
function mostrarAnalisisCompraAvanzadoLocal(datos) {
  chrome.storage.sync.get(['resumen'], function(data) {
    if (data.resumen) {
      const ingreso = data.resumen.ingreso || 0;
      const totalGastos = data.resumen.totalGastos || 0;
      const ahorroMensual = ingreso - totalGastos;
      
      const opcionesDiv = document.getElementById('opciones-compra');
      opcionesDiv.innerHTML = '';
      
      const accordionContainer = document.createElement('div');
      accordionContainer.className = 'accordion-container';
      
      // Opciones de ahorro
      const opcionesAhorroBtn = document.createElement('button');
      opcionesAhorroBtn.className = 'collapsible';
      opcionesAhorroBtn.innerHTML = '<span><span class="icon-text">💰</span> Opciones para ahorrar</span>';
      
      const opcionesAhorroContent = document.createElement('div');
      opcionesAhorroContent.className = 'collapsible-content';
      
      const ahorro3Meses = Math.ceil(datos.precio / 3);
      const ahorro6Meses = Math.ceil(datos.precio / 6);
      const ahorro12Meses = Math.ceil(datos.precio / 12);
      
      const porcentaje3Meses = ((ahorro3Meses / ingreso) * 100).toFixed(1);
      const porcentaje6Meses = ((ahorro6Meses / ingreso) * 100).toFixed(1);
      const porcentaje12Meses = ((ahorro12Meses / ingreso) * 100).toFixed(1);
      
      opcionesAhorroContent.innerHTML = `
        <div class="option-card">
          <h4>🕒 En 3 meses</h4>
          <p>$${formatearNumeroLocal(ahorro3Meses)} mensuales <span class="option-badge">${porcentaje3Meses}%</span></p>
        </div>
        <div class="option-card">
          <h4>🕓 En 6 meses</h4>
          <p>$${formatearNumeroLocal(ahorro6Meses)} mensuales <span class="option-badge">${porcentaje6Meses}%</span></p>
        </div>
        <div class="option-card">
          <h4>🕔 En 12 meses</h4>
          <p>$${formatearNumeroLocal(ahorro12Meses)} mensuales <span class="option-badge">${porcentaje12Meses}%</span></p>
        </div>
      `;
      
      accordionContainer.appendChild(opcionesAhorroBtn);
      accordionContainer.appendChild(opcionesAhorroContent);
      opcionesDiv.appendChild(accordionContainer);
      
      // Agregar funcionalidad al acordeón
      opcionesAhorroBtn.addEventListener("click", function() {
        this.classList.toggle("active-collapsible");
        const content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    }
  });
}

// =================================================================
// ANÁLISIS AVANZADO PARA USD
// =================================================================
function mostrarAnalisisCompraAvanzadoUSD(datos) {
  chrome.storage.sync.get(['resumen'], function(data) {
    if (data.resumen) {
      const ingreso = parseFloat(data.resumen.ingreso) || 0;
      const totalGastos = parseFloat(data.resumen.totalGastos) || 0;
      const ahorroMensual = ingreso - totalGastos;
      const precio = parseFloat(datos.precio);
      
      const opcionesDiv = document.getElementById('opciones-compra');
      opcionesDiv.innerHTML = '';
      
      const accordionContainer = document.createElement('div');
      accordionContainer.className = 'accordion-container';
      
      // Opciones de ahorro
      const opcionesAhorroBtn = document.createElement('button');
      opcionesAhorroBtn.className = 'collapsible';
      opcionesAhorroBtn.innerHTML = '<span><span class="icon-text">💰</span> Opciones para ahorrar</span>';
      
      const opcionesAhorroContent = document.createElement('div');
      opcionesAhorroContent.className = 'collapsible-content';
      
      const ahorro3Meses = precio / 3;
      const ahorro6Meses = precio / 6;
      const ahorro12Meses = precio / 12;
      
      const porcentaje3Meses = ((ahorro3Meses / ingreso) * 100).toFixed(1);
      const porcentaje6Meses = ((ahorro6Meses / ingreso) * 100).toFixed(1);
      const porcentaje12Meses = ((ahorro12Meses / ingreso) * 100).toFixed(1);
      
      opcionesAhorroContent.innerHTML = `
        <div class="option-card">
          <h4>🕒 En 3 meses</h4>
          <p>$${formatearNumeroUSD(ahorro3Meses)} USD mensuales <span class="option-badge">${porcentaje3Meses}%</span></p>
        </div>
        <div class="option-card">
          <h4>🕓 En 6 meses</h4>
          <p>$${formatearNumeroUSD(ahorro6Meses)} USD mensuales <span class="option-badge">${porcentaje6Meses}%</span></p>
        </div>
        <div class="option-card">
          <h4>🕔 En 12 meses</h4>
          <p>$${formatearNumeroUSD(ahorro12Meses)} USD mensuales <span class="option-badge">${porcentaje12Meses}%</span></p>
        </div>
      `;
      
      accordionContainer.appendChild(opcionesAhorroBtn);
      accordionContainer.appendChild(opcionesAhorroContent);
      opcionesDiv.appendChild(accordionContainer);
      
      // Agregar funcionalidad al acordeón
      opcionesAhorroBtn.addEventListener("click", function() {
        this.classList.toggle("active-collapsible");
        const content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    }
  });
}


// Función para actualizar el gráfico de gastos
function actualizarGraficoGastos() {
  chrome.storage.sync.get(['ingreso', 'gastos', 'gastosPersonalizados'], function(data) {
    const ingreso = data.ingreso || 1; // Evita dividir por cero
    const gastos = data.gastos || {};
    const gastosPersonalizados = data.gastosPersonalizados || [];
    
    // Crear objeto para agrupar todos los gastos por nombre
    let todosLosGastos = {};
    
    // Agregar gastos predefinidos
    for (const [nombre, valor] of Object.entries(gastos)) {
      todosLosGastos[nombre] = valor;
    }
    
    // Agregar gastos personalizados
    gastosPersonalizados.forEach(gasto => {
      todosLosGastos[gasto.nombre] = gasto.monto;
    });
    
    // Calcular total de gastos
    const totalGastos = Object.values(todosLosGastos).reduce((a, b) => a + b, 0);
    const dineroDisponible = ingreso - totalGastos;
    
    // Convertir datos en arrays
    let categorias = [...Object.keys(todosLosGastos)];
    let valores = [...Object.values(todosLosGastos)];
    
    // Agregar el dinero disponible
    categorias.push("Disponible");
    valores.push(dineroDisponible > 0 ? dineroDisponible : 0); // No mostrar disponible negativo en gráfico
    
    // Calcular porcentajes
    const porcentajes = valores.map(valor => (valor / ingreso) * 100);
    
    // Configuración del Canvas
    const canvas = document.getElementById("graficoGastos");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar antes de redibujar
    
    // Configuración del gráfico de pastel
    const centroX = canvas.width / 2;
    const centroY = canvas.height / 2;
    const radio = Math.min(centroX, centroY) - 10;
    let anguloInicio = 0;
    
    // Colores aleatorios + un color especial para "Disponible"
    const colores = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#4CAF50', 
      '#FF5733', '#C70039', '#900C3F', '#581845', '#1ABC9C', '#2ECC71', '#3498DB', 
      '#9B59B6', '#34495E', '#16A085', '#27AE60', '#2980B9', '#8E44AD', '#2C3E50', 
      '#F39C12', '#D35400', '#E74C3C', '#ECF0F1', '#95A5A6', '#7F8C8D', '#BDC3C7', 
      '#E67E22', '#F1C40F', '#E84393', '#00CEC9', '#636E72', '#B2BEC3', '#FD79A8', 
      '#A29BFE', '#6C5CE7', '#00B894', '#55EFC4', '#FAB1A0', '#FFEAA7', '#FF7675'];
    
    porcentajes.forEach((porcentaje, i) => {
      if (porcentaje <= 0) return; // No dibujar secciones de 0%
      
      const anguloFin = anguloInicio + (porcentaje / 100) * 2 * Math.PI;
      
      // Dibujar sector
      ctx.beginPath();
      ctx.moveTo(centroX, centroY);
      ctx.arc(centroX, centroY, radio, anguloInicio, anguloFin);
      ctx.closePath();
      ctx.fillStyle = colores[i % colores.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Posición para texto
      const anguloMedio = (anguloInicio + anguloFin) / 2;
      const xTexto = centroX + Math.cos(anguloMedio) * (radio / 1.5);
      const yTexto = centroY + Math.sin(anguloMedio) * (radio / 1.5);
      
      // Dibujar porcentaje en la sección
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${porcentaje.toFixed(1)}%`, xTexto, yTexto);
      
      anguloInicio = anguloFin;
    });
    
    // Mostrar leyenda con porcentaje y monto
    const leyenda = document.getElementById("leyenda");
    leyenda.innerHTML = "";
    categorias.forEach((categoria, i) => {
      if (valores[i] <= 0) return; // No mostrar elementos con valor cero
      
      const color = colores[i % colores.length];
      const montoFormateado = formatearNumero(valores[i].toFixed(0));
      const porcentajeTexto = porcentajes[i].toFixed(1);
      
      leyenda.innerHTML += `<div style="display: flex; align-items: center; margin-bottom: 4px;">
                              <span style="display: inline-block; width: 15px; height: 15px; background-color: ${color}; margin-right: 5px;"></span> 
                              ${categoria} (${montoFormateado}$ - ${porcentajeTexto}%)
                            </div>`;
    });
  });
}
////////////////////////////////////////////////Analisis De compras /////////////////////////////////////////////////// 


// Funciones auxiliares
function calcularCuotasMensuales(precio, ahorroMensual) {
  if (ahorroMensual <= 0) return 'No es posible financiar';
  const meses = Math.ceil(precio / ahorroMensual);
  return `${meses} cuotas de $${formatearNumero((precio / meses).toFixed(0))}`;
}

function sugerirFinanciamiento(precio, ahorroMensual) {
  const tasasInteres = [
    { nombre: 'Bajo', tasa: 0.1 },
    { nombre: 'Medio', tasa: 0.15 },
    { nombre: 'Alto', tasa: 0.20 }
  ];
  
  return tasasInteres.map(interes => {
    const pagoMensual = precio * (1 + interes.tasa) / (precio / ahorroMensual);
    return `${interes.nombre}: $${formatearNumero(pagoMensual.toFixed(0))} mensual`;
  }).join(' | ');
}

function calcularPorcentajeIngreso(precio, ingreso) {
  return ((precio / ingreso) * 100).toFixed(1);
}

function identificarCategoriasReduccion(ahorroMensual) {
  if (ahorroMensual <= 0) return 'Necesitas aumentar tus ingresos o reducir gastos';
  if (ahorroMensual < 50000) return 'Revisar gastos de entretenimiento y suscripciones';
  if (ahorroMensual < 100000) return 'Optimizar gastos en alimentación y servicios';
  return 'Buen manejo financiero, considera inversiones';
}

function calcularRendimientoInversion(monto) {
  const tasasInversion = [
    { nombre: 'Conservador', tasa: 0.05 },
    { nombre: 'Moderado', tasa: 0.08 },
    { nombre: 'Agresivo', tasa: 0.12 }
  ];
  
  return tasasInversion.map(inv => 
    `${inv.nombre}: $${formatearNumero((monto * inv.tasa).toFixed(0))}`
  ).join(' | ');
}

function limpiarPrecio(precioTexto) {
  // Si el texto contiene una coma y no un punto, asumimos que es formato europeo (1.234,56)
  if (precioTexto.includes(',') && !precioTexto.includes('.')) {
    return parseFloat(precioTexto.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Si es en formato anglosajón (como 79.95 o 1,584.00), eliminamos comas, pero no tocamos el punto decimal
  return parseFloat(precioTexto.replace(/,/g, '')) || 0;
}
