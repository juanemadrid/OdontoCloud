// modules/pacientes.js
import { db, storage } from "../app.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export async function initPacientes(db, auth) {
  const tabla = document.getElementById("tablaPacientes");
  const resultCount = document.getElementById("resultCount");
  const modal = document.getElementById("modalPaciente");
  const form = document.getElementById("formPaciente");
  const btnCerrar = document.getElementById("btnCerrarModal");
  const btnNuevo = document.getElementById("btnNuevoPaciente");
  const btnInactivos = document.getElementById("btnInactivos");
  const buscarInput = document.getElementById("buscarPaciente");
  const btnBuscar = document.getElementById("btnBuscar");

  let mostrarInactivos = false;

  // =============================
  // Función para cargar pacientes
  // =============================
  async function cargarPacientes() {
    tabla.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
    let q = collection(db, "pacientes");
    if (!mostrarInactivos) {
      q = query(q, where("activo", "==", true));
    }
    const snapshot = await getDocs(q);
    const pacientes = [];
    snapshot.forEach(doc => pacientes.push({ id: doc.id, ...doc.data() }));

    if (buscarInput.value.trim()) {
      const term = buscarInput.value.toLowerCase();
      pacientes = pacientes.filter(p => 
        p.nombres.toLowerCase().includes(term) ||
        p.apellidos.toLowerCase().includes(term) ||
        p.nroDocumento.toLowerCase().includes(term) ||
        (p.celular?.toLowerCase() || "").includes(term)
      );
    }

    if (pacientes.length === 0) {
      tabla.innerHTML = `<tr class="sin-datos"><td colspan="6">Sin datos</td></tr>`;
    } else {
      tabla.innerHTML = "";
      pacientes.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.nombres} ${p.apellidos}</td>
          <td>${p.nroDocumento || "-"}</td>
          <td>${p.fechaIngreso || "-"}</td>
          <td style="text-align:center">
            <button class="btn-accion" data-id="${p.id}" data-accion="editar">✏️</button>
            <button class="btn-accion" data-id="${p.id}" data-accion="${p.activo ? "inactivar" : "activar"}">
              ${p.activo ? "🔒" : "🔓"}
            </button>
          </td>
        `;
        tabla.appendChild(tr);
      });
    }

    resultCount.textContent = pacientes.length;

    // Agregar eventos a botones de acciones
    document.querySelectorAll(".btn-accion").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") {
          await editarPaciente(id);
        } else if (accion === "inactivar" || accion === "activar") {
          await toggleActivo(id, accion === "activar");
        }
      });
    });
  }

  // =============================
  // Activar/Inactivar paciente
  // =============================
  async function toggleActivo(id, activar) {
    const refPac = doc(db, "pacientes", id);
    await updateDoc(refPac, { activo: activar });
    cargarPacientes();
  }

  // =============================
  // Editar paciente
  // =============================
  async function editarPaciente(id) {
    const docRef = doc(db, "pacientes", id);
    const snap = await getDocs(query(collection(db, "pacientes"), where("__name__", "==", id)));
    if (!snap.empty) {
      const data = snap.docs[0].data();
      for (const key in data) {
        const input = document.getElementById(key);
        if (input) input.value = data[key];
      }
      document.getElementById("pacienteId").value = id;
      modal.style.display = "block";
    }
  }

  // =============================
  // Abrir modal nuevo paciente
  // =============================
  btnNuevo.addEventListener("click", () => {
    form.reset();
    document.getElementById("pacienteId").value = "";
    modal.style.display = "block";
  });

  btnCerrar.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // =============================
  // Guardar paciente
  // =============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pacienteId").value;
    const fotoFile = document.getElementById("inputFoto").files[0];

    const pacienteData = {
      nombres: document.getElementById("nombres").value,
      apellidos: document.getElementById("apellidos").value,
      nroDocumento: document.getElementById("nroDocumento").value,
      fechaIngreso: document.getElementById("fechaIngreso").value,
      activo: true,
      // Agrega más campos según tu formulario
    };

    if (fotoFile) {
      const storageRef = ref(storage, `pacientes/${fotoFile.name}`);
      await uploadBytes(storageRef, fotoFile);
      const url = await getDownloadURL(storageRef);
      pacienteData.fotoURL = url;
    }

    if (id) {
      // Actualizar paciente
      const docRef = doc(db, "pacientes", id);
      await updateDoc(docRef, pacienteData);
    } else {
      // Crear nuevo paciente
      await addDoc(collection(db, "pacientes"), pacienteData);
    }

    modal.style.display = "none";
    cargarPacientes();
  });

  // =============================
  // Filtros y búsqueda
  // =============================
  btnInactivos.addEventListener("click", () => {
    mostrarInactivos = !mostrarInactivos;
    btnInactivos.textContent = mostrarInactivos ? "Activos" : "Inactivos";
    cargarPacientes();
  });

  btnBuscar.addEventListener("click", cargarPacientes);
  buscarInput.addEventListener("keyup", (e) => { if (e.key === "Enter") cargarPacientes(); });

  // =============================
  // Inicializar
  // =============================
  cargarPacientes();
}
