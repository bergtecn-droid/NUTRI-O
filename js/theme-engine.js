const canvas = document.getElementById("particles");
const ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];
let spawnTimer = 0;
let activeTheme = getTheme("padrao");

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function spawnParticle() {
  if (!ctx) return;
  const icons = activeTheme.icons;
  particles.push({
    x: Math.random() * canvas.width,
    y: -40,
    size: 18 + Math.random() * 22,
    speedY: 0.6 + Math.random() * 1.6,
    drift: 0.4 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
    rotation: (Math.random() - 0.5) * 0.02,
    angle: Math.random() * Math.PI * 2,
    glyph: icons[Math.floor(Math.random() * icons.length)]
  });
}

function tickParticles(delay) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  spawnTimer += 16;
  if (spawnTimer > delay) {
    spawnTimer = 0;
    spawnParticle();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.phase += 0.02;
    p.y += p.speedY;
    p.x += Math.sin(p.phase) * p.drift;
    p.angle += p.rotation;
    if (p.y > canvas.height + 60) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.font = `${p.size}px serif`;
    ctx.globalAlpha = 0.9;
    ctx.textAlign = "center";
    ctx.fillText(p.glyph, 0, 0);
    ctx.restore();
  }
  requestAnimationFrame(() => tickParticles(activeTheme.interval));
}
requestAnimationFrame(() => tickParticles(activeTheme.interval));

function applyTheme(name) {
  const theme = getTheme(name);
  activeTheme = theme;
  particles = [];
  const root = document.documentElement.style;
  root.setProperty("--primary", theme.colors.primary);
  root.setProperty("--primary-dark", theme.colors.primaryDark);
  root.setProperty("--accent", theme.colors.accent);
  root.setProperty("--bg", theme.colors.bg);
  root.setProperty("--bg-alt", theme.colors.bgAlt);
  root.setProperty("--text", theme.colors.text);
  root.setProperty("--glass", theme.colors.glass);
  root.setProperty("--hero-gradient", theme.heroGradient);
  document.querySelectorAll("[data-theme-label]").forEach(el => {
    el.textContent = theme.label;
  });
  document.querySelectorAll("[data-theme-icon]").forEach(el => {
    el.textContent = theme.icon;
  });
  document.querySelectorAll("[data-theme-option]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeOption === name);
  });
  localStorage.setItem("tema-site", name);
}

const savedTheme = localStorage.getItem("tema-site");
window.addEventListener("DOMContentLoaded", () => {
  applyTheme(savedTheme || "padrao");
  document.querySelectorAll("[data-theme-option]").forEach(btn => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.themeOption));
  });
});
