const LOGO_KEY = "logo-site";
const LOGO_MAX_INPUT = 8 * 1024 * 1024;
const LOGO_MAX_DIM = 640;

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

function compressImage(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, LOGO_MAX_DIM / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const isPng = file.type === "image/png" || file.type === "image/svg+xml";
      resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function storeLogo(file) {
  if (!file.type.startsWith("image/")) {
    notify("Escolha um arquivo de imagem (PNG, JPG, SVG ou WEBP).");
    return;
  }
  if (file.size > LOGO_MAX_INPUT) {
    notify("Imagem muito grande. Use um arquivo de até 8 MB.");
    return;
  }
  const store = dataUrl => {
    localStorage.setItem(LOGO_KEY, dataUrl);
    applyLogo(dataUrl);
    notify("Logomarca aplicada no topo ✨");
  };
  if (file.size > 400 * 1024) {
    compressImage(file).then(dataUrl => {
      if (dataUrl) {
        store(dataUrl);
        notify("Logo otimizada e aplicada no topo ✨");
      } else {
        notify("Não foi possível processar a imagem. Tente outro arquivo.");
      }
    });
  } else {
    const reader = new FileReader();
    reader.onload = () => store(reader.result);
    reader.readAsDataURL(file);
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
      if (file) storeLogo(file);
      input.value = "";
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
