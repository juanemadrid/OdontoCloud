// modules/pacientes.js
// Versión completa y lista para reemplazar — mantiene la UI tal como está
(function () {
  if (window.__odc_pacientes_loaded) return;
  window.__odc_pacientes_loaded = true;

  function initPacientes(db, auth) {
    console.log("✅ initPacientes cargado correctamente (mejorado y completo)");

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
      fotoInput: "inputFoto",
      fotoPreview: "fotoPreview",
      pacienteIdHidden: "pacienteId",
      // Campos del formulario según HTML
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
      // Nuevos campos del HTML
      sexo: "sexo",
      estadoCivil: "estadoCivil",
      nroHistoria: "nroHistoria",
      estrato: "estrato",
      zonaResidencial: "zonaResidencial",
      esExtranjero: "esExtranjero",
      permitePublicidad: "permitePublicidad",
      telDomicilio: "telDomicilio",
      telOficina: "telOficina",
      extension: "extension",
      ocupacion: "ocupacion",
      tipoVinculacion: "tipoVinculacion",
      nombreEps: "nombreEps",
      polizaSalud: "polizaSalud",
      fechaIngreso: "fechaIngreso",
    };

    let bound = false;
    let currentFilterDoctor = "";
    let currentShowInactivos = false;
    let lastSearchTerm = "";

    function qid(id) {
      return document.getElementById(id);
    }

    function escapeHtml(s) {
      if (s == null) return "";
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function calcularEdadDesdeFecha(fechaISO) {
      if (!fechaISO) return "";
      const n = new Date(fechaISO);
      if (isNaN(n)) return "";
      const diff = Date.now() - n.getTime();
      const ageDt = new Date(diff);
      return String(Math.abs(ageDt.getUTCFullYear() - 1970));
    }

    function renderPacientes(rows) {
      const tbody = qid(IDS.tabla);
      const countEl = qid("resultCount");
      if (!tbody) return;
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr class="sin-datos"><td colspan="6">Sin datos</td></tr>`;
        if (countEl) countEl.textContent = "0";
        return;
      }
      let html = "";
      for (const r of rows) {
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
      }
      tbody.innerHTML = html;
      if (countEl) countEl.textContent = String(rows.length);
    }

    async function buscarPacientes(term = "", filterDoctor = "", showInactivos = false) {
      term = (term || "").trim().toLowerCase();
      lastSearchTerm = term;
      filterDoctor = (filterDoctor || "").trim();
      try {
        if (!db) {
          renderPacientes([]);
          return;
        }
        const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const cRef = collection(db, "pacientes");
        const snap = await getDocs(query(cRef, orderBy("nombre")));
        const rows = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const id = d.id;
          const nombre = `${data.nombre || ""} ${data.apellido || ""}`.trim() || (data.nombre || "");
          const documento = (data.documento || "").toString();
          const telefono = (data.celular || data.telefono || "").toString();
          const doctor = (data.doctor || "").toString();
          const activo = data.activo === false ? false : true;
          if (!showInactivos && !activo) return;
          if (filterDoctor && filterDoctor !== "__all" && doctor !== filterDoctor) return;
          const hay = `${nombre} ${documento} ${telefono}`.toLowerCase();
          if (term && !hay.includes(term)) return;
          rows.push({
            id,
            nombre,
            documento,
            telefono,
            doctor,
            createdAt: data.creado || data.fechaIngreso || "",
          });
        });
        renderPacientes(rows);
      } catch (err) {
        console.error("Error buscando pacientes:", err);
        renderPacientes([]);
      }
    }

    function openModal() {
      const modal = qid(IDS.modal);
      if (!modal) return console.warn("❌ No se encontró #modalPaciente");
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    }
    function closeModal() {
      const modal = qid(IDS.modal);
      const form = qid(IDS.form);
      if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
      if (form) {
        try {
          form.reset();
          const fp = qid(IDS.fotoPreview);
          if (fp) { fp.src = ""; fp.style.display = "none"; }
          const hid = qid(IDS.pacienteIdHidden);
          if (hid) hid.value = "";
          const nc = qid(IDS.nombreCompleto);
          if (nc) nc.value = "";
          const age = qid(IDS.edad);
          if (age) age.value = "";
        } catch (e) {}
      }
    }

    async function cargarPacienteEnModal(id) {
      if (!db) {
        alert("Base de datos no disponible (simulación).");
        return;
      }
      try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("No se encontró el paciente en la base de datos.");
          return;
        }
        const data = snap.data() || {};
        qid(IDS.pacienteIdHidden).value = id;
        qid(IDS.nroDocumento).value = data.documento || "";
        qid(IDS.nombres).value = data.nombre || "";
        qid(IDS.apellidos).value = data.apellido || "";
        qid(IDS.nombreCompleto).value = `${data.nombre || ""} ${data.apellido || ""}`.trim();
        qid(IDS.fechaNacimiento).value = data.fechaNacimiento || "";
        qid(IDS.edad).value = calcularEdadDesdeFecha(data.fechaNacimiento);
        qid(IDS.celular).value = data.celular || data.telefono || "";
        qid(IDS.email).value = data.correo || data.email || "";
        qid(IDS.doctorField).value = data.doctor || "";
        qid(IDS.tipoDocumento).value = data.tipoDocumento || "";
        qid(IDS.paisNacimiento).value = data.paisNacimiento || "";
        qid(IDS.ciudadNacimiento).value = data.ciudadNacimiento || "";
        qid(IDS.paisDomicilio).value = data.paisDomicilio || "";
        qid(IDS.ciudadDomicilio).value = data.ciudadDomicilio || "";
        qid(IDS.barrio).value = data.barrio || "";
        qid(IDS.lugarResidencia).value = data.lugarResidencia || "";
        qid(IDS.notas).value = data.notas || data.comentario || "";
        qid(IDS.sexo).value = data.sexo || "";
        qid(IDS.estadoCivil).value = data.estadoCivil || "";
        qid(IDS.nroHistoria).value = data.nroHistoria || "";
        qid(IDS.estrato).value = data.estrato || "";
        qid(IDS.zonaResidencial).value = data.zonaResidencial || "";
        qid(IDS.esExtranjero).checked = data.esExtranjero || false;
        qid(IDS.permitePublicidad).checked = data.permitePublicidad || false;
        qid(IDS.telDomicilio).value = data.telDomicilio || "";
        qid(IDS.telOficina).value = data.telOficina || "";
        qid(IDS.extension).value = data.extension || "";
        qid(IDS.ocupacion).value = data.ocupacion || "";
        qid(IDS.tipoVinculacion).value = data.tipoVinculacion || "";
        qid(IDS.nombreEps).value = data.nombreEps || "";
        qid(IDS.polizaSalud).value = data.polizaSalud || "";
        qid(IDS.fechaIngreso).value = data.fechaIngreso || "";
        try {
          const fp = qid(IDS.fotoPreview);
          if (fp && data.fotoUrl) {
            fp.src = data.fotoUrl;
            fp.style.display = "block";
          }
        } catch (e) {}
        openModal();
      } catch (err) {
        console.error("Error cargando paciente:", err);
        alert("Error cargando paciente. Revisa consola.");
      }
    }

    async function inactivarPaciente(id) {
      if (!confirm("¿Inactivar paciente? Esto marcará al paciente como inactivo.")) return;
      try {
        if (!db) { alert("DB no disponible (simulación)."); return; }
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", id);
        await updateDoc(ref, { activo: false });
        alert("Paciente inactivado.");
        await buscarPacientes(lastSearchTerm, currentFilterDoctor, currentShowInactivos);
      } catch (err) {
        console.error("Error inactivando paciente:", err);
        alert("Error al inactivar. Revisa la consola.");
      }
    }

    async function guardarPacienteDesdeFormulario() {
      const form = qid(IDS.form);
      if (!form) return;

      const idHidden = qid(IDS.pacienteIdHidden)?.value?.trim();
      const documento = qid(IDS.nroDocumento)?.value?.trim();
      const nombre = qid(IDS.nombres)?.value?.trim();
      const apellido = qid(IDS.apellidos)?.value?.trim();
      const fechaNacimiento = qid(IDS.fechaNacimiento)?.value || "";
      const celular = qid(IDS.celular)?.value?.trim();
      const email = qid(IDS.email)?.value?.trim();
      const doctor = qid(IDS.doctorField)?.value?.trim();
      const tipoDocumento = qid(IDS.tipoDocumento)?.value?.trim();
      const paisNacimiento = qid(IDS.paisNacimiento)?.value?.trim();
      const ciudadNacimiento = qid(IDS.ciudadNacimiento)?.value?.trim();
      const paisDomicilio = qid(IDS.paisDomicilio)?.value?.trim();
      const ciudadDomicilio = qid(IDS.ciudadDomicilio)?.value?.trim();
      const barrio = qid(IDS.barrio)?.value?.trim();
      const lugarResidencia = qid(IDS.lugarResidencia)?.value?.trim();
      const notas = qid(IDS.notas)?.value?.trim();
      const sexo = qid(IDS.sexo)?.value || "";
      const estadoCivil = qid(IDS.estadoCivil)?.value || "";
      const nroHistoria = qid(IDS.nroHistoria)?.value?.trim() || "";
      const estrato = qid(IDS.estrato)?.value || "";
      const zonaResidencial = qid(IDS.zonaResidencial)?.value || "";
      const esExtranjero = qid(IDS.esExtranjero)?.checked || false;
      const permitePublicidad = qid(IDS.permitePublicidad)?.checked || false;
      const telDomicilio = qid(IDS.telDomicilio)?.value?.trim() || "";
      const telOficina = qid(IDS.telOficina)?.value?.trim() || "";
      const extension = qid(IDS.extension)?.value?.trim() || "";
      const ocupacion = qid(IDS.ocupacion)?.value?.trim() || "";
      const tipoVinculacion = qid(IDS.tipoVinculacion)?.value || "";
      const nombreEps = qid(IDS.nombreEps)?.value || "";
      const polizaSalud = qid(IDS.polizaSalud)?.value || "";
      const fechaIngreso = qid(IDS.fechaIngreso)?.value || new Date().toISOString();

      if (!nombre || !apellido || !documento || !tipoDocumento || !sexo || !estadoCivil) {
        alert("Por favor completa todos los campos obligatorios (*)");
        return;
      }

      const idToUse = idHidden || documento.replace(/\s+/g, "_");

      try {
        if (!db) {
          console.log("Simulación guardar paciente:", { idToUse, nombre, apellido, documento });
          alert("Simulación: paciente guardado (DB no disponible).");
          closeModal();
          await buscarPacientes();
          return;
        }

        const payload = {
          nombre, apellido, nombreCompleto: `${nombre} ${apellido}`.trim(), documento,
          tipoDocumento, fechaNacimiento, edad: fechaNacimiento ? calcularEdadDesdeFecha(fechaNacimiento) : null,
          celular, correo: email, email, doctor, paisNacimiento, ciudadNacimiento,
          paisDomicilio, ciudadDomicilio, barrio, lugarResidencia, notas,
          sexo, estadoCivil, nroHistoria, estrato, zonaResidencial, esExtranjero, permitePublicidad,
          telDomicilio, telOficina, extension, ocupacion,
          tipoVinculacion, nombreEps, polizaSalud,
          fechaIngreso, activo: true, creado: new Date().toISOString(),
        };

        const inputFoto = qid(IDS.fotoInput);
        if (inputFoto && inputFoto.files && inputFoto.files[0]) {
          const file = inputFoto.files[0];
          const reader = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          payload.fotoUrl = reader;
        }

        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", idToUse);
        await setDoc(ref, payload, { merge: true });

        alert("✅ Paciente guardado correctamente.");
        closeModal();
        await buscarPacientes(lastSearchTerm, currentFilterDoctor, currentShowInactivos);
      } catch (err) {
        console.error("Error guardando paciente:", err);
        alert("Error guardando paciente. Revisa la consola.");
      }
    }

    async function poblarDoctorList() {
      try {
        if (!db) return;
        const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const cRef = collection(db, "doctores");
        const snap = await getDocs(query(cRef, orderBy("nombre")));
        const container = qid(IDS.doctorList);
        if (!container) return;
        let html = `<button class="odc-dropdown-item" data-doctor="__all">Todos</button>`;
        snap.forEach((d) => {
          const name = d.data()?.nombre || d.id;
          html += `<button class="odc-dropdown-item" data-doctor="${escapeHtml(String(name))}">${escapeHtml(String(name))}</button>`;
        });
        container.innerHTML = html;
      } catch (err) {
        console.warn("No se pudo poblar doctorList:", err);
      }
    }

    function bindOnce() {
      if (bound) return;
      const btnNuevo = qid(IDS.btnNuevo);
      const btnCerrar = qid(IDS.btnCerrar);
      const btnCancelar = qid(IDS.btnCancelar);
      const modal = qid(IDS.modal);
      const form = qid(IDS.form);
      const buscarInput = qid(IDS.buscarInput);
      const btnBuscar = qid(IDS.btnBuscar);
      const btnInactivos = qid(IDS.btnInactivos);
      const btnFiltroDoctor = qid(IDS.btnFiltroDoctor);
      const tabla = qid(IDS.tabla);

      if (btnNuevo) btnNuevo.addEventListener("click", openModal);
      if (btnCerrar) btnCerrar.addEventListener("click", closeModal);
      if (btnCancelar) btnCancelar.addEventListener("click", closeModal);
      if (form) form.addEventListener("submit", (e) => { e.preventDefault(); guardarPacienteDesdeFormulario(); });
      if (buscarInput) buscarInput.addEventListener("input", () => buscarPacientes(buscarInput.value, currentFilterDoctor, currentShowInactivos));
      if (btnBuscar) btnBuscar.addEventListener("click", () => buscarPacientes(buscarInput.value, currentFilterDoctor, currentShowInactivos));
      if (btnInactivos) btnInactivos.addEventListener("click", () => { currentShowInactivos = !currentShowInactivos; buscarPacientes(lastSearchTerm, currentFilterDoctor, currentShowInactivos); });
      if (btnFiltroDoctor) btnFiltroDoctor.addEventListener("click", poblarDoctorList);
      if (tabla) {
        tabla.addEventListener("click", (e) => {
          if (e.target.matches(".btn-editar")) cargarPacienteEnModal(e.target.dataset.id);
          if (e.target.matches(".btn-inactivar")) inactivarPaciente(e.target.dataset.id);
        });
      }

      const fotoInput = qid(IDS.fotoInput);
      const fotoPreview = qid(IDS.fotoPreview);
      if (fotoInput && fotoPreview) {
        fotoInput.addEventListener("change", () => {
          const file = fotoInput.files[0];
          if (!file) { fotoPreview.style.display = "none"; return; }
          const reader = new FileReader();
          reader.onload = () => { fotoPreview.src = reader.result; fotoPreview.style.display = "block"; };
          reader.readAsDataURL(file);
        });
      }

      const nombreField = qid(IDS.nombres);
      const apellidoField = qid(IDS.apellidos);
      const nombreCompletoField = qid(IDS.nombreCompleto);
      if (nombreField && apellidoField && nombreCompletoField) {
        const sync = () => { nombreCompletoField.value = `${nombreField.value} ${apellidoField.value}`.trim(); };
        nombreField.addEventListener("input", sync);
        apellidoField.addEventListener("input", sync);
      }

      bound = true;
    }

    bindOnce();
    poblarDoctorList();
    buscarPacientes();
  }

  window.initPacientes = initPacientes;
})();
