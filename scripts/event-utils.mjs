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

export function buildEventFromThemeDefaults(theme, values = {}) {
  const themeBannerSize = theme && typeof theme.bannerSize === "number" && theme.bannerSize > 0
    ? theme.bannerSize
    : null;
  const themeWelcomeSize = theme && typeof theme.welcomeTitleSize === "number" && theme.welcomeTitleSize > 0
    ? theme.welcomeTitleSize
    : null;
  const themeCharacterX = theme && typeof theme.characterX === "number" ? theme.characterX : null;
  const themeCharacterBottom = theme && typeof theme.characterBottom === "number" ? theme.characterBottom : null;
  const themeCharacterHeight = theme && typeof theme.characterHeight === "number" ? theme.characterHeight : null;
  const base = {
    ...values,
    bannerText: typeof values.bannerText === "string"
      ? values.bannerText
      : ((theme && typeof theme.bannerText === "string") ? theme.bannerText : ""),
    welcomeTitle: typeof values.welcomeTitle === "string"
      ? values.welcomeTitle
      : ((theme && theme.welcome && typeof theme.welcome.title === "string") ? theme.welcome.title : ""),
    startButtonText: typeof values.startButtonText === "string"
      ? values.startButtonText
      : ((theme && theme.welcome && typeof theme.welcome.prompt === "string") ? theme.welcome.prompt : ""),
    captureLabel: typeof values.captureLabel === "string"
      ? values.captureLabel
      : ((theme && typeof theme.captureLabel === "string") ? theme.captureLabel : ""),
    fontHeading: typeof values.fontHeading === "string" && values.fontHeading
      ? values.fontHeading
      : ((theme && (theme.fontHeading || theme.font)) || ""),
    fontBody: typeof values.fontBody === "string" && values.fontBody
      ? values.fontBody
      : ((theme && (theme.fontBody || theme.font)) || ""),
    overrides: values.overrides && typeof values.overrides === "object"
      ? values.overrides
      : { backgrounds: [], overlays: [], templates: [], backgroundIndex: 0, greenBackgrounds: [], greenBackgroundIndex: 0 }
  };
  if (typeof values.bannerSize === "number" && values.bannerSize > 0) base.bannerSize = values.bannerSize;
  else if (themeBannerSize) base.bannerSize = themeBannerSize;
  if (typeof values.welcomeTitleSize === "number" && values.welcomeTitleSize > 0) base.welcomeTitleSize = values.welcomeTitleSize;
  else if (themeWelcomeSize) base.welcomeTitleSize = themeWelcomeSize;
  if (typeof values.characterX === "number") base.characterX = values.characterX;
  else if (themeCharacterX !== null) base.characterX = themeCharacterX;
  if (typeof values.characterBottom === "number") base.characterBottom = values.characterBottom;
  else if (themeCharacterBottom !== null) base.characterBottom = themeCharacterBottom;
  if (typeof values.characterHeight === "number") base.characterHeight = values.characterHeight;
  else if (themeCharacterHeight !== null) base.characterHeight = themeCharacterHeight;
  return base;
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
