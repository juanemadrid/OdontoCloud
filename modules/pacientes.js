// pacientes.js - versión completa funcional y estable

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const tabla = document.getElementById("tablaPacientes");
const resultCount = document.getElementById("resultCount");
const btnBuscar = document.getElementById("btnBuscar");
const buscarPaciente = document.getElementById("buscarPaciente");
const btnNuevoPaciente = document.getElementById("btnNuevoPaciente");
const btnFiltroDoctor = document.getElementById("btnFiltroDoctor");
const btnInactivos = document.getElementById("btnInactivos");
const modal = document.getElementById("modalPaciente");
const formPaciente = document.getElementById("formPaciente");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const modalCancel = document.getElementById("modalCancel");
const doctorDropdown = document.getElementById("doctorDropdown");
const doctorList = document.getElementById("doctorList");

let pacientes = [];
let modoInactivos = false;

// 🔹 Cargar todos los pacientes activos al iniciar
window.addEventListener("DOMContentLoaded", async () => {
  await cargarPacientes();
});

// 🔹 Función principal de carga
async function cargarPacientes(filtroDoctor = null, soloInactivos = false) {
  tabla.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
  const snapshot = await getDocs(collection(db, "pacientes"));
  pacientes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  let data = pacientes.filter((p) =>
    soloInactivos ? p.activo === false : p.activo !== false
  );

  if (filtroDoctor && filtroDoctor !== "__all") {
    data = data.filter((p) => p.doctor?.toLowerCase() === filtroDoctor.toLowerCase());
  }

  renderPacientes(data);
}

// 🔹 Renderizar tabla
function renderPacientes(lista) {
  if (!lista.length) {
    tabla.innerHTML = `<tr><td colspan="6">Sin datos</td></tr>`;
    resultCount.textContent = "0";
    return;
  }

  tabla.innerHTML = lista
    .map(
      (p) => `
      <tr>
        <td>${p.nombreCompleto || ""}</td>
        <td>${p.documento || ""}</td>
        <td>${p.creado ? new Date(p.creado).toLocaleDateString() : ""}</td>
        <td style="text-align:center">
          ${
            p.activo === false
              ? `<button class="odc-btn odc-btn-green btn-activar" data-id="${p.id}">Activar</button>`
              : `
                <button class="odc-btn odc-btn-blue btn-editar" data-id="${p.id}">Editar</button>
                <button class="odc-btn odc-btn-red btn-inactivar" data-id="${p.id}">Inactivar</button>
              `
          }
        </td>
      </tr>`
    )
    .join("");

  resultCount.textContent = lista.length;

  // Asignar eventos dinámicos
  document.querySelectorAll(".btn-editar").forEach((b) =>
    b.addEventListener("click", () => editarPaciente(b.dataset.id))
  );
  document.querySelectorAll(".btn-inactivar").forEach((b) =>
    b.addEventListener("click", () => cambiarEstado(b.dataset.id, false))
  );
  document.querySelectorAll(".btn-activar").forEach((b) =>
    b.addEventListener("click", () => cambiarEstado(b.dataset.id, true))
  );
}

// 🔹 Buscar paciente
btnBuscar.addEventListener("click", () => {
  const texto = buscarPaciente.value.trim().toLowerCase();
  if (!texto) return renderPacientes(pacientes.filter((p) => p.activo !== false));

  const filtrados = pacientes.filter(
    (p) =>
      (p.activo !== false &&
        (p.nombreCompleto?.toLowerCase().includes(texto) ||
          p.documento?.toLowerCase().includes(texto) ||
          p.celular?.toLowerCase().includes(texto) ||
          p.email?.toLowerCase().includes(texto)))
  );

  renderPacientes(filtrados);
});

// 🔹 Mostrar solo inactivos
btnInactivos.addEventListener("click", async () => {
  modoInactivos = !modoInactivos;
  btnInactivos.textContent = modoInactivos ? "Ver activos" : "Inactivos";
  await cargarPacientes(null, modoInactivos);
});

// 🔹 Abrir modal nuevo paciente
btnNuevoPaciente.addEventListener("click", () => {
  modal.style.display = "flex";
  formPaciente.reset();
  document.getElementById("pacienteId").value = "";
});

// 🔹 Cerrar modal
[btnCerrarModal, modalCancel].forEach((btn) =>
  btn.addEventListener("click", () => (modal.style.display = "none"))
);

// 🔹 Guardar paciente nuevo o existente
formPaciente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("pacienteId").value;
  const data = {
    nombreCompleto: document.getElementById("nombreCompleto").value,
    documento: document.getElementById("nroDocumento").value,
    email: document.getElementById("email").value,
    celular: document.getElementById("celular").value,
    doctor: document.getElementById("doctor").value,
    eps: document.getElementById("nombreEps").value,
    activo: true,
    creado: new Date().toISOString(),
  };

  if (id) {
    await updateDoc(doc(db, "pacientes", id), data);
  } else {
    await addDoc(collection(db, "pacientes"), data);
  }

  modal.style.display = "none";
  await cargarPacientes();
});

// 🔹 Editar paciente
async function editarPaciente(id) {
  const p = pacientes.find((x) => x.id === id);
  if (!p) return alert("Paciente no encontrado");

  modal.style.display = "flex";
  document.getElementById("pacienteId").value = id;
  document.getElementById("nombreCompleto").value = p.nombreCompleto || "";
  document.getElementById("nroDocumento").value = p.documento || "";
  document.getElementById("email").value = p.email || "";
  document.getElementById("celular").value = p.celular || "";
  document.getElementById("nombreEps").value = p.eps || "";
  document.getElementById("doctor").value = p.doctor || "";
}

// 🔹 Activar / Inactivar paciente
async function cambiarEstado(id, nuevoEstado) {
  await updateDoc(doc(db, "pacientes", id), { activo: nuevoEstado });
  await cargarPacientes(null, modoInactivos);
}

// 🔹 Filtro por doctor (desplegable)
btnFiltroDoctor.addEventListener("click", async () => {
  doctorDropdown.style.display =
    doctorDropdown.style.display === "block" ? "none" : "block";

  const doctores = [
    ...new Set(
      pacientes.map((p) => (p.doctor ? p.doctor.toLowerCase() : null)).filter(Boolean)
    ),
  ];

  doctorList.innerHTML = `<button class="odc-dropdown-item" data-doctor="__all">Todos</button>` +
    doctores
      .map(
        (d) =>
          `<button class="odc-dropdown-item" data-doctor="${d}">${d}</button>`
      )
      .join("");

  doctorList.querySelectorAll(".odc-dropdown-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      doctorDropdown.style.display = "none";
      await cargarPacientes(btn.dataset.doctor);
    });
  });
});
