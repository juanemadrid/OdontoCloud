// modules/pacientes.js
// Versión mejorada y lista para reemplazar — mantiene la UI tal como está (HTML/CSS) y añade:
// - Guardado/actualización en Firestore
// - Listado y búsqueda (en tiempo real al teclear)
// - Editar (cargar datos al modal)
// - Inactivar (marcar activo: false)
// - Población del dropdown de doctores (si existe colección "doctores")
// - Cálculo de edad automático desde fecha de nacimiento
// - Protección para no romper nada visual (no cambia HTML/CSS, usa los IDs existentes)
//
// Reemplaza totalmente tu archivo pacientes.js por este. No modifica HTML/CSS, solo añade lógica.
// NOTA: requiere que `window.db` (Firestore) y `window.auth` estén disponibles en la página.

(function () {
  if (window.__odc_pacientes_loaded) return;
  window.__odc_pacientes_loaded = true;

  function initPacientes(db, auth) {
    console.log("✅ initPacientes cargado correctamente (mejorado)");

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
      // campos del formulario (según tu HTML)
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
      // otros campos pueden añadirse fácilmente aquí...
    };

    // Estado local
    let bound = false;
    let currentFilterDoctor = "";
    let currentShowInactivos = false;
    let lastSearchTerm = "";

    // Utilidades
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
      const years = Math.abs(ageDt.getUTCFullYear() - 1970);
      return String(years);
    }

    // Render de tabla
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
        const fecha = r.createdAt ? r.createdAt : (r.fechaIngreso || "");
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

    // Buscar/listar pacientes (local filtering client-side)
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
        // obtenemos todos ordenados por nombre (si la colección es grande, luego optimizamos con paginación/queries)
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

    // Abrir y cerrar modal
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
          // limpiar preview foto si existe
          const fp = qid(IDS.fotoPreview);
          if (fp) { fp.src = ""; fp.style.display = "none"; }
          // limpiar pacienteId
          const hid = qid(IDS.pacienteIdHidden);
          if (hid) hid.value = "";
          // limpiar nombreCompleto readonly
          const nc = qid(IDS.nombreCompleto);
          if (nc) nc.value = "";
          // limpiar edad
          const age = qid(IDS.edad);
          if (age) age.value = "";
        } catch (e) {
          // ignore
        }
      }
    }

    // Cargar paciente al modal para editar
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
        // Mapear campos del documento a los fields del formulario
        qid(IDS.pacienteIdHidden).value = id;
        qid(IDS.nroDocumento).value = data.documento || "";
        qid(IDS.nombres).value = data.nombre || "";
        qid(IDS.apellidos).value = data.apellido || "";
        qid(IDS.nombreCompleto).value = `${data.nombre || ""} ${data.apellido || ""}`.trim();
        if (data.fechaNacimiento) qid(IDS.fechaNacimiento).value = data.fechaNacimiento;
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
        // foto preview si está guardada como URL
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

    // Inactivar paciente
    async function inactivarPaciente(id) {
      if (!confirm("¿Inactivar paciente? Esto marcará al paciente como inactivo.")) return;
      try {
        if (!db) {
          alert("DB no disponible (simulación).");
          return;
        }
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

    // Guardar o actualizar paciente desde formulario
    async function guardarPacienteDesdeFormulario() {
      const form = qid(IDS.form);
      if (!form) return;
      // leer campos (seguro para que estén presentes)
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

      if (!nombre || !apellido || !documento) {
        alert("Por favor completa Nombre, Apellido y Número de documento.");
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

        // Construir payload que sea razonable y no rompa la estructura existente
        const payload = {
          nombre,
          apellido,
          nombreCompleto: `${nombre} ${apellido}`.trim(),
          documento,
          tipoDocumento: tipoDocumento || null,
          fechaNacimiento: fechaNacimiento || null,
          edad: fechaNacimiento ? calcularEdadDesdeFecha(fechaNacimiento) : null,
          celular: celular || null,
          correo: email || null,
          email: email || null,
          doctor: doctor || null,
          paisNacimiento: paisNacimiento || null,
          ciudadNacimiento: ciudadNacimiento || null,
          paisDomicilio: paisDomicilio || null,
          ciudadDomicilio: ciudadDomicilio || null,
          barrio: barrio || null,
          lugarResidencia: lugarResidencia || null,
          notas: notas || null,
          activo: true,
          creado: new Date().toISOString(),
        };

        // Si hay una imagen seleccionada en inputFoto, intentar subir a campo fotoUrl como data URL (opcional).
        const inputFoto = qid(IDS.fotoInput);
        if (inputFoto && inputFoto.files && inputFoto.files[0]) {
          // leer como base64 — si prefieres subir a Storage en el futuro, lo cambiamos.
          const file = inputFoto.files[0];
          const reader = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          // Atención: base64 puede ser grande, si no quieres guardarlo en Firestore debes subir a Storage.
          payload.fotoUrl = reader;
        }

        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ref = doc(db, "pacientes", idToUse);
        // merge true para no borrar info extra
        await setDoc(ref, payload, { merge: true });

        alert("✅ Paciente guardado correctamente.");
        closeModal();
        await buscarPacientes(lastSearchTerm, currentFilterDoctor, currentShowInactivos);
      } catch (err) {
        console.error("Error guardando paciente:", err);
        alert("Error guardando paciente. Revisa la consola.");
      }
    }

    // Población del dropdown de doctores (si existe la colección)
    async function poblarDoctorList() {
      try {
        if (!db) return;
        const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const cRef = collection(db, "doctores");
        const snap = await getDocs(query(cRef, orderBy("nombre")));
        const container = qid(IDS.doctorList);
        if (!container) return;
        // mantener el botón 'Todos'
        let html = `<button class="odc-dropdown-item" data-doctor="__all">Todos</button>`;
        snap.forEach((d) => {
          const name = d.data()?.nombre || d.id;
          html += `<button class="odc-dropdown-item" data-doctor="${escapeHtml(String(name))}">${escapeHtml(String(name))}</button>`;
        });
        container.innerHTML = html;
      } catch (err) {
        // no es crítico
        console.warn("No se pudo poblar doctorList:", err);
      }
    }

    // Bind de eventos — solo una vez
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
      const doctorList = qid(IDS.doctorList);
      const tabla = qid(IDS.tabla);
      const fotoInput = qid(IDS.fotoInput);
      const fechaNacimientoInput = qid(IDS.fechaNacimiento);
      const nombreInput = qid(IDS.nombres);
      const apellidoInput = qid(IDS.apellidos);
      const nombreCompletoInput = qid(IDS.nombreCompleto);

      if (!btnNuevo || !modal || !form) {
        console.warn("Elementos esenciales no encontrados. Revisar HTML (btnNuevo/modal/form).");
        return false;
      }

      btnNuevo.addEventListener("click", (e) => { e.preventDefault(); openModal(); });

      btnCerrar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });
      btnCancelar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });

      // cerrar al click en backdrop
      modal.addEventListener("click", (e) => {
        if (e.target.classList && e.target.classList.contains("odc-modal-backdrop")) closeModal();
      });

      // submit del formulario
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await guardarPacienteDesdeFormulario();
      });

      // preview imagen (ya tienes script en HTML, pero lo dejamos por si falta)
      if (fotoInput) {
        fotoInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          const preview = qid(IDS.fotoPreview);
          if (file && preview) {
            const reader = new FileReader();
            reader.onload = function (ev) {
              preview.src = ev.target.result;
              preview.style.display = "block";
            };
            reader.readAsDataURL(file);
          }
        });
      }

      // calcular nombre completo automáticamente
      if (nombreInput || apellidoInput) {
        const updateFullName = () => {
          try {
            const n = nombreInput?.value?.trim() || "";
            const a = apellidoInput?.value?.trim() || "";
            if (nombreCompletoInput) nombreCompletoInput.value = `${n} ${a}`.trim();
          } catch (e) {}
        };
        nombreInput?.addEventListener("input", updateFullName);
        apellidoInput?.addEventListener("input", updateFullName);
      }

      // calcular edad al cambiar fecha de nacimiento
      fechaNacimientoInput?.addEventListener("change", (e) => {
        const v = e.target.value;
        const edadField = qid(IDS.edad);
        if (edadField) edadField.value = calcularEdadDesdeFecha(v);
      });

      // búsqueda en input (teclear)
      if (buscarInput) {
        let debounceTimer = null;
        buscarInput.addEventListener("input", (e) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            await buscarPacientes(e.target.value, currentFilterDoctor, currentShowInactivos);
          }, 220);
        });
      }

      btnBuscar?.addEventListener("click", async (e) => {
        e.preventDefault();
        await buscarPacientes(qid(IDS.buscarInput)?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      btnInactivos?.addEventListener("click", async (e) => {
        e.preventDefault();
        currentShowInactivos = !currentShowInactivos;
        btnInactivos.classList.toggle("active", currentShowInactivos);
        await buscarPacientes(qid(IDS.buscarInput)?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      // toggle dropdown doctores
      btnFiltroDoctor?.addEventListener("click", () => {
        const dd = document.getElementById("doctorDropdown");
        if (!dd) return;
        const hidden = dd.style.display === "none" || dd.getAttribute("aria-hidden") === "true" || !dd.style.display;
        dd.style.display = hidden ? "block" : "none";
        dd.setAttribute("aria-hidden", hidden ? "false" : "true");
      });

      // selección doctor desde dropdown
      doctorList?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".odc-dropdown-item");
        if (!btn) return;
        const doctor = btn.dataset.doctor || "__all";
        currentFilterDoctor = doctor === "__all" ? "" : doctor;
        document.getElementById("doctorDropdown").style.display = "none";
        await buscarPacientes(qid(IDS.buscarInput)?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      // Delegación de eventos para botones Editar / Inactivar en la tabla
      tabla?.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.classList.contains("btn-editar")) {
          const id = btn.dataset.id;
          if (id) await cargarPacienteEnModal(id);
        } else if (btn.classList.contains("btn-inactivar")) {
          const id = btn.dataset.id;
          if (id) await inactivarPaciente(id);
        }
      });

      bound = true;
      console.log("🎯 Listeners pacientes conectados correctamente");
      return true;
    }

    // Intentar bind repetidamente hasta que el HTML exista
    const tryBind = async () => {
      const ok = bindOnce();
      if (ok) {
        // poblar doctores y listar pacientes inicial
        await poblarDoctorList();
        await buscarPacientes("", currentFilterDoctor, currentShowInactivos);
        return;
      }
      setTimeout(tryBind, 250);
    };

    tryBind();
  }

  // Export init para uso externo
  window.initPacientes = initPacientes;

  // Auto-init si DOM listo y window.db provisto
  document.addEventListener("DOMContentLoaded", () => {
    try {
      // intenta inicializar con window.db/ window.auth si existen
      initPacientes(window.db, window.auth);
    } catch (err) {
      console.error("initPacientes autoinit error:", err);
    }
  });
})();
