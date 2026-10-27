export function createFontPickerModule(__appRuntimeContext) {
  let fontManifestPromise = null;

  function loadFontManifest() {
    if (!fontManifestPromise) {
      fontManifestPromise = (async () => {
        for (const candidate of ["fonts.json", "./fonts.json", "/fonts.json"]) {
          try {
            const response = await fetch(candidate, { cache: "no-cache" });
            if (response.ok) return await response.json();
          } catch (error) {
            console.warn("Failed to load fonts manifest from", candidate, error);
          }
        }
        // Retry on the next refresh if the manifest was unavailable offline.
        fontManifestPromise = null;
        return { available: [], defaults: {}, pairings: [] };
      })();
    }
    return fontManifestPromise;
  }

  function getStoredFonts() {
    try {
      const raw = localStorage.getItem("photoboothFonts");
      const local = raw ? JSON.parse(raw) : [];
      // Fire-and-forget remote merge so new fonts sync to other devices
      if (!__appRuntimeContext.fontsRemoteRequested) {
        __appRuntimeContext.fontsRemoteRequested = true;
        __appRuntimeContext.deferNonCriticalTask(() =>
          __appRuntimeContext.loadFontsRemote()
            .then((remote) => {
              if (Array.isArray(remote) && remote.length) {
                const merged = __appRuntimeContext.mergeFonts(local, remote);
                localStorage.setItem("photoboothFonts", JSON.stringify(merged));
              }
            })
            .catch(() => {})
        );
      }
      return local;
    } catch (e) {
      return [];
    }
  }

  function saveStoredFonts(fonts) {
    localStorage.setItem("photoboothFonts", JSON.stringify(fonts));
    __appRuntimeContext.scheduleFontsRemoteSync(fonts);
    queueFontPickerRefresh({ preserveSelection: true });
  }

  function queueFontPickerRefresh(options = {}) {
    if (!__appRuntimeContext.fontPickerInitialized) return;
    reloadFontPickerOptions(options).catch(() => {});
  }

  function slugifyFontName(name) {
    return (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function composeFontString(family) {
    if (!family) return "";
    return `'${family}', ${__appRuntimeContext.FONT_FALLBACK_STACK}`;
  }

  function primaryFontFamily(fontStr) {
    if (!fontStr) return "";
    const m = fontStr.match(/'([^']+)'/);
    if (m) return m[1];
    return fontStr.split(",")[0].trim();
  }

  function ensureFontLoadedForFontString(fontStr) {
    const fam = primaryFontFamily(fontStr);
    if (fam) ensureFontLoaded(fam, true);
  }

  function ensureFontLoaded(family, storeIfNew = false) {
    const fam = (family || "").replace(/^['"]|['"]$/g, "").trim();
    if (!fam) return;
    const id = "gf-" + slugifyFontName(fam);
    if (!document.getElementById(id)) {
      const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        fam
      ).replace(/%20/g, "+")}&display=swap`;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    if (storeIfNew) {
      const fonts = getStoredFonts();
      if (
        !fonts.find(
          (f) =>
            f.type === "family" && f.value.toLowerCase() === fam.toLowerCase()
        )
      ) {
        fonts.push({ type: "family", value: fam });
        saveStoredFonts(fonts);
      }
    }
  }

  function loadFontsFromStorage() {
    const fonts = getStoredFonts();
    fonts.forEach((f) => {
      if (f.type === "family") ensureFontLoaded(f.value, false);
      if (f.type === "url") {
        const id = "gf-url-" + btoa(f.value).replace(/=/g, "");
        if (!document.getElementById(id)) {
          const link = document.createElement("link");
          link.id = id;
          link.rel = "stylesheet";
          link.href = f.value;
          document.head.appendChild(link);
        }
      }
    });
    if (__appRuntimeContext.fontPickerInitialized) {
      queueFontPickerRefresh({ preserveSelection: true });
    }
  }

  function injectStylesheetOnce(href) {
    if (!href) return;
    const existing = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    );
    if (existing.some((l) => l instanceof HTMLLinkElement && l.href === href))
      return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function getFontPreviewText(name) {
    if (!name) return __appRuntimeContext.DEFAULT_FONT_PREVIEW;
    const match = (
      Array.isArray(__appRuntimeContext.fontCatalog.available) ? __appRuntimeContext.fontCatalog.available : []
    ).find((f) => f && f.name && f.name.toLowerCase() === name.toLowerCase());
    return (match && match.preview) || __appRuntimeContext.DEFAULT_FONT_PREVIEW;
  }

  function findPairingPreview(pairing, fonts = __appRuntimeContext.fontCatalog.available) {
    if (!pairing) return __appRuntimeContext.DEFAULT_FONT_PREVIEW;
    if (pairing.preview) return pairing.preview;
    const heading = pairing.heading;
    if (heading && Array.isArray(fonts)) {
      const normalized = __appRuntimeContext.normalizeFontFamilyName(heading);
      const match = fonts.find(
        (font) =>
          font && __appRuntimeContext.normalizeFontFamilyName(font.name || font.value) === normalized
      );
      if (match && match.preview) return match.preview;
    }
    return getFontPreviewText(heading);
  }

  function ensureOptionExists(select, family) {
    if (!select || !family) return;
    const exists = Array.from(select.options).some(
      (opt) => opt.value.toLowerCase() === family.toLowerCase()
    );
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = family;
      opt.textContent = family;
      opt.style.fontFamily = composeFontString(family);
      select.appendChild(opt);
    }
  }

  function getFontPickerSelection() {
    const theme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget() || {};
    const heading = primaryFontFamily(theme.fontHeading || theme.font || "");
    const body = primaryFontFamily(theme.fontBody || theme.font || "") || heading;
    return {
      heading,
      body,
    };
  }

  function setFontPickerSelection(heading, body, options = {}) {
    if (heading) ensureFontLoaded(heading, false);
    if (body) ensureFontLoaded(body, false);
  }

  function applyFontsToActiveTheme(headingName, bodyName, options = {}) {
    const target = __appRuntimeContext.getSelectedThemeTarget();
    if (!target) return;
    const heading =
      headingName || primaryFontFamily(target.fontHeading || target.font || "");
    const body =
      bodyName || primaryFontFamily(target.fontBody || target.font || "");
    if (heading) ensureFontLoaded(heading, false);
    if (body) ensureFontLoaded(body, false);
    if (heading) target.fontHeading = composeFontString(heading);
    else delete target.fontHeading;
    if (body) target.fontBody = composeFontString(body);
    else delete target.fontBody;
    target.font = composeFontString(body || heading || "Comic Neue");
    if (__appRuntimeContext.activeTheme === target) {
      __appRuntimeContext.applyThemeFontStyles(target);
      __appRuntimeContext.renderCurrentAssets(target);
    }
    __appRuntimeContext.saveThemesToStorage();
    if (!options.quiet) __appRuntimeContext.showToast("Fonts updated");
    __appRuntimeContext.updateThemeEditorSummary();
  }

  function applyFontSelection(heading, body, options = {}) {
    if (!heading && !body) return;
    setFontPickerSelection(heading, body, options);
    applyFontsToActiveTheme(heading, body, options);
  }

  function syncSessionFontSearch() {
    const theme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget() || {};
    const heading = primaryFontFamily(theme.fontHeading || theme.font || "");
    const body = primaryFontFamily(theme.fontBody || theme.font || "") || heading;
    const label =
      heading && body && heading === body
        ? heading
        : heading && body
        ? `${heading} + ${body}`
        : heading || body || "";
    if (__appRuntimeContext.DOM.sessionFontValue) __appRuntimeContext.DOM.sessionFontValue.textContent = label || "Choose font";
    if (__appRuntimeContext.DOM.sessionFontSearch) __appRuntimeContext.DOM.sessionFontSearch.value = "";
    renderSessionFontOptions();
  }

  function getSessionPairingOptions(filter = "") {
    const needle = String(filter || "").trim().toLowerCase();
    return (__appRuntimeContext.fontCatalog.pairings || []).slice(0, 8).filter((pairing) => {
      if (!pairing || !pairing.heading || !pairing.body) return false;
      if (!needle) return true;
      return `${pairing.heading} ${pairing.body} ${pairing.notes || ""}`
        .toLowerCase()
        .includes(needle);
    });
  }

  function appendSessionFontGroupLabel(label) {
    const heading = document.createElement("div");
    heading.className = "setup-combobox-group-label";
    heading.textContent = label;
    __appRuntimeContext.DOM.sessionFontOptions.appendChild(heading);
  }

  function renderSessionFontOptions(filter = "") {
    if (!__appRuntimeContext.DOM.sessionFontOptions) return;
    __appRuntimeContext.DOM.sessionFontOptions.innerHTML = "";
    const theme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget() || {};
    const selectedHeading = primaryFontFamily(theme.fontHeading || theme.font || "");
    const selectedBody = primaryFontFamily(theme.fontBody || theme.font || "") || selectedHeading;
    const pairings = getSessionPairingOptions(filter);
    if (pairings.length) appendSessionFontGroupLabel("Popular pairings");
    pairings.forEach((pairing) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "setup-combobox-option setup-font-pairing-option";
      item.dataset.headingFont = pairing.heading;
      item.dataset.bodyFont = pairing.body;
      const title = document.createElement("strong");
      title.textContent = pairing.notes || `${pairing.heading} + ${pairing.body}`;
      const detail = document.createElement("span");
      detail.textContent = `${pairing.heading} + ${pairing.body}`;
      detail.style.fontFamily = composeFontString(pairing.heading);
      item.append(title, detail);
      item.setAttribute("role", "option");
      item.setAttribute(
        "aria-selected",
        pairing.heading === selectedHeading && pairing.body === selectedBody
          ? "true"
          : "false"
      );
      item.addEventListener("click", () => activateFontPairingFromSetup(pairing));
      __appRuntimeContext.DOM.sessionFontOptions.appendChild(item);
    });
    if (!pairings.length) {
      const empty = document.createElement("div");
      empty.className = "setup-combobox-empty";
      empty.textContent = "No pairings found";
      __appRuntimeContext.DOM.sessionFontOptions.appendChild(empty);
    }
  }

  function activateFontPairingFromSetup(pairing) {
    if (!pairing || !pairing.heading || !pairing.body) return;
    applyFontSelection(pairing.heading, pairing.body, {
      keepPairing: true,
      headingPreviewText: findPairingPreview(pairing),
      bodyPreviewText: getFontPreviewText(pairing.body),
    });
    __appRuntimeContext.updateLaunchSummary();
    syncSessionFontSearch();
    __appRuntimeContext.closeSetupCombobox("font");
  }

  async function reloadFontPickerOptions(options = {}) {
    const base = await loadFontManifest();
    const stored = getStoredFonts();
    const extras = stored
      .filter((f) => f && f.type === "family" && f.value)
      .map((f) => ({
        name: f.value,
        weights: [400],
        ital: false,
        preview: __appRuntimeContext.DEFAULT_FONT_PREVIEW,
      }));
    const merged = [];
    const seen = new Set();
    [...(Array.isArray(base.available) ? base.available : []), ...extras].forEach(
      (font) => {
        if (!font || !font.name) return;
        const key = font.name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({
          name: font.name,
          weights:
            Array.isArray(font.weights) && font.weights.length
              ? font.weights
              : [400],
          ital: !!font.ital,
          preview: font.preview || __appRuntimeContext.DEFAULT_FONT_PREVIEW,
        });
      }
    );
    __appRuntimeContext.fontCatalog = {
      available: merged,
      defaults: base.defaults || {},
      pairings: Array.isArray(base.pairings) ? base.pairings.slice() : [],
    };
    const href = __appRuntimeContext.buildGoogleFontsURL(__appRuntimeContext.fontCatalog.available);
    if (href) injectStylesheetOnce(href);
    renderSessionFontOptions();
    syncSessionFontSearch();
  }

  return {
    getStoredFonts,
    saveStoredFonts,
    queueFontPickerRefresh,
    slugifyFontName,
    composeFontString,
    primaryFontFamily,
    ensureFontLoadedForFontString,
    ensureFontLoaded,
    loadFontsFromStorage,
    injectStylesheetOnce,
    getFontPreviewText,
    findPairingPreview,
    ensureOptionExists,
    getFontPickerSelection,
    setFontPickerSelection,
    applyFontsToActiveTheme,
    applyFontSelection,
    syncSessionFontSearch,
    getSessionPairingOptions,
    appendSessionFontGroupLabel,
    renderSessionFontOptions,
    activateFontPairingFromSetup,
    reloadFontPickerOptions,
  };
}
