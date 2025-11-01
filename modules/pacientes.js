// modules/pacientes.js
// Basado en tu versión funcional — mantiene el botón original y agrega soporte completo de guardado

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

      if (!btnNuevo || !modal || !form) return false;

      btnNuevo.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
      btnCerrar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });
      btnCancelar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });

      modal.addEventListener("click", (e) => {
        if (e.target.classList.contains("odc-modal-backdrop")) closeModal();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombre = (document.getElementById("inputNombre")?.value || "").trim();
        const documento = (document.getElementById("inputDocumento")?.value || "").trim();
        const telefono = (document.getElementById("inputTelefono")?.value || "").trim();
        const eps = (document.getElementById("inputEps")?.value || "").trim();
        const doctor = (document.getElementById("inputDoctor")?.value || "").trim();
        if (!nombre || !documento) { alert("Completa Nombre y Documento"); return; }

        try {
          if (db) {
            const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
            const idCandidate = documento.replace(/\s+/g, "_");
            const ref = doc(db, "pacientes", idCandidate);
            const snap = await getDoc(ref);
            const payload = { nombre, documento, telefono, eps, doctor, creado: new Date().toISOString(), activo: true };
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

      if (buscarInput) {
        buscarInput.addEventListener("input", async (e) => {
          await buscarPacientes(e.target.value, currentFilterDoctor, currentShowInactivos);
        });
      }

      btnBuscar?.addEventListener("click", async (e) => {
        e.preventDefault();
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      btnInactivos?.addEventListener("click", async (e) => {
        e.preventDefault();
        currentShowInactivos = !currentShowInactivos;
        btnInactivos.classList.toggle("active", currentShowInactivos);
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

      btnFiltroDoctor?.addEventListener("click", () => {
        const dd = document.getElementById("doctorDropdown");
        if (!dd) return;
        const hidden = dd.style.display === "none" || dd.getAttribute("aria-hidden") === "true";
        dd.style.display = hidden ? "block" : "none";
        dd.setAttribute("aria-hidden", hidden ? "false" : "true");
      });

      doctorList?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".odc-dropdown-item");
        if (!btn) return;
        const doctor = btn.dataset.doctor || "__all";
        currentFilterDoctor = doctor === "__all" ? "" : doctor;
        document.getElementById("doctorDropdown").style.display = "none";
        await buscarPacientes(buscarInput?.value || "", currentFilterDoctor, currentShowInactivos);
      });

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
