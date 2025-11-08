// pacientes.js - Versión profesional completa

// 🔹 Alias para simplificar acceso al DOM
const qid = id => document.getElementById(id);

// 🔹 Referencias principales
const tablaPacientes = qid("tablaPacientes");
const btnNuevo = qid("btnNuevoPaciente");
const btnCerrar = qid("btnCerrarModal");
const btnCancelar = qid("modalCancel");
const modal = qid("modalPaciente");
const form = qid("formPaciente");
const buscarInput = qid("buscarPaciente");
const btnBuscar = qid("btnBuscar");
const btnInactivos = qid("btnInactivos");
const btnFiltroDoctor = qid("btnFiltroDoctor");
const doctorDropdown = qid("doctorDropdown");
const doctorList = qid("doctorList");
const resultCount = qid("resultCount");

let pacientes = [];
let mostrarInactivos = false;
let filtroDoctor = "__all__";

// ===================================================
// 🔹 CARGA INICIAL
// ===================================================
window.addEventListener("DOMContentLoaded", async () => {
  await cargarPacientes();
  inicializarEventos();
});

// ===================================================
// 🔹 CARGAR PACIENTES DESDE FIREBASE
// ===================================================
async function cargarPacientes() {
  try {
    const snapshot = await window.db.collection("pacientes").get();
    pacientes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderPacientes();
    cargarDoctoresUnicos();
  } catch (error) {
    console.error("Error cargando pacientes:", error);
  }
}

// ===================================================
// 🔹 MOSTRAR PACIENTES EN TABLA
// ===================================================
function renderPacientes() {
  tablaPacientes.innerHTML = "";

  let filtrados = pacientes.filter(p => {
    const activo = !p.inactivo;
    if (!mostrarInactivos && !activo) return false;
    if (filtroDoctor !== "__all__" && p.doctor !== filtroDoctor) return false;
    return true;
  });

  // Búsqueda activa
  const texto = buscarInput.value.trim().toLowerCase();
  if (texto) {
    filtrados = filtrados.filter(p =>
      (p.nombres || "").toLowerCase().includes(texto) ||
      (p.apellidos || "").toLowerCase().includes(texto) ||
      (p.nombreCompleto || "").toLowerCase().includes(texto) ||
      (p.nroDocumento || "").includes(texto) ||
      (p.celular || "").includes(texto)
    );
  }

  if (filtrados.length === 0) {
    tablaPacientes.innerHTML = `<tr class="sin-datos"><td colspan="6">Sin datos</td></tr>`;
    resultCount.textContent = 0;
    return;
  }

  filtrados.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nombreCompleto || `${p.nombres || ""} ${p.apellidos || ""}`}</td>
      <td>${p.nroDocumento || "-"}</td>
      <td>${p.fechaIngreso || "-"}</td>
      <td style="text-align:center">
        <button class="odc-btn odc-btn-blue btn-ver" data-id="${p.id}">Ver</button>
        <button class="odc-btn odc-btn-green btn-editar" data-id="${p.id}">Editar</button>
        <button class="odc-btn odc-btn-red btn-eliminar" data-id="${p.id}">Eliminar</button>
      </td>
    `;
    tablaPacientes.appendChild(tr);
  });

  resultCount.textContent = filtrados.length;
  vincularBotonesFila();
}

// ===================================================
// 🔹 VINCULAR BOTONES DE CADA FILA
// ===================================================
function vincularBotonesFila() {
  tablaPacientes.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", e => editarPaciente(e.target.dataset.id));
  });
  tablaPacientes.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", e => eliminarPaciente(e.target.dataset.id));
  });
  tablaPacientes.querySelectorAll(".btn-ver").forEach(btn => {
    btn.addEventListener("click", e => verHistorialPaciente(e.target.dataset.id));
  });
}

// ===================================================
// 🔹 EVENTOS GENERALES
// ===================================================
function inicializarEventos() {
  btnNuevo.addEventListener("click", abrirModalNuevo);
  btnCerrar.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);

  btnBuscar.addEventListener("click", renderPacientes);
  buscarInput.addEventListener("keyup", e => {
    if (e.key === "Enter") renderPacientes();
  });

  btnInactivos.addEventListener("click", () => {
    mostrarInactivos = !mostrarInactivos;
    btnInactivos.classList.toggle("activo", mostrarInactivos);
    renderPacientes();
  });

  btnFiltroDoctor.addEventListener("click", () => {
    doctorDropdown.style.display = "block";
  });

  document.addEventListener("click", e => {
    if (!doctorDropdown.contains(e.target) && e.target !== btnFiltroDoctor) {
      doctorDropdown.style.display = "none";
    }
  });

  form.addEventListener("submit", guardarPaciente);
}

// ===================================================
// 🔹 LLENAR LISTA DE DOCTORES PARA FILTRO
// ===================================================
function cargarDoctoresUnicos() {
  const doctores = [...new Set(pacientes.map(p => p.doctor).filter(Boolean))];
  doctorList.innerHTML = `<button class="odc-dropdown-item" data-doctor="__all__">Todos</button>`;
  doctores.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "odc-dropdown-item";
    btn.dataset.doctor = d;
    btn.textContent = d;
    doctorList.appendChild(btn);
  });

  doctorList.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", e => {
      filtroDoctor = e.target.dataset.doctor;
      doctorDropdown.style.display = "none";
      renderPacientes();
    });
  });
}

// ===================================================
// 🔹 ABRIR Y CERRAR MODAL
// ===================================================
function abrirModalNuevo() {
  form.reset();
  qid("pacienteId").value = "";
  modal.style.display = "block";
}

function cerrarModal() {
  modal.style.display = "none";
}

// ===================================================
// 🔹 GUARDAR / ACTUALIZAR PACIENTE
// ===================================================
async function guardarPaciente(e) {
  e.preventDefault();

  const id = qid("pacienteId").value;
  const data = {
    nombres: qid("nombres").value,
    apellidos: qid("apellidos").value,
    nombreCompleto: `${qid("nombres").value} ${qid("apellidos").value}`.trim(),
    nroDocumento: qid("nroDocumento").value,
    fechaIngreso: qid("fechaIngreso").value,
    doctor: qid("doctor").value,
    celular: qid("celular").value,
    email: qid("email").value,
    inactivo: false,
  };

  try {
    if (id) {
      await window.db.collection("pacientes").doc(id).update(data);
    } else {
      await window.db.collection("pacientes").add(data);
    }
    await cargarPacientes();
    cerrarModal();
  } catch (error) {
    console.error("Error guardando paciente:", error);
  }
}

// ===================================================
// 🔹 EDITAR PACIENTE
// ===================================================
function editarPaciente(id) {
  const p = pacientes.find(p => p.id === id);
  if (!p) return;

  for (const [key, val] of Object.entries(p)) {
    if (qid(key)) qid(key).value = val;
  }

  qid("pacienteId").value = id;
  modal.style.display = "block";
}

// ===================================================
// 🔹 ELIMINAR PACIENTE
// ===================================================
async function eliminarPaciente(id) {
  if (!confirm("¿Deseas eliminar este paciente?")) return;
  try {
    await window.db.collection("pacientes").doc(id).delete();
    await cargarPacientes();
  } catch (error) {
    console.error("Error eliminando paciente:", error);
  }
}

// ===================================================
// 🔹 VER HISTORIAL DE PACIENTE (CITAS)
// ===================================================
async function verHistorialPaciente(id) {
  const p = pacientes.find(p => p.id === id);
  if (!p) return alert("Paciente no encontrado.");

  const nombrePaciente = p.nombreCompleto || `${p.nombres || ""} ${p.apellidos || ""}`.trim();
  if (!nombrePaciente) return alert("El paciente no tiene nombre registrado.");

  try {
    // Consulta a Firestore
    const snapshot = await window.db.collection("citas")
      .where("paciente", "==", nombrePaciente)
      .orderBy("fecha", "desc")
      .get();

    if (snapshot.empty) {
      alert(`No hay citas registradas para ${nombrePaciente}.`);
      return;
    }

    // Construir contenido del historial
    let historialHTML = `
      <div class="odc-historial">
        <h3>Historial de ${nombrePaciente}</h3>
        <table class="odc-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Doctor</th>
              <th>Estado</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
    `;

    snapshot.docs.forEach(doc => {
      const c = doc.data();
      historialHTML += `
        <tr>
          <td>${c.fecha || "-"}</td>
          <td>${c.horaInicio || "-"}</td>
          <td>${c.doctor || "-"}</td>
          <td>${c.estado || "-"}</td>
          <td>${c.comentario || ""}</td>
        </tr>
      `;
    });

    historialHTML += `
          </tbody>
        </table>
      </div>
    `;

    mostrarHistorialModal(historialHTML);
  } catch (error) {
    console.error("Error cargando historial:", error);
    alert("Error al cargar el historial del paciente.");
  }
}

// ===================================================
// 🔹 MODAL PARA MOSTRAR HISTORIAL
// ===================================================
function mostrarHistorialModal(html) {
  // Crear el modal si no existe
  let modalHist = document.getElementById("modalHistorial");
  if (!modalHist) {
    modalHist = document.createElement("div");
    modalHist.id = "modalHistorial";
    modalHist.className = "odc-modal";
    modalHist.innerHTML = `
      <div class="odc-modal-backdrop"></div>
      <div class="odc-modal-dialog">
        <div class="odc-modal-header">
          <h3>Historial del paciente</h3>
          <button class="odc-modal-close" id="btnCerrarHistorial">&times;</button>
        </div>
        <div class="odc-modal-body" id="contenidoHistorial"></div>
      </div>
    `;
    document.body.appendChild(modalHist);
  }

  // Insertar contenido y mostrar
  document.getElementById("contenidoHistorial").innerHTML = html;
  modalHist.style.display = "block";

  // Cerrar modal
  document.getElementById("btnCerrarHistorial").onclick = () => {
    modalHist.style.display = "none";
  };

  modalHist.querySelector(".odc-modal-backdrop").onclick = () => {
    modalHist.style.display = "none";
  };
}
