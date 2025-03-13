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
});

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