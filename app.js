// =============================
//   CONFIGURACIÓN BÁSICA
// =============================

const LS_VACACIONES = "uci_vacaciones";
const LS_EMAIL_COORDINADOR = "uci_email_coordinador";
const LS_CLAVE_COORDINADOR = "uci_clave_coordinador";
const LS_HISTORIAL = "uci_historial";
const LS_DARK_MODE = "uci_dark_mode";

const ANIO_INICIAL = new Date().getFullYear();
const ANIO_FINAL = ANIO_INICIAL + 1;

// Para drag & drop
let dragVacId = null;

// EmailJS (se activa cuando completes datos y pongas EMAILJS_ENABLED = true)
const EMAILJS_ENABLED = true; // ⚠️ cambiar a true cuando configures EmailJS
const EMAILJS_SERVICE_ID = "service_lo_que_te_dio_emailjs";
const EMAILJS_TEMPLATE_ID = "template_lo_que_te_dio_emailjs";
// =============================
//       UTILIDADES
// =============================

function obtenerVacaciones() {
  return JSON.parse(localStorage.getItem(LS_VACACIONES) || "[]");
}

function guardarVacaciones(lista) {
  localStorage.setItem(LS_VACACIONES, JSON.stringify(lista));
}

function obtenerHistorial() {
  return JSON.parse(localStorage.getItem(LS_HISTORIAL) || "[]");
}

function guardarHistorial(lista) {
  localStorage.setItem(LS_HISTORIAL, JSON.stringify(lista));
}

function registrarEvento(tipo, detalle) {
  const ahora = new Date();
  const evento = {
    id: generarId(),
    tipo,
    detalle,
    timestamp: ahora.toISOString()
  };
  const hist = obtenerHistorial();
  hist.unshift(evento); // último evento arriba
  guardarHistorial(hist);
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

function formatDateTime(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
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
  const selectAnioCal = document.getElementById("anioCalendario");
  const selectMesCal = document.getElementById("mesCalendario");
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

  if (selectAnioCal && selectAnioCal.options.length === 0) {
    for (let anio = ANIO_INICIAL; anio <= ANIO_FINAL; anio++) {
      const o = document.createElement("option");
      o.value = anio;
      o.textContent = anio;
      selectAnioCal.appendChild(o);
    }
    selectAnioCal.value = ANIO_INICIAL;
  }

  if (selectMesCal && selectMesCal.options.length === 0) {
    const meses = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    meses.forEach((m, idx) => {
      const o = document.createElement("option");
      o.value = idx;
      o.textContent = m;
      selectMesCal.appendChild(o);
    });
    selectMesCal.value = new Date().getMonth();
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

  registrarEvento(
    "Solicitud",
    `Solicitud de vacaciones de ${nombre} (legajo ${legajo}) del ${formatDMY(inicio)} al ${formatDMY(fin)}.`
  );
  enviarNotificacionAlCoordinador(nueva);

  alert("Solicitud registrada. El coordinador será notificado.");
  renderTablaColaborador();
  renderHistorial();
  renderSemanasCoordinador();
  renderCalendarioMensual();
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
    renderHistorial();
    return;
  }

  if (claveIng === claveGuardada) {
    document.getElementById("coordinadorLogin").classList.add("hidden");
    document.getElementById("coordinadorPanel").classList.remove("hidden");
    inicializarSelectAnios();
    cambiarAnioCoordinador();
    renderHistorial();
  } else {
    alert("Clave incorrecta.");
  }
}

// =============================
//      PANEL COORDINADOR
// =============================

function toggleCambioEmail() {
  const panel = document.getElementById("cambioEmailPanel");
  if (!panel) return;

  panel.classList.toggle("hidden");

  if (!panel.classList.contains("hidden")) {
    const emailGuardado = localStorage.getItem(LS_EMAIL_COORDINADOR) || "";
    const input = document.getElementById("emailCoordinador");
    if (input && !input.value) {
      input.value = emailGuardado;
    }
  }
}

function guardarEmailCoordinador() {
  const input = document.getElementById("emailCoordinador");
  if (!input) return;

  const email = input.value.trim();
  if (!email || !email.includes("@")) {
    alert("Ingresá un correo válido.");
    return;
  }

  localStorage.setItem(LS_EMAIL_COORDINADOR, email);
  registrarEvento("Configuración", `Se actualizó el correo del coordinador a ${email}.`);
  alert("Correo de notificaciones actualizado.");
  renderHistorial();
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
  registrarEvento("Configuración", "Se actualizó la clave del coordinador.");
  alert("Clave actualizada correctamente.");
  renderHistorial();
}

function cambiarAnioCoordinador() {
  renderTablaCoordinador();
  renderSemanasCoordinador();

  const selectCoord = document.getElementById("anioCoordinador");
  const selectAnioCal = document.getElementById("anioCalendario");
  if (selectCoord && selectAnioCal) {
    selectAnioCal.value = selectCoord.value;
  }
  renderCalendarioMensual();
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
  const vacaciones = obtenerVacaciones();
  const vac = vacaciones.find(v => v.id === id);
  if (!vac) return;

  if (!confirm("¿Seguro que querés borrar estas vacaciones?")) return;

  const nuevas = vacaciones.filter(v => v.id !== id);
  guardarVacaciones(nuevas);

  registrarEvento(
    "Borrado",
    `Se eliminaron las vacaciones de ${vac.nombre} (legajo ${vac.legajo}) del ${formatDMY(vac.inicio)} al ${formatDMY(vac.fin)}.`
  );

  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
  renderCalendarioMensual();
  renderHistorial();
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

  const viejoInicio = vac.inicio;
  const viejoFin = vac.fin;

  vac.inicio = nuevoInicio;
  vac.fin = nuevoFin;
  guardarVacaciones(vacaciones);

  registrarEvento(
    "Movimiento",
    `Se movieron las vacaciones de ${vac.nombre} de ${formatDMY(viejoInicio)}–${formatDMY(viejoFin)} a ${formatDMY(
      nuevoInicio
    )}–${formatDMY(nuevoFin)} (modo manual).`
  );

  alert("Vacaciones actualizadas.");
  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
  renderCalendarioMensual();
  renderHistorial();
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
    `¿Mover las vacaciones de ${vac.nombre} del ${formatDMY(vac.inicio)}–${formatDMY(vac.fin)} a ${formatDMY(
      inicioNuevo
    )}–${formatDMY(finNuevo)}?`
  );
  if (!ok) return;

  const viejoInicio = vac.inicio;
  const viejoFin = vac.fin;

  vac.inicio = inicioNuevo;
  vac.fin = finNuevo;
  guardarVacaciones(vacaciones);

  registrarEvento(
    "Movimiento",
    `Se movieron las vacaciones de ${vac.nombre} de ${formatDMY(viejoInicio)}–${formatDMY(viejoFin)} a ${formatDMY(
      inicioNuevo
    )}–${formatDMY(finNuevo)} (drag & drop).`
  );

  renderTablaCoordinador();
  renderSemanasCoordinador();
  renderTablaColaborador();
  renderCalendarioMensual();
  renderHistorial();
}

// =============================
//  CALENDARIO MENSUAL
// =============================

function renderCalendarioMensual() {
  const cont = document.getElementById("calendarioMensual");
  const selMes = document.getElementById("mesCalendario");
  const selAnio = document.getElementById("anioCalendario");
  if (!cont || !selMes || !selAnio) return;

  const mes = parseInt(selMes.value, 10); // 0-11
  const anio = parseInt(selAnio.value, 10);

  const inicioMes = new Date(anio, mes, 1);
  let cursor = new Date(inicioMes);
  while (cursor.getDay() !== 1) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const vacaciones = obtenerVacaciones();

  let html = '<div class="cal-grid">';
  const diasSemana = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
  diasSemana.forEach(d => {
    html += `<div class="cal-header">${d}</div>`;
  });

  for (let fila = 0; fila < 6; fila++) {
    for (let col = 0; col < 7; col++) {
      const iso = formatoISO(cursor);
      const esMesActual = cursor.getMonth() === mes;

      const vac = vacaciones.find(v => {
        const ini = parseDate(v.inicio);
        const fin = parseDate(v.fin);
        return ini <= cursor && cursor <= fin;
      });

      const clases = ["cal-cell"];
      if (!esMesActual) clases.push("cal-other-month");
      if (vac) clases.push("cal-vacaciones");

      html += `<div class="${clases.join(" ")}">`;
      html += `<div class="cal-num">${esMesActual ? cursor.getDate() : ""}</div>`;
      if (vac && esMesActual) {
        html += `<div class="cal-tag">${vac.nombre}</div>`;
      }
      html += `</div>`;

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  html += "</div>";
  cont.innerHTML = html;
}

// =============================
//  HISTORIAL
// =============================

function renderHistorial() {
  const cont = document.getElementById("historialPanel");
  if (!cont) return;

  const hist = obtenerHistorial();
  if (hist.length === 0) {
    cont.innerHTML = "<p>No hay eventos registrados todavía.</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Fecha / hora</th>
          <th>Tipo</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
  `;

  hist.slice(0, 50).forEach(ev => {
    html += `
      <tr>
        <td>${formatDateTime(ev.timestamp)}</td>
        <td class="hist-tipo">${ev.tipo}</td>
        <td>${ev.detalle}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  cont.innerHTML = html;
}

// =============================
//  EXPORTAR / IMPRIMIR
// =============================

function exportarVacacionesCSV() {
  const todas = obtenerVacaciones();
  if (todas.length === 0) {
    alert("No hay vacaciones para exportar.");
    return;
  }

  let csv = "Colaborador,Legajo,Inicio,Fin,Dias\n";
  todas.forEach(v => {
    const dias = diasEntre(v.inicio, v.fin) + 1;
    csv += `"${v.nombre}",${v.legajo},${formatDMY(v.inicio)},${formatDMY(v.fin)},${dias}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vacaciones_uco.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function imprimirVacaciones() {
  const todas = obtenerVacaciones();
  if (todas.length === 0) {
    alert("No hay vacaciones para imprimir.");
    return;
  }

  let html = `
    <html>
    <head>
      <title>Vacaciones UCO</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:Arial,sans-serif;padding:16px;}
        h1{text-align:center;margin-bottom:12px;}
        table{width:100%;border-collapse:collapse;margin-top:10px;}
        th,td{border:1px solid #999;padding:6px;font-size:12px;}
        th{background:#eee;}
      </style>
    </head>
    <body>
      <h1>Vacaciones UCO</h1>
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Legajo</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Días</th>
          </tr>
        </thead>
        <tbody>
  `;

  todas.forEach(v => {
    const dias = diasEntre(v.inicio, v.fin) + 1;
    html += `
      <tr>
        <td>${v.nombre}</td>
        <td>${v.legajo}</td>
        <td>${formatDMY(v.inicio)}</td>
        <td>${formatDMY(v.fin)}</td>
        <td>${dias}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print(); // el usuario puede elegir "Guardar como PDF"
}

// =============================
//  NOTIFICACIÓN (EMAILJS)
// =============================

function enviarNotificacionAlCoordinador(vacacion) {
  const email = localStorage.getItem(LS_EMAIL_COORDINADOR);
  if (!email) {
    console.log(
      "No hay email de coordinador configurado. Guardar primero en el panel del coordinador."
    );
    return;
  }

  if (EMAILJS_ENABLED && typeof emailjs !== "undefined") {
    const params = {
      to_email: email,
      colaborador: vacacion.nombre,
      legajo: vacacion.legajo,
      fecha_inicio: formatDMY(vacacion.inicio),
      fecha_fin: formatDMY(vacacion.fin)
    };

    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
      .then(() => {
        console.log("EmailJS: notificación enviada correctamente.");
      })
      .catch(err => {
        console.error("EmailJS error:", err);
      });
  } else {
    // Fallback: solo consola
    console.log(
      `Notificar a ${email}: nueva solicitud de ${vacacion.nombre} (${vacacion.legajo}) del ${formatDMY(
        vacacion.inicio
      )} al ${formatDMY(vacacion.fin)}.`
    );
  }
}


// =============================
//   MODO OSCURO
// =============================

function aplicarTemaDesdeStorage() {
  const stored = localStorage.getItem(LS_DARK_MODE);
  const body = document.body;
  if (stored === "dark") body.classList.add("dark");
  else body.classList.remove("dark");
  actualizarTextoBotonModo();
}

function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark");
  const modo = body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem(LS_DARK_MODE, modo);
  actualizarTextoBotonModo();
}

function actualizarTextoBotonModo() {
  const btn = document.getElementById("darkModeButton");
  if (!btn) return;
  const dark = document.body.classList.contains("dark");
  btn.textContent = dark ? "Modo claro" : "Modo oscuro";
}

// =============================
//   INICIALIZACIÓN
// =============================

window.addEventListener("DOMContentLoaded", () => {
  aplicarTemaDesdeStorage();
  // si querés que arranque ya con un modo:
  // setMode('colaborador');
});

