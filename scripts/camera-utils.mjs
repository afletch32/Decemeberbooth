export function clampZoom(value, min = 1, max = 2.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}
