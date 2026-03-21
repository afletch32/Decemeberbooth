export function applyEventNameToTheme(theme, name) {
  if (!theme || typeof theme !== "object") return theme;
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return theme;
  theme.name = trimmed;
  if (!theme.welcome || typeof theme.welcome !== "object") {
    theme.welcome = {};
  }
  if (!theme.welcome.title) theme.welcome.title = trimmed;
  return theme;
}

export function mergeUniqueUrls(preferred = [], fallback = []) {
  const seen = new Set();
  const combined = [];
  const append = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((src) => {
      const key = (src || "").toString();
      if (!key || seen.has(key)) return;
      seen.add(key);
      combined.push(src);
    });
  };
  append(preferred);
  append(fallback);
  return combined;
}

export function applyThemeText(theme, values = {}) {
  if (!theme || typeof theme !== "object") return theme;
  const {
    bannerText,
    welcomeTitle,
    startButtonText,
    captureLabel
  } = values || {};
  if (typeof bannerText === "string") theme.bannerText = bannerText;
  if (typeof welcomeTitle === "string") {
    if (!theme.welcome || typeof theme.welcome !== "object") {
      theme.welcome = {};
    }
    theme.welcome.title = welcomeTitle;
  }
  if (typeof startButtonText === "string") {
    if (!theme.welcome || typeof theme.welcome !== "object") {
      theme.welcome = {};
    }
    theme.welcome.prompt = startButtonText;
  }
  if (typeof captureLabel === "string") theme.captureLabel = captureLabel;
  return theme;
}

export function getEventTextOverrides(event) {
  return {
    bannerText: (event && event.bannerText) || "",
    welcomeTitle: (event && event.welcomeTitle) || "",
    welcomeTitleSize: (event && event.welcomeTitleSize) || null,
    startButtonText: (event && event.startButtonText) || "",
    captureLabel: (event && event.captureLabel) || ""
  };
}

export function hasEventTextOverrides(event) {
  const overrides = getEventTextOverrides(event);
  return Object.values(overrides).some((value) => {
    if (typeof value === "number") return value > 0;
    return value && value.trim();
  });
}

export function normalizeEventStyle(value) {
  const clean = (value || "").toString().trim().toLowerCase();
  if (!clean) return "general";
  const aliases = {
    gala: "wedding",
    formal: "wedding",
    bridal: "wedding",
    conference: "expo",
    trade: "expo",
    tradeshow: "expo",
    party: "birthday",
    fair: "community",
    festival: "community",
    fundraiser: "community",
    holiday: "christmas",
    school: "community",
    sports: "community"
  };
  return aliases[clean] || clean;
}

export function inferThemeEventStyle(themeKey = "", theme = null) {
  const explicit = normalizeEventStyle(theme && theme.fontPairingStyle);
  if (explicit !== "general") return explicit;
  const text = [
    themeKey,
    theme && theme.name,
    theme && theme.vibeSummary,
    theme && theme.welcome && theme.welcome.title
  ].filter(Boolean).join(" ").toLowerCase();

  if (/wedding|bridal|romantic|love|valentine/.test(text)) return "wedding";
  if (/expo|conference|vendor|trade/.test(text)) return "expo";
  if (/birthday|party/.test(text)) return "birthday";
  if (/community|festival|fair|fundraiser|school|hawks|ane|grad|graduation/.test(text)) return "community";
  if (/christmas|holiday|winter wonderland|santa/.test(text)) return "christmas";
  if (/halloween|spooky|ghost|boo/.test(text)) return "halloween";
  if (/new year|nye/.test(text)) return "newyear";
  return "general";
}

export function pairingSupportsEventStyle(pairing, style) {
  const normalizedStyle = normalizeEventStyle(style);
  if (normalizedStyle === "general") return true;
  const styleList = Array.isArray(pairing && pairing.styles)
    ? pairing.styles.map((item) => normalizeEventStyle(item)).filter(Boolean)
    : [];
  if (styleList.includes(normalizedStyle)) return true;
  if (styleList.includes("general")) return true;

  const text = [
    pairing && pairing.notes,
    pairing && pairing.preview
  ].filter(Boolean).join(" ").toLowerCase();

  const keywordMap = {
    wedding: ["wedding", "romantic", "bridal", "elegance", "love"],
    expo: ["expo", "conference", "booth", "vendor", "modern", "clean", "tech"],
    birthday: ["birthday", "party", "joyful", "kids", "family"],
    community: ["community", "welcome", "friendly", "family", "school", "grad", "team"],
    christmas: ["christmas", "holiday", "festive", "winter"],
    halloween: ["halloween", "spooky", "ghost"],
    newyear: ["new year", "nye", "gala", "chic"]
  };
  const keywords = keywordMap[normalizedStyle] || [];
  return keywords.some((keyword) => text.includes(keyword));
}
