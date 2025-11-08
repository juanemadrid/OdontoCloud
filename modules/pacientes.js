(function () {
  if (window.__odc_pacientes_loaded) return;
  window.__odc_pacientes_loaded = true;

  async function initPacientes(db, auth) {
    console.log("✅ Módulo pacientes inicializado");

    const IDS = {
      modal: "modalPaciente",
      btnNuevo: "btnNuevoPaciente",
      btnCerrar: "btnCerrarModal",
      btnCancelar: "modalCancel",
      form: "formPaciente",
      tabla: "tablaPacientes",
      buscarInput: "buscarPaciente",
      btnBuscar: "btnBuscar",
      btnInactivos: "btnInactivos",
      btnFiltroDoctor: "btnFiltroDoctor",
      doctorList: "doctorList",
      pacienteIdHidden: "pacienteId",
      nroDocumento: "nroDocumento",
      nombres: "nombres",
      apellidos: "apellidos",
      nombreCompleto: "nombreCompleto",
      fechaNacimiento: "fechaNacimiento",
      edad: "edad",
      celular: "celular",
      email: "email",
      doctorField: "doctor",
      tipoDocumento: "tipoDocumento",
      paisNacimiento: "paisNacimiento",
      ciudadNacimiento: "ciudadNacimiento",
      paisDomicilio: "paisDomicilio",
      ciudadDomicilio: "ciudadDomicilio",
      barrio: "barrio",
      lugarResidencia: "lugarResidencia",
      notas: "notas",
      fotoInput: "inputFoto",
      fotoPreview: "fotoPreview",
      historialContainer: "historialCitasPaciente"
    };

    function qid(id) { return document.getElementById(id); }

    function calcularEdad(fechaISO) {
      if (!fechaISO) return "";
      const n = new Date(fechaISO);
      const diff = Date.now() - n.getTime();
      const ageDt = new Date(diff);
      return Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    function escapeHtml(s) {
      return s ? s.replace(/[&<>"']/g, (m) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
      )) : "";
    }

    // === Render de tabla ===
    function renderPacientes(rows) {
      const tbody = qid(IDS.tabla);
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5">Sin pacientes</td></tr>`;
        return;
      }
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${escapeHtml(r.nombre)}</td>
          <td>${escapeHtml(r.documento)}</td>
          <td>${escapeHtml(r.doctor || "-")}</td>
          <td>${escapeHtml(r.creado || "-")}</td>
          <td style="text-align:center">
            <button class="btn-editar" data-id="${r.id}">Editar</button>
            <button class="btn-inactivar" data-id="${r.id}">Inactivar</button>
          </td>
        </tr>
      `).join("");
    }

    // === Buscar pacientes ===
    async function buscarPacientes(term = "") {
      try {
        const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const q = query(collection(db, "pacientes"), orderBy("nombre"));
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach(d => {
          const data = d.data();
          if (!data.activo) return;
          if (term && !(`${data.nombre} ${data.apellido} ${data.documento}`.toLowerCase().includes(term.toLowerCase()))) return;
          rows.push({
            id: d.id,
            nombre: `${data.nombre || ""} ${data.apellido || ""}`.trim(),
            documento: data.documento,
            doctor: data.doctor,
            creado: data.creado ? new Date(data.creado).toLocaleDateString() : ""
          });
        });
        renderPacientes(rows);
      } catch (e) {
        console.error(e);
      }
    }

    // === Cargar paciente al modal ===
    async function cargarPaciente(id) {
      try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return alert("Paciente no encontrado");
        const p = snap.data();

        qid(IDS.pacienteIdHidden).value = id;
        qid(IDS.nroDocumento).value = p.documento || "";
        qid(IDS.nombres).value = p.nombre || "";
        qid(IDS.apellidos).value = p.apellido || "";
        qid(IDS.nombreCompleto).value = `${p.nombre || ""} ${p.apellido || ""}`.trim();
        qid(IDS.fechaNacimiento).value = p.fechaNacimiento || "";
        qid(IDS.edad).value = calcularEdad(p.fechaNacimiento);
        qid(IDS.celular).value = p.celular || "";
        qid(IDS.email).value = p.email || "";
        qid(IDS.doctorField).value = p.doctor || "";
        qid(IDS.tipoDocumento).value = p.tipoDocumento || "";
        qid(IDS.paisNacimiento).value = p.paisNacimiento || "";
        qid(IDS.ciudadNacimiento).value = p.ciudadNacimiento || "";
        qid(IDS.paisDomicilio).value = p.paisDomicilio || "";
        qid(IDS.ciudadDomicilio).value = p.ciudadDomicilio || "";
        qid(IDS.barrio).value = p.barrio || "";
        qid(IDS.lugarResidencia).value = p.lugarResidencia || "";
        qid(IDS.notas).value = p.notas || "";

        await cargarHistorialCitas(p.nombreCompleto);
        openModal();
      } catch (err) {
        console.error("Error al cargar paciente", err);
      }
    }

    // === Cargar historial de citas ===
    async function cargarHistorialCitas(nombreCompleto) {
      try {
        const { collection, getDocs, where, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const q = query(collection(db, "citas"), where("paciente", "==", nombreCompleto), orderBy("fecha", "desc"));
        const snap = await getDocs(q);

        let cont = qid(IDS.historialContainer);
        if (!cont) {
          cont = document.createElement("div");
          cont.id = IDS.historialContainer;
          cont.className = "historial-citas";
          const form = qid(IDS.form);
          form.parentNode.appendChild(cont);
        }

        if (snap.empty) {
          cont.innerHTML = `<h3>Historial de citas</h3><p>Sin citas registradas</p>`;
          return;
        }

        let html = `<h3>Historial de citas</h3><table class="tabla-historial">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Doctor</th><th>Estado</th><th>Comentario</th></tr></thead><tbody>`;
        snap.forEach(doc => {
          const d = doc.data();
          html += `<tr>
            <td>${escapeHtml(d.fecha || "")}</td>
            <td>${escapeHtml(d.horaInicio || "")}</td>
            <td>${escapeHtml(d.doctor || "")}</td>
            <td>${escapeHtml(d.estado || "")}</td>
            <td>${escapeHtml(d.comentario || "")}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
        cont.innerHTML = html;
      } catch (err) {
        console.error("Error cargando historial:", err);
      }
    }

    // === Guardar paciente ===
    async function guardarPaciente() {
      const id = qid(IDS.pacienteIdHidden).value.trim();
      const nombre = qid(IDS.nombres).value.trim();
      const apellido = qid(IDS.apellidos).value.trim();
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      const documento = qid(IDS.nroDocumento).value.trim();
      const fechaNacimiento = qid(IDS.fechaNacimiento).value;
      const edad = calcularEdad(fechaNacimiento);
      const celular = qid(IDS.celular).value.trim();
      const email = qid(IDS.email).value.trim();
      const doctor = qid(IDS.doctorField).value.trim();
      const tipoDocumento = qid(IDS.tipoDocumento).value.trim();
      const paisNacimiento = qid(IDS.paisNacimiento).value.trim();
      const ciudadNacimiento = qid(IDS.ciudadNacimiento).value.trim();
      const paisDomicilio = qid(IDS.paisDomicilio).value.trim();
      const ciudadDomicilio = qid(IDS.ciudadDomicilio).value.trim();
      const barrio = qid(IDS.barrio).value.trim();
      const lugarResidencia = qid(IDS.lugarResidencia).value.trim();
      const notas = qid(IDS.notas).value.trim();

      if (!nombre || !apellido || !documento) return alert("Faltan campos obligatorios.");

      const payload = {
        nombre, apellido, nombreCompleto, documento, fechaNacimiento, edad,
        celular, email, doctor, tipoDocumento, paisNacimiento, ciudadNacimiento,
        paisDomicilio, ciudadDomicilio, barrio, lugarResidencia, notas,
        activo: true, creado: new Date().toISOString()
      };

      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
      const ref = doc(db, "pacientes", id || documento);
      await setDoc(ref, payload, { merge: true });
      alert("✅ Paciente guardado correctamente");
      closeModal();
      await buscarPacientes();
    }

    // === Inactivar paciente ===
    async function inactivarPaciente(id) {
      if (!confirm("¿Inactivar paciente?")) return;
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
      await updateDoc(doc(db, "pacientes", id), { activo: false });
      alert("Paciente inactivado");
      await buscarPacientes();
    }

    function openModal() { qid(IDS.modal).style.display = "flex"; }
    function closeModal() { qid(IDS.modal).style.display = "none"; }

    // === Eventos ===
    qid(IDS.btnNuevo)?.addEventListener("click", () => openModal());
    qid(IDS.btnCerrar)?.addEventListener("click", closeModal);
    qid(IDS.btnCancelar)?.addEventListener("click", closeModal);
    qid(IDS.form)?.addEventListener("submit", e => { e.preventDefault(); guardarPaciente(); });
    qid(IDS.buscarInput)?.addEventListener("input", e => buscarPacientes(e.target.value));

    qid(IDS.tabla)?.addEventListener("click", async e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains("btn-editar")) await cargarPaciente(id);
      if (btn.classList.contains("btn-inactivar")) await inactivarPaciente(id);
    });

    // === Inicial ===
    await buscarPacientes();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.db) initPacientes(window.db, window.auth);
    else console.warn("⚠️ Firestore (window.db) no encontrado");
  });
})();
