export const REMOTE_SYNC_BLOCKLIST = [
  /github\.io$/i
];

export function hostMatches(list, host) {
  if (!Array.isArray(list) || !host) return false;
  return list.some((rule) => {
    if (typeof rule === "string") return host === rule;
    if (rule && typeof rule.test === "function") return rule.test(host);
    return false;
  });
}

export function shouldEnableRemoteSync({ protocol = "", host = "", override = null } = {}) {
  if (!protocol.startsWith("http")) return false;
  if (override !== null) return !!override;
  const normalizedHost = (host || "").toString().toLowerCase();
  if (!normalizedHost) return false;
  if (hostMatches(REMOTE_SYNC_BLOCKLIST, normalizedHost)) return false;
  return true;
}
