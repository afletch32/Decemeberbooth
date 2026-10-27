export function createNormalizationModule(__appRuntimeContext) {
  function arrayUniqueStrings(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const s = (v || "").toString().trim();
      if (!s) continue;
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
    return out;
  }

  function arrayUniqueOverlays(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const entry of arr) {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push(
        entry && typeof entry === "object"
          ? { ...__appRuntimeContext.cloneThemeValue(entry), src }
          : src
      );
    }
    return out;
  }

  function arrayUniqueTemplates(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const t of arr) {
      if (!t || !t.src) continue;
      const s = t.src.toString().trim();
      if (!s) continue;
      if (!seen.has(s)) {
        seen.add(s);
        out.push({
          ...__appRuntimeContext.cloneThemeValue(t),
          src: s,
          layout: __appRuntimeContext.normalizeTemplateLayout(t.layout || "double_column"),
          slots: t.slots,
          photoSlots: t.photoSlots,
          background: t.background,
          foreground: t.foreground,
          textFields: __appRuntimeContext.normalizeTemplateTextFields(t.textFields),
        });
      }
    }
    return out;
  }

  function normalizeThemeObject(t) {
    if (!t || typeof t !== "object") return;
    if (typeof t.name === "string") t.name = normalizeThemeName(t.name);
    if (Array.isArray(t.overlays)) t.overlays = arrayUniqueOverlays(t.overlays);
    if (Array.isArray(t.templates))
      t.templates = arrayUniqueTemplates(t.templates);
    // Background normalization: ensure index in range
    const list = Array.isArray(t.backgrounds)
      ? t.backgrounds.filter(Boolean)
      : t.background
      ? [t.background]
      : [];
    if (Array.isArray(t.backgrounds)) {
      t.backgrounds = arrayUniqueStrings(list);
      if (typeof t.backgroundIndex === "number") {
        t.backgroundIndex = Math.min(
          Math.max(t.backgroundIndex, 0),
          Math.max(t.backgrounds.length - 1, 0)
        );
      }
    } else if (
      t.background &&
      typeof t.background === "string" &&
      !t.background.trim()
    ) {
      t.background = "";
    }
    const baseFont = typeof t.font === "string" && t.font.trim() ? t.font : "";
    if ((!t.fontHeading || !t.fontHeading.trim()) && baseFont)
      t.fontHeading = baseFont;
    if ((!t.fontBody || !t.fontBody.trim()) && baseFont) t.fontBody = baseFont;
    if (!t.fontHeading && t.fontBody) t.fontHeading = t.fontBody;
    if (!t.fontBody && t.fontHeading) t.fontBody = t.fontHeading;
    if (!t.font || !t.font.trim())
      t.font = t.fontBody || t.fontHeading || "'Comic Neue', cursive";
  }

  function normalizeThemeName(value = "") {
    return String(value)
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u200D\uFE0F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeAllThemes() {
    const keys = Object.keys(__appRuntimeContext.themes || {});
    for (const k of keys) {
      const group = __appRuntimeContext.themes[k];
      if (!group || typeof group !== "object") continue;
      if (typeof group.name === "string") group.name = normalizeThemeName(group.name);
      if (group.themes || group.holidays) {
        const dict = group.themes || group.holidays;
        for (const sk in dict) normalizeThemeObject(dict[sk]);
      } else {
        normalizeThemeObject(group);
      }
    }
  }

  function removeLegacyFlatBuiltinThemes() {
    let removed = false;
    for (const key of Object.keys(__appRuntimeContext.themes || {})) {
      const theme = __appRuntimeContext.themes[key];
      if (
        __appRuntimeContext.BUILTIN_THEME_LOCATIONS[key] &&
        theme &&
        typeof theme === "object" &&
        !theme.themes &&
        !theme.holidays
      ) {
        delete __appRuntimeContext.themes[key];
        removed = true;
      }
    }
    return removed;
  }

  function repairCorruptedBackgroundDefaults() {
    if (!__appRuntimeContext.themes || typeof __appRuntimeContext.themes !== "object") return false;
    if (!__appRuntimeContext.themes._meta || typeof __appRuntimeContext.themes._meta !== "object") __appRuntimeContext.themes._meta = {};
    if (__appRuntimeContext.themes._meta.assetDefaultRepairVersion >= __appRuntimeContext.ASSET_DEFAULT_REPAIR_VERSION)
      return false;
    const globalCatalog = new Set(__appRuntimeContext.getAllThemeBackgroundCatalogList());
    let repaired = false;
    forEachThemeEntry((theme) => {
      const backgrounds = Array.isArray(theme.backgrounds)
        ? theme.backgrounds.filter(Boolean)
        : [];
      const selected = new Set(backgrounds);
      const catalog = new Set(__appRuntimeContext.getThemeBackgroundCatalogList(theme));
      const folderBackedTheme =
        typeof theme.background === "string" && theme.background.trim().endsWith("/");
      if (
        (folderBackedTheme &&
          __appRuntimeContext.isCompleteBackgroundCatalogSelection(backgrounds, catalog)) ||
        __appRuntimeContext.isCompleteBackgroundCatalogSelection(backgrounds, globalCatalog)
      ) {
        theme.backgrounds = [];
        repaired = true;
      }
    });
    __appRuntimeContext.themes._meta.assetDefaultRepairVersion = __appRuntimeContext.ASSET_DEFAULT_REPAIR_VERSION;
    return repaired;
  }

  function forEachThemeEntry(callback) {
    if (!__appRuntimeContext.themes || typeof __appRuntimeContext.themes !== "object" || typeof callback !== "function")
      return;
    const visit = (collection, prefix = "") => {
      if (!collection || typeof collection !== "object") return;
      for (const key of Object.keys(collection)) {
        if (key === "_meta") continue;
        const value = collection[key];
        if (!value || typeof value !== "object") continue;
        const nextKey = prefix ? `${prefix}:${key}` : key;
        if (value.themes || value.holidays) {
          if (value.themes) visit(value.themes, nextKey);
          if (value.holidays) visit(value.holidays, nextKey);
        } else {
          callback(value, nextKey);
        }
      }
    };
    visit(__appRuntimeContext.themes);
  }

  function applyGlobalLogoToTheme(theme, logo) {
    if (!theme || typeof theme !== "object") return;
    if (typeof logo !== "string") return;
    theme.logo = logo;
  }

  function applyGlobalLogoToAllThemes(logo) {
    if (typeof logo !== "string") return;
    forEachThemeEntry((theme) => applyGlobalLogoToTheme(theme, logo));
  }

  function getGlobalLogo() {
    try {
      const value = localStorage.getItem(__appRuntimeContext.GLOBAL_LOGO_STORAGE_KEY);
      return value === null ? null : value;
    } catch (_) {
      return null;
    }
  }

  function setGlobalLogo(logo, options = {}) {
    const value = typeof logo === "string" ? logo : "";
    try {
      if (value) localStorage.setItem(__appRuntimeContext.GLOBAL_LOGO_STORAGE_KEY, value);
      else localStorage.removeItem(__appRuntimeContext.GLOBAL_LOGO_STORAGE_KEY);
    } catch (_) {}
    applyGlobalLogoToAllThemes(value);
    if (__appRuntimeContext.activeTheme) {
      applyGlobalLogoToTheme(__appRuntimeContext.activeTheme, value);
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    }
    if (__appRuntimeContext.DOM.logo) __appRuntimeContext.DOM.logo.src = value || "";
    if (!options.skipSave) __appRuntimeContext.saveThemesToStorage();
    if (!options.quiet)
      __appRuntimeContext.showToast(
        value ? "Logo applied to all themes" : "Logo cleared for all themes"
      );
  }

  function updateCurrentThemeFont() {
    const selection = __appRuntimeContext.getFontPickerSelection();
    if (!selection.heading && !selection.body) {
      alert("Choose heading and body fonts first.");
      return;
    }
    __appRuntimeContext.applyFontSelection(
      selection.heading || selection.body,
      selection.body || selection.heading,
      { keepPairing: true }
    );
  }

  return {
    arrayUniqueStrings,
    arrayUniqueOverlays,
    arrayUniqueTemplates,
    normalizeThemeObject,
    normalizeThemeName,
    normalizeAllThemes,
    removeLegacyFlatBuiltinThemes,
    repairCorruptedBackgroundDefaults,
    forEachThemeEntry,
    applyGlobalLogoToTheme,
    applyGlobalLogoToAllThemes,
    getGlobalLogo,
    setGlobalLogo,
    updateCurrentThemeFont,
  };
}
