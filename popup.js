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
    
    chrome.storage.sync.set({gastos: gastos}, function() {
      alert('Gastos guardados correctamente');
      actualizarResumen();
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

  actualizarGraficoGastos(); // Llama a la función al cargar la página

});


// Función para actualizar el total de gastos
function actualizarTotalGastos() {
  chrome.storage.sync.get(["gastos"], function(data) {
    let totalGastos = 0;
    if (data.gastos) {
      for (const key in data.gastos) {
        totalGastos += data.gastos[key]; // Sumando los valores de los gastos
      }
    }
    document.getElementById("totalGastos").textContent = `Total Gastado: $${formatearNumero(totalGastos.toFixed(0))}`;
  });
}

// Guardar gastos en chrome.storage.sync al agregar uno nuevo
function agregarGasto(descripcion, monto) {
  chrome.storage.sync.get(["gastos"], function(data) {
    let gastos = data.gastos || {};
    gastos[descripcion] = parseFloat(monto); // Guardar como objeto clave-valor

    chrome.storage.sync.set({ gastos: gastos }, function() {
      actualizarTotalGastos(); // Actualiza la suma total
    });
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
  chrome.storage.sync.get(['ingreso', 'gastos'], function(data) {
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
    
    actualizarResumen();
  });
}

// Actualizar resumen de presupuesto
function actualizarResumen() {
  chrome.storage.sync.get(['ingreso', 'gastos'], function(data) {
    const ingreso = data.ingreso || 0;
    const gastos = data.gastos || {};
    
    // Calcular totales por categoría
    let totalEsencial = 0;
    let totalImportante = 0;
    let totalOpcional = 0;
    
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
  });
}

// Mostrar análisis de compra
function mostrarAnalisisCompra(datos) {
  const resultadoDiv = document.getElementById('resultado-compra');
  const mensajeP = document.getElementById('mensaje-compra');
  
  const precioFormateado = formatearNumero(datos.precio);
  const restanteFormateado = formatearNumero(Math.abs(datos.restante));
  
  resultadoDiv.classList.remove('oculto');
  
  if (datos.puedeComprar) {
    mensajeP.innerHTML = `¡Puedes comprar este producto de $${precioFormateado}!<br>
                          Te quedarán $${restanteFormateado} de tu presupuesto disponible.`;
    mensajeP.className = 'verde';
  } else {
    mensajeP.innerHTML = `No tienes presupuesto suficiente para comprar este producto de $${precioFormateado}.<br>
                          Te faltan $${restanteFormateado}.`;
    mensajeP.className = 'rojo';
  }
}

// Formatear número con separadores de miles
function formatearNumero(numero) {
  return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function actualizarGraficoGastos() {
  chrome.storage.sync.get(['ingreso', 'gastos'], function (data) {
      const ingreso = data.ingreso || 1; // Evita dividir por cero
      const gastos = data.gastos || {};

      // Calcular total de gastos
      const totalGastos = Object.values(gastos).reduce((a, b) => a + b, 0);
      const dineroDisponible = ingreso - totalGastos;

      // Convertir datos en arrays
      const categorias = [...Object.keys(gastos), "Disponible"];
      const valores = [...Object.values(gastos), dineroDisponible];

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
          const color = colores[i % colores.length];
          const montoFormateado = valores[i].toLocaleString();
          const porcentajeTexto = porcentajes[i].toFixed(1);

          leyenda.innerHTML += `<div style="display: flex; align-items: center; margin-bottom: 4px;">
                                  <span style="display: inline-block; width: 15px; height: 15px; background-color: ${color}; margin-right: 5px;"></span> 
                                  ${categoria} (${montoFormateado}$ - ${porcentajeTexto}%)
                                </div>`;
      });
  });
}


// //funcion para la suma de todo lo ingresado por el usuario 
// function actualizarTotalGastos() {
//   chrome.storage.sync.get(["gastos"], function(data) {
//       if (data.gastos) {
//           let totalGastos = data.gastos.reduce((total, gasto) => total + gasto.monto, 0);
//           document.getElementById("totalGastos").textContent = `Total Gastado: $${totalGastos.toFixed(2)}`;
//       } else {
//           document.getElementById("totalGastos").textContent = "Total Gastado: $0.00";
//       }
//   });
// }

// // Guardar gastos en chrome.storage.sync al agregar uno nuevos
// function agregarGasto(descripcion, monto) {
//   chrome.storage.sync.get(["gastos"], function(data) {
//       let gastos = data.gastos || [];
//       gastos.push({ descripcion: descripcion, monto: parseFloat(monto) });

//       chrome.storage.sync.set({ gastos: gastos }, function() {
//           actualizarTotalGastos(); // Actualiza la suma total
//       });
//   });
// }