const THEMES = {
  padrao: {
    label: "Nutrição",
    icon: "🥑",
    icons: ["🍎", "🥦", "🥑", "🍓", "🥕", "🍇", "🍋", "🫐", "🥝", "🍊"],
    colors: {
      primary: "#2fbf71",
      primaryDark: "#1f8f52",
      accent: "#f4a261",
      bg: "#f6fbf7",
      bgAlt: "#e7f5ec",
      text: "#17332a",
      glass: "rgba(255,255,255,0.72)"
    },
    heroGradient: "linear-gradient(135deg,#1f8f52 0%,#2fbf71 45%,#a8e063 100%)",
    interval: 700
  },
  natal: {
    label: "Natal",
    icon: "🎄",
    icons: ["❄️", "🎄", "🔔", "🎅", "🎁", "⛄", "✨", "🕯️"],
    colors: {
      primary: "#c0392b",
      primaryDark: "#8e2418",
      accent: "#f1c40f",
      bg: "#fdf6ec",
      bgAlt: "#fbe8d3",
      text: "#2c1a12",
      glass: "rgba(255,252,245,0.8)"
    },
    heroGradient: "linear-gradient(135deg,#5d2a0f 0%,#8e2418 50%,#c0392b 100%)",
    interval: 450
  },
  anoNovo: {
    label: "Ano Novo",
    icon: "🎆",
    icons: ["🎉", "🎊", "✨", "🥂", "🎆", "⭐", "🍾", "💫"],
    colors: {
      primary: "#6c5ce7",
      primaryDark: "#4834b8",
      accent: "#fdcb6e",
      bg: "#f7f6fd",
      bgAlt: "#ece9fb",
      text: "#1c1a33",
      glass: "rgba(250,249,255,0.78)"
    },
    heroGradient: "linear-gradient(135deg,#180b45 0%,#4834b8 55%,#6c5ce7 100%)",
    interval: 400
  },
  pascoa: {
    label: "Páscoa",
    icon: "🐣",
    icons: ["🥚", "🐣", "🐰", "🌷", "🍫", "🌼", "🐣", "🧺"],
    colors: {
      primary: "#e17055",
      primaryDark: "#b3503a",
      accent: "#74b9ff",
      bg: "#fffaf3",
      bgAlt: "#fdeee0",
      text: "#3b2416",
      glass: "rgba(255,252,248,0.78)"
    },
    heroGradient: "linear-gradient(135deg,#b3503a 0%,#e17055 50%,#fab1a0 100%)",
    interval: 550
  },
  festaJunina: {
    label: "Festa Junina",
    icon: "🌽",
    icons: ["🌽", "🎪", "🏮", "🤠", "🥜", "🍬", "🎻", "🔥"],
    colors: {
      primary: "#e67e22",
      primaryDark: "#b35c12",
      accent: "#2980b9",
      bg: "#fffbf2",
      bgAlt: "#fdefd6",
      text: "#3a2a12",
      glass: "rgba(255,253,246,0.8)"
    },
    heroGradient: "linear-gradient(135deg,#8a4b08 0%,#e67e22 55%,#f5b041 100%)",
    interval: 500
  },
  verao: {
    label: "Verão",
    icon: "🌞",
    icons: ["🍉", "🌞", "⛱️", "🍍", "🥥", "🍹", "🌊", "🩴"],
    colors: {
      primary: "#00b4d8",
      primaryDark: "#0087a8",
      accent: "#f9c74f",
      bg: "#f2fcff",
      bgAlt: "#dcf5fb",
      text: "#0c2a33",
      glass: "rgba(245,253,255,0.78)"
    },
    heroGradient: "linear-gradient(135deg,#0087a8 0%,#00b4d8 50%,#90e0ef 100%)",
    interval: 550
  }
};

function getTheme(name) {
  return THEMES[name] || THEMES.padrao;
}
