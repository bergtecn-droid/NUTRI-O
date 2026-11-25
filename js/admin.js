let sessionOk = false;

async function sha256(text) {
  if (!window.crypto || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isSetupDone() {
  return Boolean(dbRead(DB.adminHash));
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function notify(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(notify._t);
  notify._t = setTimeout(() => toast.classList.remove("show"), 3200);
}

async function enterPanel() {
  sessionOk = true;
  sessionStorage.setItem("nv-admin-session", "ok");
  document.getElementById("login-shell").style.display = "none";
  document.getElementById("admin-shell").classList.add("authenticated");
  renderPatients();
  renderMeetings();
  fillPatientSelect();
  fillConfigForm();
}

function initLogin() {
  const form = document.getElementById("login-form");
  const done = isSetupDone();
  document.getElementById("current-pass-wrap").style.display = done ? "block" : "none";
  document.getElementById("admin-pass-label").textContent = done ? "Senha" : "Crie uma senha";
  document.getElementById("admin-pass2-label").textContent = done ? "Confirme a senha" : "Confirme a senha";
  document.getElementById("login-desc").textContent = done
    ? "Digita sua senha de administrador para acessar o painel."
    : "Somente o(a) nutricionista e a equipe têm acesso. Crie sua senha de administrador no primeiro uso.";
  document.getElementById("login-submit").textContent = done ? "🔓 Entrar no painel" : "🔒 Criar senha e entrar";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = document.getElementById("admin-pass").value;
    const pass2 = document.getElementById("admin-pass2").value;
    if (pass !== pass2) { notify("As senhas não conferem."); return; }
    const hash = await sha256(pass);
    if (!hash) { notify("Seu navegador não suporta o modo seguro. Use Chrome ou Firefox atualizados."); return; }

    if (isSetupDone()) {
      if (hash !== dbRead(DB.adminHash)) { notify("Senha incorreta."); return; }
    } else {
      dbWrite(DB.adminHash, hash);
      notify("Senha do administrador criada! ✅");
    }
    enterPanel();
  });

  if (sessionStorage.getItem("nv-admin-session") === "ok") enterPanel();
}

function initTabs() {
  document.querySelectorAll("#admin-nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#admin-nav button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });
}

function patientLabel(p) {
  const pieces = [];
  if (p.phone) pieces.push(formatWhats(p.phone));
  if (p.email) pieces.push(esc(p.email));
  return pieces.join(" · ") || "—";
}

function renderPatients() {
  const rows = document.getElementById("patient-rows");
  if (!rows) return;
  const term = (document.getElementById("patient-search").value || "").toLowerCase();
  const list = dbRead(DB.pacientes, []);
  rows.innerHTML = "";
  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(term) || String(p.email || "").toLowerCase().includes(term) || String(p.phone || "").includes(term)
  );
  if (!filtered.length) {
    rows.innerHTML = `<tr><td colspan="3" class="empty-note">${list.length ? "Nenhum paciente encontrado com essa busca." : "Nenhum paciente cadastrado ainda. Use o formulário acima 👆"}</td></tr>`;
    return;
  }
  filtered.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(p.name)}</strong>${p.notes ? `<br><small style="opacity:.6">${esc(p.notes)}</small>` : ""}</td>
      <td>${patientLabel(p)}${p.birth ? `<br><small style="opacity:.6">🎂 ${p.birth.split("-").reverse().join("/")}</small>` : ""}</td>
      <td><div class="table-actions">
        ${p.phone ? `<a class="btn-mini" target="_blank" rel="noopener" href="${waLink(p.phone, "Olá " + p.name.split(" ")[0] + "! Tudo bem? Sou da equipe da clínica. 🥑")}">💬 WhatsApp</a>` : ""}
        <button class="btn-mini" data-edit="${p.id}">✏️ Editar</button>
        <button class="btn-mini danger" data-del="${p.id}">🗑️</button>
      </div></td>`;
    rows.appendChild(tr);
  });

  rows.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    dbWrite(DB.pacientes, dbRead(DB.pacientes, []).filter(p => p.id !== b.dataset.del));
    renderPatients();
    fillPatientSelect();
    notify("Paciente removido.");
  }));
  rows.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const p = dbRead(DB.pacientes, []).find(x => x.id === b.dataset.edit);
    if (!p) return;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-phone").value = p.phone || "";
    document.getElementById("p-email").value = p.email || "";
    document.getElementById("p-birth").value = p.birth || "";
    document.getElementById("p-notes").value = p.notes || "";
    document.getElementById("p-name").dataset.editId = p.id;
    document.getElementById("p-name").focus();
    notify("Editando: " + p.name);
  }));
}

function initPatients() {
  const form = document.getElementById("patient-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const list = dbRead(DB.pacientes, []);
    const nameEl = document.getElementById("p-name");
    const data = {
      name: nameEl.value.trim(),
      phone: document.getElementById("p-phone").value.trim(),
      email: document.getElementById("p-email").value.trim(),
      birth: document.getElementById("p-birth").value,
      notes: document.getElementById("p-notes").value.trim()
    };
    const editId = nameEl.dataset.editId;
    if (editId) {
      const idx = list.findIndex(p => p.id === editId);
      if (idx >= 0) list[idx] = { ...list[idx], ...data };
      delete nameEl.dataset.editId;
      notify("Paciente atualizado! ✅");
    } else {
      list.push({ id: uid(), ...data, createdAt: Date.now() });
      notify("Paciente cadastrado! ✅");
    }
    dbWrite(DB.pacientes, list);
    form.reset();
    renderPatients();
    fillPatientSelect();
  });
  document.getElementById("patient-search").addEventListener("input", renderPatients);
}

function fillPatientSelect() {
  const sel = document.getElementById("m-patient");
  if (!sel) return;
  const list = dbRead(DB.pacientes, []);
  sel.innerHTML = '<option value="">— sem vínculo —</option>' + list.map(p =>
    `<option value="${p.id}">${esc(p.name)}</option>`).join("");
}

function roomLink(room) {
  return window.location.origin + window.location.pathname.replace("admin.html", "") + "reuniao.html?sala=" + encodeURIComponent(room);
}

function renderMeetings() {
  const rows = document.getElementById("meeting-rows");
  if (!rows) return;
  const meetings = dbRead(DB.reunioes, []);
  const patients = dbRead(DB.pacientes, []);
  rows.innerHTML = "";
  if (!meetings.length) {
    rows.innerHTML = '<tr><td colspan="3" class="empty-note">Nenhuma reunião criada ainda.</td></tr>';
    return;
  }
  meetings.slice().reverse().forEach((m, i) => {
    const p = patients.find(x => x.id === m.patientId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(m.name)}</strong>${p ? `<br><small style="opacity:.6">👤 ${esc(p.name)}</small>` : ""}</td>
      <td>${m.date ? `📅 ${m.date.split("-").reverse().join("/")} · ${m.time}` : "aberta"}</td>
      <td><div class="table-actions">
        <a class="btn-mini" target="_blank" rel="noopener" href="${roomLink(m.room)}">🎥 Entrar</a>
        <button class="btn-mini" data-copy="${i}">📋 Link</button>
        ${p && p.phone ? `<a class="btn-mini" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá ${p.name.split(" ")[0]}! Sua consulta online está marcada para ${m.date.split("-").reverse().join("/")} às ${m.time}. Acesse: ${roomLink(m.room)}`)}">💬 Enviar</a>` : ""}
        <button class="btn-mini danger" data-mdel="${i}">🗑️</button>
      </div></td>`;
    rows.appendChild(tr);
  });
  rows.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    const m = meetings.slice().reverse()[Number(b.dataset.copy)];
    await navigator.clipboard.writeText(roomLink(m.room));
    notify("Link copiado! 📋");
  }));
  rows.querySelectorAll("[data-mdel]").forEach(b => b.addEventListener("click", () => {
    const list = dbRead(DB.reunioes, []);
    list.splice(list.length - 1 - Number(b.dataset.mdel), 1);
    dbWrite(DB.reunioes, list);
    renderMeetings();
    notify("Reunião removida.");
  }));
}

function initMeetings() {
  document.getElementById("meeting-form").addEventListener("submit", e => {
    e.preventDefault();
    const patientId = document.getElementById("m-patient").value;
    const patients = dbRead(DB.pacientes, []);
    const p = patients.find(x => x.id === patientId);
    const type = document.getElementById("m-type").value;
    const room = (p ? p.name : "reuniao").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) + "-" + uid();
    const list = dbRead(DB.reunioes, []);
    list.push({
      name: (p ? p.name + " · " : "") + type,
      room,
      patientId: patientId || null,
      date: document.getElementById("m-date").value,
      time: document.getElementById("m-time").value,
      createdAt: Date.now()
    });
    dbWrite(DB.reunioes, list);
    renderMeetings();
    e.target.reset();
    notify("Sala criada! Copie o link ou envie por WhatsApp 📋");
  });
}

function fillConfigForm() {
  const cfg = dbRead(DB.config, {}) || {};
  document.getElementById("c-wa").value = cfg.whatsapp || "";
  document.getElementById("c-email").value = cfg.email || "";
  document.getElementById("c-insta").value = cfg.instagram || "";
  document.getElementById("c-zapmsg").value = cfg.zapmsg || "";
}

function initConfig() {
  document.getElementById("config-form").addEventListener("submit", e => {
    e.preventDefault();
    dbWrite(DB.config, {
      whatsapp: document.getElementById("c-wa").value.trim(),
      email: document.getElementById("c-email").value.trim(),
      instagram: document.getElementById("c-insta").value.trim(),
      zapmsg: document.getElementById("c-zapmsg").value.trim()
    });
    notify("Configurações salvas! O site público já reflete as mudanças 🎉");
  });
}

function initPassword() {
  document.getElementById("password-form").addEventListener("submit", async e => {
    e.preventDefault();
    const cur = document.getElementById("cur-pass").value;
    const novo = document.getElementById("new-pass").value;
    const curHash = await sha256(cur);
    if (!curHash || curHash !== dbRead(DB.adminHash)) { notify("Senha atual incorreta."); return; }
    const novoHash = await sha256(novo);
    if (!novoHash || novo === cur) { notify("Escolha uma senha nova com 6+ caracteres."); return; }
    dbWrite(DB.adminHash, novoHash);
    e.target.reset();
    notify("Senha alterada com sucesso! 🔑");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initTabs();
  initPatients();
  initMeetings();
  initConfig();
  initPassword();
  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("nv-admin-session");
    window.location.reload();
  });
});
