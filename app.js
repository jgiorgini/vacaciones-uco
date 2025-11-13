// =============================
//   CONFIGURACIÓN BÁSICA
// =============================

const LS_VACACIONES = "uci_vacaciones";
const LS_EMAIL_COORDINADOR = "uci_email_coordinador";
const LS_CLAVE_COORDINADOR = "uci_clave_coordinador";

const ANIO_INICIAL = new Date().getFullYear();
const ANIO_FINAL = ANIO_INICIAL + 1;

// Para drag & drop
let dragVacId = null;

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
  return new Date(str + "T00:00:00");
}

function formatoISO(date) {
  return date.toISOString().slice(0, 10);
}

// Muestra dd-mm-aaaa
function formatDMY(fechaStr) {
  const d = parseDate(fechaStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function diasEntre(a, b) {
  const ms = parseDate(b) - parseDate(a);
  return ms / 86400000;
}

function esLunes(fechaStr) {
  const d = parseDate(fechaStr);
  return d.getDay() === 1;
}

function esDomingo(fechaStr) {
  const d = parseDate(fechaStr);
  return d.getDay() === 0;
}

function haySolapamiento(inicio, fin, lista, excluirId = null) {
  const inicioDate = parseDate(inicio);
  const finDate = parseDate(fin);

  return lista.some(v => {
    if (excluirId && v.id === excluirId) return false;
    const vInicio = parseDate(v.inicio);
    const vFin = parseDate(v.fin);
    return !(finDate < vInicio || inicioDate > vFin);
  });
}

// =============================
//    GENERACIÓN DE SEMANAS
// =============================

function obtenerSemanasDelAnio(anio) {
  const semanas = [];
  let d = new Date(anio, 0, 1);

  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }

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

function inicializarSelectAnios() {
  const selectColab = document.getElementById("anioColaborador");
  const selectCoord = document.getElementById("anioCoordinador");
  if (!selectColab || !selectCoord) return;

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
        <td>${formatDMY(sem.inicio)}</td>
        <td>${formatDMY(sem.fin)}</td>
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
  const claveIng = document.getElementById("clave").value.trim();
  if (!claveIng) {
    alert("Ingresá una clave.");
    return;
  }

  const claveGuardada = localStorage.getItem(LS_CLAVE_COORDINADOR);

  if (!claveGuardada) {
    localStorage.setItem(LS_CLAVE_COORDINADOR, claveIng);
    alert("Clave creada. Guardala en un lugar seguro.");
    document.getElementById("coordinadorLogin").classList.add("hidden");
    document.getElementById("coordinadorPanel").classList.remove("hidden");
    inicializarSelectAnios();
    cambiarAnioCoordinador();
    return;
  }

  if (claveIng === claveGuardada) {
    document.getElementById("coordinadorLogin").classList.add("hidden");
    document.getElementById("coordinadorPanel").classList.remove("hidden");
    inicializarSelectAnios();
    cambiarAnioCoordinador();
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

function toggleCambioClave() {
  const panel = document.getElementById("cambioClavePanel");
  if (!panel) return;
  panel.classList.toggle("hidden");
}

function cambiarClaveCoordinador() {
  const claveActual = document.getElementById("claveActual").value.trim();
  const claveNueva = document.getElementById("claveNueva").value.trim();
  const claveNueva2 = document.getElementById("claveNueva2").value.trim();

  const claveGuardada = localStorage.getItem(LS_CLAVE_COORDINADOR);

  if (!claveGuardada) {
    alert("Todavía no hay una clave guardada. Ingresá primero por el login.");
    return;
  }

  if (!claveActual || !claveNueva || !claveNueva2) {
    alert("Completá todos los campos de seguridad.");
    return;
  }

  if (claveActual !== claveGuardada) {
    alert("La clave actual no es correcta.");
    return;
  }

  if (claveNueva !== claveNueva2) {
    alert("La nueva clave y su repetición no coinciden.");
    return;
  }

  if (claveNueva.length < 4) {
    alert("La nueva clave debe tener al menos 4 caracteres.");
    return;
  }

  localStorage.setItem(LS_CLAVE_COORDINADOR, claveNueva);
  document.getElementById("claveActual").value = "";
  document.getElementById("claveNueva").value = "";
  document.getElementById("claveNueva2").value = "";
  alert("Clave actualizada correctamente.");
}

function cambiarAnioCoordinador() {
  renderTablaCoordinador();
  renderSemanasCoordinador();
}

function renderTablaCoordinador() {
  const contenedor = document.getElementById("tablaCoordinador");
  const anio = parseInt(document.getElementById("anioCoordinador").value, 10);
  const todas = obtenerVacaciones();
  const vacaciones = todas.filter(v => parseDate(v.inicio).getFullYear() === anio);

  const otrosAnios = Array.from(
    new Set(
      todas
        .map(v => parseDate(v.inicio).getFullYear())
        .filter(y => y !== anio)
    )
  );

  let html = "";

  if (vacaciones.length === 0) {
    html += "<p>No hay vacaciones registradas para este año.</p>";
  } else {
    html += `
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
          <td>${formatDMY(v.inicio)}</td>
          <td>${formatDMY(v.fin)}</td>
          <td>${dias}</td>
          <td class="acciones">
            <button onclick="borrarVacaciones('${v.id}')">Borrar</button>
            <button onclick="moverVacaciones('${v.id}')">Mover</button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
  }

  if (otrosAnios.length > 0) {
    html += `<p class="aviso-otros-anios">Hay vacaciones solicitadas en: ${otrosAnios.join(", ")}.</p>`;
  }

  contenedor.innerHTML = html;
}

function borrarVacaciones(id) {
  if (!confirm("¿Seguro que querés borrar estas vacaciones?")) return;
  const vacaciones = obtenerVacaciones();
  const nuevas = vacaciones.filter(v => v.id !== id);
  guardarVacaciones(nuevas);
  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
}

// Mover con prompts, proponiendo finales en múltiplos de 7 días
function moverVacaciones(id) {
  const vacaciones = obtenerVacaciones();
  const vac = vacaciones.find(v => v.id === id);
  if (!vac) return;

  const nuevoInicio = prompt(
    "Nueva fecha de inicio (debe ser LUNES, formato AAAA-MM-DD):",
    vac.inicio
  );
  if (!nuevoInicio) return;

  if (!esLunes(nuevoInicio)) {
    alert("La nueva fecha de inicio debe ser un LUNES.");
    return;
  }

  const diasOriginales = diasEntre(vac.inicio, vac.fin) + 1;
  const cantidadSemanas = Math.max(1, Math.round(diasOriginales / 7));

  const opciones = [];
  for (let i = 1; i <= cantidadSemanas; i++) {
    const finDate = parseDate(nuevoInicio);
    finDate.setDate(finDate.getDate() + i * 7 - 1);
    opciones.push(formatoISO(finDate));
  }

  let mensaje = "Elegí la duración (todas son múltiplos de 7 días):\n";
  opciones.forEach((fin, index) => {
    const diasOpcion = (index + 1) * 7;
    mensaje += `${index + 1}) ${diasOpcion} días: ${formatDMY(nuevoInicio)} → ${formatDMY(fin)}\n`;
  });

  const elegido = prompt(mensaje, "1");
  const idx = parseInt(elegido, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= opciones.length) return;

  const nuevoFin = opciones[idx];

  if (haySolapamiento(nuevoInicio, nuevoFin, vacaciones, id)) {
    alert("Esas fechas se superponen con otras vacaciones.");
    return;
  }

  const ok = confirm(
    `¿Confirmar mover las vacaciones de ${vac.nombre} a ${formatDMY(nuevoInicio)} → ${formatDMY(nuevoFin)}?`
  );
  if (!ok) return;

  vac.inicio = nuevoInicio;
  vac.fin = nuevoFin;
  guardarVacaciones(vacaciones);

  alert("Vacaciones actualizadas.");
  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
}

// =============================
//  PANEL DE SEMANAS (COORD.)
// =============================

function renderSemanasCoordinador() {
  const cont = document.getElementById("semanasCoordinador");
  const select = document.getElementById("anioCoordinador");
  const label = document.getElementById("anioSemanasLabel");
  if (!cont || !select) return;

  const anio = parseInt(select.value, 10);
  if (label) label.textContent = `(${anio})`;

  const semanas = obtenerSemanasDelAnio(anio);
  const vacaciones = obtenerVacaciones();

  let html = '<div class="semanas-grid">';

  semanas.forEach((sem, index) => {
    let vacSemana = null;

    for (const v of vacaciones) {
      if (haySolapamiento(sem.inicio, sem.fin, [v])) {
        vacSemana = v;
        break;
      }
    }

    const ocupada = !!vacSemana;

    html += `
      <div class="semana ${ocupada ? "semana-ocupada" : "semana-libre"}"
           data-semana-inicio="${sem.inicio}"
           data-semana-fin="${sem.fin}"
           ${ocupada ? `data-vac-id="${vacSemana.id}" draggable="true"` : ""}>
        <div class="semana-titulo">Sem ${index + 1}</div>
        <div>${formatDMY(sem.inicio)} → ${formatDMY(sem.fin)}</div>
        <div class="semana-nombre">
          ${ocupada ? vacSemana.nombre : "Libre"}
        </div>
      </div>
    `;
  });

  html += "</div>";
  cont.innerHTML = html;

  prepararDragAndDropSemanas();
}

function prepararDragAndDropSemanas() {
  const semanas = document.querySelectorAll(".semana");

  semanas.forEach(sem => {
    sem.addEventListener("dragstart", e => {
      const vacId = sem.getAttribute("data-vac-id");
      if (!vacId) return;
      dragVacId = vacId;
      e.dataTransfer.effectAllowed = "move";
    });

    sem.addEventListener("dragover", e => {
      e.preventDefault();
    });

    sem.addEventListener("drop", e => {
      e.preventDefault();
      if (!dragVacId) return;

      const targetVacId = sem.getAttribute("data-vac-id");
      if (targetVacId) {
        dragVacId = null;
        return;
      }

      const semanaInicio = sem.getAttribute("data-semana-inicio");
      if (!semanaInicio) {
        dragVacId = null;
        return;
      }

      moverVacacionesADesdeDrag(dragVacId, semanaInicio);
      dragVacId = null;
    });
  });
}

function moverVacacionesADesdeDrag(id, nuevoInicioSemana) {
  const vacaciones = obtenerVacaciones();
  const vac = vacaciones.find(v => v.id === id);
  if (!vac) return;

  const dias = diasEntre(vac.inicio, vac.fin) + 1;
  const inicioNuevo = nuevoInicioSemana;
  const finDate = parseDate(inicioNuevo);
  finDate.setDate(finDate.getDate() + dias - 1);
  const finNuevo = formatoISO(finDate);

  if (haySolapamiento(inicioNuevo, finNuevo, vacaciones, id)) {
    alert("No se puede mover: se superpone con otras vacaciones.");
    return;
  }

  const ok = confirm(
    `¿Mover las vacaciones de ${vac.nombre} del ${formatDMY(vac.inicio)}–${formatDMY(vac.fin)} a ${formatDMY(inicioNuevo)}–${formatDMY(finNuevo)}?`
  );
  if (!ok) return;

  vac.inicio = inicioNuevo;
  vac.fin = finNuevo;
  guardarVacaciones(vacaciones);

  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
}

// =============================
//  NOTIFICACIÓN (PROTOTIPO)
// =============================

function enviarNotificacionAlCoordinador(vacacion) {
  const email = localStorage.getItem(LS_EMAIL_COORDINADOR);
  if (!email) {
    console.log(
      "No hay email de coordinador configurado. Guardar primero en el panel del coordinador."
    );
    return;
  }

  // Prototipo: solo se muestra en consola, NO envía mails reales
  console.log(
    `Notificar a ${email}: nueva solicitud de ${vacacion.nombre} (${vacacion.legajo}) del ${formatDMY(
      vacacion.inicio
    )} al ${formatDMY(vacacion.fin)}.`
  );
}

// =============================
//   INICIALIZACIÓN
// =============================

window.addEventListener("DOMContentLoaded", () => {
  // Podés descomentar esto si querés entrar directo como colaborador:
  // setMode('colaborador');
});
