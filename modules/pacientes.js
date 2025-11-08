// ===============================
// pacientes.js - Gestión de pacientes
// ===============================

// Asegúrate de que 'db' esté disponible desde app.js
// import { db } from './app.js'; // si usas módulos

const tablaPacientes = document.getElementById("tablaPacientes");
const btnNuevoPaciente = document.getElementById("btnNuevoPaciente");
const modalPaciente = document.getElementById("modalPaciente");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarModal = document.getElementById("modalCancel");
const formPaciente = document.getElementById("formPaciente");
const buscarInput = document.getElementById("buscarPaciente");
const btnBuscar = document.getElementById("btnBuscar");
const btnInactivos = document.getElementById("btnInactivos");
const doctorInput = document.getElementById("doctor");
const resultCount = document.getElementById("resultCount");

let mostrandoInactivos = false;

// ===============================
// Abrir/Cerrar Modal
// ===============================
btnNuevoPaciente.addEventListener("click", () => {
  modalPaciente.style.display = "block";
});

btnCerrarModal.addEventListener("click", () => {
  modalPaciente.style.display = "none";
  formPaciente.reset();
});

btnCancelarModal.addEventListener("click", () => {
  modalPaciente.style.display = "none";
  formPaciente.reset();
});

// ===============================
// Función para calcular edad
// ===============================
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// ===============================
// Guardar paciente en Firestore
// ===============================
formPaciente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pacienteData = {
    tipoDocumento: document.getElementById("tipoDocumento").value,
    nroDocumento: document.getElementById("nroDocumento").value,
    nroHistoria: document.getElementById("nroHistoria").value,
    nombres: document.getElementById("nombres").value,
    apellidos: document.getElementById("apellidos").value,
    nombreCompleto: document.getElementById("nombres").value + " " + document.getElementById("apellidos").value,
    sexo: document.getElementById("sexo").value,
    estadoCivil: document.getElementById("estadoCivil").value,
    paisNacimiento: document.getElementById("paisNacimiento").value,
    ciudadNacimiento: document.getElementById("ciudadNacimiento").value,
    fechaIngreso: new Date().toISOString(),
    fechaNacimiento: document.getElementById("fechaNacimiento").value,
    edad: calcularEdad(document.getElementById("fechaNacimiento").value),
    paisDomicilio: document.getElementById("paisDomicilio").value,
    ciudadDomicilio: document.getElementById("ciudadDomicilio").value,
    barrio: document.getElementById("barrio").value,
    lugarResidencia: document.getElementById("lugarResidencia").value,
    estrato: document.getElementById("estrato").value,
    zonaResidencial: document.getElementById("zonaResidencial").value,
    esExtranjero: document.getElementById("esExtranjero").checked,
    permitePublicidad: document.getElementById("permitePublicidad").checked,
    celular: document.getElementById("celular").value,
    telDomicilio: document.getElementById("telDomicilio").value,
    telOficina: document.getElementById("telOficina").value,
    extension: document.getElementById("extension").value,
    email: document.getElementById("email").value,
    ocupacion: document.getElementById("ocupacion").value,
    nombreResponsable: document.getElementById("nombreResponsable").value,
    parentesco: document.getElementById("parentesco").value,
    celularResponsable: document.getElementById("celularResponsable").value,
    telefonoResponsable: document.getElementById("telefonoResponsable").value,
    emailResponsable: document.getElementById("emailResponsable").value,
    nombreAcompanante: document.getElementById("nombreAcompanante").value,
    telefonoAcompanante: document.getElementById("telefonoAcompanante").value,
    convenioBeneficio: document.getElementById("convenioBeneficio").value,
    comoConocio: document.getElementById("comoConocio").value,
    campania: document.getElementById("campania").value,
    remitidoPor: document.getElementById("remitidoPor").value,
    asesorComercial: document.getElementById("asesorComercial").value,
    tipoVinculacion: document.getElementById("tipoVinculacion").value,
    nombreEps: document.getElementById("nombreEps").value,
    polizaSalud: document.getElementById("polizaSalud").value,
    doctor: document.getElementById("doctor").value,
    notas: document.getElementById("notas").value,
    activo: true, // por defecto activo
    createdAt: new Date(),
  };

  try {
    await db.collection("pacientes").add(pacienteData);
    alert("Paciente guardado correctamente.");
    formPaciente.reset();
    modalPaciente.style.display = "none";
    cargarPacientes();
  } catch (error) {
    console.error("Error al guardar paciente:", error);
    alert("Error al guardar paciente. Ver consola.");
  }
});

// ===============================
// Cargar pacientes desde Firestore
// ===============================
async function cargarPacientes() {
  tablaPacientes.innerHTML = `<tr class="sin-datos"><td colspan="6">Cargando...</td></tr>`;

  try {
    let queryRef = db.collection("pacientes");
    queryRef = queryRef.orderBy("nombres", "asc");

    const snapshot = await queryRef.get();
    let pacientes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filtrar activos/inactivos
    pacientes = pacientes.filter((p) => p.activo !== mostrandoInactivos);

    // Filtrar por búsqueda
    const term = buscarInput.value.trim().toLowerCase();
    if (term) {
      pacientes = pacientes.filter(
        (p) =>
          p.nombres.toLowerCase().includes(term) ||
          p.apellidos.toLowerCase().includes(term) ||
          (p.nroDocumento && p.nroDocumento.includes(term)) ||
          (p.celular && p.celular.includes(term))
      );
    }

    // Filtrar por doctor si se ingresó
    const doctorTerm = doctorInput.value.trim().toLowerCase();
    if (doctorTerm) {
      pacientes = pacientes.filter(
        (p) => p.doctor && p.doctor.toLowerCase().includes(doctorTerm)
      );
    }

    if (pacientes.length === 0) {
      tablaPacientes.innerHTML = `<tr class="sin-datos"><td colspan="6">Sin datos</td></tr>`;
      resultCount.textContent = "0";
      return;
    }

    tablaPacientes.innerHTML = "";
    pacientes.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nombreCompleto || ""}</td>
        <td>${p.nroDocumento || ""}</td>
        <td>${p.fechaIngreso ? new Date(p.fechaIngreso).toLocaleDateString() : ""}</td>
        <td style="text-align:center">
          <button class="odc-btn odc-btn-blue btn-toggle" data-id="${p.id}" data-activo="${p.activo}">
            ${p.activo ? "Inactivar" : "Activar"}
          </button>
        </td>
      `;
      tablaPacientes.appendChild(tr);
    });

    resultCount.textContent = pacientes.length;

    // Agregar eventos a botones Activar/Inactivar
    document.querySelectorAll(".btn-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pacienteId = btn.dataset.id;
        const nuevoEstado = btn.dataset.activo === "true" ? false : true;
        try {
          await db.collection("pacientes").doc(pacienteId).update({ activo: nuevoEstado });
          cargarPacientes();
        } catch (error) {
          console.error("Error al cambiar estado:", error);
        }
      });
    });
  } catch (error) {
    console.error("Error al cargar pacientes:", error);
    tablaPacientes.innerHTML = `<tr class="sin-datos"><td colspan="6">Error al cargar datos</td></tr>`;
    resultCount.textContent = "0";
  }
}

// ===============================
// Búsqueda y filtros
// ===============================
btnBuscar.addEventListener("click", () => cargarPacientes());

btnInactivos.addEventListener("click", () => {
  mostrandoInactivos = !mostrandoInactivos;
  btnInactivos.textContent = mostrandoInactivos ? "Activos" : "Inactivos";
  cargarPacientes();
});

// ===============================
// Inicializar carga
// ===============================
cargarPacientes();
