const STORAGE_KEY = "reunioes-site";

function loadMeetings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMeetings(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function buildRoomLink(room) {
  const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
  return base + "reuniao.html?sala=" + encodeURIComponent(room);
}

function renderMeetings() {
  const list = document.getElementById("meeting-list");
  if (!list) return;
  const meetings = loadMeetings();
  list.innerHTML = "";
  if (meetings.length === 0) {
    list.innerHTML = "<p style='text-align:center;opacity:0.6'>Nenhuma reunião criada ainda. Agende a primeira acima 👆</p>";
    return;
  }
  meetings.slice().reverse().forEach((m, index) => {
    const item = document.createElement("div");
    item.className = "meeting-item";
    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = m.name;
    const small = document.createElement("small");
    small.textContent = m.date ? `📅 ${m.date} · ${m.time}` : "Reunião aberta";
    info.append(strong, small);
    const actions = document.createElement("div");
    actions.className = "meeting-actions";
    const enter = document.createElement("a");
    enter.className = "icon-btn";
    enter.href = buildRoomLink(m.room).replace("index.html", "");
    enter.target = "_blank";
    enter.rel = "noopener";
    enter.textContent = "🎥 Entrar";
    const copy = document.createElement("button");
    copy.className = "icon-btn";
    copy.textContent = "📋 Copiar link";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(enter.href);
      showToast("Link copiado! Agora é só enviar 🚀");
    });
    const zap = document.createElement("a");
    zap.className = "icon-btn whatsapp";
    zap.target = "_blank";
    zap.rel = "noopener";
    zap.href = "https://wa.me/?text=" + encodeURIComponent(`Olá! Sua consulta online está marcada${m.date ? ` para ${m.date} às ${m.time}` : ""}. Entre pelo link: ${enter.href}`);
    if (navigator.share) {
      const share = document.createElement("button");
      share.className = "icon-btn";
      share.textContent = "📤 Compartilhar";
      share.addEventListener("click", () => navigator.share({
        title: "Consulta online",
        text: `Sua consulta online${m.date ? ` para ${m.date}` : ""}!`,
        url: enter.href
      }).catch(() => {}));
      actions.append(enter, copy, share);
    } else {
      const zapText = "💬 Zap";
      zap.textContent = zapText;
      actions.append(enter, copy, zap);
    }
    item.append(info, actions);
    list.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const patient = document.getElementById("patient-name").value.trim();
      const date = document.getElementById("meeting-date").value;
      const time = document.getElementById("meeting-time").value;
      const type = document.getElementById("meeting-type").value;
      const room = slugify(type) + "-" + slugify(patient || "consultorio") + "-" + randomSuffix();
      const meetings = loadMeetings();
      meetings.push({
        name: (patient || "Consulta") + " · " + type,
        room,
        date,
        time,
        createdAt: Date.now()
      });
      saveMeetings(meetings);
      renderMeetings();
      form.reset();
      showToast("Reunião criada! Copie o link e envie ao paciente ✅");
    });
  }
  renderMeetings();

  const toggle = document.getElementById("theme-toggle");
  const menu = document.getElementById("theme-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menu.classList.remove("open");
    });
  }
});

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
}
