const CLOUD_CONFIG_KEY = "nv-firebase";
const SYNC_KEYS = [];

const SDK_BASE = "https://www.gstatic.com/firebasejs/10.12.2";

function loadCloudScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Falha ao carregar " + src));
    document.head.appendChild(s);
  });
}

function parseFirebaseConfig(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Cole o objeto completo do firebaseConfig (entre { e }).");
  const cfg = JSON.parse(m[0]);
  if (!cfg.apiKey || !cfg.projectId) throw new Error("O firebaseConfig precisa ter apiKey e projectId.");
  return cfg;
}

window.nvCloud = {
  active: false,
  store: null,

  async push(key) {
    if (!this.active || !this.store) return;
    try {
      await this.store.collection("nutriviva").doc(key).set({
        json: localStorage.getItem(key),
        ts: Number(localStorage.getItem("nv-ts-" + key)) || Date.now()
      });
    } catch (e) {
      console.warn("nv-cloud push falhou:", e.code || e.message);
    }
  },

  async pull() {
    if (!this.active || !this.store) return false;
    let changed = false;
    for (const key of SYNC_KEYS) {
      try {
        const snap = await this.store.collection("nutriviva").doc(key).get();
        if (!snap.exists) continue;
        const data = snap.data();
        const localTs = Number(localStorage.getItem("nv-ts-" + key)) || 0;
        if ((data.ts || 0) > localTs && data.json) {
          localStorage.setItem(key, data.json);
          localStorage.setItem("nv-ts-" + key, String(data.ts));
          changed = true;
        }
      } catch (e) {
        console.warn("nv-cloud pull falhou em " + key + ":", e.code || e.message);
      }
    }
    return changed;
  }
};

function cloudStatusEl() { return document.getElementById("fb-status"); }

function setCloudStatus(text, ok) {
  const el = cloudStatusEl();
  if (el) {
    el.textContent = text;
    el.style.color = ok === true ? "var(--primary-dark)" : ok === false ? "#b3261e" : "inherit";
  }
}

async function connectCloud(cfg) {
  setCloudStatus("⏳ Conectando à nuvem...");
  await loadCloudScript(SDK_BASE + "/firebase-app-compat.js");
  await loadCloudScript(SDK_BASE + "/firebase-firestore-compat.js");
  firebase.initializeApp(cfg);
  window.nvCloud.store = firebase.firestore();
  window.nvCloud.active = true;
  const changed = await window.nvCloud.pull();
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cfg));
  setCloudStatus("☁️ Conectado! Os dados sincronizam com a nuvem automaticamente. " + (changed ? "Cadastro atualizado a partir da nuvem." : ""), true);
  document.dispatchEvent(new CustomEvent("nv-cloud-synced"));
}

async function tryAutoConnect() {
  for (const key of Object.keys(DB)) {
    if (![DB.pacientes, DB.anamneses, DB.reunioes, DB.config].includes(key)) continue;
    if (!SYNC_KEYS.includes(key)) SYNC_KEYS.push(key);
  }
  const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
  if (!raw) return;
  try {
    await connectCloud(JSON.parse(raw));
  } catch (e) {
    setCloudStatus("⚠️ Há uma configuração salva, mas a conexão falhou: " + e.message, false);
  }
}

function initCloudUI() {
  const connectBtn = document.getElementById("fb-connect");
  if (!connectBtn) return;
  const disconnectBtn = document.getElementById("fb-disconnect");
  const box = document.getElementById("fb-config");

  const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
  if (raw) {
    try { box.value = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
    disconnectBtn.style.display = "inline-block";
  }

  connectBtn.addEventListener("click", async () => {
    try {
      const cfg = parseFirebaseConfig(box.value);
      await connectCloud(cfg);
      disconnectBtn.style.display = "inline-block";
      box.value = JSON.stringify(cfg, null, 2);
    } catch (e) {
      setCloudStatus("❌ " + e.message, false);
    }
  });

  disconnectBtn.addEventListener("click", () => {
    window.nvCloud.active = false;
    localStorage.removeItem(CLOUD_CONFIG_KEY);
    setCloudStatus("Desconectado. Os dados continuam salvos neste navegador.", null);
    disconnectBtn.style.display = "none";
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initCloudUI();
  tryAutoConnect();
});
