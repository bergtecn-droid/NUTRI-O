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
  renderAnxHistory();
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
  refreshPatientSelects();
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

function meetingMessage(m, p) {
  const d = m.date ? m.date.split("-").reverse().join("/") : "hoje";
  const hr = m.time ? " às " + m.time : "";
  return `Olá${p ? " " + p.name.split(" ")[0] : ""}! 🥑 Sua consulta online está marcada para ${d}${hr}.\n\nPara participar, clique no link ${m.date ? "5 minutos antes do horário" : ""}:\n${roomLink(m.room)}\n\nDicas: use fone de ouvido e procure um lugar silencioso. Até logo! 💚`;
}

function openShare(title, text, directPhone) {
  document.getElementById("share-modal")?.remove();
  const back = document.createElement("div");
  back.id = "share-modal";
  back.className = "modal-backdrop";
  const wa = directPhone
    ? waLink(directPhone, text)
    : "https://wa.me/?text=" + encodeURIComponent(text);
  back.innerHTML = `
    <div class="modal-card">
      <h3>${esc(title)}</h3>
      <textarea readonly rows="8">${esc(text)}</textarea>
      <div class="btn-row">
        <a class="btn btn-solid" target="_blank" rel="noopener" href="${wa}">💬 Enviar por WhatsApp</a>
        <button class="btn-mini" id="share-copy">📋 Copiar mensagem</button>
        <button class="btn-mini" id="share-close">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  back.querySelector("#share-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(text);
    notify("Mensagem copiada! 📋");
  });
  back.querySelector("#share-close").addEventListener("click", () => back.remove());
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
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
    const m = {
      name: (p ? p.name + " · " : "") + type,
      room,
      patientId: patientId || null,
      date: document.getElementById("m-date").value,
      time: document.getElementById("m-time").value,
      createdAt: Date.now()
    };
    list.push(m);
    dbWrite(DB.reunioes, list);
    renderMeetings();
    e.target.reset();
    openShare("Sala criada! Envie ao paciente", meetingMessage(m, p), p && p.phone);
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

const ANX_SECTIONS = [
  { id: "antropo", title: "Antropometria & Composição corporal", icon: "⚖️", fields: [
    { id: "peso", label: "Peso (kg)", type: "number", step: "0.1" },
    { id: "altura", label: "Altura (cm)", type: "number", step: "0.1" },
    { id: "imc", label: "IMC (auto)", type: "computed" },
    { id: "classImc", label: "Classificação (auto)", type: "computed" },
    { id: "circAbd", label: "Circunferência abdominal (cm)", type: "number", step: "0.1" },
    { id: "circQuadril", label: "Circunferência do quadril (cm)", type: "number", step: "0.1" },
    { id: "rcq", label: "RCQ cintura/quadril (auto)", type: "computed" },
    { id: "circPescoco", label: "Circunferência do pescoço (cm)", type: "number", step: "0.1" },
    { id: "circBraco", label: "Circunferência do braço (cm)", type: "number", step: "0.1" },
    { id: "pctGordura", label: "% Gordura (bioimpedância)", type: "number", step: "0.1" },
    { id: "pctMassaMagra", label: "% Massa magra", type: "number", step: "0.1" },
    { id: "pctAgua", label: "% Água corporal", type: "number", step: "0.1" }
  ]},
  { id: "queixa", title: "Queixa, expectativa & objetivos", icon: "🎯", fields: [
    { id: "queixa", label: "Motivo da consulta / queixa principal", type: "textarea" },
    { id: "expectativa", label: "Expectativa do paciente", type: "textarea" },
    { id: "objetivos", label: "Objetivos (ex.: perder peso, energia, saúde intestinal)", type: "textarea" }
  ]},
  { id: "clinico", title: "Histórico clínico", icon: "🩺", fields: [
    { id: "comorbidades", label: "Comorbidades (diabetes, hipertensão, tireoide...)", type: "textarea" },
    { id: "medicacoes", label: "Medicações em uso", type: "textarea" },
    { id: "suplementos", label: "Suplementos / fitoterápicos", type: "textarea" },
    { id: "cirurgias", label: "Cirurgias prévias", type: "textarea" },
    { id: "alergias", label: "Alergias e intolerâncias", type: "text" }
  ]},
  { id: "familiar", title: "Antecedentes familiares", icon: "👨‍👩‍👧", fields: [
    { id: "famObesidade", label: "Obesidade", type: "check" },
    { id: "famDiabetes", label: "Diabetes", type: "check" },
    { id: "famDislipidemia", label: "Dislipidemia (colesterol alto)", type: "check" },
    { id: "famHipertensao", label: "Hipertensão", type: "check" },
    { id: "famCv", label: "Doença cardiovascular precoce", type: "check" },
    { id: "famObs", label: "Observações familiares", type: "textarea" }
  ]},
  { id: "alimentar", title: "Avaliação alimentar (Recordatório 24h)", icon: "🍽️", fields: [
    { id: "r24h", label: "Recordatório 24h — o que comeu ontem (café, almoço, jantar, lanches...)", type: "textarea" },
    { id: "refeicoesDia", label: "Nº de refeições por dia", type: "number" },
    { id: "ondeCome", label: "Onde faz as refeições", type: "select", options: ["Em casa", "No trabalho/fora", "Misto (casa e fora)"] },
    { id: "apetite", label: "Apetite", type: "select", options: ["Normal", "Aumentado", "Reduzido", "Compulsivo"] },
    { id: "restricoes", label: "Restrições / dietas alimentares", type: "textarea" },
    { id: "aversoes", label: "Aversões e preferências", type: "textarea" }
  ]},
  { id: "hidratacao", title: "Hidratação, intestino & estimulantes", icon: "💧", fields: [
    { id: "agua", label: "Água por dia (litros ou copos)", type: "text" },
    { id: "cafe", label: "Café / energéticos por dia", type: "text" },
    { id: "alcool", label: "Álcool", type: "select", options: ["Não consome", "Social (fins de semana)", "Frequente"] },
    { id: "tabagismo", label: "Tabagismo", type: "select", options: ["Não fuma", "Fumante", "Ex-fumante"] },
    { id: "intestino", label: "Hábito intestinal", type: "select", options: ["Diário", "Intervalado (3/dsem)", "Constipado", "Alternado"] }
  ]},
  { id: "sono", title: "Sono & estresse", icon: "😴", fields: [
    { id: "sonoHoras", label: "Horas de sono", type: "number", step: "0.5" },
    { id: "sonoQualidade", label: "Qualidade do sono", type: "select", options: ["Boa", "Regular", "Ruim"] },
    { id: "estresse", label: "Nível de estresse", type: "select", options: ["Baixo", "Moderado", "Alto"] }
  ]},
  { id: "fisica", title: "Atividade física", icon: "🏃", fields: [
    { id: "praticaFisica", label: "Pratica atividade física?", type: "select", options: ["Sim", "Não", "Às vezes"] },
    { id: "tipoFisica", label: "Qual tipo", type: "text" },
    { id: "freqFisica", label: "Frequência (x por semana)", type: "text" },
    { id: "tipoTrabalho", label: "Rotina de trabalho", type: "select", options: ["Sentado (sedentário)", "Em pé / leve", "Moderado", "Intenso (braçal)"] }
  ]},
  { id: "dietas", title: "Histórico de dietas & contexto", icon: "📚", fields: [
    { id: "dietasPrevias", label: "Dietas anteriores", type: "textarea" },
    { id: "resultadoDietas", label: "Resultados e por que parou", type: "textarea" },
    { id: "quemCozinha", label: "Quem cozinha em casa", type: "text" },
    { id: "quemCompra", label: "Quem faz as compras", type: "text" },
    { id: "orcamento", label: "Restrições de tempo/rotina relevantes", type: "textarea" }
  ]},
  { id: "exames", title: "Exames & conduta", icon: "🔬", fields: [
    { id: "examesLab", label: "Exames laboratoriais recentes", type: "textarea" },
    { id: "conduta", label: "Conduta nutricional", type: "textarea" },
    { id: "planoAlimentar", label: "Plano alimentar prescrito", type: "textarea" },
    { id: "proxConsulta", label: "Retorno", type: "date" },
    { id: "obsFinais", label: "Observações gerais", type: "textarea" }
  ]}
];
const ANX_FIELDS = ANX_SECTIONS.flatMap(s => s.fields);
let anxEditingId = null;

function anxInput(id) { return document.getElementById("anx-" + id); }

function imcInfo() {
  const peso = parseFloat(anxInput("peso").value);
  const h = parseFloat(anxInput("altura").value);
  if (!peso || !h) return { imc: "", cls: "" };
  const imc = peso / Math.pow(h / 100, 2);
  const r = imc.toFixed(1);
  const cls = imc < 18.5 ? "Abaixo do peso" : imc < 25 ? "Eutrófico" : imc < 30 ? "Sobrepeso" : imc < 35 ? "Obesidade I" : imc < 40 ? "Obesidade II" : "Obesidade III";
  return { imc: r, cls };
}

function updateCalcFields() {
  const { imc, cls } = imcInfo();
  anxInput("imc").value = imc;
  anxInput("classImc").value = cls;
  const abd = parseFloat(anxInput("circAbd").value);
  const quadril = parseFloat(anxInput("circQuadril").value);
  anxInput("rcq").value = abd && quadril ? (abd / quadril).toFixed(2) : "";
}

function buildAnxForm() {
  const root = document.getElementById("anx-form");
  root.innerHTML = "";
  ANX_SECTIONS.forEach((sec, idx) => {
    const d = document.createElement("details");
    d.className = "anx";
    if (idx === 0) d.open = true;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span>${sec.icon} ${sec.title}</span><span class="anx-badge" data-badge="${sec.id}">0/${sec.fields.length}</span>`;
    const wrap = document.createElement("div");
    wrap.className = "form-grid anx-body";
    sec.fields.forEach(f => {
      const field = document.createElement("div");
      field.className = "field" + (f.type === "textarea" || f.type === "check" ? " full" : "");
      if (f.type === "textarea") {
        field.innerHTML = `<label for="anx-${f.id}">${f.label}</label><textarea id="anx-${f.id}" rows="2"></textarea>`;
      } else if (f.type === "check") {
        field.innerHTML = `<label class="anx-check"><input type="checkbox" id="anx-${f.id}"> ${f.label}</label>`;
      } else if (f.type === "select") {
        field.innerHTML = `<label for="anx-${f.id}">${f.label}</label><select id="anx-${f.id}"><option value=""></option>${f.options.map(o => `<option>${o}</option>`).join("")}</select>`;
      } else if (f.type === "computed") {
        field.innerHTML = `<label>${f.label}</label><input id="anx-${f.id}" readonly class="computed">`;
      } else {
        field.innerHTML = `<label for="anx-${f.id}">${f.label}</label><input id="anx-${f.id}" type="${f.type}"${f.step ? ` step="${f.step}"` : ""} style="width:100%">`;
      }
      wrap.appendChild(field);
    });
    d.append(summary, wrap);
    root.appendChild(d);
  });
  root.addEventListener("input", () => { updateCalcFields(); updateBadges(); });
}

function updateBadges() {
  ANX_SECTIONS.forEach(sec => {
    const filled = sec.fields.filter(f => f.type !== "computed" && f.type !== "check").filter(f => anxInput(f.id).value.trim() !== "").length;
    const checked = sec.fields.filter(f => f.type === "check").filter(f => anxInput(f.id).checked).length;
    const valid = sec.fields.filter(f => f.type !== "computed").length;
    const badge = document.querySelector(`[data-badge="${sec.id}"]`);
    if (badge) {
      badge.textContent = `${filled + checked}/${valid}`;
      badge.classList.toggle("done", filled + checked === valid);
    }
  });
}

function collectAnx() {
  const data = {};
  ANX_FIELDS.forEach(f => {
    if (f.type === "computed") return;
    const el = anxInput(f.id);
    data[f.id] = f.type === "check" ? el.checked : el.value.trim();
  });
  const info = imcInfo();
  data.imc = info.imc;
  data.classImc = info.cls;
  return data;
}

function fillAnx(rec) {
  ANX_FIELDS.forEach(f => {
    const el = anxInput(f.id);
    if (!el) return;
    if (f.type === "check") el.checked = Boolean(rec.data[f.id]);
    else if (f.type !== "computed") el.value = rec.data[f.id] || "";
  });
  updateCalcFields();
  updateBadges();
}

function clearAnxForm() {
  anxEditingId = null;
  const dateEl = document.getElementById("anx-date");
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
  ANX_FIELDS.forEach(f => {
    const el = anxInput(f.id);
    if (!el) return;
    if (f.type === "check") el.checked = false;
    else if (f.type !== "computed") el.value = "";
  });
  document.getElementById("anx-date").value = new Date().toISOString().slice(0, 10);
  updateCalcFields();
  updateBadges();
}

function anxPatientName(id) {
  const p = dbRead(DB.pacientes, []).find(x => x.id === id);
  return p ? p.name : "—";
}

function renderAnxHistory() {
  const rows = document.getElementById("anx-rows");
  if (!rows) return;
  const list = dbRead(DB.anamneses, []);
  rows.innerHTML = "";
  if (!list.length) {
    rows.innerHTML = '<tr><td colspan="4" class="empty-note">Nenhuma ficha de anamnese salva ainda.</td></tr>';
    return;
  }
  list.slice().reverse().forEach((rec, rIdx) => {
    const idx = list.length - 1 - rIdx;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${rec.date.split("-").reverse().join("/")}</strong>${rec.updatedAt ? `<br><small style="opacity:.6">editada</small>` : ""}</td>
      <td>${esc(anxPatientName(rec.patientId))}</td>
      <td>${rec.data.imc ? rec.data.imc + ` <small style="opacity:.6">(${esc(rec.data.classImc || "")})</small>` : "—"}</td>
      <td><div class="table-actions">
        <button class="btn-mini" data-open="${idx}">📂 Abrir</button>
        <button class="btn-mini danger" data-adel="${idx}">🗑️</button>
      </div></td>`;
    rows.appendChild(tr);
  });
  rows.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => {
    const rec = dbRead(DB.anamneses, [])[Number(b.dataset.open)];
    if (!rec) return;
    document.getElementById("anx-patient").value = rec.patientId;
    document.getElementById("anx-date").value = rec.date;
    anxEditingId = rec.id;
    fillAnx(rec);
    document.querySelectorAll(".anx").forEach(d => d.open = true);
    notify("Ficha carregada. Edite e salve para atualizar.");
  }));
  rows.querySelectorAll("[data-adel]").forEach(b => b.addEventListener("click", () => {
    const list = dbRead(DB.anamneses, []);
    list.splice(Number(b.dataset.adel), 1);
    dbWrite(DB.anamneses, list);
    renderAnxHistory();
    notify("Ficha removida.");
  }));
}

function initAnamnese() {
  buildAnxForm();
  clearAnxForm();
  document.getElementById("anx-save").addEventListener("click", () => {
    const patientId = document.getElementById("anx-patient").value;
    const date = document.getElementById("anx-date").value;
    if (!patientId) { notify("Selecione o paciente primeiro."); return; }
    if (!date) { notify("Escolha a data da avaliação."); return; }
    const list = dbRead(DB.anamneses, []);
    const rec = { id: anxEditingId || uid(), patientId, date, data: collectAnx(), updatedAt: Date.now() };
    if (anxEditingId) {
      const idx = list.findIndex(r => r.id === anxEditingId);
      if (idx >= 0) list[idx] = rec;
    } else {
      list.push(rec);
    }
    dbWrite(DB.anamneses, list);
    renderAnxHistory();
    notify("Ficha de anamnese salva! 📋✅");
  });
  document.getElementById("anx-new").addEventListener("click", () => {
    clearAnxForm();
    notify("Formulário limpo. Nova ficha pronta para preencher.");
  });
  document.getElementById("anx-print").addEventListener("click", () => {
    document.querySelectorAll("details.anx").forEach(d => d.open = true);
    window.print();
  });
}

function refreshPatientSelects() {
  const list = dbRead(DB.pacientes, []);
  ["m-patient", "anx-patient"].forEach(selId => {
    const sel = document.getElementById(selId);
    if (sel) sel.innerHTML = '<option value="">— selecione —</option>' + list.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  });
}

document.addEventListener("nv-cloud-synced", () => {
  if (sessionOk) {
    renderPatients();
    renderMeetings();
    fillPatientSelect();
    renderAnxHistory();
    fillConfigForm();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initTabs();
  initPatients();
  initAnamnese();
  initMeetings();
  initConfig();
  initPassword();
  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("nv-admin-session");
    window.location.reload();
  });
});
