const LOGO_KEY = "logo-site";

function applyLogo(dataUrl) {
  document.querySelectorAll("[data-logo-slot]").forEach(slot => {
    if (dataUrl) {
      let img = slot.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        img.alt = "Logomarca do cliente";
        slot.prepend(img);
      }
      img.src = dataUrl;
    } else {
      const img = slot.querySelector("img");
      if (img) img.remove();
    }
  });
  document.querySelectorAll("[data-logo-remove]").forEach(btn => {
    btn.style.display = dataUrl ? "inline-flex" : "none";
  });
  document.querySelectorAll("[data-logo-upload]").forEach(btn => {
    btn.textContent = dataUrl ? "🖼️ Trocar logo" : "🖼️ Sua logo";
  });
  const favicon = document.querySelector("#favicon");
  if (favicon && dataUrl) favicon.href = dataUrl;
  const bigIcon = document.querySelector(".big-icon");
  if (bigIcon) bigIcon.style.display = dataUrl ? "none" : "block";
}

function notify(message) {
  if (typeof showToast === "function") {
    showToast(message);
  } else {
    alert(message);
  }
}

function initLogo() {
  applyLogo(localStorage.getItem(LOGO_KEY));
  const input = document.getElementById("logo-input");
  document.querySelectorAll("[data-logo-upload]").forEach(btn => {
    btn.addEventListener("click", () => input && input.click());
  });
  if (input) {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        notify("Escolha um arquivo de imagem (PNG, JPG, SVG ou WEBP).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        notify("Imagem muito grande. Use um arquivo de até 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem(LOGO_KEY, reader.result);
        applyLogo(reader.result);
        notify("Logomarca aplicada no topo ✨");
      };
      reader.readAsDataURL(file);
    });
  }
  document.querySelectorAll("[data-logo-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.removeItem(LOGO_KEY);
      applyLogo(null);
      notify("Logomarca removida. Voltamos ao padrão 💚");
    });
  });
}

window.addEventListener("DOMContentLoaded", initLogo);
