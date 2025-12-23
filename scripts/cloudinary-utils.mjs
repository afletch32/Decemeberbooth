export function buildEventFolderPath({ base, name, date, fallback }) {
  const safeBase = (base || "").replace(/\/+$/g, "");
  const parts = [];
  if (name) parts.push(name);
  if (date) parts.push(date);
  if (!parts.length && fallback) parts.push(fallback);
  const suffix = parts.join("/");
  if (!safeBase) return suffix;
  if (!suffix) return safeBase;
  return `${safeBase}/${suffix}`;
}
