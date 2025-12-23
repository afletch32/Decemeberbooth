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
