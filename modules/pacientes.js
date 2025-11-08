// modules/pacientes.js
export function initPacientes(db, auth) {
  console.log("🔥 Módulo pacientes iniciado");

  // ======== ELEMENTOS =========
  const tablaPacientes = document.getElementById("tablaPacientes");
  const resultCount = document.getElementById("resultCount");
  const btnNuevoPaciente = document.getElementById("btnNuevoPaciente");
  const modalPaciente = document.getElementById("modalPaciente");
  const btnCerrarModal = document.getElementById("btnCerrarModal");
  const modalCancel = document.getElementById("modalCancel");
  const formPaciente = document.getElementById("formPaciente");
  const btnInactivos = document.getElementById("btnInactivos");
  const buscarPaciente = document.getElementById("buscarPaciente");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnFiltroDoctor = document.getElementById("btnFiltroDoctor");
  const doctorDropdown = document.getElementById("doctorDropdown");
  const doctorList = document.getElementById("doctorList");
  const inputFoto = document.getElementById("inputFoto");
  const fotoPreview = document.getElementById("fotoPreview");

  let pacientesData = [];
  let mostrarInactivos = false;
  let filtroDoctor = "__all";

  // ======== FUNCIONES =========
  const openModal = () => (modalPaciente.style.display = "block");
  const closeModal = () => {
    modalPaciente.style.display = "none";
    formPaciente.reset();
    fotoPreview.src = "";
    fotoPreview.style.display = "none";
    document.getElementById("pacienteId").value = "";
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return "";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const renderTabla = () => {
    let filtered = pacientesData.filter(p => (mostrarInactivos ? p.estado === "inactivo" : p.estado !== "inactivo"));
    if (buscarPaciente.value.trim()) {
      const term = buscarPaciente.value.toLowerCase();
      filtered = filtered.filter(p =>
        (p.nombres + " " + p.apellidos).toLowerCase().includes(term) ||
        (p.nroDocumento || "").toLowerCase().includes(term) ||
        (p.celular || "").toLowerCase().includes(term)
      );
    }
    if (filtroDoctor !== "__all") {
      filtered = filtered.filter(p => p.doctor === filtroDoctor);
    }

    resultCount.textContent = filtered.length;

    if (!filtered.length) {
      tablaPacientes.innerHTML = '<tr class="sin-datos"><td colspan="6">Sin datos</td></tr>';
      return;
    }

    tablaPacientes.innerHTML = filtered
      .map(p => `
      <tr>
        <td>${p.nombres} ${p.apellidos}</td>
        <td>${p.nroDocumento || ""}</td>
        <td>${p.fechaIngreso || ""}</td>
        <td style="text-align:center">
          <button class="btn-edit" data-id="${p.id}">✏️</button>
          <button class="btn-toggle" data-id="${p.id}">${p.estado === "activo" ? "🔓" : "🔒"}</button>
        </td>
      </tr>
    `).join("");

    // Eventos de botones
    tablaPacientes.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", async () => {
        const paciente = pacientesData.find(p => p.id === btn.dataset.id);
        if (!paciente) return;
        // llenar formulario
        Object.keys(paciente).forEach(key => {
          const el = document.getElementById(key);
          if (el) {
            if (el.type === "checkbox") el.checked = paciente[key];
            else el.value = paciente[key];
          }
        });
        if (paciente.fotoURL) {
          fotoPreview.src = paciente.fotoURL;
          fotoPreview.style.display = "block";
        }
        openModal();
      });
    });

    tablaPacientes.querySelectorAll(".btn-toggle").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const pacienteRef = doc(db, "pacientes", id);
        const paciente = pacientesData.find(p => p.id === id);
        const nuevoEstado = paciente.estado === "activo" ? "inactivo" : "activo";
        await pacienteRef.update({ estado: nuevoEstado });
        paciente.estado = nuevoEstado;
        renderTabla();
      });
    });
  };

  const fetchPacientes = async () => {
    const snapshot = await db.collection("pacientes").get();
    pacientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTabla();
    renderDoctorDropdown();
  };

  const renderDoctorDropdown = () => {
    const doctores = [...new Set(pacientesData.map(p => p.doctor).filter(Boolean))];
    doctorList.innerHTML = '<button class="odc-dropdown-item" data-doctor="__all">Todos</button>' +
      doctores.map(d => `<button class="odc-dropdown-item" data-doctor="${d}">${d}</button>`).join("");
    doctorList.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        filtroDoctor = btn.dataset.doctor;
        doctorDropdown.style.display = "none";
        renderTabla();
      });
    });
  };

  // ======== EVENTOS =========
  btnNuevoPaciente.addEventListener("click", openModal);
  btnCerrarModal.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);

  btnInactivos.addEventListener("click", () => {
    mostrarInactivos = !mostrarInactivos;
    btnInactivos.textContent = mostrarInactivos ? "Activos" : "Inactivos";
    renderTabla();
  });

  btnBuscar.addEventListener("click", renderTabla);

  btnFiltroDoctor.addEventListener("click", () => {
    doctorDropdown.style.display = doctorDropdown.style.display === "block" ? "none" : "block";
  });

  // Calcular nombre completo y edad automáticamente
  formPaciente.addEventListener("input", () => {
    const nombres = document.getElementById("nombres").value;
    const apellidos = document.getElementById("apellidos").value;
    document.getElementById("nombreCompleto").value = `${nombres} ${apellidos}`.trim();
    document.getElementById("edad").value = calcularEdad(document.getElementById("fechaNacimiento").value);
  });

  // Guardar paciente
  formPaciente.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pacienteId").value || null;

    const pacienteData = {};
    Array.from(formPaciente.elements).forEach(el => {
      if (el.id && el.type !== "button" && el.type !== "submit" && el.type !== "file") {
        if (el.type === "checkbox") pacienteData[el.id] = el.checked;
        else pacienteData[el.id] = el.value;
      }
    });

    pacienteData.estado = "activo";

    // Subir foto si hay
    if (inputFoto.files[0]) {
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(`pacientes/${Date.now()}_${inputFoto.files[0].name}`);
      await fileRef.put(inputFoto.files[0]);
      pacienteData.fotoURL = await fileRef.getDownloadURL();
    }

    if (id) {
      // actualizar
      await db.collection("pacientes").doc(id).update(pacienteData);
    } else {
      // nuevo
      pacienteData.fechaIngreso = new Date().toLocaleString();
      const docRef = await db.collection("pacientes").add(pacienteData);
      pacienteData.id = docRef.id;
      pacientesData.push(pacienteData);
    }

    closeModal();
    fetchPacientes();
  });

  // Inicializar
  fetchPacientes();
}
