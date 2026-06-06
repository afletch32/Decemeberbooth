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

export function buildEventAssetFolderPath({ base, name, date, fallback, kind }) {
  const eventFolder = buildEventFolderPath({ base, name, date, fallback });
  const cleanKind = (kind || "").toString().replace(/^\/+|\/+$/g, "");
  if (!cleanKind) return eventFolder;
  if (!eventFolder) return cleanKind;
  return `${eventFolder}/${cleanKind}`;
}

export function buildDateSessionFolderPath({ base, date }) {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || "").trim())
    ? String(date).trim()
    : "session";
  return buildEventFolderPath({
    base,
    name: "",
    date: "",
    fallback: safeDate,
  });
}

export function buildAssetIndexKey({ hash, folder }) {
  const cleanHash = (hash || "").toString().trim();
  const cleanFolder = (folder || "").toString().replace(/\/+$/g, "");
  if (!cleanFolder) return cleanHash;
  if (!cleanHash) return cleanFolder;
  return `${cleanFolder}::${cleanHash}`;
}
