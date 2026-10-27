export function createSessionAssetsModule(__appRuntimeContext) {
  function getUrlParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (_) {
      return "";
    }
  }

  function isBoothTestMode() {
    return getUrlParam("testMode") === "booth";
  }

  function getBoothQaState() {
    return getUrlParam("qaState");
  }

  function getAssetPickerFilename(src = "") {
    const value = String(src || "").split("?")[0].split("#")[0];
    try {
      return decodeURIComponent(value.split("/").pop() || value || "");
    } catch (_) {
      return value.split("/").pop() || value || "";
    }
  }

  function getAssetPickerVisibleLimit(modeKey, selectedSrc = "", entries = []) {
    const base =
      __appRuntimeContext.assetPickerVisibleLimits[modeKey] || __appRuntimeContext.ASSET_PICKER_INITIAL_LIMIT;
    const cleanSelected = getAssetEntrySrc(selectedSrc);
    if (!cleanSelected) return base;
    const selectedIndex = entries.findIndex(
      (entry) => getAssetEntrySrc(entry) === cleanSelected
    );
    return selectedIndex >= 0 ? Math.max(base, selectedIndex + 1) : base;
  }

  function withBust(src) {
    try {
      if (!src) return src;
      const lower = String(src).toLowerCase();
      if (lower.startsWith("data:") || lower.startsWith("blob:")) return src;
      return src + (src.includes("?") ? "&" : "?") + "v=" + __appRuntimeContext.SESSION_BUST;
    } catch (_) {
      return src;
    }
  }

  function getLocalIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getLastThemeKey() {
    try {
      return localStorage.getItem(__appRuntimeContext.LAST_THEME_KEY_STORAGE) || "";
    } catch (_) {
      return "";
    }
  }

  function setLastThemeKey(themeKey) {
    if (!themeKey) return;
    try {
      localStorage.setItem(__appRuntimeContext.LAST_THEME_KEY_STORAGE, themeKey);
    } catch (_) {}
  }

  function getQuickStartSessionDate() {
    try {
      return localStorage.getItem(__appRuntimeContext.QUICK_START_SESSION_DATE_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setQuickStartSessionDate(dateValue) {
    const safe = typeof dateValue === "string" ? dateValue.trim() : "";
    if (!safe) return;
    try {
      localStorage.setItem(__appRuntimeContext.QUICK_START_SESSION_DATE_KEY, safe);
    } catch (_) {}
  }

  function clearQuickStartSessionDate() {
    try {
      localStorage.removeItem(__appRuntimeContext.QUICK_START_SESSION_DATE_KEY);
    } catch (_) {}
  }

  function getDateSessionSlug() {
    const raw = getQuickStartSessionDate() || getLocalIsoDate();
    const safe = (raw || "").toString().trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(safe) ? safe : getLocalIsoDate();
  }

  function getSessionUploadName() {
    const active = __appRuntimeContext.getActiveEvent();
    if (active && active.name) return active.name;
    const sessionName =
      __appRuntimeContext.getSavedEventTextValue(__appRuntimeContext.activeSessionTextDetails, "name") ||
      __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventNameInput);
    if (sessionName) return sessionName;
    return getDateSessionSlug();
  }

  function getSessionUploadDate() {
    const active = __appRuntimeContext.getActiveEvent();
    if (active && active.date) return active.date;
    const sessionDate =
      __appRuntimeContext.getSavedEventTextValue(__appRuntimeContext.activeSessionTextDetails, "date") ||
      __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventDateInput) ||
      __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventGeneralDateInput);
    if (sessionDate) return sessionDate;
    return getDateSessionSlug();
  }

  function getShowcaseDemoThemeKey(kind) {
    const normalized = (kind || "").toString().trim().toLowerCase();
    const options = __appRuntimeContext.getThemeOptions();
    const candidates = __appRuntimeContext.SHOWCASE_DEMO_THEME_CANDIDATES[normalized] || [];
    const direct = candidates.find((key) =>
      options.some((opt) => opt.value === key)
    );
    if (direct) return direct;
    const inferred = options.find(
      (opt) =>
        __appRuntimeContext.inferThemeEventStyle(opt.value, __appRuntimeContext.resolveThemeByKey(opt.value)) ===
        normalized
    );
    return inferred ? inferred.value : "";
  }

  function updateShowcaseDemoUi() {
    const buttons = Array.from(document.querySelectorAll("[data-demo-theme]"));
    const hasChoices = buttons.some((button) =>
      !!getShowcaseDemoThemeKey(button.dataset.demoTheme)
    );
    if (__appRuntimeContext.DOM.demoThemeBar) __appRuntimeContext.DOM.demoThemeBar.classList.toggle("show", hasChoices);
    buttons.forEach((button) => {
      const key = getShowcaseDemoThemeKey(button.dataset.demoTheme);
      const isActive = !!key && key === __appRuntimeContext.showcaseDemoCurrentKey;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = !key;
    });
  }

  function hasShowcaseDemoChoices() {
    return ["birthday", "general"].some((kind) =>
      !!getShowcaseDemoThemeKey(kind)
    );
  }

  function resolveInitialWelcomeStep() {
    return __appRuntimeContext.showcaseDemoActive && hasShowcaseDemoChoices() ? "demo" : "idle";
  }

  function updateWelcomeFlowUi() {
    const step = __appRuntimeContext.welcomeFlowStep || resolveInitialWelcomeStep();
    if (__appRuntimeContext.DOM.welcomeOverlay) __appRuntimeContext.DOM.welcomeOverlay.dataset.step = step;
    if (__appRuntimeContext.DOM.welcomeDemoStep)
      __appRuntimeContext.DOM.welcomeDemoStep.classList.toggle("hidden", step !== "demo");
    if (__appRuntimeContext.DOM.welcomeIdleStep)
      __appRuntimeContext.DOM.welcomeIdleStep.classList.toggle("hidden", step !== "idle");
    if (__appRuntimeContext.DOM.welcomeModeStep)
      __appRuntimeContext.DOM.welcomeModeStep.classList.toggle("hidden", step !== "mode");
    if (__appRuntimeContext.DOM.welcomeEyebrow) {
      __appRuntimeContext.DOM.welcomeEyebrow.textContent =
        step === "demo"
          ? "Choose your demo"
          : step === "mode"
          ? "Choose your photo style"
          : "";
    }
  }

  function setWelcomeFlowStep(step) {
    __appRuntimeContext.welcomeFlowStep = step || resolveInitialWelcomeStep();
    updateWelcomeFlowUi();
  }

  function disableShowcaseDemo() {
    __appRuntimeContext.showcaseDemoActive = false;
    __appRuntimeContext.showcaseDemoCurrentKey = "";
    updateShowcaseDemoUi();
  }

  function applyShowcaseDemoTheme(kind) {
    const themeKey = getShowcaseDemoThemeKey(kind);
    if (!themeKey) return false;
    __appRuntimeContext.showcaseDemoActive = true;
    __appRuntimeContext.showcaseDemoCurrentKey = themeKey;
    __appRuntimeContext.setActiveEventId("");
    if (__appRuntimeContext.DOM.eventProfileSelect) __appRuntimeContext.DOM.eventProfileSelect.value = "";
    setQuickStartSessionDate(getLocalIsoDate());
    __appRuntimeContext.setEventSelection(themeKey);
    __appRuntimeContext.loadTheme(themeKey);
    __appRuntimeContext.syncEventInputsFromActive();
    __appRuntimeContext.updateEventOverridesSummary();
    __appRuntimeContext.updateStylePreview();
    updateShowcaseDemoUi();
    return true;
  }

  function startShowcaseDemo() {
    const order = ["birthday", "general"];
    const kind = order.find((entry) => !!getShowcaseDemoThemeKey(entry));
    if (!kind) return;
    if (!applyShowcaseDemoTheme(kind)) return;
    __appRuntimeContext.showToast("Demo showcase ready.");
    __appRuntimeContext.startBooth({ preserveSession: true });
  }

  function cycleShowcaseDemoTheme() {
    if (!__appRuntimeContext.showcaseDemoActive) return false;
    const order = ["birthday", "general"];
    const currentKind = __appRuntimeContext.inferThemeEventStyle(
      __appRuntimeContext.showcaseDemoCurrentKey,
      __appRuntimeContext.resolveThemeByKey(__appRuntimeContext.showcaseDemoCurrentKey)
    );
    const currentIndex = Math.max(0, order.indexOf(currentKind));
    for (let offset = 1; offset <= order.length; offset += 1) {
      const nextKind = order[(currentIndex + offset) % order.length];
      if (applyShowcaseDemoTheme(nextKind)) return true;
    }
    return false;
  }

  function getThemeFavorites() {
    try {
      const raw = JSON.parse(
        localStorage.getItem(__appRuntimeContext.THEME_FAVORITES_STORAGE_KEY) || "[]"
      );
      if (!Array.isArray(raw)) return new Set();
      return new Set(raw.filter((value) => typeof value === "string" && value));
    } catch (_) {
      return new Set();
    }
  }

  function setThemeFavorites(favorites) {
    const list = Array.from(favorites || []).filter(
      (value) => typeof value === "string" && value
    );
    localStorage.setItem(__appRuntimeContext.THEME_FAVORITES_STORAGE_KEY, JSON.stringify(list));
  }

  function isBuiltinThemeKey(themeKey) {
    if (!themeKey || typeof themeKey !== "string") return false;
    if (!themeKey.includes(":")) return !!__appRuntimeContext.BUILTIN_THEMES[themeKey];
    const [rootKey, leafKey] = themeKey.split(":");
    const group = __appRuntimeContext.BUILTIN_THEMES[rootKey];
    if (!group || typeof group !== "object") return false;
    if (group.themes && group.themes[leafKey]) return true;
    if (group.holidays && group.holidays[leafKey]) return true;
    return false;
  }

  function getThemeTypeForKey(themeKey, favorites = getThemeFavorites()) {
    if (!themeKey) return "standard";
    if (favorites.has(themeKey)) return "favorite";
    return isBuiltinThemeKey(themeKey) ? "standard" : "custom";
  }

  function renderMissingThumbnail(container, src) {
    if (!container) return;
    if (container.classList.contains("asset-library-card")) {
      const media = container.querySelector("img, video");
      if (media) media.remove();
      if (!container.querySelector(".asset-library-preview-fallback")) {
        const fallback = document.createElement("div");
        fallback.className = "asset-library-preview-fallback";
        fallback.textContent = "Preview unavailable";
        container.prepend(fallback);
      }
      return;
    }
    const panel = container.closest("[data-asset-panel]");
    if (panel && panel.dataset.assetPanel) {
      const kind = panel.dataset.assetPanel === "template" ? "template" : "overlay";
      setAssetPanelMessage(
        kind,
        "error",
        kind === "template"
          ? "Couldn’t load template thumbnails."
          : "Couldn’t load overlay thumbnails."
      );
    }
    container.remove();
  }

  function createAssetTile(src, options = {}) {
    const item = document.createElement("div");
    item.className = "asset-item";
    const media = createAssetPreviewMedia(src);
    media.onerror = () => renderMissingThumbnail(item, src);
    item.appendChild(media);
    if (options.badge) {
      const badgeEl = document.createElement("div");
      badgeEl.className = "asset-badge";
      badgeEl.textContent = options.badge;
      item.appendChild(badgeEl);
    }
    return item;
  }

  function getAssetPanelKind(kind) {
    if (kind === "template") return "template";
    if (kind === "background") return "background";
    return "overlay";
  }

  function readAssetPanelState() {
    try {
      const raw = localStorage.getItem(__appRuntimeContext.ASSET_PANEL_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeAssetPanelState(state) {
    try {
      localStorage.setItem(__appRuntimeContext.ASSET_PANEL_STATE_KEY, JSON.stringify(state || {}));
    } catch (_) {}
  }

  function getAssetPanelControls(kind) {
    const resolved = getAssetPanelKind(kind);
    if (resolved === "background") {
      return {
        panel: __appRuntimeContext.DOM.backgroundThumbnailsPanel,
        header: __appRuntimeContext.DOM.backgroundThumbnailsHeader,
        selected: __appRuntimeContext.DOM.backgroundThumbnailsSelected,
        count: __appRuntimeContext.DOM.backgroundThumbnailsCount,
        action: __appRuntimeContext.DOM.backgroundThumbnailsAction,
        body: __appRuntimeContext.DOM.backgroundThumbnailsBody,
        loading: __appRuntimeContext.DOM.backgroundThumbnailsLoading,
        error: __appRuntimeContext.DOM.backgroundThumbnailsError,
      };
    }
    if (resolved === "template") {
      return {
        panel: __appRuntimeContext.DOM.templateThumbnailsPanel,
        header: __appRuntimeContext.DOM.templateThumbnailsHeader,
        selected: __appRuntimeContext.DOM.templateThumbnailsSelected,
        count: __appRuntimeContext.DOM.templateThumbnailsCount,
        action: __appRuntimeContext.DOM.templateThumbnailsAction,
        body: __appRuntimeContext.DOM.templateThumbnailsBody,
        loading: __appRuntimeContext.DOM.templateThumbnailsLoading,
        error: __appRuntimeContext.DOM.templateThumbnailsError,
      };
    }
    return {
      panel: __appRuntimeContext.DOM.overlayThumbnailsPanel,
      header: __appRuntimeContext.DOM.overlayThumbnailsHeader,
      selected: __appRuntimeContext.DOM.overlayThumbnailsSelected,
      count: __appRuntimeContext.DOM.overlayThumbnailsCount,
      action: __appRuntimeContext.DOM.overlayThumbnailsAction,
      body: __appRuntimeContext.DOM.overlayThumbnailsBody,
      loading: __appRuntimeContext.DOM.overlayThumbnailsLoading,
      error: __appRuntimeContext.DOM.overlayThumbnailsError,
    };
  }

  function normalizeAssetDisplayName(value, fallback = "None") {
    const raw =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
        ? value.name || value.id || value.src || ""
        : "";
    const trimmed = raw.toString().trim();
    if (!trimmed) return fallback;
    const cleaned = trimmed.split("?")[0].split("#")[0];
    const fileName = cleaned.split("/").pop() || cleaned;
    return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || fallback;
  }

  function getAssetEntrySrc(entry) {
    const value = String(
      typeof entry === "string"
        ? entry
        : entry && (entry.src || entry.url || entry.secure_url || "")
    ).trim();
    return ["[object Object]", "undefined", "null"].includes(value)
      ? ""
      : value;
  }

  function isVideoAsset(entry) {
    if (!entry) return false;
    const contentType =
      typeof entry === "object"
        ? String(entry.contentType || entry.type || "").toLowerCase()
        : "";
    if (contentType.startsWith("video/")) return true;
    const src = getAssetEntrySrc(entry);
    if (!src) return false;
    const clean = src.split("#")[0].split("?")[0].toLowerCase();
    return (
      clean.startsWith("data:video/") ||
      clean.includes("/video/upload/") ||
      /\.(mp4|webm|mov|m4v|ogv|ogg)$/.test(clean)
    );
  }

  function createAssetPreviewMedia(entry, alt = "") {
    const source = getAssetEntrySrc(entry);
    const previewSrc = isVideoAsset(entry)
      ? __appRuntimeContext.getVideoPreviewPosterSrc(entry, source)
      : getAssetPreviewSrc(source);
    const img = document.createElement("img");
    img.src = withBust(__appRuntimeContext.resolvePreviewAssetSrc(previewSrc, window.location.href));
    img.alt = alt;
    img.loading = "lazy";
    img.decoding = "async";
    return img;
  }

  function getAssetPreviewSrc(src) {
    const value = String(src || "");
    if (!/^\/assets\//.test(value) || /\.svg(?:$|[?#])/i.test(value)) {
      return __appRuntimeContext.resolvePreviewAssetSrc(value, window.location.href);
    }
    return __appRuntimeContext.resolvePreviewAssetSrc(
      value.replace(/\.(png|jpe?g|webp)(?=($|[?#]))/i, ".thumb.webp"),
      window.location.href
    );
  }

  function createAssetSelectionSet(value) {
    if (value instanceof Set) return value;
    const source = Array.isArray(value) ? value : value ? [value] : [];
    return new Set(source.map(getAssetEntrySrc).filter(Boolean));
  }

  function getSessionAssignedAssetEntries(category = "") {
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    if (normalized === "background") {
      return Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
        ? __appRuntimeContext.activeSessionAssets.backgrounds.map(getAssetEntrySrc).filter(Boolean)
        : [];
    }
    if (normalized === "overlay") {
      return Array.isArray(__appRuntimeContext.activeSessionAssets.overlays)
        ? __appRuntimeContext.activeSessionAssets.overlays
            .map((entry) => {
              const src = getAssetEntrySrc(entry);
              if (!src) return null;
              return typeof entry === "object" ? entry : { src, __session: true };
            })
            .filter(Boolean)
        : [];
    }
    if (normalized === "template") {
      return Array.isArray(__appRuntimeContext.activeSessionAssets.templates)
        ? __appRuntimeContext.activeSessionAssets.templates
            .map((entry) => {
              const src = getAssetEntrySrc(entry);
              if (!src) return null;
              return typeof entry === "object"
                ? entry
                : { src, layout: "double_column", __session: true };
            })
            .filter(Boolean)
        : [];
    }
    return [];
  }

  function getSessionAssignedAssetSourceSet(category = "") {
    return createAssetSelectionSet(getSessionAssignedAssetEntries(category));
  }

  function discardStaleSessionLibraryAssets() {
    const canonicalSources = {
      background: new Set(__appRuntimeContext.getCanonicalAssetCollection("background").map((asset) => asset.url)),
      overlay: new Set(__appRuntimeContext.getCanonicalAssetCollection("overlay").map((asset) => asset.url)),
      template: new Set(__appRuntimeContext.getCanonicalAssetCollection("template").map((asset) => asset.url)),
    };
    __appRuntimeContext.activeSessionAssets.backgrounds = (Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
      ? __appRuntimeContext.activeSessionAssets.backgrounds
      : [])
      .filter((entry) => canonicalSources.background.has(getAssetEntrySrc(entry)))
      .slice(0, 1);
    __appRuntimeContext.activeSessionAssets.backgroundIndex = 0;
    __appRuntimeContext.activeSessionAssets.overlays = (Array.isArray(__appRuntimeContext.activeSessionAssets.overlays)
      ? __appRuntimeContext.activeSessionAssets.overlays
      : []).filter((entry) => canonicalSources.overlay.has(getAssetEntrySrc(entry)));
    __appRuntimeContext.activeSessionAssets.templates = (Array.isArray(__appRuntimeContext.activeSessionAssets.templates)
      ? __appRuntimeContext.activeSessionAssets.templates
      : []).filter((entry) => canonicalSources.template.has(getAssetEntrySrc(entry)));
    // Keep removal tombstones even after an asset is deleted from the library.
    // Event/theme assignments can still reference the old source and would
    // otherwise reappear in the selected count on the next render.
  }

  function getSessionEffectiveAssetSourceSet(category = "") {
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    discardStaleSessionLibraryAssets();
    const theme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
    if (normalized === "background") {
      const activeBackground = __appRuntimeContext.getActiveBackground(theme);
      return new Set(activeBackground ? [activeBackground] : []);
    }
    if (normalized === "overlay") {
      return new Set(
        __appRuntimeContext.getAssignedOverlayList(theme)
          .map((o) => (o && o.src ? o.src : null))
          .filter(Boolean)
      );
    }
    if (normalized === "idle-screen") {
      const orientation = __appRuntimeContext.getGuestScreenOrientation();
      const active = __appRuntimeContext.getActiveEvent();
      const overrides = active ? __appRuntimeContext.ensureEventOverrides(active) : {};
      const sessionEntries = Array.isArray(__appRuntimeContext.activeSessionAssets.idleScreens)
        ? __appRuntimeContext.activeSessionAssets.idleScreens
        : [];
      const assignedEntries = sessionEntries.length
        ? sessionEntries
        : Array.isArray(overrides.idleScreens) && overrides.idleScreens.length
        ? overrides.idleScreens
        : [];
      const themeEntries = Array.isArray(theme && theme.idleScreens)
        ? theme.idleScreens
        : [];
      const findRole = (entries, role) =>
        entries.find(
          (entry) =>
            (entry && entry.role === "photo-choice"
              ? "photo-choice"
              : "idle") === role &&
            __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) ===
              orientation
        );
      return new Set(
        ["idle", "photo-choice"]
          .map((role) =>
            getAssetEntrySrc(
              findRole(assignedEntries, role) || findRole(themeEntries, role)
            )
          )
          .filter(Boolean)
      );
    }
    if (normalized === "template") {
      return new Set(
        __appRuntimeContext.getTemplateList(theme)
          .map((t) => (t && t.src ? t.src : null))
          .filter(Boolean)
      );
    }
    return new Set();
  }

  function syncAssetPanelHeader(kind, list = [], selectedValue = "") {
    const controls = getAssetPanelControls(kind);
    const resolved = getAssetPanelKind(kind);
    const count = Array.isArray(list) ? list.length : 0;
    const noun =
      resolved === "template"
        ? "template"
        : resolved === "background"
        ? "background"
        : "overlay";
    const selectedText = !count
      ? `No ${noun}s assigned yet`
      : `${count} ${noun}${count === 1 ? "" : "s"} assigned`;
    if (controls.selected) {
      controls.selected.textContent = selectedText;
    }
    if (controls.count && controls.count !== controls.selected) {
      controls.count.textContent = `${count} ${noun}${count === 1 ? "" : "s"}`;
    }
    if (controls.action) {
      const isOpen = !!(controls.panel && controls.panel.classList.contains("open"));
      controls.action.textContent = isOpen ? "Hide" : "View all";
    }
  }

  function setAssetPanelMessage(kind, state, message) {
    const controls = getAssetPanelControls(kind);
    if (controls.loading) controls.loading.classList.add("hidden");
    if (controls.error) controls.error.classList.add("hidden");
    if (!state) return;
    const target = state === "loading" ? controls.loading : controls.error;
    if (!target) return;
    target.textContent = message || target.textContent;
    target.classList.remove("hidden");
  }

  function setAssetPanelOpen(kind, open, options = {}) {
    const controls = getAssetPanelControls(kind);
    if (!controls.panel || !controls.header) return;
    const resolved = getAssetPanelKind(kind);
    controls.panel.classList.toggle("open", !!open);
    controls.header.setAttribute("aria-expanded", !!open ? "true" : "false");
    if (controls.action) controls.action.textContent = open ? "Hide" : "View all";
    if (options.persist !== false) {
      const state = readAssetPanelState();
      state[resolved] = !!open;
      writeAssetPanelState(state);
    }
    if (open && __appRuntimeContext.activeTheme) {
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    }
  }

  function restoreAssetPanelState() {
    const state = readAssetPanelState();
    ["background", "overlay", "template"].forEach((kind) => {
      setAssetPanelOpen(kind, !!state[getAssetPanelKind(kind)], {
        persist: false,
      });
    });
  }

  function setupAssetPanelControls() {
    const bind = (kind) => {
      const controls = getAssetPanelControls(kind);
      if (!controls.header) return;
      controls.header.addEventListener("click", () => {
        const next = !controls.panel.classList.contains("open");
        setAssetPanelOpen(kind, next);
      });
    };
    bind("overlay");
    bind("template");
    restoreAssetPanelState();

    const assetLibraryPanel = document.getElementById(
      "uploaded" + "AssetLibraryPanel"
    );
    if (assetLibraryPanel) {
      assetLibraryPanel.addEventListener("toggle", () => {
        if (assetLibraryPanel.open) __appRuntimeContext.renderAssetLibrary();
      });
    }
    const advancedAssetsPanel = __appRuntimeContext.DOM.currentAssets
      ? __appRuntimeContext.DOM.currentAssets.closest("details")
      : null;
    if (advancedAssetsPanel) {
      advancedAssetsPanel.addEventListener("toggle", () => {
        if (advancedAssetsPanel.open) {
          __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
        }
      });
    }
  }

  function resetIdleTimer() {
    if (isBoothTestMode()) return;
    clearTimeout(__appRuntimeContext.idleTimer);
    __appRuntimeContext.idleTimer = setTimeout(() => {
      __appRuntimeContext.hideFinal();
      cycleShowcaseDemoTheme();
      __appRuntimeContext.showWelcome();
    }, __appRuntimeContext.IDLE_TIMEOUT_MS);
  }

  return {
    getUrlParam,
    isBoothTestMode,
    getBoothQaState,
    getAssetPickerFilename,
    getAssetPickerVisibleLimit,
    withBust,
    getLocalIsoDate,
    getLastThemeKey,
    setLastThemeKey,
    getQuickStartSessionDate,
    setQuickStartSessionDate,
    clearQuickStartSessionDate,
    getDateSessionSlug,
    getSessionUploadName,
    getSessionUploadDate,
    getShowcaseDemoThemeKey,
    updateShowcaseDemoUi,
    hasShowcaseDemoChoices,
    resolveInitialWelcomeStep,
    updateWelcomeFlowUi,
    setWelcomeFlowStep,
    disableShowcaseDemo,
    applyShowcaseDemoTheme,
    startShowcaseDemo,
    cycleShowcaseDemoTheme,
    getThemeFavorites,
    setThemeFavorites,
    isBuiltinThemeKey,
    getThemeTypeForKey,
    renderMissingThumbnail,
    createAssetTile,
    getAssetPanelKind,
    readAssetPanelState,
    writeAssetPanelState,
    getAssetPanelControls,
    normalizeAssetDisplayName,
    getAssetEntrySrc,
    isVideoAsset,
    createAssetPreviewMedia,
    getAssetPreviewSrc,
    createAssetSelectionSet,
    getSessionAssignedAssetEntries,
    getSessionAssignedAssetSourceSet,
    discardStaleSessionLibraryAssets,
    getSessionEffectiveAssetSourceSet,
    syncAssetPanelHeader,
    setAssetPanelMessage,
    setAssetPanelOpen,
    restoreAssetPanelState,
    setupAssetPanelControls,
    resetIdleTimer,
  };
}
