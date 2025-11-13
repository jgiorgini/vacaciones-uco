// =============================
//   CONFIGURACIÓN BÁSICA
// =============================

// Clave simple para prototipo (en producción se movería a backend)
const CLAVE_COORDINADOR = "UCI2025";

// Claves de LocalStorage
const LS_VACACIONES = "uci_vacaciones";
const LS_EMAIL_COORDINADOR = "uci_email_coordinador";

// Años que se mostrarán en los selectores
const ANIO_INICIAL = new Date().getFullYear();
const ANIO_FINAL = ANIO_INICIAL + 1;

// =============================
//       UTILIDADES
// =============================

function obtenerVacaciones() {
  return JSON.parse(localStorage.getItem(LS_VACACIONES) || "[]");
}

function guardarVacaciones(lista) {
  localStorage.setItem(LS_VACACIONES, JSON.stringify(lista));
}

function generarId() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

function parseDate(str) {
  // str = "YYYY-MM-DD"
  return new Date(str + "T00:00:00");
}

function formatoISO(date) {
  return date.toISOString().slice(0, 10);
}

function diasEntre(a, b) {
  const ms = parseDate(b) - parseDate(a);
  return ms / 86400000;
}

function esLunes(fechaStr) {
  const d = parseDate(fechaStr);
  return d.getDay() === 1; // 1 = lunes
}

function esDomingo(fechaStr) {
  const d = parseDate(fechaStr);
  return d.getDay() === 0; // 0 = domingo
}

// Devuelve true si el rango [inicio, fin] se solapa con [a.inicio, a.fin]
function haySolapamiento(inicio, fin, lista, excluirId = null) {
  const inicioDate = parseDate(inicio);
  const finDate = parseDate(fin);

  return lista.some(v => {
    if (excluirId && v.id === excluirId) return false;
    const vInicio = parseDate(v.inicio);
    const vFin = parseDate(v.fin);
    // Se solapan si NO se cumple que uno termina antes de que empiece el otro
    return !(finDate < vInicio || inicioDate > vFin);
  });
}

// =============================
//    GENERACIÓN DE SEMANAS
// =============================

// Devuelve todas las semanas (lunes–domingo) del año dado
function obtenerSemanasDelAnio(anio) {
  const semanas = [];

  // 1) Buscar el primer lunes del año
  let d = new Date(anio, 0, 1); // 1 de enero
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }

  // 2) Ir saltando de 7 en 7 hasta fin de año
  while (d.getFullYear() === anio) {
    const inicio = new Date(d);
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 6);

    semanas.push({
      inicio: formatoISO(inicio),
      fin: formatoISO(fin)
    });

    d.setDate(d.getDate() + 7);
  }

  return semanas;
}

// =============================
//        MODO GENERAL
// =============================

function setMode(modo) {
  document.getElementById("colaboradorPanel").classList.add("hidden");
  document.getElementById("coordinadorLogin").classList.add("hidden");
  document.getElementById("coordinadorPanel").classList.add("hidden");

  if (modo === "colaborador") {
    document.getElementById("colaboradorPanel").classList.remove("hidden");
    inicializarSelectAnios();
    renderTablaColaborador();
  } else if (modo === "coordinador") {
    document.getElementById("coordinadorLogin").classList.remove("hidden");
  }
}

// Rellena los select de años en ambos paneles
function inicializarSelectAnios() {
  const selectColab = document.getElementById("anioColaborador");
  const selectCoord = document.getElementById("anioCoordinador");
  if (!selectColab || !selectCoord) return;

  // Evitar duplicar opciones si ya están
  if (selectColab.options.length === 0) {
    for (let anio = ANIO_INICIAL; anio <= ANIO_FINAL; anio++) {
      const opt1 = document.createElement("option");
      opt1.value = anio;
      opt1.textContent = anio;
      selectColab.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = anio;
      opt2.textContent = anio;
      selectCoord.appendChild(opt2);
    }
    selectColab.value = ANIO_INICIAL;
    selectCoord.value = ANIO_INICIAL;
  }

  // Cargar email de coordinador si existe
  const emailGuardado = localStorage.getItem(LS_EMAIL_COORDINADOR) || "";
  const inputEmail = document.getElementById("emailCoordinador");
  if (inputEmail && !inputEmail.value) {
    inputEmail.value = emailGuardado;
  }
}

// =============================
//      PANEL COLABORADOR
// =============================

function cambiarAnioColaborador() {
  renderTablaColaborador();
}

function solicitarVacaciones() {
  const nombre = document.getElementById("colaboradorNombre").value.trim();
  const legajo = document.getElementById("colaboradorLegajo").value.trim();
  const inicio = document.getElementById("fechaInicio").value;
  const fin = document.getElementById("fechaFin").value;

  if (!nombre || !legajo || !inicio || !fin) {
    alert("Completar todos los campos de la solicitud.");
    return;
  }

  if (!esLunes(inicio)) {
    alert("Las vacaciones deben comenzar un LUNES.");
    return;
  }

  if (!esDomingo(fin)) {
    alert("Las vacaciones deben finalizar un DOMINGO.");
    return;
  }

  const dias = diasEntre(inicio, fin) + 1;
  if (dias <= 0 || dias % 7 !== 0) {
    alert("Solo se permiten períodos de 7, 14, 21 días, etc.");
    return;
  }

  const vacaciones = obtenerVacaciones();

  if (haySolapamiento(inicio, fin, vacaciones)) {
    alert("Esas fechas ya están adjudicadas.");
    return;
  }

  const nueva = {
    id: generarId(),
    nombre,
    legajo,
    inicio,
    fin
  };

  vacaciones.push(nueva);
  guardarVacaciones(vacaciones);

  // Notificación "fake" por ahora (prototipo estático)
  enviarNotificacionAlCoordinador(nueva);

  alert("Solicitud registrada. El coordinador será notificado.");
  renderTablaColaborador();
  limpiarFormularioColaborador();
}

function limpiarFormularioColaborador() {
  document.getElementById("colaboradorNombre").value = "";
  document.getElementById("colaboradorLegajo").value = "";
  document.getElementById("fechaInicio").value = "";
  document.getElementById("fechaFin").value = "";
}

// Tabla que ve el colaborador: solo LIBRE / OCUPADO, sin nombres
function renderTablaColaborador() {
  const contenedor = document.getElementById("tablaColaborador");
  const anio = parseInt(document.getElementById("anioColaborador").value, 10);
  const semanas = obtenerSemanasDelAnio(anio);
  const vacaciones = obtenerVacaciones();

  let html = `
    <table>
      <thead>
        <tr>
          <th># Semana</th>
          <th>Inicio (lunes)</th>
          <th>Fin (domingo)</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
  `;

  semanas.forEach((sem, idx) => {
    const ocupado = haySolapamiento(sem.inicio, sem.fin, vacaciones);
    html += `
      <tr class="${ocupado ? "fila-ocupado" : "fila-libre"}">
        <td>${idx + 1}</td>
        <td>${sem.inicio}</td>
        <td>${sem.fin}</td>
        <td>
          ${
            ocupado
              ? '<span class="badge badge-ocupado">OCUPADO</span>'
              : '<span class="badge badge-libre">LIBRE</span>'
          }
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  contenedor.innerHTML = html;
}

// =============================
//      LOGIN COORDINADOR
// =============================

function loginCoordinador() {
  const claveIng = document.getElementById("clave").value;
  if (claveIng === CLAVE_COORDINADOR) {
    document.getElementById("coordinadorLogin").classList.add("hidden");
    document.getElementById("coordinadorPanel").classList.remove("hidden");
    inicializarSelectAnios();
    renderTablaCoordinador();
  } else {
    alert("Clave incorrecta.");
  }
}

// =============================
//      PANEL COORDINADOR
// =============================

function guardarEmailCoordinador() {
  const email = document.getElementById("emailCoordinador").value.trim();
  localStorage.setItem(LS_EMAIL_COORDINADOR, email);
}

function renderTablaCoordinador() {
  const contenedor = document.getElementById("tablaCoordinador");
  const anio = parseInt(document.getElementById("anioCoordinador").value, 10);
  const vacaciones = obtenerVacaciones().filter(v => {
    return parseDate(v.inicio).getFullYear() === anio;
  });

  if (vacaciones.length === 0) {
    contenedor.innerHTML = "<p>No hay vacaciones registradas para este año.</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>Legajo</th>
          <th>Inicio</th>
          <th>Fin</th>
          <th>Días</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  vacaciones.forEach(v => {
    const dias = diasEntre(v.inicio, v.fin) + 1;
    html += `
      <tr class="fila-ocupado">
        <td>${v.nombre}</td>
        <td>${v.legajo}</td>
        <td>${v.inicio}</td>
        <td>${v.fin}</td>
        <td>${dias}</td>
        <td class="acciones">
          <button onclick="borrarVacaciones('${v.id}')">Borrar</button>
          <button onclick="moverVacaciones('${v.id}')">Mover</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  contenedor.innerHTML = html;
}

function borrarVacaciones(id) {
  if (!confirm("¿Seguro que querés borrar estas vacaciones?")) return;
  const vacaciones = obtenerVacaciones();
  const nuevas = vacaciones.filter(v => v.id !== id);
  guardarVacaciones(nuevas);
  renderTablaCoordinador();
  renderTablaColaborador(); // actualizar vista colaborador
}

function moverVacaciones(id) {
  const vacaciones = obtenerVacaciones();
  const vac = vacaciones.find(v => v.id === id);
  if (!vac) return;

  const nuevoInicio = prompt(
    "Nueva fecha de inicio (lunes) en formato AAAA-MM-DD:",
    vac.inicio
  );
  if (!nuevoInicio) return;

  const nuevoFin = prompt(
    "Nueva fecha de fin (domingo) en formato AAAA-MM-DD:",
    vac.fin
  );
  if (!nuevoFin) return;

  if (!esLunes(nuevoInicio)) {
    alert("Las vacaciones deben comenzar un LUNES.");
    return;
  }

  if (!esDomingo(nuevoFin)) {
    alert("Las vacaciones deben finalizar un DOMINGO.");
    return;
  }

  const dias = diasEntre(nuevoInicio, nuevoFin) + 1;
  if (dias <= 0 || dias % 7 !== 0) {
    alert("Solo se permiten períodos de 7, 14, 21 días, etc.");
    return;
  }

  if (haySolapamiento(nuevoInicio, nuevoFin, vacaciones, id)) {
    alert("Esas fechas ya están adjudicadas.");
    return;
  }

  vac.inicio = nuevoInicio;
  vac.fin = nuevoFin;
  guardarVacaciones(vacaciones);

  alert("Vacaciones actualizadas.");
  renderTablaCoordinador();
  renderTablaColaborador();
}

// =============================
//  NOTIFICACIÓN "EMAIL" (FAKE)
// =============================

function enviarNotificacionAlCoordinador(vacacion) {
  const email = localStorage.getItem(LS_EMAIL_COORDINADOR);
  if (!email) {
    console.log(
      "No hay email de coordinador configurado. Guardar primero en el panel del coordinador."
    );
    return;
  }

  // Prototipo estático: solo mostramos un mensaje/console.
  console.log(
    `Notificar a ${email}: nueva solicitud de ${vacacion.nombre} (${vacacion.legajo}) del ${vacacion.inicio} al ${vacacion.fin}.`
  );
  // En una versión con backend o con EmailJS, acá se haría el envío real.
}

// =============================
//   INICIALIZACIÓN INICIAL
// =============================

window.addEventListener("DOMContentLoaded", () => {
  // Por defecto, no mostramos ningún panel hasta que elijan modo
  // Si querés, podés arrancar en modo colaborador:
  // setMode('colaborador');
});
