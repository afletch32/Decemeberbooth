function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeRecord(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeRecord(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function mergeThemeGroup(existing, incoming) {
  const merged = mergeRecord(existing, incoming);
  for (const bucket of ["themes", "holidays"]) {
    if (!isRecord(incoming[bucket])) continue;
    merged[bucket] = {
      ...(isRecord(existing[bucket]) ? existing[bucket] : {}),
      ...incoming[bucket],
    };
  }
  return merged;
}

export function mergeThemeCatalog(existing, incoming) {
  if (!isRecord(incoming)) throw new TypeError("Theme payload must be an object.");
  const merged = isRecord(existing) ? { ...existing } : {};

  for (const [key, value] of Object.entries(incoming)) {
    if (!isRecord(value)) {
      merged[key] = value;
      continue;
    }
    const hasThemeBucket = isRecord(value.themes) || isRecord(value.holidays);
    if (hasThemeBucket) {
      merged[key] = mergeThemeGroup(
        isRecord(merged[key]) ? merged[key] : {},
        value
      );
    } else if (isRecord(merged[key])) {
      merged[key] = mergeRecord(merged[key], value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}
