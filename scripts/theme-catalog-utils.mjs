export function pruneUnapprovedThemes(catalog, approvedThemeKeys) {
  if (!catalog || typeof catalog !== "object") return false;
  let removed = false;

  for (const [rootKey, group] of Object.entries(catalog)) {
    if (rootKey === "_meta") continue;
    if (!group || typeof group !== "object") {
      delete catalog[rootKey];
      removed = true;
      continue;
    }
    for (const bucket of ["themes", "holidays"]) {
      const entries = group[bucket];
      if (!entries || typeof entries !== "object") continue;
      for (const entryKey of Object.keys(entries)) {
        if (!approvedThemeKeys.has(`${rootKey}:${entryKey}`)) {
          delete entries[entryKey];
          removed = true;
        }
      }
      if (Object.keys(entries).length === 0) {
        delete group[bucket];
        removed = true;
      }
    }
    if (!group.themes && !group.holidays) {
      delete catalog[rootKey];
      removed = true;
    }
  }

  return removed;
}
