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
