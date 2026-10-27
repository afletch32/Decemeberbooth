export function createOperationsModule(__appRuntimeContext) {
  function removeBackground() {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const eventList = Array.isArray(overrides.backgrounds)
      ? overrides.backgrounds.filter(Boolean)
      : [];
    const selected = getActiveBackground(t);
    if (selected && eventList.includes(selected)) {
      const idx = eventList.indexOf(selected);
      overrides.backgrounds.splice(idx, 1);
      if (overrides.backgroundIndex >= overrides.backgrounds.length)
        overrides.backgroundIndex = 0;
      __appRuntimeContext.updateActiveEventDetails({ overrides });
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      __appRuntimeContext.showToast("Event background removed");
      return;
    }
    if (!selected) return;
    const themeSources = getThemeAssetSourceSet("background", t);
    if (themeSources.has(selected)) {
      removeSessionAssetBySrc("background", selected);
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.renderAssetLibrary();
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      __appRuntimeContext.showToast("Session background removed");
      return;
    }
    __appRuntimeContext.scheduleLocalAssetCleanup(selected);
    __appRuntimeContext.showToast("Background removed");
  }

  function removeBackgroundAt(index) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const eventList = Array.isArray(overrides.backgrounds)
      ? overrides.backgrounds.filter(Boolean)
      : [];
    const combined = getBackgroundList(t).filter(Boolean);
    if (index < 0 || index >= combined.length) return;
    const selected = combined[index];
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
      ? __appRuntimeContext.activeSessionAssets.backgrounds.filter(Boolean)
      : [];
    if (sessionList.includes(selected) || getThemeAssetSourceSet("background", t).has(selected)) {
      removeSessionAssetBySrc("background", selected);
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      __appRuntimeContext.showToast("Session background removed");
      return;
    }
    if (eventList.includes(selected)) {
      const removeIdx = eventList.indexOf(selected);
      overrides.backgrounds.splice(removeIdx, 1);
      if (overrides.backgroundIndex >= overrides.backgrounds.length)
        overrides.backgroundIndex = 0;
      __appRuntimeContext.updateActiveEventDetails({ overrides });
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      __appRuntimeContext.showToast("Event background removed");
      return;
    }
    const baseList = getBaseBackgroundList(t);
    const baseIndex = baseList.indexOf(selected);
    if (baseIndex < 0) return;
    if (!Array.isArray(t.backgrounds)) t.backgrounds = baseList.slice();
    if (t.backgrounds[baseIndex])
      pushRemoved(key, "background", t.backgrounds[baseIndex], baseIndex);
    t.backgrounds.splice(baseIndex, 1);
    if (t.backgrounds.length === 0) {
      t.background = "";
      delete t.backgrounds;
      delete t.backgroundIndex;
    } else {
      if (typeof t.backgroundIndex !== "number") t.backgroundIndex = 0;
      if (baseIndex <= t.backgroundIndex)
        t.backgroundIndex = Math.max(0, t.backgroundIndex - 1);
      t.background = t.backgrounds[t.backgroundIndex] || "";
    }
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.scheduleLocalAssetCleanup(selected);
  }

  function setBackgroundIndex(index) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
      ? __appRuntimeContext.activeSessionAssets.backgrounds.filter(Boolean)
      : [];
    const eventList = Array.isArray(overrides.backgrounds)
      ? overrides.backgrounds.filter(Boolean)
      : [];
    const baseList = getBaseBackgroundList(t);
    const combined = __appRuntimeContext.mergeUniqueUrls(sessionList, __appRuntimeContext.mergeUniqueUrls(eventList, baseList));
    if (index < 0 || index >= combined.length) return;
    const selected = combined[index];
    const sessionIndex = sessionList.indexOf(selected);
    if (sessionIndex >= 0) {
      __appRuntimeContext.activeSessionAssets.backgroundIndex = sessionIndex;
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.showToast("Session background selected");
      return;
    }
    const eventIndex = eventList.indexOf(selected);
    if (eventIndex >= 0) {
      overrides.backgroundIndex = eventIndex;
      delete overrides.useBaseBackgroundIndex;
      __appRuntimeContext.updateActiveEventDetails({ overrides });
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.showToast("Event background selected");
      return;
    }
    const baseIndex = baseList.indexOf(selected);
    if (baseIndex < 0) return;
    if (eventList.length) {
      overrides.useBaseBackgroundIndex = baseIndex;
      __appRuntimeContext.updateActiveEventDetails({ overrides });
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
      __appRuntimeContext.showToast("Background selected");
      return;
    }
    t.backgrounds = baseList.slice();
    t.background = t.backgrounds[baseIndex] || "";
    t.backgroundIndex = baseIndex;
    // Refresh live booth background immediately when editing the active theme
    if (__appRuntimeContext.activeTheme === t) {
      __appRuntimeContext.applyThemeBackground(t);
      __appRuntimeContext.renderCurrentAssets(t);
    }
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.showToast("Background selected");
  }

  function removeLogo() {
    const key = __appRuntimeContext.getSelectedThemeKey();
    if (!key) {
      alert("Select a theme first.");
      return;
    }
    const currentLogo = __appRuntimeContext.getGlobalLogo();
    if (!currentLogo) {
      __appRuntimeContext.showToast("No shared logo to remove");
      return;
    }
    pushRemoved(key, "logo", currentLogo, 0);
    __appRuntimeContext.setGlobalLogo("", { quiet: true, skipSave: true });
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.scheduleLocalAssetCleanup(currentLogo);
    __appRuntimeContext.showToast("Logo removed from all themes");
  }

  function removeOverlay(index) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const list = getEffectiveOverlayList(t);
    const removed = list[index];
    const src = __appRuntimeContext.getAssetEntrySrc(removed);
    if (!src) return;
    if (
      Array.isArray(__appRuntimeContext.activeSessionAssets.overlays) &&
      __appRuntimeContext.activeSessionAssets.overlays.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src)
    ) {
      removeSessionAssetBySrc("overlay", src);
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderAssetLibrary();
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(src);
      __appRuntimeContext.showToast("Session overlay removed");
      return;
    }
    if (getThemeAssetSourceSet("overlay", t).has(src)) {
      addSessionRemovedAsset("overlay", src);
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderAssetLibrary();
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(src);
      __appRuntimeContext.showToast("Session overlay removed");
      return;
    }
    if (!Array.isArray(t.overlays)) return;
    const localIndex = t.overlays.findIndex(
      (item) => (typeof item === "string" ? item : item && item.src) === src
    );
    if (localIndex < 0) return;
    const removedLocal = t.overlays.splice(localIndex, 1)[0];
    pushRemoved(key, "overlay", removedLocal, localIndex);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Overlay removed");
  }

  function removeTemplate(index) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const list = getEffectiveTemplateList(t);
    const removed = list[index];
    const src = __appRuntimeContext.getAssetEntrySrc(removed);
    if (!src) return;
    if (
      Array.isArray(__appRuntimeContext.activeSessionAssets.templates) &&
      __appRuntimeContext.activeSessionAssets.templates.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src)
    ) {
      removeSessionAssetBySrc("template", src);
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderAssetLibrary();
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(src);
      __appRuntimeContext.showToast("Session template removed");
      return;
    }
    if (getThemeAssetSourceSet("template", t).has(src)) {
      addSessionRemovedAsset("template", src);
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderAssetLibrary();
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(src);
      __appRuntimeContext.showToast("Session template removed");
      return;
    }
    if (!Array.isArray(t.templates)) return;
    const localIndex = t.templates.findIndex(
      (item) => (typeof item === "string" ? item : item && item.src) === src
    );
    if (localIndex < 0) return;
    const removedLocal = t.templates.splice(localIndex, 1)[0];
    pushRemoved(key, "template", removedLocal, localIndex);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Template removed");
  }

  function removeEventOverlay(src) {
    const active = __appRuntimeContext.getActiveEvent();
    if (!active) return;
    const overrides = __appRuntimeContext.ensureEventOverrides(active);
    overrides.overlays = overrides.overlays.filter((item) => item !== src);
    __appRuntimeContext.updateActiveEventDetails({ overrides });
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Event overlay removed");
  }

  function removeEventTemplate(src) {
    const active = __appRuntimeContext.getActiveEvent();
    if (!active) return;
    const overrides = __appRuntimeContext.ensureEventOverrides(active);
    overrides.templates = overrides.templates.filter((item) =>
      typeof item === "string" ? item !== src : item && item.src !== src
    );
    __appRuntimeContext.updateActiveEventDetails({ overrides });
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Event template removed");
  }

  function getThemeAssetSourceSet(kind, theme) {
    const target = theme && typeof theme === "object" ? theme : null;
    if (kind === "background") {
      return new Set(getSelectedBackgroundSourceList(target));
    }
    if (kind === "overlay") {
      return new Set(
        getBaseOverlayList(target)
          .map((item) => __appRuntimeContext.getAssetEntrySrc(item))
          .filter(Boolean)
      );
    }
    if (kind === "template") {
      return new Set(
        getBaseTemplateList(target)
          .map((item) => __appRuntimeContext.getAssetEntrySrc(item))
          .filter(Boolean)
      );
    }
    return new Set();
  }

  function getEventAssetSourceSet(kind) {
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(kind);
    if (normalized === "background") {
      return __appRuntimeContext.createAssetSelectionSet(overrides.backgrounds);
    }
    if (normalized === "overlay") {
      return __appRuntimeContext.createAssetSelectionSet(overrides.overlays);
    }
    if (normalized === "template") {
      return __appRuntimeContext.createAssetSelectionSet(overrides.templates);
    }
    if (normalized === "idle-screen") {
      return __appRuntimeContext.createAssetSelectionSet(overrides.idleScreens);
    }
    return new Set();
  }

  function removeSessionAssetBySrc(kind, src) {
    const cleanSrc = __appRuntimeContext.getAssetEntrySrc(src);
    if (!cleanSrc) return;
    const baseTheme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
    const themeSources = getThemeAssetSourceSet(kind, baseTheme);
    if (kind === "background") {
      __appRuntimeContext.activeSessionAssets.backgrounds = __appRuntimeContext.activeSessionAssets.backgrounds.filter(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) !== cleanSrc
      );
      if (
        __appRuntimeContext.activeSessionAssets.backgroundIndex >= __appRuntimeContext.activeSessionAssets.backgrounds.length
      ) {
        __appRuntimeContext.activeSessionAssets.backgroundIndex = Math.max(
          0,
          __appRuntimeContext.activeSessionAssets.backgrounds.length - 1
        );
      }
    } else if (kind === "overlay") {
      __appRuntimeContext.activeSessionAssets.overlays = __appRuntimeContext.activeSessionAssets.overlays.filter(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) !== cleanSrc
      );
    } else if (kind === "template") {
      __appRuntimeContext.activeSessionAssets.templates = __appRuntimeContext.activeSessionAssets.templates.filter(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) !== cleanSrc
      );
    } else if (kind === "idle-screen") {
      const active = __appRuntimeContext.getActiveEvent();
      if (active) {
        const overrides = __appRuntimeContext.ensureEventOverrides(active);
        overrides.idleScreens = (Array.isArray(overrides.idleScreens)
          ? overrides.idleScreens
          : []
        ).filter((item) => __appRuntimeContext.getAssetEntrySrc(item) !== cleanSrc);
        __appRuntimeContext.updateActiveEventDetails({ overrides });
      } else {
        __appRuntimeContext.activeSessionAssets.idleScreens = (
          Array.isArray(__appRuntimeContext.activeSessionAssets.idleScreens)
            ? __appRuntimeContext.activeSessionAssets.idleScreens
            : []
        ).filter((item) => __appRuntimeContext.getAssetEntrySrc(item) !== cleanSrc);
      }
    }
    const eventSources = getEventAssetSourceSet(kind);
    if (themeSources.has(cleanSrc) || eventSources.has(cleanSrc))
      addSessionRemovedAsset(kind, cleanSrc);
    else clearSessionRemovedAsset(kind, cleanSrc);
  }

  function removeSessionOverlay(src) {
    removeSessionAssetBySrc("overlay", src);
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Session overlay removed");
  }

  function removeSessionBackground(src) {
    removeSessionAssetBySrc("background", src);
    __appRuntimeContext.applyThemeBackground(__appRuntimeContext.activeTheme);
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Session background removed");
  }

  function removeSessionTemplate(src) {
    removeSessionAssetBySrc("template", src);
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.scheduleLocalAssetCleanup(src);
    __appRuntimeContext.showToast("Session template removed");
  }

  function removeFolderOverlay(src) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    if (!Array.isArray(t.overlaysRemoved)) t.overlaysRemoved = [];
    if (!t.overlaysRemoved.includes(src)) t.overlaysRemoved.push(src);
    pushRemoved(key, "overlay-removed", src, -1);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.showToast("Overlay hidden");
  }

  function removeFolderBackground(src) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    if (!Array.isArray(t.backgroundsRemoved)) t.backgroundsRemoved = [];
    if (!t.backgroundsRemoved.includes(src)) t.backgroundsRemoved.push(src);
    pushRemoved(key, "background-removed", src, -1);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.showToast("Background hidden");
  }

  function removeFolderTemplate(src) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    if (!Array.isArray(t.templatesRemoved)) t.templatesRemoved = [];
    if (!t.templatesRemoved.includes(src)) t.templatesRemoved.push(src);
    pushRemoved(key, "template-removed", src, -1);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.showToast("Template hidden");
  }

  function reorderAssets(kind, from, to) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const t = __appRuntimeContext.getSelectedThemeTarget();
    if (!t) return;
    const arr = kind === "overlay" ? t.overlays : t.templates;
    if (!Array.isArray(arr)) return;
    const len = arr.length;
    if (from < 0 || from >= len || to < 0 || to >= len) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.showToast("Order updated");
  }

  function pushRemoved(key, kind, item, index) {
    __appRuntimeContext.removedStack.push({ key, kind, item, index });
    updateUndoUI();
  }

  function updateUndoUI() {
    const btn = document.getElementById("undoBtn");
    const count = document.getElementById("undoCount");
    if (btn) btn.disabled = __appRuntimeContext.removedStack.length === 0;
    if (count)
      count.textContent = __appRuntimeContext.removedStack.length ? `(${__appRuntimeContext.removedStack.length})` : "";
  }

  function getThemeByKey(key) {
    if (!key) return null;
    if (key.includes(":")) {
      const [rootKey, subKey] = key.split(":");
      const root = __appRuntimeContext.themes[rootKey];
      if (!root) return null;
      if (root.themes && root.themes[subKey]) return root.themes[subKey];
      if (root.holidays && root.holidays[subKey]) return root.holidays[subKey];
      return null;
    }
    return __appRuntimeContext.themes[key] || null;
  }

  function undoLastRemoval() {
    const last = __appRuntimeContext.removedStack.pop();
    if (!last) return;
    if (last.kind === "logo") {
      __appRuntimeContext.setGlobalLogo(last.item || "", { quiet: true, skipSave: true });
    }
    const t = getThemeByKey(last.key);
    if (!t && last.kind !== "logo") {
      updateUndoUI();
      return;
    }
    if (last.kind === "background" && t) t.background = last.item;
    else if (last.kind === "overlay") {
      if (!Array.isArray(t.overlays)) t.overlays = [];
      const pos = Math.min(last.index, t.overlays.length);
      t.overlays.splice(pos, 0, last.item);
    } else if (last.kind === "template") {
      if (!Array.isArray(t.templates)) t.templates = [];
      const pos = Math.min(last.index, t.templates.length);
      t.templates.splice(pos, 0, last.item);
    } else if (last.kind === "overlay-removed") {
      if (Array.isArray(t.overlaysRemoved))
        t.overlaysRemoved = t.overlaysRemoved.filter((s) => s !== last.item);
    } else if (last.kind === "template-removed") {
      if (Array.isArray(t.templatesRemoved))
        t.templatesRemoved = t.templatesRemoved.filter((s) => s !== last.item);
    } else if (last.kind === "background-removed") {
      if (Array.isArray(t.backgroundsRemoved))
        t.backgroundsRemoved = t.backgroundsRemoved.filter(
          (s) => s !== last.item
        );
    }
    __appRuntimeContext.saveThemesToStorage();
    if (__appRuntimeContext.getSelectedThemeKey() === last.key) {
      __appRuntimeContext.loadTheme(last.key);
    }
    updateUndoUI();
    __appRuntimeContext.showToast("Restored");
  }

  function getBaseBackgroundList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const removed = new Set(
      Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
    );
    const explicit = Array.isArray(theme.backgrounds)
      ? theme.backgrounds.filter((src) => src && !removed.has(src))
      : [];
    if (explicit.length) return __appRuntimeContext.mergeUniqueUrls(explicit);
    const fallback =
      typeof theme.background === "string" && theme.background.trim()
        ? [theme.background]
        : [];
    return fallback.filter((src) => src && !removed.has(src));
  }

  function getSelectedBackgroundSourceList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const removed = new Set(
      Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
    );
    const explicit = Array.isArray(theme.backgrounds)
      ? theme.backgrounds.filter((src) => src && !removed.has(src))
      : [];
    const uniqueExplicit = __appRuntimeContext.mergeUniqueUrls(explicit);
    if (uniqueExplicit.length) {
      const catalog = getThemeBackgroundCatalogList(theme);
      const globalCatalog = getAllThemeBackgroundCatalogList();
      if (
        isCompleteBackgroundCatalogSelection(uniqueExplicit, catalog) ||
        isCompleteBackgroundCatalogSelection(uniqueExplicit, globalCatalog)
      )
        return [];
      return uniqueExplicit;
    }
    const fallback =
      typeof theme.background === "string" ? theme.background.trim() : "";
    if (!fallback || fallback.endsWith("/") || removed.has(fallback)) return [];
    return [fallback];
  }

  function isCompleteBackgroundCatalogSelection(sources, catalog) {
   const selected = new Set(Array.isArray(sources) ? sources : []);
    const catalogSet = catalog instanceof Set ? catalog : new Set(catalog || []);
    return (
      selected.size > 0 &&
      selected.size === catalogSet.size &&
      Array.isArray(sources) &&
      sources.length === selected.size &&
      [...catalogSet].every((src) => selected.has(src))
    );
  }

  function getEffectiveSelectedBackgroundList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
      ? __appRuntimeContext.activeSessionAssets.backgrounds.filter(Boolean)
      : [];
    if (sessionList.length) return __appRuntimeContext.mergeUniqueUrls(sessionList).slice(0, 1);
    const removed = new Set(__appRuntimeContext.sessionRemovedBackgrounds.map(__appRuntimeContext.getAssetEntrySrc));
    return getSelectedBackgroundSourceList(theme)
      .filter((src) => !removed.has(src))
      .slice(0, 1);
  }

  function getBackgroundList(theme) {
    const baseList = getEffectiveBackgroundList(theme);
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const removed = getSessionRemovedAssetSourceSet("background");
    const eventList = Array.isArray(overrides.backgrounds)
      ? overrides.backgrounds.filter(
          (entry) => entry && !removed.has(__appRuntimeContext.getAssetEntrySrc(entry))
        )
      : [];
    return __appRuntimeContext.mergeUniqueUrls(baseList, eventList);
  }

  function getThemeBackgroundCatalogList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const removed = new Set(
      Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : []
    );
    const explicit = Array.isArray(theme.backgrounds)
      ? theme.backgrounds.filter(Boolean)
      : [];
    const single =
      typeof theme.background === "string" &&
      theme.background.trim() &&
      !theme.background.trim().endsWith("/")
        ? [theme.background.trim()]
        : [];
    return __appRuntimeContext.mergeUniqueUrls([...explicit, ...single], [])
      .filter((src) => src && !src.endsWith("/") && !removed.has(src));
  }

  function getAllThemeBackgroundCatalogList() {
    return __appRuntimeContext.getCanonicalAssetCollection("background").map((asset) => asset.url);
  }

  function getSessionBackgroundPickerList(theme) {
    return __appRuntimeContext.mergeUniqueUrls(
      getBackgroundList(theme),
      __appRuntimeContext.getCanonicalAssetCollection("background").map((asset) => asset.url)
    );
  }

  function getGreenBackgroundList(theme) {
    const baseList = Array.isArray(theme && theme.greenBackgrounds)
      ? theme.greenBackgrounds.filter(Boolean)
      : [];
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.greenBackgrounds)
      ? __appRuntimeContext.activeSessionAssets.greenBackgrounds.filter(Boolean)
      : [];
    const eventList = Array.isArray(overrides.greenBackgrounds)
      ? overrides.greenBackgrounds.filter(Boolean)
      : [];
    return __appRuntimeContext.mergeUniqueUrls(sessionList, __appRuntimeContext.mergeUniqueUrls(eventList, baseList));
  }

  function getActiveBackground(theme) {
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const baseList = getEffectiveBackgroundList(theme);
    if (
      Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds) &&
      __appRuntimeContext.activeSessionAssets.backgrounds.length
    ) {
      const idx =
        typeof __appRuntimeContext.activeSessionAssets.backgroundIndex === "number"
          ? Math.min(
              Math.max(__appRuntimeContext.activeSessionAssets.backgroundIndex, 0),
              __appRuntimeContext.activeSessionAssets.backgrounds.length - 1
            )
          : 0;
      return __appRuntimeContext.activeSessionAssets.backgrounds[idx];
    }
    if (Number.isFinite(overrides.useBaseBackgroundIndex)) {
      const idx = Math.min(
        Math.max(overrides.useBaseBackgroundIndex, 0),
        baseList.length - 1
      );
      return baseList[idx] || "";
    }
    if (Array.isArray(overrides.backgrounds) && overrides.backgrounds.length) {
      const idx =
        typeof overrides.backgroundIndex === "number"
          ? Math.min(
              Math.max(overrides.backgroundIndex, 0),
              overrides.backgrounds.length - 1
            )
          : 0;
      return overrides.backgrounds[idx];
    }
    if (baseList.length === 0) return "";
    const orientation = __appRuntimeContext.getGuestScreenOrientation();
    const orientationMatch = baseList.find((entry) => {
      const src = __appRuntimeContext.getAssetEntrySrc(entry).toLowerCase();
      return src.includes(`-${orientation}.`) || src.includes(`-${orientation}-`);
    });
    if (orientationMatch) return orientationMatch;
    const idx =
      typeof theme.backgroundIndex === "number"
        ? Math.min(Math.max(theme.backgroundIndex, 0), baseList.length - 1)
        : 0;
    return baseList[idx];
  }

  function setGreenBackgroundIndex(idx) {
    const active = __appRuntimeContext.getActiveEvent();
    const target = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
    if (!target) return;
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.greenBackgrounds)
      ? __appRuntimeContext.activeSessionAssets.greenBackgrounds.filter(Boolean)
      : [];
    const eventList = Array.isArray(overrides.greenBackgrounds)
      ? overrides.greenBackgrounds.filter(Boolean)
      : [];
    const baseList = Array.isArray(target.greenBackgrounds)
      ? target.greenBackgrounds.filter(Boolean)
      : [];
    const combined = __appRuntimeContext.mergeUniqueUrls(sessionList, __appRuntimeContext.mergeUniqueUrls(eventList, baseList));
    if (idx < 0 || idx >= combined.length) return;
    const selected = combined[idx];
    const sessionIndex = sessionList.indexOf(selected);
    if (sessionIndex >= 0) {
      __appRuntimeContext.activeSessionAssets.greenBackgroundIndex = sessionIndex;
      __appRuntimeContext.renderCurrentAssets(target);
      __appRuntimeContext.renderOptions();
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
      return;
    }
    const eventIndex = eventList.indexOf(selected);
    if (active) {
      const activeOverrides = __appRuntimeContext.ensureEventOverrides(active);
      if (eventIndex >= 0) {
        activeOverrides.greenBackgroundIndex = eventIndex;
        delete activeOverrides.useBaseGreenBackgroundIndex;
      } else {
        const baseIndex = baseList.indexOf(selected);
        if (baseIndex < 0) return;
        if (eventList.length) {
          activeOverrides.useBaseGreenBackgroundIndex = baseIndex;
        } else {
          target.greenBackgroundIndex = baseIndex;
        }
      }
      __appRuntimeContext.updateActiveEventDetails({ overrides: activeOverrides });
    } else {
      const baseIndex = baseList.indexOf(selected);
      if (baseIndex < 0) return;
      target.greenBackgroundIndex = baseIndex;
      __appRuntimeContext.saveThemesToStorage();
    }
    __appRuntimeContext.renderCurrentAssets(target);
    __appRuntimeContext.renderOptions();
    __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
  }

  function removeGreenBackgroundAt(idx) {
    const active = __appRuntimeContext.getActiveEvent();
    const target = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
    if (!target) return;
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.greenBackgrounds)
      ? __appRuntimeContext.activeSessionAssets.greenBackgrounds.filter(Boolean)
      : [];
    const eventList = Array.isArray(overrides.greenBackgrounds)
      ? overrides.greenBackgrounds.filter(Boolean)
      : [];
    const baseList = Array.isArray(target.greenBackgrounds)
      ? target.greenBackgrounds.filter(Boolean)
      : [];
    const combined = __appRuntimeContext.mergeUniqueUrls(sessionList, __appRuntimeContext.mergeUniqueUrls(eventList, baseList));
    if (idx < 0 || idx >= combined.length) return;
    const selected = combined[idx];
    const sessionIndex = sessionList.indexOf(selected);
    if (sessionIndex >= 0) {
      __appRuntimeContext.activeSessionAssets.greenBackgrounds.splice(sessionIndex, 1);
      if (
        __appRuntimeContext.activeSessionAssets.greenBackgroundIndex >=
        __appRuntimeContext.activeSessionAssets.greenBackgrounds.length
      ) {
        __appRuntimeContext.activeSessionAssets.greenBackgroundIndex = Math.max(
          0,
          __appRuntimeContext.activeSessionAssets.greenBackgrounds.length - 1
        );
      }
    __appRuntimeContext.renderCurrentAssets(target);
      __appRuntimeContext.updateLaunchSummary();
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      return;
    }
    const eventIndex = eventList.indexOf(selected);
    if (active && eventIndex >= 0) {
      const activeOverrides = __appRuntimeContext.ensureEventOverrides(active);
      activeOverrides.greenBackgrounds.splice(eventIndex, 1);
      if (
        activeOverrides.greenBackgroundIndex >=
        activeOverrides.greenBackgrounds.length
      ) {
        activeOverrides.greenBackgroundIndex = Math.max(
          0,
          activeOverrides.greenBackgrounds.length - 1
        );
      }
      delete activeOverrides.useBaseGreenBackgroundIndex;
      __appRuntimeContext.updateActiveEventDetails({ overrides: activeOverrides });
      __appRuntimeContext.renderCurrentAssets(target);
      __appRuntimeContext.scheduleLocalAssetCleanup(selected);
      return;
    }
    const baseIndex = baseList.indexOf(selected);
    if (baseIndex < 0) return;
    if (!Array.isArray(target.greenBackgrounds)) return;
    target.greenBackgrounds.splice(baseIndex, 1);
    if (target.greenBackgroundIndex >= target.greenBackgrounds.length) {
      target.greenBackgroundIndex = Math.max(
        0,
        target.greenBackgrounds.length - 1
      );
    }
    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.renderCurrentAssets(target);
    __appRuntimeContext.scheduleLocalAssetCleanup(selected);
  }

  function getActiveGreenBackground(theme) {
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const baseList = Array.isArray(theme && theme.greenBackgrounds)
      ? theme.greenBackgrounds.filter(Boolean)
      : [];
    if (
      Array.isArray(__appRuntimeContext.activeSessionAssets.greenBackgrounds) &&
      __appRuntimeContext.activeSessionAssets.greenBackgrounds.length
    ) {
      const idx =
        typeof __appRuntimeContext.activeSessionAssets.greenBackgroundIndex === "number"
          ? Math.min(
              Math.max(__appRuntimeContext.activeSessionAssets.greenBackgroundIndex, 0),
              __appRuntimeContext.activeSessionAssets.greenBackgrounds.length - 1
            )
          : 0;
      return __appRuntimeContext.activeSessionAssets.greenBackgrounds[idx];
    }
    if (Number.isFinite(overrides.useBaseGreenBackgroundIndex)) {
      const idx = Math.min(
        Math.max(overrides.useBaseGreenBackgroundIndex, 0),
        baseList.length - 1
      );
      return baseList[idx] || "";
    }
    if (
      Array.isArray(overrides.greenBackgrounds) &&
      overrides.greenBackgrounds.length
    ) {
      const idx =
        typeof overrides.greenBackgroundIndex === "number"
          ? Math.min(
              Math.max(overrides.greenBackgroundIndex, 0),
              overrides.greenBackgrounds.length - 1
            )
          : 0;
      return overrides.greenBackgrounds[idx];
    }
    const list = getGreenBackgroundList(theme);
    if (!list.length) return "";
    const idx =
      typeof theme.greenBackgroundIndex === "number"
        ? Math.min(Math.max(theme.greenBackgroundIndex, 0), list.length - 1)
        : 0;
    return list[idx];
  }

  function normalizeAssetSlots(slots) {
    if (!Array.isArray(slots)) return [];
    return slots
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;
        const x = __appRuntimeContext.toNumber(slot.x, NaN);
        const y = __appRuntimeContext.toNumber(slot.y, NaN);
        const w = __appRuntimeContext.toNumber(slot.w, NaN);
        const h = __appRuntimeContext.toNumber(slot.h, NaN);
        if (![x, y, w, h].every((value) => Number.isFinite(value))) return null;
        if (w <= 0 || h <= 0) return null;
        return { x, y, w, h };
      })
      .filter(Boolean);
  }

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function parseAspectRatioValue(value) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.includes(":")) {
      const parts = text.split(":").map((part) => Number.parseFloat(part));
      if (
        parts.length === 2 &&
        Number.isFinite(parts[0]) &&
        Number.isFinite(parts[1]) &&
        parts[0] > 0 &&
        parts[1] > 0
      ) {
        return parts[0] / parts[1];
      }
    }
    const numeric = Number.parseFloat(text);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  function buildOverlayIdFromSrc(src) {
    return String(src || "")
      .split(/[\\/]/)
      .pop()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function normalizeOverlayLayerDescriptor(layer, fallbackSrc = "") {
    if (!layer && !fallbackSrc) return null;
    if (typeof layer === "string") {
      const src = __appRuntimeContext.getAssetEntrySrc(layer) || __appRuntimeContext.getAssetEntrySrc(fallbackSrc);
      return src ? { type: "image", src } : null;
    }
    if (!layer || typeof layer !== "object") {
      const src = __appRuntimeContext.getAssetEntrySrc(fallbackSrc);
      return src ? { type: "image", src } : null;
    }
    if (layer.type === "color") {
      return {
        type: "color",
        value: String(layer.value || layer.color || "#ffffff"),
      };
    }
    if (layer.type === "image" || layer.src || fallbackSrc) {
      const src =
        __appRuntimeContext.getAssetEntrySrc(layer.src) ||
        __appRuntimeContext.getAssetEntrySrc(layer.value) ||
        __appRuntimeContext.getAssetEntrySrc(fallbackSrc);
      if (!src) return null;
      return {
        type: "image",
        src,
      };
    }
    return null;
  }

  function normalizePhotoSlotDescriptor(slot, index = 0) {
    if (!slot || typeof slot !== "object") return null;
    const x = Number(slot.x);
    const y = Number(slot.y);
    const width = Number(slot.width ?? slot.w);
    const height = Number(slot.height ?? slot.h);
    if (![x, y, width, height].every((value) => Number.isFinite(value))) {
      return null;
    }
    const photoSlot = {
      x: clamp01(x),
      y: clamp01(y),
      width: clamp01(width),
      height: clamp01(height),
      borderRadius: clamp01(Number(slot.borderRadius || 0)),
      objectFit: slot.objectFit === "contain" ? "contain" : "cover",
      objectPosition: String(slot.objectPosition || "center").trim() || "center",
    };
    if (Number.isFinite(Number(slot.rotation))) {
      photoSlot.rotation = Number(slot.rotation);
    }
    if (slot.mask) {
      photoSlot.mask = slot.mask;
    }
    if (Number.isFinite(Number(slot.sourceIndex))) {
      photoSlot.sourceIndex = Math.max(0, Math.floor(Number(slot.sourceIndex)));
    } else {
      photoSlot.sourceIndex = index;
    }
    return photoSlot;
  }

  function normalizeOverlayPhotoSlots(entry) {
    const source = Array.isArray(entry && entry.photoSlots)
      ? entry.photoSlots
      : Array.isArray(entry && entry.slots)
      ? entry.slots
      : [];
    const normalized = source
      .map((slot, index) => normalizePhotoSlotDescriptor(slot, index))
      .filter(Boolean);
    if (normalized.length) return normalized;
    return [
      {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        borderRadius: 0,
        objectFit: "cover",
        objectPosition: "center",
        sourceIndex: 0,
      },
    ];
  }

  function hasExplicitPhotoSlots(entry) {
    return Array.isArray(entry && entry.photoSlots) && entry.photoSlots.length > 0;
  }

  function logTemplateSlotResolution(template, normalizedSlots, outputW, outputH) {
    console.debug("[template-photo-slots]", {
      template: template && (template.src || template.id || template.name),
      rawManifestPhotoSlots: template && template.photoSlots,
      normalizedSlots,
      outputW,
      outputH,
    });
  }

  function normalizeOverlayDefinition(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      if (!src) return null;
      return {
        id: buildOverlayIdFromSrc(src),
        name: buildOverlayIdFromSrc(src) || src,
        type: "overlay",
        category: "general",
        aspectRatio: null,
        background: null,
        foreground: { type: "image", src },
        photoSlots: normalizeOverlayPhotoSlots({}),
        src,
        renderSrc: src,
      };
    }
    if (typeof entry !== "object") return null;
    const src = __appRuntimeContext.getAssetEntrySrc(entry.src) || __appRuntimeContext.getAssetEntrySrc(entry.renderSrc);
    if (!src) return null;
    const renderSrc = __appRuntimeContext.getAssetEntrySrc(entry.renderSrc) || src;
    const photoSlots = normalizeOverlayPhotoSlots(entry);
    const aspectRatio =
      parseAspectRatioValue(entry.aspectRatio) ||
      parseAspectRatioValue(entry.layoutAspectRatio) ||
      null;
    const foreground = normalizeOverlayLayerDescriptor(
      entry.foreground,
      renderSrc
    );
    const background = normalizeOverlayLayerDescriptor(entry.background, "");
    if (
      foreground &&
      foreground.type === "image" &&
      renderSrc &&
      foreground.src === src &&
      renderSrc !== src
    ) {
      foreground.src = renderSrc;
    }
    const isStrip =
      photoSlots.length > 1 ||
      String(entry.type || entry.layout || src).toLowerCase().includes("strip");
    return {
      ...entry,
      id: String(entry.id || buildOverlayIdFromSrc(src) || src),
      name: String(entry.name || entry.id || buildOverlayIdFromSrc(src) || src),
      type: String(entry.type || (isStrip ? "photo-strip-layout" : "overlay")),
      category: String(entry.category || "general"),
      aspectRatio: aspectRatio ? String(entry.aspectRatio || "") : "",
      background,
      foreground: foreground || { type: "image", src: renderSrc },
      photoSlots,
      src,
      renderSrc,
      slots: Array.isArray(entry.slots) ? entry.slots : undefined,
      textFields: __appRuntimeContext.normalizeTemplateTextFields(entry.textFields),
    };
  }

  function overlayUsesPhotoSlots(overlay) {
    return Array.isArray(overlay && overlay.photoSlots) && overlay.photoSlots.length > 0;
  }

  function getOverlayAspectRatio(overlay) {
    const parsed = parseAspectRatioValue(overlay && overlay.aspectRatio);
    if (parsed) return parsed;
    return null;
  }

  function getOverlayEntryBySrc(theme, src) {
    if (!src) return null;
    const list = getOverlayList(theme);
    return (
      list.find((item) => {
        if (!item) return false;
        if (typeof item === "string") return item === src;
        return item.src === src;
      }) || null
    );
  }

  function resolveOverlayRenderSrc(theme, src) {
    const entry = getOverlayEntryBySrc(theme, src);
    if (
      entry &&
      typeof entry === "object" &&
      entry.foreground &&
      entry.foreground.type === "image" &&
      entry.foreground.src
    ) {
      return entry.foreground.src;
    }
    if (entry && typeof entry === "object" && entry.renderSrc) {
      return entry.renderSrc;
    }
    return src;
  }

  function resolveOverlaySlots(theme, src) {
    const entry = getOverlayEntryBySrc(theme, src);
    if (!entry || typeof entry !== "object") return [];
    return Array.isArray(entry.photoSlots) ? entry.photoSlots : [];
  }

  function readSvgTagAttr(tag, attrName) {
    if (!tag || !attrName) return "";
    const pattern = new RegExp(`${attrName}="([^"]*)"`, "i");
    const match = tag.match(pattern);
    return match ? match[1].trim() : "";
  }

  function readSvgNumericAttr(tag, attrName) {
    const value = readSvgTagAttr(tag, attrName);
    if (!value) return null;
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function readSvgOpacity(tag) {
    const opacity = readSvgNumericAttr(tag, "opacity");
    if (opacity !== null) return opacity;
    const fillOpacity = readSvgNumericAttr(tag, "fill-opacity");
    if (fillOpacity !== null) return fillOpacity;
    return 1;
  }

  function getSvgCanvasSize(svgMarkup) {
    if (typeof svgMarkup !== "string" || !svgMarkup.trim()) return null;
    const svgTagMatch = svgMarkup.match(/<svg\b[^>]*>/i);
    const svgTag = svgTagMatch ? svgTagMatch[0] : "";
    if (!svgTag) return null;
    const viewBox = readSvgTagAttr(svgTag, "viewBox");
    if (viewBox) {
      const values = viewBox
        .split(/[\s,]+/)
        .map((part) => Number.parseFloat(part))
        .filter((part) => Number.isFinite(part));
      if (values.length === 4) {
        return { width: values[2], height: values[3] };
      }
    }
    const width = readSvgNumericAttr(svgTag, "width");
    const height = readSvgNumericAttr(svgTag, "height");
    if (width !== null && height !== null) {
      return { width, height };
    }
    return null;
  }

  function isOpaqueSvgFill(fillValue) {
    const fill = String(fillValue || "").trim().toLowerCase();
    if (!fill) return false;
    if (fill === "none" || fill === "transparent") return false;
    if (fill === "rgba(0,0,0,0)" || fill === "rgba(0, 0, 0, 0)") return false;
    return true;
  }

  function rectLooksLikePhotoBlockingCover(tag, canvas) {
    const width = readSvgNumericAttr(tag, "width");
    const height = readSvgNumericAttr(tag, "height");
    const x = readSvgNumericAttr(tag, "x") || 0;
    const y = readSvgNumericAttr(tag, "y") || 0;
    const fill = readSvgTagAttr(tag, "fill");
    const stroke = readSvgTagAttr(tag, "stroke");
    if (width === null || height === null) return false;
    const widthRatio = width / canvas.width;
    const heightRatio = height / canvas.height;
    if (widthRatio < 0.85 || heightRatio < 0.85) return false;
    if (Math.abs(x) > canvas.width * 0.1 || Math.abs(y) > canvas.height * 0.1) {
      return false;
    }
    if (!isOpaqueSvgFill(fill)) return false;
    return {
      hasStroke: !!(stroke && stroke.toLowerCase() !== "none"),
      opacity: readSvgOpacity(tag),
    };
  }

  function svgNeedsPhotoWindowFix(svgMarkup) {
    const canvas = getSvgCanvasSize(svgMarkup);
    if (!canvas) return false;
    const rects = svgMarkup.match(/<rect\b[^>]*>/gi) || [];
    return rects.some((tag) => {
      const cover = rectLooksLikePhotoBlockingCover(tag, canvas);
      return !!(cover && cover.opacity > 0.2);
    });
  }

  function sanitizeSvgOverlayMarkup(svgMarkup) {
    const canvas = getSvgCanvasSize(svgMarkup);
    if (!canvas) return svgMarkup;
    return svgMarkup.replace(/<rect\b[^>]*>/gi, (tag) => {
      const cover = rectLooksLikePhotoBlockingCover(tag, canvas);
      if (!cover || cover.opacity <= 0.2) return tag;
      if (!cover.hasStroke) return "";
      if (/fill="/i.test(tag)) {
        return tag.replace(/fill="[^"]*"/i, 'fill="none"');
      }
      return tag.replace(/^<rect/i, '<rect fill="none"');
    });
  }

  function buildSanitizedSvgDataUrl(svgMarkup) {
    return (
      "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgMarkup)
    );
  }

  async function getOverlayFixedAsset(entry) {
    const src =
      typeof entry === "string" ? entry : entry && typeof entry.src === "string"
        ? entry.src
        : "";
    if (!src) return entry;
    if (!/\.svg(?:[?#].*)?$/i.test(src)) return entry;
    if (__appRuntimeContext.overlaySvgFixCache.has(src)) {
      const cached = __appRuntimeContext.overlaySvgFixCache.get(src);
      return typeof entry === "string"
        ? cached.renderSrc === src
          ? src
          : { src, renderSrc: cached.renderSrc }
        : { ...entry, renderSrc: cached.renderSrc };
    }
    try {
      const resp = await fetch(src, { cache: "reload" });
      if (!resp.ok) {
        __appRuntimeContext.overlaySvgFixCache.set(src, { renderSrc: src });
        return entry;
      }
      const svgMarkup = await resp.text();
      const renderSrc = svgNeedsPhotoWindowFix(svgMarkup)
        ? buildSanitizedSvgDataUrl(sanitizeSvgOverlayMarkup(svgMarkup))
        : src;
      __appRuntimeContext.overlaySvgFixCache.set(src, { renderSrc });
      return typeof entry === "string"
        ? renderSrc === src
          ? src
          : { src, renderSrc }
        : { ...entry, renderSrc };
    } catch (_) {
      __appRuntimeContext.overlaySvgFixCache.set(src, { renderSrc: src });
      return entry;
    }
  }

  async function fixOverlayEntries(entries) {
    const source = Array.isArray(entries) ? entries : [];
    const fixed = [];
    for (const entry of source) {
      fixed.push(await getOverlayFixedAsset(entry));
    }
    return fixed;
  }

  function copyText(s) {
    try {
      navigator.clipboard.writeText(s);
      __appRuntimeContext.showToast("Copied");
    } catch (_) {
      alert("Copy: " + s);
    }
  }

  function getBaseOverlayList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const removed = new Set(
      Array.isArray(theme.overlaysRemoved) ? theme.overlaysRemoved : []
    );
    const localArr = Array.isArray(theme.overlays)
      ? theme.overlays
          .map((item) => normalizeOverlayDefinition(item))
          .filter((item) => item && !removed.has(item.src))
      : [];
    const seen = new Set();
    const out = [];
    for (const o of localArr) {
      const k = (o && o.src ? o.src : "").toString().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(o);
    }
    return out;
  }

  function getBaseTemplateList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const removed = new Set(
      Array.isArray(theme.templatesRemoved) ? theme.templatesRemoved : []
    );
    const localArr = Array.isArray(theme.templates)
      ? theme.templates
          .filter((t) => t && t.src && !removed.has(t.src))
          .map((t) => ({
            ...__appRuntimeContext.cloneThemeValue(t),
            src: t.src,
            layout: __appRuntimeContext.normalizeTemplateLayout(t.layout),
            slots: t.slots,
            photoSlots: t.photoSlots,
            background: t.background,
            foreground: t.foreground,
            textFields: __appRuntimeContext.normalizeTemplateTextFields(t.textFields),
          }))
      : [];
    const seen = new Set();
    const out = [];
    for (const t of localArr) {
      const k = (t && t.src ? t.src : "").toString().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }

  function getSessionRemovedAssetList(category = "") {
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    if (normalized === "background") return __appRuntimeContext.sessionRemovedBackgrounds;
    if (normalized === "overlay") return __appRuntimeContext.sessionRemovedOverlays;
    if (normalized === "template") return __appRuntimeContext.sessionRemovedTemplates;
    return [];
  }

  function getSessionRemovedAssetSourceSet(category = "") {
    return __appRuntimeContext.createAssetSelectionSet(getSessionRemovedAssetList(category));
  }

  function clearSessionRemovedAsset(category = "", src = "") {
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    const cleanSrc = __appRuntimeContext.getAssetEntrySrc(src);
    if (!cleanSrc) return;
    if (normalized === "background") {
      __appRuntimeContext.sessionRemovedBackgrounds = __appRuntimeContext.sessionRemovedBackgrounds.filter(
        (item) => item !== cleanSrc
      );
    } else if (normalized === "overlay") {
      __appRuntimeContext.sessionRemovedOverlays = __appRuntimeContext.sessionRemovedOverlays.filter(
        (item) => item !== cleanSrc
      );
    } else if (normalized === "template") {
      __appRuntimeContext.sessionRemovedTemplates = __appRuntimeContext.sessionRemovedTemplates.filter(
        (item) => item !== cleanSrc
      );
    }
  }

  function addSessionRemovedAsset(category = "", src = "") {
    const normalized = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    const cleanSrc = __appRuntimeContext.getAssetEntrySrc(src);
    if (!cleanSrc) return;
    if (normalized === "background") {
      if (!__appRuntimeContext.sessionRemovedBackgrounds.includes(cleanSrc))
        __appRuntimeContext.sessionRemovedBackgrounds.push(cleanSrc);
    } else if (normalized === "overlay") {
      if (!__appRuntimeContext.sessionRemovedOverlays.includes(cleanSrc))
        __appRuntimeContext.sessionRemovedOverlays.push(cleanSrc);
    } else if (normalized === "template") {
      if (!__appRuntimeContext.sessionRemovedTemplates.includes(cleanSrc))
        __appRuntimeContext.sessionRemovedTemplates.push(cleanSrc);
    }
  }

  function getEffectiveAssetList(baseEntries = [], sessionEntries = [], removedEntries = []) {
    const removed = new Set(
      (Array.isArray(removedEntries) ? removedEntries : [])
        .map(__appRuntimeContext.getAssetEntrySrc)
        .filter(Boolean)
    );
    const seen = new Set();
    const out = [];
    for (const entry of [...sessionEntries, ...baseEntries]) {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      if (!src || removed.has(src) || seen.has(src)) continue;
      seen.add(src);
      out.push(entry);
    }
    return out;
  }

  function getEffectiveBackgroundList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds)
      ? __appRuntimeContext.activeSessionAssets.backgrounds.filter(Boolean)
      : [];
    return getEffectiveAssetList(
      getBaseBackgroundList(theme),
      sessionList,
      __appRuntimeContext.sessionRemovedBackgrounds
    );
  }

  function getEffectiveOverlayList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.overlays)
      ? __appRuntimeContext.activeSessionAssets.overlays
          .map((item) => normalizeOverlayDefinition(item))
          .filter(Boolean)
      : [];
    return getEffectiveAssetList(
      getBaseOverlayList(theme),
      sessionList,
      __appRuntimeContext.sessionRemovedOverlays
    );
  }

  function getEffectiveTemplateList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const sessionList = Array.isArray(__appRuntimeContext.activeSessionAssets.templates)
      ? __appRuntimeContext.activeSessionAssets.templates
          .map((item) => {
            const src = __appRuntimeContext.getAssetEntrySrc(item);
            if (!src) return null;
            return typeof item === "object"
              ? {
                  ...__appRuntimeContext.cloneThemeValue(item),
                  src,
                  layout: __appRuntimeContext.normalizeTemplateLayout(item.layout),
                  slots: item.slots,
                  photoSlots: item.photoSlots,
                  background: item.background,
                  foreground: item.foreground,
                  textFields: __appRuntimeContext.normalizeTemplateTextFields(item.textFields),
                }
              : {
                  src,
                  layout: "double_column",
                  __session: true,
                };
          })
          .filter(Boolean)
      : [];
    return getEffectiveAssetList(
      getBaseTemplateList(theme),
      sessionList,
      __appRuntimeContext.sessionRemovedTemplates
    );
  }

  function getAssetDebugSources(list = []) {
    return (Array.isArray(list) ? list : [])
      .map(__appRuntimeContext.getAssetEntrySrc)
      .filter(Boolean)
      .slice(0, 10);
  }

  function logEffectiveAssetState(theme, reason = "effective-assets") {
    if (!theme || typeof theme !== "object") return;
    const backgrounds = getEffectiveBackgroundList(theme);
    const overlays = getEffectiveOverlayList(theme);
    const templates = getEffectiveTemplateList(theme);
    console.info("[photobooth effective assets]", {
      reason,
      theme: theme.name || theme.key || "(unnamed theme)",
      backgroundCount: backgrounds.length,
      overlayCount: overlays.length,
      templateCount: templates.length,
      backgroundFirst10: getAssetDebugSources(backgrounds),
      overlayFirst10: getAssetDebugSources(overlays),
      templateFirst10: getAssetDebugSources(templates),
    });
  }

  function getOverlayList(theme) {
    return __appRuntimeContext.filterPhotoOverlaysByOrientation(
      getAssignedOverlayList(theme),
      __appRuntimeContext.getGuestScreenOrientation()
    );
  }

  function getAssignedOverlayList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const removed = getSessionRemovedAssetSourceSet("overlay");
    const eventArr = Array.isArray(overrides.overlays)
      ? overrides.overlays
          .map((item) => normalizeOverlayDefinition(item))
          .filter(
            (item) => item && !removed.has(__appRuntimeContext.getAssetEntrySrc(item))
          )
      : [];
    const effective = getEffectiveOverlayList(theme);
    const seen = new Set();
    const out = [];
    for (const item of [...effective, ...eventArr]) {
      const src = __appRuntimeContext.getAssetEntrySrc(item);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push(item);
    }
    return out;
  }

  function getAllThemeOverlayCatalogList(theme) {
    const bySrc = new Map();
    const add = (entry) => {
      const normalized = normalizeOverlayDefinition(entry);
      if (normalized && normalized.src && !bySrc.has(normalized.src)) {
        bySrc.set(normalized.src, normalized);
      }
    };
    getOverlayList(theme).forEach(add);
    __appRuntimeContext.getCanonicalAssetCollection("overlay")
      .map((asset) =>
        normalizeOverlayDefinition({
          ...(asset.raw && typeof asset.raw === "object" ? asset.raw : {}),
          src: asset.url,
          name: asset.name,
          tags: asset.tags,
          textFields: asset.editableFields,
          __library: true,
        })
      )
      .forEach(add);
    return Array.from(bySrc.values());
  }

  function getTemplateList(theme) {
    if (!theme || typeof theme !== "object") return [];
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const removed = getSessionRemovedAssetSourceSet("template");
    const eventArr = Array.isArray(overrides.templates)
      ? overrides.templates
          .map((item) =>
            typeof item === "string"
              ? {
                  src: item,
                  layout: "double_column",
                  __event: true,
                }
              : {
                  ...__appRuntimeContext.cloneThemeValue(item),
                  src: item.src,
                  layout: __appRuntimeContext.normalizeTemplateLayout(item.layout),
                  slots: item.slots,
                  photoSlots: item.photoSlots,
                  background: item.background,
                  foreground: item.foreground,
                  textFields: __appRuntimeContext.normalizeTemplateTextFields(item.textFields),
                  __event: true,
                }
          )
          .filter(
            (item) =>
              item && item.src && !removed.has(__appRuntimeContext.getAssetEntrySrc(item))
          )
      : [];
    const effective = getEffectiveTemplateList(theme);
    const seen = new Set();
    const out = [];
    for (const item of [...effective, ...eventArr]) {
      const src = __appRuntimeContext.getAssetEntrySrc(item);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push(item);
    }
    return out;
  }

  return {
    removeBackground,
    removeBackgroundAt,
    setBackgroundIndex,
    removeLogo,
    removeOverlay,
    removeTemplate,
    removeEventOverlay,
    removeEventTemplate,
    getThemeAssetSourceSet,
    getEventAssetSourceSet,
    removeSessionAssetBySrc,
    removeSessionOverlay,
    removeSessionBackground,
    removeSessionTemplate,
    removeFolderOverlay,
    removeFolderBackground,
    removeFolderTemplate,
    reorderAssets,
    pushRemoved,
    updateUndoUI,
    getThemeByKey,
    undoLastRemoval,
    getBaseBackgroundList,
    getSelectedBackgroundSourceList,
    isCompleteBackgroundCatalogSelection,
    getEffectiveSelectedBackgroundList,
    getBackgroundList,
    getThemeBackgroundCatalogList,
    getAllThemeBackgroundCatalogList,
    getSessionBackgroundPickerList,
    getGreenBackgroundList,
    getActiveBackground,
    setGreenBackgroundIndex,
    removeGreenBackgroundAt,
    getActiveGreenBackground,
    normalizeAssetSlots,
    clamp01,
    parseAspectRatioValue,
    buildOverlayIdFromSrc,
    normalizeOverlayLayerDescriptor,
    normalizePhotoSlotDescriptor,
    normalizeOverlayPhotoSlots,
    hasExplicitPhotoSlots,
    logTemplateSlotResolution,
    normalizeOverlayDefinition,
    overlayUsesPhotoSlots,
    getOverlayAspectRatio,
    getOverlayEntryBySrc,
    resolveOverlayRenderSrc,
    resolveOverlaySlots,
    readSvgTagAttr,
    readSvgNumericAttr,
    readSvgOpacity,
    getSvgCanvasSize,
    isOpaqueSvgFill,
    rectLooksLikePhotoBlockingCover,
    svgNeedsPhotoWindowFix,
    sanitizeSvgOverlayMarkup,
    buildSanitizedSvgDataUrl,
    getOverlayFixedAsset,
    fixOverlayEntries,
    copyText,
    getBaseOverlayList,
    getBaseTemplateList,
    getSessionRemovedAssetList,
    getSessionRemovedAssetSourceSet,
    clearSessionRemovedAsset,
    addSessionRemovedAsset,
    getEffectiveAssetList,
    getEffectiveBackgroundList,
    getEffectiveOverlayList,
    getEffectiveTemplateList,
    getAssetDebugSources,
    logEffectiveAssetState,
    getOverlayList,
    getAssignedOverlayList,
    getAllThemeOverlayCatalogList,
    getTemplateList,
  };
}
