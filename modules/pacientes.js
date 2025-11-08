// modules/pacientes.js
// Versión mejorada: edición + inactivar + lista de doctores + robustez
(function () {
  if (window.__odc_pacientes_loaded) return;
  window.__odc_pacientes_loaded = true;

  function initPacientes(db, auth) {
    console.log("✅ initPacientes cargado correctamente");

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
      doctorDropdown: "doctorDropdown",
    };

    let bound = false;
    let currentFilterDoctor = "";
    let currentShowInactivos = false;

    function openModal() {
      const modal = document.getElementById(IDS.modal);
      if (!modal) return console.warn("❌ No se encontró #modalPaciente");
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
      const modal = document.getElementById(IDS.modal);
      const form = document.getElementById(IDS.form);
      if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
      if (form) try { form.reset(); } catch (e) {}
      // limpiar pacienteId y campos ocultos
      const pid = document.getElementById("pacienteId");
      if (pid) pid.value = "";
      const hiddenIds = ["inputNombre","inputDocumento","inputTelefono","inputEps","inputDoctor"];
      hiddenIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
      // limpiar nombreCompleto
      const nombreCompleto = document.getElementById("nombreCompleto");
      if (nombreCompleto) nombreCompleto.value = "";
    }

    function escapeHtml(s) {
      if (s == null) return "";
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function renderPacientes(rows) {
      const tbody = document.getElementById(IDS.tabla);
      const countEl = document.getElementById("resultCount");
      if (!tbody) return;
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">Sin datos</td></tr>`;
        if (countEl) countEl.textContent = "0";
        return;
      }
      let html = "";
      rows.forEach((r) => {
        const fecha = r.createdAt || r.fechaIngreso || "";
        html += `
          <tr>
            <td>${escapeHtml(r.nombre)}</td>
            <td>${escapeHtml(r.documento)}</td>
            <td>${escapeHtml(fecha)}</td>
            <td style="text-align:center">
              <button class="btn-editar" data-id="${escapeHtml(r.id)}">Editar</button>
              <button class="btn-inactivar" data-id="${escapeHtml(r.id)}">Inactivar</button>
            </td>
          </tr>`;
      });
      tbody.innerHTML = html;
      if (countEl) countEl.textContent = String(rows.length);

      // Delegación: manejar editar / inactivar (la tabla se re-renderiza)
      tbody.removeEventListener?.("click", tbody._clickHandler);
      const clickHandler = async (e) => {
        const editBtn = e.target.closest(".btn-editar");
        if (editBtn) {
          const id = editBtn.dataset.id;
          if (id) await onEditarPaciente(id);
          return;
        }
        const inactBtn = e.target.closest(".btn-inactivar");
        if (inactBtn) {
          const id = inactBtn.dataset.id;
          if (id) await onInactivarPaciente(id);
          return;
        }
      };
      tbody._clickHandler = clickHandler;
      tbody.addEventListener("click", clickHandler);
    }

    async function buscarPacientes(term = "", filterDoctor = "", showInactivos = false) {
      term = (term || "").trim().toLowerCase();
      filterDoctor = (filterDoctor || "").trim();
      try {
        if (db) {
          const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
          const cRef = collection(db, "pacientes");
          const snap = await getDocs(query(cRef, orderBy("nombre")));
          const rows = [];
          snap.forEach((d) => {
            const data = d.data();
            const id = d.id;
            const nombre = (data.nombre || "").toString();
            const documento = (data.documento || "").toString();
            const telefono = (data.celular || data.telefono || "").toString();
            const doctor = (data.doctor || "").toString();
            const activo = data.activo === false ? false : true;
            if (!showInactivos && !activo) return;
            if (filterDoctor && filterDoctor !== "__all" && doctor !== filterDoctor) return;
            const hay = `${nombre} ${documento} ${telefono}`.toLowerCase();
            if (term && !hay.includes(term)) return;
            rows.push({ id, nombre, documento, telefono, doctor, createdAt: data.creado || data.fechaIngreso || "" });
          });
          renderPacientes(rows);
        } else {
          renderPacientes([]);
        }
      } catch (err) {
        console.error("Error buscando pacientes:", err);
        renderPacientes([]);
      }
    }

    // Carga la lista de doctores para el dropdown de filtro
    async function loadDoctorList() {
      try {
        if (!db) return;
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const cRef = collection(db, "doctores");
        const snap = await getDocs(cRef);
        const listEl = document.getElementById("doctorList");
        if (!listEl) return;
        // limpiar existentes excepto "Todos"
        listEl.innerHTML = `<button class="odc-dropdown-item" data-doctor="__all">Todos</button>`;
        snap.forEach((d) => {
          const name = d.data()?.nombre || d.id;
          const btn = document.createElement("button");
          btn.className = "odc-dropdown-item";
          btn.dataset.doctor = String(name);
          btn.textContent = String(name);
          listEl.appendChild(btn);
        });
      } catch (err) {
        console.warn("No se pudo cargar la lista de doctores:", err);
      }
    }

    // Cargar datos del paciente y llenar el formulario para edición
    async function onEditarPaciente(id) {
      try {
        if (!confirm("Cargar paciente para editar?")) return;
        if (!db) {
          alert("DB no disponible localmente.");
          return;
        }
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("Paciente no encontrado.");
          return;
        }
        const data = snap.data() || {};
        // Rellenar campos visibles/ocultos (no tocar estructura visual)
        const fullName = (data.nombre || "").toString();
        const documento = data.documento || "";
        const celular = data.celular || data.telefono || "";
        const nombreEps = data.correo || data.nombreEps || ""; // fallback
        const doctor = data.doctor || "";

        // Set pacienteId hidden
        const pid = document.getElementById("pacienteId");
        if (pid) pid.value = id;

        // Campos ocultos que usa el JS de guardado
        const inNombre = document.getElementById("inputNombre");
        const inDocumento = document.getElementById("inputDocumento");
        const inTelefono = document.getElementById("inputTelefono");
        const inEps = document.getElementById("inputEps");
        const inDoctor = document.getElementById("inputDoctor");
        if (inNombre) inNombre.value = fullName;
        if (inDocumento) inDocumento.value = documento;
        if (inTelefono) inTelefono.value = celular;
        if (inEps) inEps.value = nombreEps;
        if (inDoctor) inDoctor.value = doctor;

        // Campos visibles del formulario (intentar rellenar lo mínimo necesario para UX)
        const nombresEl = document.getElementById("nombres");
        const apellidosEl = document.getElementById("apellidos");
        const nombreCompletoEl = document.getElementById("nombreCompleto");
        const nroDocumentoEl = document.getElementById("nroDocumento");
        const celularEl = document.getElementById("celular");
        const nombreEpsEl = document.getElementById("nombreEps");
        const doctorEl = document.getElementById("doctor");

        // Split nombre en nombres/apellidos (mejor que nada)
        if (fullName && (!nombresEl?.value && !apellidosEl?.value)) {
          const parts = fullName.split(" ");
          if (nombresEl) nombresEl.value = parts.shift() || "";
          if (apellidosEl) apellidosEl.value = parts.join(" ") || "";
        } else {
          if (nombresEl && data.nombres) nombresEl.value = data.nombres;
          if (apellidosEl && data.apellidos) apellidosEl.value = data.apellidos;
        }

        if (nombreCompletoEl) nombreCompletoEl.value = fullName;
        if (nroDocumentoEl) nroDocumentoEl.value = documento;
        if (celularEl) celularEl.value = celular;
        if (nombreEpsEl) nombreEpsEl.value = data.nombreEps || data.correo || "";
        if (doctorEl) doctorEl.value = doctor;

        // Abrir modal
        openModal();
      } catch (err) {
        console.error("Error al cargar paciente:", err);
        alert("Error cargando paciente. Mira la consola.");
      }
    }

    // Inactivar paciente (set activo:false). Si ya está inactivo, pregunta para activar.
    async function onInactivarPaciente(id) {
      try {
        if (!db) {
          alert("DB no disponible.");
          return;
        }
        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("Paciente no encontrado.");
          return;
        }
        const data = snap.data() || {};
        const isActive = data.activo === false ? false : true;
        const action = isActive ? "Inactivar" : "Reactivar";
        if (!confirm(`${action} paciente ${data.nombre || ""}?`)) return;
        await setDoc(ref, { activo: !isActive }, { merge: true });
        alert(`✅ Paciente ${isActive ? "inactivado" : "reactivado"} correctamente.`);
        await buscarPacientes(document.getElementById(IDS.buscarInput)?.value || "", currentFilterDoctor, currentShowInactivos);
      } catch (err) {
        console.error("Error al (in)activar paciente:", err);
        alert("Error actualizando estado. Revisa la consola.");
      }
    }

    function bindOnce() {
      if (bound) return;
      const btnNuevo = document.getElementById(IDS.btnNuevo);
      const btnCerrar = document.getElementById(IDS.btnCerrar);
      const btnCancelar = document.getElementById(IDS.btnCancelar);
      const modal = document.getElementById(IDS.modal);
      const form = document.getElementById(IDS.form);
      const buscarInput = document.getElementById(IDS.buscarInput);
      const btnBuscar = document.getElementById(IDS.btnBuscar);
      const btnInactivos = document.getElementById(IDS.btnInactivos);
      const btnFiltroDoctor = document.getElementById(IDS.btnFiltroDoctor);
      const doctorList = document.getElementById(IDS.doctorList);
      const doctorDropdown = document.getElementById(IDS.doctorDropdown);
      const tabla = document.getElementById(IDS.tabla);

      if (!btnNuevo || !modal || !form) return false;

      // abrir modal nuevo
      btnNuevo.addEventListener("click", (e) => { e.preventDefault(); openModal(); });

      // cerrar modal botones
      btnCerrar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });
      btnCancelar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });

      // cerrar modal al click en backdrop
      modal.addEventListener("click", (e) => {
        if (e.target.classList.contains("odc-modal-backdrop")) closeModal();
      });

      // SUBMIT: guardar paciente (create/update)
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Recolectar datos desde los inputs ocultos (sin alterar formulario visual)
        const pacienteIdHidden = (document.getElementById("pacienteId")?.value || "").trim();
        const nombre = (document.getElementById("inputNombre")?.value || "").trim();
        const documento = (document.getElementById("inputDocumento")?.value || "").trim();
        const telefono = (document.getElementById("inputTelefono")?.value || "").trim();
        const eps = (document.getElementById("inputEps")?.value || "").trim();
        const doctor = (document.getElementById("inputDoctor")?.value || "").trim();

        if (!nombre || !documento) { alert("Completa Nombre y Documento"); return; }

        try {
          if (db) {
            const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
            // if pacienteIdHidden present, use it; otherwise generate from documento
            const idCandidate = pacienteIdHidden || documento.replace(/\s+/g, "_");
            const ref = doc(db, "pacientes", idCandidate);

            // build payload - tomar valores adicionales visibles si existen
            const payload = {
              nombre,
              documento,
              celular: telefono,
              telefono: telefono,
              correo: eps || (document.getElementById("email")?.value || ""),
              nombreEps: document.getElementById("nombreEps")?.value || "",
              doctor: doctor || document.getElementById("doctor")?.value || "",
              creado: new Date().toISOString(),
              activo: true
            };

            // merge true para no sobreescribir campos no provistos
            await setDoc(ref, payload, { merge: true });
          } else {
            console.log("DB no disponible — simulando guardado", { nombre, documento });
          }

          alert("✅ Paciente guardado correctamente.");
          closeModal();
          await buscarPacientes();
        } catch (err) {
          console.error("Error guardando paciente:", err);
          alert("Error guardando paciente. Mira la consola.");
        }
      });

      // INPUT búsqueda live
      if (buscarInput) {
        buscarInput.addEventListener("input", async (e) => {
          await buscarPacientes(e.target.value, currentFilterDoctor, currentShowInactivos);
        });
      }

      // botón buscar
      btnBuscar?.addEventListener("click", async (e) => {
        e.preventDefault();
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      // botón mostrar inactivos
      btnInactivos?.addEventListener("click", async (e) => {
        e.preventDefault();
        currentShowInactivos = !currentShowInactivos;
        btnInactivos.classList.toggle("active", currentShowInactivos);
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      // botón filtro doctor (muestra/oculta dropdown)
      btnFiltroDoctor?.addEventListener("click", () => {
        const dd = document.getElementById("doctorDropdown");
        if (!dd) return;
        const hidden = dd.style.display === "none" || dd.getAttribute("aria-hidden") === "true";
        dd.style.display = hidden ? "block" : "none";
        dd.setAttribute("aria-hidden", hidden ? "false" : "true");
      });

      // selección doctor en dropdown
      doctorList?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".odc-dropdown-item");
        if (!btn) return;
        const doctor = btn.dataset.doctor || "__all";
        currentFilterDoctor = doctor === "__all" ? "" : doctor;
        document.getElementById("doctorDropdown").style.display = "none";
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      // cargar lista de doctores al init
      loadDoctorList();

      bound = true;
      console.log("🎯 Listeners pacientes conectados correctamente");
      return true;
    }

    const tryBind = async () => {
      const ok = bindOnce();
      if (ok) {
        await buscarPacientes("", currentFilterDoctor, currentShowInactivos);
        return;
      }
      setTimeout(tryBind, 300);
    };

    tryBind();
  }

  window.initPacientes = initPacientes;

  document.addEventListener("DOMContentLoaded", () => {
    try { initPacientes(window.db, window.auth); }
    catch (err) { console.error("initPacientes autoinit error:", err); }
  });
})();
