const DB = {
  anamneses: "nv-anamneses",
  pacientes: "nv-pacientes",
  config: "nv-config",
  reunioes: "reunioes-site",
  adminHash: "nv-admin-hash"
};

function dbRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? (fallback === undefined ? null : fallback) : JSON.parse(raw);
  } catch {
    return fallback === undefined ? null : fallback;
  }
}

function dbWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function waLink(phone, text) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return "https://wa.me/" + digits + (text ? "?text=" + encodeURIComponent(text) : "");
}

function formatWhats(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone || "";
}
