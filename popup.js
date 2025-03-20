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
    ingresoTexto = ingresoTexto.replace(/\./g, ''); // Eliminar puntos
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
      mostrarAnalisisCompra(data.analisis);
      // Abrir pestaña de análisis
      openTab(null, 'analisis');
      // Limpiar después de mostrar
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


  // Mostrar gastos personalizados guardados
  mostrarGastosPersonalizados();
  
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
        <button class="eliminar-gasto" data-id="${gasto.id}">X</button>
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

// Cargar datos guardados
function cargarDatos() {
  chrome.storage.sync.get(['ingreso', 'gastos', 'gastosPersonalizados'], function(data) {
    if (data.ingreso) {
      document.getElementById('ingreso').value = data.ingreso;
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
    
    actualizarResumen();
  });
}

// Actualizar resumen de presupuesto
function actualizarResumen() {
  chrome.storage.sync.get(['ingreso', 'gastos', 'gastosPersonalizados'], function(data) {
    const ingreso = data.ingreso || 0;
    const gastos = data.gastos || {};
    const gastosPersonalizados = data.gastosPersonalizados || [];
    
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
    
    // Formatear y mostrar los valores
    document.getElementById('total-ingreso').textContent = '$' + formatearNumero(ingreso);
    document.getElementById('total-esencial').textContent = '$' + formatearNumero(totalEsencial);
    document.getElementById('total-importante').textContent = '$' + formatearNumero(totalImportante);
    document.getElementById('total-opcional').textContent = '$' + formatearNumero(totalOpcional);
    document.getElementById('total-gastos').textContent = '$' + formatearNumero(totalGastos);
    document.getElementById('dinero-disponible').textContent = '$' + formatearNumero(disponible);
    
    // Guardar resumen para usar en el análisis de compras
    chrome.storage.sync.set({
      resumen: {
        ingreso: ingreso,
        totalGastos: totalGastos,
        disponible: disponible
      }
    });
    
    // Actualizar el total mostrado en la pestaña de gastos
    document.getElementById("totalGastos").textContent = `Total Gastado: $${formatearNumero(totalGastos.toFixed(0))}`;
  });
}

// Mostrar análisis de compra
function mostrarAnalisisCompra(datos) {
  const resultadoDiv = document.getElementById('resultado-compra');
  const mensajeP = document.getElementById('mensaje-compra');
  const tiempoP = document.createElement('p'); // Nuevo elemento para mostrar el tiempo
  
  const precioFormateado = formatearNumero(datos.precio);
  const restanteFormateado = formatearNumero(Math.abs(datos.restante));
  
  resultadoDiv.classList.remove('oculto');
  
  if (datos.puedeComprar) {
    mensajeP.innerHTML = `¡Puedes comprar este producto de $${precioFormateado}!<br>
                          Te quedarán $${restanteFormateado} de tu presupuesto disponible.`;
    mensajeP.className = 'verde';
    
    // Eliminar el elemento de tiempo si existía de un análisis anterior
    const tiempoExistente = document.getElementById('tiempo-estimado');
    if (tiempoExistente) {
      tiempoExistente.remove();
    }
  } else {
    mensajeP.innerHTML = `No tienes presupuesto suficiente para comprar este producto de $${precioFormateado}.<br>
                          Te faltan $${restanteFormateado}.`;
    mensajeP.className = 'rojo';
    
    // Obtener datos del resumen para calcular el tiempo
    chrome.storage.sync.get(['resumen'], function(data) {
      if (data.resumen) {
        const ingreso = data.resumen.ingreso || 0;
        const totalGastos = data.resumen.totalGastos || 0;
        
        // Calcular ahorro mensual (si es positivo)
        const ahorroMensual = ingreso - totalGastos;
        
        if (ahorroMensual > 0) {
          // Calcular tiempo necesario
          const mesesNecesarios = Math.abs(datos.restante) / ahorroMensual;
          
          // Convertir a años, meses, semanas y días
          const anos = Math.floor(mesesNecesarios / 12);
          const mesesRestantes = Math.floor(mesesNecesarios % 12);
          const diasTotales = Math.ceil((mesesNecesarios % 1) * 30); // Aproximadamente 30 días por mes
          const semanas = Math.floor(diasTotales / 7);
          const dias = diasTotales % 7;
          
          // Preparar el mensaje
          let mensajeTiempo = 'Con tu ahorro mensual actual podrías comprar este producto en: ';
          
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
          
          // Mostrar el mensaje
          tiempoP.innerHTML = mensajeTiempo;
          tiempoP.className = 'tiempo-estimado';
          tiempoP.id = 'tiempo-estimado';
          resultadoDiv.appendChild(tiempoP);
        } else {
          // Si no hay ahorro mensual
          tiempoP.innerHTML = 'Con tu presupuesto actual no estás ahorrando dinero cada mes. ' +
                              'Necesitarías reducir gastos para poder comprar este producto.';
          tiempoP.className = 'tiempo-estimado alerta';
          tiempoP.id = 'tiempo-estimado';
          resultadoDiv.appendChild(tiempoP);
        }
      }
    });
  }
}

// Formatear número con separadores de miles
function formatearNumero(numero) {
  return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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


