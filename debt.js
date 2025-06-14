window.addEventListener('DOMContentLoaded', function () {
  const boton = document.getElementById("mostrarDescripcionBtn");
  if (!boton) return;

  boton.addEventListener("click", function () {
    const descripciones = {
      "garantizada": "Deuda respaldada por un activo, como una casa o vehículo.",
      "no-garantizada": "No necesita garantía. Ej: tarjetas de crédito, préstamos personales.",
      "consumo": "Deuda usada para bienes/servicios: electrodomésticos, viajes, etc.",
      "hipoteca": "Préstamo largo plazo con una vivienda como garantía.",
      "subsistencia": "Para cubrir necesidades básicas. Señal de urgencia financiera.",
      "estudiantil": "Préstamos para estudios: matrículas, manutención, transporte.",
      "apalancamiento": "Deuda usada para invertir y multiplicar ingresos."
    };

    const seleccion = document.getElementById("nuevo-deuda-categoria").value;
    const descripcion = descripciones[seleccion];

    const contenedor = document.getElementById("descripcion-deuda");

    if (!descripcion) {
      contenedor.textContent = "Por favor selecciona una categoría para ver su descripción.";
      contenedor.classList.remove("oculto");
      return;
    }

    contenedor.textContent = descripcion;
    contenedor.classList.remove("oculto");
  });
});



