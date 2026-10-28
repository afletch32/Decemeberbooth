export function createLibrarySyncModule(__appRuntimeContext) {
  function saveTheme() {
    const themeName = __appRuntimeContext.THEME_EDITOR.name.value.trim();
    if (!themeName) {
      alert("Please enter a theme name.");
      return;
    }

    const pickerSelection = __appRuntimeContext.getFontPickerSelection();
    const headingFamily = pickerSelection.heading || "Comic Neue";
    const bodyFamily = pickerSelection.body || headingFamily || "Comic Neue";
    const headingCss = __appRuntimeContext.composeFontString(headingFamily);
    const bodyCss = __appRuntimeContext.composeFontString(bodyFamily);

    const newTheme = {
      name: themeName,
      accent: __appRuntimeContext.THEME_EDITOR.accent.value,
      accent2: __appRuntimeContext.THEME_EDITOR.accent2.value,
      fontHeading: headingCss,
      fontBody: bodyCss,
      font: bodyCss,
      background: "",
      logo: "",
      overlays: [],
      templates: [],
      welcome: {
        title: __appRuntimeContext.THEME_EDITOR.welcomeTitle.value,
        portrait: "",
        landscape: "",
        prompt: __appRuntimeContext.THEME_EDITOR.welcomePrompt.value,
      },
    };

    __appRuntimeContext.ensureFontLoaded(headingFamily, true);
    __appRuntimeContext.ensureFontLoaded(bodyFamily, true);

    const backgroundFile = __appRuntimeContext.DOM.themeBackground.files[0];
    const logoFile = __appRuntimeContext.DOM.themeLogo.files[0];
    const overlayFiles = __appRuntimeContext.DOM.themeOverlays.files;
    const templateFiles = __appRuntimeContext.DOM.themeTemplates.files;
    const filePromises = [];

    if (backgroundFile) {
      filePromises.push(
        __appRuntimeContext.uploadAsset(backgroundFile, "backgrounds").then((url) => {
          if (url) newTheme.background = url;
        })
      );
    }
    if (logoFile) {
      filePromises.push(
        __appRuntimeContext.uploadAsset(logoFile, "logo").then((url) => {
          if (url) newTheme.logo = url;
        })
      );
    }
    for (const file of overlayFiles) {
      filePromises.push(
        __appRuntimeContext.uploadAsset(file, "overlays").then((url) => {
          if (url) newTheme.overlays.push(url);
        })
      );
    }
    for (const file of templateFiles) {
      filePromises.push(
        __appRuntimeContext.uploadAsset(file, "templates").then((url) => {
          if (url) newTheme.templates.push({ src: url, layout: "double_column" });
        })
      );
    }
    Promise.all(filePromises).then(() => {
      // Try to load/record the chosen fonts so they're available immediately
      __appRuntimeContext.ensureFontLoadedForFontString(newTheme.fontHeading);
      __appRuntimeContext.ensureFontLoadedForFontString(newTheme.fontBody);
      const newKey = themeName.toLowerCase().replace(/\s/g, "-");
      __appRuntimeContext.themes[newKey] = newTheme;
      __appRuntimeContext.saveThemesToStorage();
      __appRuntimeContext.populateThemeSelector(newKey);
      __appRuntimeContext.setEventSelection(newKey);
      __appRuntimeContext.loadTheme(newKey);
      __appRuntimeContext.THEME_EDITOR.mode.value = "edit";
      __appRuntimeContext.setThemeEditorMode("edit");
      alert(`Theme '${themeName}' saved!`);
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getAssetIndex() {
    if (!__appRuntimeContext.themes._meta) __appRuntimeContext.themes._meta = {};
    if (!__appRuntimeContext.themes._meta.assetIndex) __appRuntimeContext.themes._meta.assetIndex = {};
    return __appRuntimeContext.themes._meta.assetIndex;
  }

  function normalizeManagedLocalAssetReference(value) {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      typeof location === "undefined"
    )
      return "";
    try {
      const resolved = new URL(value, location.origin);
      if (resolved.origin !== location.origin) return "";
      if (!resolved.pathname.startsWith("/uploads/")) return "";
      const filename = decodeURIComponent(
        resolved.pathname.slice("/uploads/".length)
      );
      if (!filename || filename.includes("/") || filename.includes("\\"))
        return "";
      return `/uploads/${filename}`;
    } catch (_err) {
      return "";
    }
  }

  function objectReferencesLocalAsset(node, targetPath) {
    if (!targetPath) return false;
    if (typeof node === "string")
      return normalizeManagedLocalAssetReference(node) === targetPath;
    if (Array.isArray(node))
      return node.some((item) => objectReferencesLocalAsset(item, targetPath));
    if (!node || typeof node !== "object") return false;
    return Object.values(node).some((value) =>
      objectReferencesLocalAsset(value, targetPath)
    );
  }

  function localAssetStillReferenced(targetPath) {
    if (!targetPath) return false;
    return (
      objectReferencesLocalAsset(__appRuntimeContext.themes, targetPath) ||
      objectReferencesLocalAsset(__appRuntimeContext.getStoredEvents(), targetPath)
    );
  }

  function pruneAssetIndexForUrl(targetPath) {
    if (!targetPath) return false;
    const index = getAssetIndex();
    let changed = false;
    Object.keys(index).forEach((key) => {
      if (normalizeManagedLocalAssetReference(index[key]) === targetPath) {
        delete index[key];
        changed = true;
      }
    });
    return changed;
  }

  async function cleanupUnusedLocalAsset(reference) {
    const targetPath = normalizeManagedLocalAssetReference(reference);
    if (!targetPath) return false;
    if (localAssetStillReferenced(targetPath)) return false;
    try {
      const resp = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetPath }),
      });
      if (!resp.ok) return false;
      const pruned = pruneAssetIndexForUrl(targetPath);
      if (pruned) __appRuntimeContext.saveThemesToStorage();
      return true;
    } catch (_err) {
      return false;
    }
  }

  function scheduleLocalAssetCleanup(reference) {
    cleanupUnusedLocalAsset(reference).catch(() => {});
  }

  function slugifyThemeAssetScope(value) {
    return (
      (value || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9:_\-]+/g, "-")
        .replace(/:+/g, "-")
        .replace(/^-+|-+$/g, "") || "theme"
    );
  }

  function getThemeAssetUploadOptionsForKey(themeKey = "", kind = "") {
    const base = __appRuntimeContext.getEventFolderBase();
    const scope = slugifyThemeAssetScope(themeKey);
    const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
    return { folder: `${base}/${scope}/${cleanKind}` };
  }

  function getManagedLocalAssetFilename(reference, fallback = "asset.png") {
    const normalized = normalizeManagedLocalAssetReference(reference);
    if (!normalized) return fallback;
    const filename = normalized.slice("/uploads/".length);
    return filename || fallback;
  }

  async function migrateManagedLocalAsset(reference, kind, options = {}) {
    const normalized = normalizeManagedLocalAssetReference(reference);
    if (!normalized) return reference;
    if (__appRuntimeContext.managedLocalAssetMigrationCache.has(normalized)) {
      return __appRuntimeContext.managedLocalAssetMigrationCache.get(normalized);
    }
    const pending = (async () => {
      try {
        const resp = await fetch(normalized, { cache: "reload" });
        if (!resp.ok) return reference;
        const blob = await resp.blob();
        const filename = getManagedLocalAssetFilename(
          normalized,
          `${kind || "asset"}.png`
        );
        const file = new File([blob], filename, {
          type: blob.type || "application/octet-stream",
        });
        const uploaded = await __appRuntimeContext.uploadAsset(file, kind, options);
        return uploaded || reference;
      } catch (_err) {
        return reference;
      }
    })();
    __appRuntimeContext.managedLocalAssetMigrationCache.set(normalized, pending);
    return pending;
  }

  async function migrateManagedLocalStringList(list, kind, options) {
    if (!Array.isArray(list) || !list.length)
      return { list: Array.isArray(list) ? list : [], changed: 0, cleanup: [] };
    let changed = 0;
    const cleanup = [];
    const next = await Promise.all(
      list.map(async (item) => {
        const migrated = await migrateManagedLocalAsset(item, kind, options);
        if (migrated !== item && normalizeManagedLocalAssetReference(item)) {
          changed += 1;
          cleanup.push(item);
        }
        return migrated;
      })
    );
    return { list: next, changed, cleanup };
  }

  async function migrateManagedLocalTemplateList(list, kind, options) {
    if (!Array.isArray(list) || !list.length)
      return { list: Array.isArray(list) ? list : [], changed: 0, cleanup: [] };
    let changed = 0;
    const cleanup = [];
    const next = await Promise.all(
      list.map(async (item) => {
        if (typeof item === "string") {
          const migrated = await migrateManagedLocalAsset(item, kind, options);
          if (migrated !== item && normalizeManagedLocalAssetReference(item)) {
            changed += 1;
            cleanup.push(item);
          }
          return migrated;
        }
        if (!item || typeof item !== "object" || typeof item.src !== "string")
          return item;
        const migratedSrc = await migrateManagedLocalAsset(
          item.src,
          kind,
          options
        );
        if (
          migratedSrc !== item.src &&
          normalizeManagedLocalAssetReference(item.src)
        ) {
          changed += 1;
          cleanup.push(item.src);
          return { ...item, src: migratedSrc };
        }
        return item;
      })
    );
    return { list: next, changed, cleanup };
  }

  async function migrateManagedLocalSingle(reference, kind, options) {
    if (typeof reference !== "string" || !reference)
      return { value: reference, changed: 0, cleanup: [] };
    const migrated = await migrateManagedLocalAsset(reference, kind, options);
    if (
      migrated !== reference &&
      normalizeManagedLocalAssetReference(reference)
    ) {
      return { value: migrated, changed: 1, cleanup: [reference] };
    }
    return { value: migrated, changed: 0, cleanup: [] };
  }

  async function migrateThemeManagedLocalAssets(theme, themeKey) {
    if (!theme || typeof theme !== "object") return { changed: 0, cleanup: [] };
    const cleanup = [];
    let changed = 0;
    const backgroundOptions = getThemeAssetUploadOptionsForKey(
      themeKey,
      "backgrounds"
    );
    const greenOptions = getThemeAssetUploadOptionsForKey(
      themeKey,
      "greenBackgrounds"
    );
    const overlayOptions = getThemeAssetUploadOptionsForKey(themeKey, "overlays");
    const templateOptions = getThemeAssetUploadOptionsForKey(
      themeKey,
      "templates"
    );
    const logoOptions = getThemeAssetUploadOptionsForKey(themeKey, "logo");
    const characterOptions = getThemeAssetUploadOptionsForKey(
      themeKey,
      "character"
    );

    const backgroundSingle = await migrateManagedLocalSingle(
      theme.background,
      "backgrounds",
      backgroundOptions
    );
    theme.background = backgroundSingle.value || "";
    changed += backgroundSingle.changed;
    cleanup.push(...backgroundSingle.cleanup);

    const backgrounds = await migrateManagedLocalStringList(
      theme.backgrounds,
      "backgrounds",
      backgroundOptions
    );
    if (Array.isArray(theme.backgrounds)) theme.backgrounds = backgrounds.list;
    changed += backgrounds.changed;
    cleanup.push(...backgrounds.cleanup);

    const greenBackgrounds = await migrateManagedLocalStringList(
      theme.greenBackgrounds,
      "greenBackgrounds",
      greenOptions
    );
    if (Array.isArray(theme.greenBackgrounds))
      theme.greenBackgrounds = greenBackgrounds.list;
    changed += greenBackgrounds.changed;
    cleanup.push(...greenBackgrounds.cleanup);

    const overlays = await migrateManagedLocalStringList(
      theme.overlays,
      "overlays",
      overlayOptions
    );
    if (Array.isArray(theme.overlays)) theme.overlays = overlays.list;
    changed += overlays.changed;
    cleanup.push(...overlays.cleanup);

    const templates = await migrateManagedLocalTemplateList(
      theme.templates,
      "templates",
      templateOptions
    );
    if (Array.isArray(theme.templates)) theme.templates = templates.list;
    changed += templates.changed;
    cleanup.push(...templates.cleanup);

    const logo = await migrateManagedLocalSingle(theme.logo, "logo", logoOptions);
    if (typeof theme.logo === "string" || logo.changed)
      theme.logo = logo.value || "";
    changed += logo.changed;
    cleanup.push(...logo.cleanup);

    const character = await migrateManagedLocalSingle(
      theme.character,
      "character",
      characterOptions
    );
    if (typeof theme.character === "string" || character.changed)
      theme.character = character.value || "";
    changed += character.changed;
    cleanup.push(...character.cleanup);

    return { changed, cleanup };
  }

  async function migrateEventManagedLocalAssets(event) {
    if (!event || typeof event !== "object") return { changed: 0, cleanup: [] };
    const cleanup = [];
    let changed = 0;
    const overrides = __appRuntimeContext.ensureEventOverrides(event);

    const backgroundSingle = await migrateManagedLocalSingle(
      event.background,
      "backgrounds",
      __appRuntimeContext.getEventAssetUploadOptions(event, "backgrounds")
    );
    if (typeof event.background === "string" || backgroundSingle.changed)
      event.background = backgroundSingle.value || "";
    changed += backgroundSingle.changed;
    cleanup.push(...backgroundSingle.cleanup);

    const backgrounds = await migrateManagedLocalStringList(
      overrides.backgrounds,
      "backgrounds",
      __appRuntimeContext.getEventAssetUploadOptions(event, "backgrounds")
    );
    overrides.backgrounds = backgrounds.list;
    changed += backgrounds.changed;
    cleanup.push(...backgrounds.cleanup);

    const greenBackgrounds = await migrateManagedLocalStringList(
      overrides.greenBackgrounds,
      "greenBackgrounds",
      __appRuntimeContext.getEventAssetUploadOptions(event, "greenBackgrounds")
    );
    overrides.greenBackgrounds = greenBackgrounds.list;
    changed += greenBackgrounds.changed;
    cleanup.push(...greenBackgrounds.cleanup);

    const overlays = await migrateManagedLocalStringList(
      overrides.overlays,
      "overlays",
      __appRuntimeContext.getEventAssetUploadOptions(event, "overlays")
    );
    overrides.overlays = overlays.list;
    changed += overlays.changed;
    cleanup.push(...overlays.cleanup);

    const templates = await migrateManagedLocalTemplateList(
      overrides.templates,
      "templates",
      __appRuntimeContext.getEventAssetUploadOptions(event, "templates")
    );
    overrides.templates = templates.list;
    changed += templates.changed;
    cleanup.push(...templates.cleanup);

    const logo = await migrateManagedLocalSingle(
      event.logo,
      "logo",
      __appRuntimeContext.getEventAssetUploadOptions(event, "logo")
    );
    if (typeof event.logo === "string" || logo.changed) {
      if (logo.value) event.logo = logo.value;
      else delete event.logo;
    }
    changed += logo.changed;
    cleanup.push(...logo.cleanup);

    return { changed, cleanup };
  }

  async function migrateAllManagedLocalAssets() {
    if (!__appRuntimeContext.cloudinaryConfigured()) {
      alert("Configure Cloudinary first.");
      return;
    }
    if (__appRuntimeContext.DOM.migrateAssetsBtn) __appRuntimeContext.DOM.migrateAssetsBtn.disabled = true;
    __appRuntimeContext.updateSyncStatus("Migrating assets…");
    try {
      __appRuntimeContext.managedLocalAssetMigrationCache.clear();
      const cleanup = new Set();
      let changed = 0;

      const globalLogo = __appRuntimeContext.getGlobalLogo();
      if (normalizeManagedLocalAssetReference(globalLogo)) {
        const migratedLogo = await migrateManagedLocalAsset(
          globalLogo,
          "logo",
          getThemeAssetUploadOptionsForKey("global", "logo")
        );
        if (migratedLogo !== globalLogo) {
          changed += 1;
          cleanup.add(globalLogo);
          __appRuntimeContext.setGlobalLogo(migratedLogo, { quiet: true, skipSave: true });
        }
      }

      const themeTasks = [];
      __appRuntimeContext.forEachThemeEntry((theme, themeKey) => {
        themeTasks.push(migrateThemeManagedLocalAssets(theme, themeKey));
      });
      const themeResults = await Promise.all(themeTasks);
      themeResults.forEach((result) => {
        changed += result.changed;
        result.cleanup.forEach((item) => cleanup.add(item));
      });

      const events = __appRuntimeContext.getStoredEvents();
      const eventResults = await Promise.all(
        events.map((event) => migrateEventManagedLocalAssets(event))
      );
      eventResults.forEach((result) => {
        changed += result.changed;
        result.cleanup.forEach((item) => cleanup.add(item));
      });

      __appRuntimeContext.normalizeAllThemes();
      __appRuntimeContext.saveThemesToStorage();
      __appRuntimeContext.setStoredEvents(events);
      __appRuntimeContext.syncEventInputsFromActive();
      if (__appRuntimeContext.activeTheme) __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.updateStylePreview();

      for (const reference of cleanup) {
        await cleanupUnusedLocalAsset(reference);
      }

      const message = changed
        ? `Migrated ${changed} local asset${
            changed === 1 ? "" : "s"
          } to Cloudinary`
        : "No local assets found to migrate";
      __appRuntimeContext.updateSyncStatus(changed ? "Migration complete" : "No local assets found");
      __appRuntimeContext.showToast(message);
    } catch (error) {
      console.error("Asset migration failed", error);
      __appRuntimeContext.updateSyncStatus("Migration failed");
      alert("Asset migration failed. Check Cloudinary settings and try again.");
    } finally {
      if (__appRuntimeContext.DOM.migrateAssetsBtn) __appRuntimeContext.DOM.migrateAssetsBtn.disabled = false;
    }
  }

  async function fileSha256Hex(file) {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function extFromName(name, fallback) {
    const m = (name || "").match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : fallback || "png";
  }

  function buildIdleScreenEntryFromUrl(url, file = null, explicitRole = "") {
    const name = (file && file.name) || "Idle Screen";
    const role =
      explicitRole === "photo-choice" || /photo[\s_-]*choice/i.test(name)
        ? "photo-choice"
        : "idle";
    const urlKey = __appRuntimeContext.getAssetLibraryUrlKey(url);
    const storedAsset = (__appRuntimeContext.assetLibrary.assets || []).find(
      (asset) =>
        asset.category === "idle-screen" &&
        __appRuntimeContext.getAssetLibraryUrlKey(__appRuntimeContext.getAssetEntrySrc(asset)) === urlKey
    );
    return {
      src: url,
      orientation: __appRuntimeContext.normalizeIdleScreenOrientation(
        (storedAsset && storedAsset.orientation) ||
          __appRuntimeContext.inferAssetOrientationFromName(file)
      ),
      name,
      contentType: (file && file.type) || "",
      role,
      buttonZones:
        role === "photo-choice"
          ? {
              singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.singlePhoto),
              photoStrip: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.photoStrip),
            }
          : { start: __appRuntimeContext.normalizeIdleButtonZone() },
    };
  }

  function normalizeAssetLibraryPayload(payload) {
    return __appRuntimeContext.normalizeAssetLibraryRecords(payload, {
      photoChoiceZones: __appRuntimeContext.photoChoiceEditorZones,
    });
  }

  function saveAssetLibraryLocal() {
    try {
      localStorage.setItem(
        __appRuntimeContext.APP_CONFIG.STORAGE_KEYS.ASSET_LIBRARY,
        JSON.stringify(normalizeAssetLibraryPayload(__appRuntimeContext.assetLibrary))
      );
    } catch (_) {}
  }

  function loadAssetLibraryLocal() {
    try {
      __appRuntimeContext.assetLibrary = normalizeAssetLibraryPayload(
        JSON.parse(
          localStorage.getItem(__appRuntimeContext.APP_CONFIG.STORAGE_KEYS.ASSET_LIBRARY) || "{}"
        )
      );
    } catch (_) {
      __appRuntimeContext.assetLibrary = { assets: [] };
    }
  }

  function mergeLibraryAsset(asset) {
    const normalized = normalizeAssetLibraryPayload({ assets: [asset] }).assets[0];
    if (!normalized) return false;
    const library = normalizeAssetLibraryPayload(__appRuntimeContext.assetLibrary);
    const existingIndex = library.assets.findIndex(
      (item) =>
        item.id === normalized.id ||
        item.url === normalized.url ||
        __appRuntimeContext.getAssetLibraryId(item.category, item.url) ===
          __appRuntimeContext.getAssetLibraryId(normalized.category, normalized.url)
    );
    if (existingIndex >= 0) {
      const existing = library.assets[existingIndex];
      const tags = Array.from(
        new Set([...(existing.tags || []), ...(normalized.tags || [])])
      );
      library.assets[existingIndex] = {
        ...existing,
        ...normalized,
        tags,
        createdAt: existing.createdAt || normalized.createdAt,
        hidden: existing.hidden === true ? true : normalized.hidden,
        archived: existing.archived === true ? true : normalized.archived,
        updatedAt: new Date().toISOString(),
      };
    } else {
      library.assets.unshift(normalized);
    }
    __appRuntimeContext.assetLibrary = normalizeAssetLibraryPayload(library);
    saveAssetLibraryLocal();
    __appRuntimeContext.renderAssetLibrary();
    return true;
  }

  async function syncAssetLibraryRemoteAsset(asset) {
    if (!__appRuntimeContext.canSyncRemote()) return false;
    try {
      const resp = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      });
      return resp.ok;
    } catch (err) {
      console.warn("Asset library sync failed", err);
      return false;
    }
  }

  async function loadAssetLibraryRemote(themeCategory = getMainAssetLibraryCategory()) {
    loadAssetLibraryLocal();
    if (!__appRuntimeContext.canSyncRemote()) {
      __appRuntimeContext.renderAssetLibrary();
      return;
    }
    const normalizedThemeCategory = String(themeCategory || "").trim().toLowerCase();
    if (normalizedThemeCategory && __appRuntimeContext.loadedAssetLibraryThemeCategories.has(normalizedThemeCategory)) {
      __appRuntimeContext.renderAssetLibrary();
      return;
    }
    try {
      const query = normalizedThemeCategory
        ? `?themeCategory=${encodeURIComponent(normalizedThemeCategory)}`
        : "";
      const resp = await fetch(`/api/assets${query}`, { cache: "no-store" });
      if (!resp.ok) {
        __appRuntimeContext.renderAssetLibrary();
        return;
      }
      const remote = normalizeAssetLibraryPayload(await resp.json());
      const merged = normalizeAssetLibraryPayload({
        assets: [...(__appRuntimeContext.assetLibrary.assets || []), ...(remote.assets || [])],
      });
      __appRuntimeContext.assetLibrary = merged;
      saveAssetLibraryLocal();
      if (normalizedThemeCategory)
        __appRuntimeContext.loadedAssetLibraryThemeCategories.add(normalizedThemeCategory);
      __appRuntimeContext.renderAssetLibrary();
      if (__appRuntimeContext.activeTheme) {
        __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
        __appRuntimeContext.renderOptions();
      }
    } catch (err) {
      console.warn("Asset library load failed", err);
      __appRuntimeContext.renderAssetLibrary();
    }
  }

  function scheduleAssetLibraryRender() {
    __appRuntimeContext.renderAssetLibrary();
    if (__appRuntimeContext.activeTheme) {
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderOptions();
    }
  }

  async function updateAssetLibraryItem(id, patch = {}, fallbackAsset = null) {
    if (!id) return;
    const library = normalizeAssetLibraryPayload(__appRuntimeContext.assetLibrary);
    const index = library.assets.findIndex(
      (asset) =>
        asset.id === id ||
        __appRuntimeContext.getAssetLibraryId(asset.category, asset.url) === id
    );
    const baseRecord =
      index >= 0
        ? library.assets[index]
        : fallbackAsset
        ? {
            id,
            category: fallbackAsset.category,
            url: fallbackAsset.url,
            secure_url: fallbackAsset.url,
            name: getAssetDisplayName(fallbackAsset),
            tags: fallbackAsset.tags || [],
            editableFields: fallbackAsset.editableFields || [],
            customizable: fallbackAsset.customizable === true,
            createdAt: fallbackAsset.createdAt || "",
          }
        : null;
    if (!baseRecord) return;
    const nextRecord = {
      ...baseRecord,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) library.assets[index] = nextRecord;
    else library.assets.unshift(nextRecord);
    __appRuntimeContext.assetLibrary = normalizeAssetLibraryPayload(library);
    saveAssetLibraryLocal();
    scheduleAssetLibraryRender();
    let remoteSaved = true;
    if (__appRuntimeContext.canSyncRemote()) {
      try {
        const response = await fetch("/api/assets", {
          method: index >= 0 ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextRecord, id }),
        });
        remoteSaved = response.ok;
      } catch (err) {
        remoteSaved = false;
        console.warn("Asset library update failed", err);
      }
    }
    return remoteSaved;
  }

  async function deleteAssetLibraryItem(id, fallbackAsset = null) {
    if (!id) return;
    const fallbackUrl = fallbackAsset && (fallbackAsset.url || fallbackAsset.secure_url);
    const saved = await updateAssetLibraryItem(
      id,
      {
        category: fallbackAsset && fallbackAsset.category,
        url: fallbackUrl,
        secure_url: fallbackUrl,
        name: getAssetDisplayName(fallbackAsset),
        tags: (fallbackAsset && fallbackAsset.tags) || [],
        hidden: true,
        archived: true,
      },
      fallbackAsset
    );

    if (fallbackUrl) {
      const category = __appRuntimeContext.normalizeUploadedAssetCategory(
        fallbackAsset && fallbackAsset.category
      );
      if (category) {
        __appRuntimeContext.removeSessionAssetBySrc(category, fallbackUrl);
        if (category === "background") __appRuntimeContext.applyThemeBackground(__appRuntimeContext.activeTheme);
        if (__appRuntimeContext.DOM.options) __appRuntimeContext.renderOptions();
        __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
        __appRuntimeContext.renderAssetLibrary();
        __appRuntimeContext.updateLaunchSummary();
      }
    }
    return saved;
  }

  function getAssetDisplayName(asset) {
    if (asset && asset.name) return String(asset.name);
    const url = typeof asset === "string"
      ? asset
      : String((asset && (asset.url || asset.src || asset.secure_url)) || "");
    const filename = decodeURIComponent(url.split(/[?#]/, 1)[0].split("/").pop() || "");
    return filename.replace(/\.[a-z0-9]+$/i, "") || "Untitled asset";
  }

  function getAssetCreatedAtLabel(asset) {
    if (!asset) return "";
    const value = asset.createdAt || asset.created_at || "";
    if (!value || asset.source === "theme") return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }

  function createCanonicalAssetRow(entry, category, themeName, themeKey) {
    const src = __appRuntimeContext.getAssetEntrySrc(entry);
    if (!src) return null;
    const raw = entry && typeof entry === "object" ? entry : {};
    const name = getAssetDisplayName({
      name: raw.name,
      url: src,
    });
    const textFields =
      raw.textFields
        ? Object.keys(raw.textFields)
        : [];
    const editableFields = __appRuntimeContext.normalizeEditableFields([
      ...textFields,
      ...__appRuntimeContext.detectEditableFieldsFromText(name, src),
    ]);
    const normalizedCategory = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    return {
      id: __appRuntimeContext.getAssetLibraryId(normalizedCategory, src),
      category: normalizedCategory,
      url: src,
      secure_url: src,
      name,
      tags: __appRuntimeContext.normalizeAssetTags([themeName, themeKey]),
      source: "theme",
      createdAt: "",
      updatedAt: "",
      customizable: editableFields.length > 0,
      editableFields,
      contentType: String(raw.contentType || raw.type || "").trim(),
      orientation:
        normalizedCategory === "idle-screen"
          ? __appRuntimeContext.normalizeIdleScreenOrientation(raw.orientation)
          : undefined,
      role:
        normalizedCategory === "idle-screen"
          ? raw.role === "photo-choice" || /photo[\s_-]*choice/i.test(name)
            ? "photo-choice"
            : "idle"
          : undefined,
      buttonZones:
        normalizedCategory === "idle-screen"
          ? __appRuntimeContext.cloneThemeValue(raw.buttonZones || {})
          : undefined,
      raw: entry,
    };
  }

  function collectThemeAssetRows(category = "") {
    const filterCategory = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    const byKey = new Map();
    const add = (entry, rowCategory, themeName, themeKey) => {
      const row = createCanonicalAssetRow(entry, rowCategory, themeName, themeKey);
      if (!row) return;
      const key = row.id;
      if (!byKey.has(key)) {
        byKey.set(key, { ...row, themeKeys: [] });
      }
      const existing = byKey.get(key);
      if (!existing.themeKeys.includes(themeKey)) {
        existing.themeKeys.push(themeKey);
      }
    };
    const addThemeAssets = (theme, themeKey) => {
      const themeName = theme && theme.name ? theme.name : themeKey;
      if (
        theme &&
        typeof theme.background === "string" &&
        theme.background &&
        !theme.background.endsWith("/")
      ) {
        add(theme.background, "background", themeName, themeKey);
      }
      if (Array.isArray(theme && theme.backgrounds)) {
        theme.backgrounds.forEach((src) => add(src, "background", themeName, themeKey));
      }
      if (Array.isArray(theme && theme.overlays)) {
        theme.overlays.forEach((entry) => add(entry, "overlay", themeName, themeKey));
      }
      if (Array.isArray(theme && theme.templates)) {
        theme.templates.forEach((entry) => add(entry, "template", themeName, themeKey));
      }
      if (Array.isArray(theme && theme.idleScreens)) {
        theme.idleScreens.forEach((entry) =>
          add(entry, "idle-screen", themeName, themeKey)
        );
      }
    };
    __appRuntimeContext.forEachThemeEntry(addThemeAssets);
    (__appRuntimeContext.HOLIDAY_THEME_CATALOG || []).forEach(({ key, theme }) =>
      addThemeAssets(theme, key)
    );
    const activeEvent = __appRuntimeContext.getActiveEvent();
    if (
      activeEvent &&
      activeEvent.eventType === "wedding" &&
      activeEvent.weddingTheme &&
      activeEvent.themeKey
    ) {
      addThemeAssets(activeEvent.weddingTheme, activeEvent.themeKey);
    }
    return Array.from(byKey.values()).map((row) => ({
      ...row,
      categories: [...new Set(row.themeKeys.map(__appRuntimeContext.themeKeyToCategory))],
    }));
  }

  function mergeCanonicalAssetWithStoredRecord(base, stored) {
    if (!stored) return base;
    return {
      ...base,
      ...stored,
      source: base.source || stored.source || "library",
      url: base.url || stored.url,
      secure_url: base.secure_url || stored.secure_url || base.url || stored.url,
      category: base.category || stored.category,
      id: base.id || stored.id,
      tags: __appRuntimeContext.normalizeAssetTags(stored.tags && stored.tags.length ? stored.tags : base.tags),
      editableFields: __appRuntimeContext.normalizeEditableFields(
        stored.editableFields && stored.editableFields.length
          ? stored.editableFields
          : base.editableFields
      ),
      customizable:
        stored.customizable === true ||
        (stored.customizable !== false && base.customizable === true),
      hidden: stored.hidden === true || stored.archived === true,
      archived: stored.archived === true,
    };
  }

  function getCanonicalAssetCollection(category = "") {
    const filterCategory = __appRuntimeContext.normalizeUploadedAssetCategory(category);
    const themeRows = collectThemeAssetRows(filterCategory);
    const storedRows = (__appRuntimeContext.assetLibrary.assets || []).filter((asset) => {
      if (!asset) return false;
      if (filterCategory && asset.category !== filterCategory) return false;
      return true;
    });
    const storedById = new Map();
    storedRows.forEach((asset) => {
      if (!asset) return;
      if (asset.id) storedById.set(asset.id, asset);
      const canonicalId = __appRuntimeContext.getAssetLibraryId(asset.category, asset.url);
      if (canonicalId) storedById.set(canonicalId, asset);
    });
    const byId = new Map();
    themeRows.forEach((row) => {
      const merged = mergeCanonicalAssetWithStoredRecord(row, storedById.get(row.id));
      if (!merged.hidden && !merged.archived) byId.set(merged.id, merged);
    });
    storedRows.forEach((asset) => {
      if (byId.has(asset.id)) return;
      if (asset.hidden || asset.archived) return;
      byId.set(asset.id, { ...asset, source: "library" });
    });
    return Array.from(byId.values()).sort((a, b) =>
      getAssetDisplayName(a).localeCompare(getAssetDisplayName(b))
    );
  }

  function getAllAssetLibraryRows() {
    return getCanonicalAssetCollection();
  }

  function getAssetLibraryTrackingKey(asset) {
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category);
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    return category && src ? `${category}:${src}` : "";
  }

  function readAssetLibraryKeyList(storageKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string" && item.trim())
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveAssetLibraryKeyList(storageKey, keys) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(keys));
    } catch (_) {}
  }

  function getAssetLibraryFavoriteKeys() {
    return new Set(readAssetLibraryKeyList(__appRuntimeContext.ASSET_LIBRARY_FAVORITES_STORAGE_KEY));
  }

  function isAssetLibraryFavorite(asset) {
    const key = getAssetLibraryTrackingKey(asset);
    return !!key && getAssetLibraryFavoriteKeys().has(key);
  }

  function toggleAssetLibraryFavorite(asset) {
    const key = getAssetLibraryTrackingKey(asset);
    if (!key) return false;
    const keys = getAssetLibraryFavoriteKeys();
    const nextIsFavorite = !keys.has(key);
    if (nextIsFavorite) keys.add(key);
    else keys.delete(key);
    saveAssetLibraryKeyList(
      __appRuntimeContext.ASSET_LIBRARY_FAVORITES_STORAGE_KEY,
      Array.from(keys)
    );
    return nextIsFavorite;
  }

  function getAssetLibraryRecentKeys() {
    return readAssetLibraryKeyList(__appRuntimeContext.ASSET_LIBRARY_RECENTS_STORAGE_KEY);
  }

  function recordAssetLibraryRecent(asset) {
    const key = getAssetLibraryTrackingKey(asset);
    if (!key) return;
    const keys = getAssetLibraryRecentKeys().filter((item) => item !== key);
    keys.unshift(key);
    saveAssetLibraryKeyList(
      __appRuntimeContext.ASSET_LIBRARY_RECENTS_STORAGE_KEY,
      keys.slice(0, __appRuntimeContext.ASSET_LIBRARY_RECENT_LIMIT)
    );
  }

  function getVisibleAssetLibraryRows() {
    const currentThemeKey = __appRuntimeContext.normalizeThemeSelectionKey(__appRuntimeContext.getSelectedThemeKey());
    const selectedCategory = __appRuntimeContext.DOM.assetLibraryCategory
      ? __appRuntimeContext.DOM.assetLibraryCategory.value
      : "";
    const themeCategory = selectedCategory || getMainAssetLibraryCategory();
    const holidayThemeKey = __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey || "";
    const themeKey = holidayThemeKey || (themeCategory === "holidays" ? "" : currentThemeKey);
    const isHolidayBrowse = themeCategory === "holidays";
    return getAllAssetLibraryRows().filter((asset) => {
      if (__appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category) === "idle-screen")
        return false;
      const themeKeys = Array.isArray(asset.themeKeys) ? asset.themeKeys : [];
      if (themeKeys.length) {
        if (themeKey) return themeKeys.includes(themeKey);
        if (isHolidayBrowse) {
          return themeKeys.some(
            (key) => __appRuntimeContext.themeKeyToCategory(key) === "holidays"
          );
        }
        return themeKeys.includes(currentThemeKey);
      }
      const tags = Array.isArray(asset.tags) ? asset.tags : [];
      if (themeKey && tags.includes(themeKey)) return true;
      return __appRuntimeContext.getAssetLibraryFilterCategories(asset).includes(themeCategory);
    });
  }

  function getMainAssetLibraryCategory() {
    return __appRuntimeContext.themeKeyToCategory(__appRuntimeContext.getSelectedThemeKey() || __appRuntimeContext.DEFAULT_THEME_KEY);
  }

  function getFilteredAssetLibraryRows() {
    const query = __appRuntimeContext.DOM.assetLibrarySearch
      ? __appRuntimeContext.DOM.assetLibrarySearch.value.trim().toLowerCase()
      : "";
    const category = __appRuntimeContext.DOM.assetLibraryCategory
      ? __appRuntimeContext.DOM.assetLibraryCategory.value || getMainAssetLibraryCategory()
      : getMainAssetLibraryCategory();
    const pillCategory = __appRuntimeContext.assetLibraryState.selectedCategory || "";
    const sortMode = __appRuntimeContext.DOM.assetLibrarySort ? __appRuntimeContext.DOM.assetLibrarySort.value : "newest";
    return __appRuntimeContext.filterAssetLibraryRows(
      getVisibleAssetLibraryRows(),
      {
        query,
        category,
        pillCategory,
        sortMode,
        themeKey: __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey,
        themeLabel: __appRuntimeContext.DOM.assetLibraryHolidayTheme
          ? __appRuntimeContext.DOM.assetLibraryHolidayTheme.selectedOptions[0]?.textContent || ""
          : "",
      },
      {
        favoriteKeys: getAssetLibraryFavoriteKeys(),
        recentKeys: getAssetLibraryRecentKeys(),
        getDisplayName: getAssetDisplayName,
        getTrackingKey: getAssetLibraryTrackingKey,
      }
    );
  }

  function clearAssetLibraryFilters() {
    if (__appRuntimeContext.DOM.assetLibrarySearch) __appRuntimeContext.DOM.assetLibrarySearch.value = "";
    if (__appRuntimeContext.DOM.assetLibraryCategory) __appRuntimeContext.DOM.assetLibraryCategory.value = "";
    __appRuntimeContext.assetLibraryState.selectedCategory = "";
    __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey = "";
    if (__appRuntimeContext.DOM.assetLibraryHolidayTheme) {
      __appRuntimeContext.DOM.assetLibraryHolidayTheme.value = "";
    }
    __appRuntimeContext.resetAssetLibraryVisibleCount();
    __appRuntimeContext.renderAssetLibrary();
  }

  function isAssetHiddenByCurrentLibraryFilters(asset) {
    if (!asset) return false;
    return !getFilteredAssetLibraryRows().some((row) => row.id === asset.id);
  }

  function getAssetThemeDefaultCount(asset) {
    const category = __appRuntimeContext.normalizeUploadedAssetCategory(asset && asset.category);
    const src = __appRuntimeContext.getAssetEntrySrc(asset);
    if (!category || !src) return 0;
    return __appRuntimeContext.getSelectableThemeEntries().filter(({ theme }) =>
      __appRuntimeContext.getExplicitThemeAssetEntries(category, theme).some(
        (item) => __appRuntimeContext.getAssetEntrySrc(item) === src
      )
    ).length;
  }

  function promptForAssetTags(asset) {
    if (!asset) return;
    const value = prompt("Tags, comma-separated", (asset.tags || []).join(", "));
    if (value === null) return;
    updateAssetLibraryItem(
      asset.id,
      { tags: __appRuntimeContext.normalizeAssetTags(value) },
      asset
    );
  }

  function promptForAssetName(asset) {
    if (!asset) return;
    const value = prompt("Asset name", getAssetDisplayName(asset));
    if (value === null) return;
    const name = value.trim();
    if (!name) return;
    updateAssetLibraryItem(asset.id, { name }, asset);
  }

  function getContainedImageRect(img, container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const naturalWidth = img.naturalWidth || img.videoWidth || width;
    const naturalHeight = img.naturalHeight || img.videoHeight || height;
    const scale = Math.min(width / naturalWidth, height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    return { left: (width - renderedWidth) / 2, top: (height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight };
  }

  function getIdleScreenEditorMedia() {
    return __appRuntimeContext.activeIdleScreenEditorAsset && __appRuntimeContext.isVideoAsset(__appRuntimeContext.activeIdleScreenEditorAsset)
      ? __appRuntimeContext.DOM.idleScreenEditorVideo
      : __appRuntimeContext.DOM.idleScreenEditorImage;
  }

  function renderIdleScreenEditorZone() {
    const media = getIdleScreenEditorMedia();
    if (!media || !__appRuntimeContext.DOM.idleScreenEditorCanvas) return;
    const rect = getContainedImageRect(media, __appRuntimeContext.DOM.idleScreenEditorCanvas);
    const render = (element, zoneValue) => {
      if (!element) return;
      const zone = __appRuntimeContext.normalizeIdleButtonZone(zoneValue);
      Object.assign(element.style, {
        left: `${rect.left + (zone.x / 100) * rect.width}px`,
        top: `${rect.top + (zone.y / 100) * rect.height}px`,
        width: `${(zone.width / 100) * rect.width}px`,
        height: `${(zone.height / 100) * rect.height}px`,
      });
    };
    render(__appRuntimeContext.DOM.idleScreenEditorZone, __appRuntimeContext.idleScreenEditorZone);
    render(__appRuntimeContext.DOM.photoChoiceSingleZone, __appRuntimeContext.photoChoiceEditorZones.singlePhoto);
    render(__appRuntimeContext.DOM.photoChoiceStripZone, __appRuntimeContext.photoChoiceEditorZones.photoStrip);
  }

  function bindIdleScreenEditorPointer() {
    const bind = (zoneElement, getZone, setZone) => {
    if (!zoneElement || zoneElement.dataset.bound === "true") return;
    zoneElement.dataset.bound = "true";
    zoneElement.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const resize = event.target.tagName === "I";
      const startX = event.clientX;
      const startY = event.clientY;
      const original = { ...getZone() };
      zoneElement.setPointerCapture(event.pointerId);
      const move = (nextEvent) => {
        const media = getIdleScreenEditorMedia();
        if (!media) return;
        const rect = getContainedImageRect(media, __appRuntimeContext.DOM.idleScreenEditorCanvas);
        const dx = ((nextEvent.clientX - startX) / rect.width) * 100;
        const dy = ((nextEvent.clientY - startY) / rect.height) * 100;
        const nextZone = resize
          ? __appRuntimeContext.normalizeIdleButtonZone({ ...original, width: original.width + dx * 2, height: original.height + dy * 2 })
          : __appRuntimeContext.normalizeIdleButtonZone({ ...original, x: original.x + dx, y: original.y + dy });
        setZone(nextZone);
        renderIdleScreenEditorZone();
      };
      const stop = () => {
        zoneElement.removeEventListener("pointermove", move);
        zoneElement.removeEventListener("pointerup", stop);
        zoneElement.removeEventListener("pointercancel", stop);
      };
      zoneElement.addEventListener("pointermove", move);
      zoneElement.addEventListener("pointerup", stop);
      zoneElement.addEventListener("pointercancel", stop);
    });
    };
    bind(__appRuntimeContext.DOM.idleScreenEditorZone, () => __appRuntimeContext.idleScreenEditorZone, (zone) => { __appRuntimeContext.idleScreenEditorZone = zone; });
    bind(__appRuntimeContext.DOM.photoChoiceSingleZone, () => __appRuntimeContext.photoChoiceEditorZones.singlePhoto, (zone) => { __appRuntimeContext.photoChoiceEditorZones.singlePhoto = zone; });
    bind(__appRuntimeContext.DOM.photoChoiceStripZone, () => __appRuntimeContext.photoChoiceEditorZones.photoStrip, (zone) => { __appRuntimeContext.photoChoiceEditorZones.photoStrip = zone; });
  }

  function closeIdleScreenEditor() {
    if (__appRuntimeContext.DOM.idleScreenEditorVideo) __appRuntimeContext.DOM.idleScreenEditorVideo.pause();
    __appRuntimeContext.activeIdleScreenEditorAsset = null;
    if (__appRuntimeContext.DOM.idleScreenEditorModal) __appRuntimeContext.DOM.idleScreenEditorModal.classList.add("hidden");
  }

  function openIdleScreenEditor(asset) {
    if (!asset || !__appRuntimeContext.DOM.idleScreenEditorModal) return;
    __appRuntimeContext.activeIdleScreenEditorAsset = asset;
    const isPhotoChoice = asset.role === "photo-choice" || /photo[\s_-]*choice/i.test(asset.name || "");
    const title = document.getElementById("idleScreenEditorTitle");
    if (title) title.textContent = isPhotoChoice ? "Position Photo Choice Hotspots" : "Position Start Hotspot";
    if (__appRuntimeContext.DOM.idleScreenResetZone)
      __appRuntimeContext.DOM.idleScreenResetZone.textContent = isPhotoChoice ? "Reset choice positions" : "Reset button position";
    __appRuntimeContext.idleScreenEditorZone = __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.start);
    __appRuntimeContext.photoChoiceEditorZones = {
      singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.singlePhoto || __appRuntimeContext.photoChoiceEditorZones.singlePhoto),
      photoStrip: __appRuntimeContext.normalizeIdleButtonZone(asset.buttonZones && asset.buttonZones.photoStrip || __appRuntimeContext.photoChoiceEditorZones.photoStrip),
    };
    __appRuntimeContext.DOM.idleScreenEditorZone.classList.toggle("hidden", isPhotoChoice);
    __appRuntimeContext.DOM.photoChoiceSingleZone.classList.toggle("hidden", !isPhotoChoice);
    __appRuntimeContext.DOM.photoChoiceStripZone.classList.toggle("hidden", !isPhotoChoice);
    __appRuntimeContext.DOM.idleScreenOrientation.value = __appRuntimeContext.normalizeIdleScreenOrientation(asset.orientation) === "portrait" ? "portrait" : "landscape";
    __appRuntimeContext.DOM.idleScreenEditorImage.classList.toggle("hidden", __appRuntimeContext.isVideoAsset(asset));
    __appRuntimeContext.DOM.idleScreenEditorVideo.classList.toggle("hidden", !__appRuntimeContext.isVideoAsset(asset));
    if (__appRuntimeContext.isVideoAsset(asset)) {
      __appRuntimeContext.DOM.idleScreenEditorVideo.onloadedmetadata = renderIdleScreenEditorZone;
      __appRuntimeContext.DOM.idleScreenEditorVideo.crossOrigin = "anonymous";
      __appRuntimeContext.DOM.idleScreenEditorVideo.src = __appRuntimeContext.getAssetEntrySrc(asset);
      __appRuntimeContext.DOM.idleScreenEditorVideo.load();
      __appRuntimeContext.DOM.idleScreenEditorVideo.play().catch(() => {});
    } else {
      __appRuntimeContext.DOM.idleScreenEditorImage.onload = renderIdleScreenEditorZone;
      __appRuntimeContext.DOM.idleScreenEditorImage.src = __appRuntimeContext.getAssetEntrySrc(asset);
    }
    __appRuntimeContext.DOM.idleScreenEditorModal.classList.remove("hidden");
    bindIdleScreenEditorPointer();
  }

  function saveIdleScreenEditor() {
    if (!__appRuntimeContext.activeIdleScreenEditorAsset) return;
    const isPhotoChoice = __appRuntimeContext.activeIdleScreenEditorAsset.role === "photo-choice";
    updateAssetLibraryItem(
      __appRuntimeContext.activeIdleScreenEditorAsset.id,
      {
        orientation: __appRuntimeContext.DOM.idleScreenOrientation.value,
        role: __appRuntimeContext.activeIdleScreenEditorAsset.role === "photo-choice" ? "photo-choice" : "idle",
        buttonZones:
          __appRuntimeContext.activeIdleScreenEditorAsset.role === "photo-choice"
            ? {
                singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.singlePhoto),
                photoStrip: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.photoStrip),
              }
            : { start: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.idleScreenEditorZone) },
      },
      __appRuntimeContext.activeIdleScreenEditorAsset
    );
    closeIdleScreenEditor();
    __appRuntimeContext.showToast(isPhotoChoice ? "Photo choice hotspots saved." : "Idle screen hotspot saved.");
  }

  function createDefaultOverlayPhotoSlot() {
    return {
      x: 0.15,
      y: 0.15,
      width: 0.7,
      height: 0.7,
      borderRadius: 0,
      objectFit: "cover",
      objectPosition: "center",
      sourceIndex: 0,
    };
  }

  function normalizeOverlaySlotEditorSlot(slot) {
    const source = __appRuntimeContext.normalizePhotoSlotDescriptor(slot || createDefaultOverlayPhotoSlot(), 0);
    if (!source || !source.width || !source.height) return createDefaultOverlayPhotoSlot();
    return {
      ...source,
      x: Math.min(source.x, 1 - source.width),
      y: Math.min(source.y, 1 - source.height),
    };
  }

  function renderOverlaySlotEditorZone() {
    const canvas = __appRuntimeContext.DOM.overlaySlotEditorCanvas;
    const firstZone = __appRuntimeContext.DOM.overlaySlotEditorZone;
    const slots = __appRuntimeContext.overlaySlotEditorSlots || [];
    if (!canvas || !firstZone || !slots.length) return;
    const zones = [firstZone, ...canvas.querySelectorAll(".overlay-slot-editor-zone-extra")];
    while (zones.length < slots.length) {
      const zone = firstZone.cloneNode(true);
      zone.removeAttribute("id");
      zone.classList.add("overlay-slot-editor-zone-extra");
      canvas.appendChild(zone);
      zones.push(zone);
    }
    zones.slice(slots.length).forEach((zone) => zone.remove());
    zones.slice(0, slots.length).forEach((zone, index) => {
      const slot = slots[index];
      zone.dataset.slotIndex = String(index);
      zone.classList.toggle("is-selected", index === __appRuntimeContext.overlaySlotEditorSelectedIndex);
      zone.style.left = `${slot.x * 100}%`;
      zone.style.top = `${slot.y * 100}%`;
      zone.style.width = `${slot.width * 100}%`;
      zone.style.height = `${slot.height * 100}%`;
      const label = zone.querySelector("span");
      if (label) label.textContent = `Photo ${index + 1}`;
    });
    __appRuntimeContext.overlaySlotEditorSlot = slots[__appRuntimeContext.overlaySlotEditorSelectedIndex] || slots[0];
    if (__appRuntimeContext.DOM.overlaySlotEditorFit) {
      __appRuntimeContext.DOM.overlaySlotEditorFit.value = __appRuntimeContext.overlaySlotEditorSlot.objectFit || "cover";
    }
  }

  function bindOverlaySlotEditorPointer() {
    const canvas = __appRuntimeContext.DOM.overlaySlotEditorCanvas;
    if (!__appRuntimeContext.DOM.overlaySlotEditorZone || !canvas || canvas.dataset.bound === "true") return;
    canvas.dataset.bound = "true";
    canvas.addEventListener("pointerdown", (event) => {
      const zone = event.target.closest(".overlay-slot-editor-zone");
      if (!zone || !__appRuntimeContext.overlaySlotEditorSlots.length) return;
      event.preventDefault();
      __appRuntimeContext.overlaySlotEditorSelectedIndex = Number(zone.dataset.slotIndex || 0);
      __appRuntimeContext.overlaySlotEditorSlot = __appRuntimeContext.overlaySlotEditorSlots[__appRuntimeContext.overlaySlotEditorSelectedIndex];
      renderOverlaySlotEditorZone();
      zone.setPointerCapture(event.pointerId);
      const resize = event.target.tagName === "I";
      const startX = event.clientX;
      const startY = event.clientY;
      const original = { ...__appRuntimeContext.overlaySlotEditorSlot };
      zone.setPointerCapture(event.pointerId);
      const move = (nextEvent) => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dx = (nextEvent.clientX - startX) / rect.width;
        const dy = (nextEvent.clientY - startY) / rect.height;
        if (resize) {
          __appRuntimeContext.overlaySlotEditorSlots[__appRuntimeContext.overlaySlotEditorSelectedIndex] = normalizeOverlaySlotEditorSlot({
            ...original,
            width: Math.min(1 - original.x, Math.max(0.06, original.width + dx)),
            height: Math.min(1 - original.y, Math.max(0.06, original.height + dy)),
          });
        } else {
          __appRuntimeContext.overlaySlotEditorSlots[__appRuntimeContext.overlaySlotEditorSelectedIndex] = normalizeOverlaySlotEditorSlot({
            ...original,
            x: Math.max(0, Math.min(1 - original.width, original.x + dx)),
            y: Math.max(0, Math.min(1 - original.height, original.y + dy)),
          });
        }
        __appRuntimeContext.overlaySlotEditorSlot = __appRuntimeContext.overlaySlotEditorSlots[__appRuntimeContext.overlaySlotEditorSelectedIndex];
        renderOverlaySlotEditorZone();
      };
      const stop = () => {
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerup", stop);
        zone.removeEventListener("pointercancel", stop);
      };
      zone.addEventListener("pointermove", move);
      zone.addEventListener("pointerup", stop);
      zone.addEventListener("pointercancel", stop);
    });
  }

  function closeOverlaySlotEditor() {
    __appRuntimeContext.activeOverlaySlotEditorAsset = null;
    __appRuntimeContext.overlaySlotEditorSlot = null;
    __appRuntimeContext.overlaySlotEditorSlots = [];
    __appRuntimeContext.overlaySlotEditorSelectedIndex = 0;
    __appRuntimeContext.DOM.overlaySlotEditorCanvas?.querySelectorAll(".overlay-slot-editor-zone-extra").forEach((zone) => zone.remove());
    if (__appRuntimeContext.DOM.overlaySlotEditorModal) __appRuntimeContext.DOM.overlaySlotEditorModal.classList.add("hidden");
  }

  function openOverlaySlotEditor(asset) {
    if (!asset || !__appRuntimeContext.DOM.overlaySlotEditorModal || !__appRuntimeContext.DOM.overlaySlotEditorArtwork) return;
    __appRuntimeContext.activeOverlaySlotEditorAsset = asset;
    const savedSlots = Array.isArray(asset.photoSlots) && asset.photoSlots.length
      ? asset.photoSlots
      : Array.isArray(asset.raw && asset.raw.photoSlots)
        ? asset.raw.photoSlots
        : [];
    __appRuntimeContext.overlaySlotEditorSlots = (savedSlots.length ? savedSlots : [createDefaultOverlayPhotoSlot()])
      .map((slot) => normalizeOverlaySlotEditorSlot(slot));
    __appRuntimeContext.overlaySlotEditorSelectedIndex = 0;
    __appRuntimeContext.overlaySlotEditorSlot = __appRuntimeContext.overlaySlotEditorSlots[0];
    const sampleSrc = __appRuntimeContext.DOM.lastShot ? __appRuntimeContext.DOM.lastShot.getAttribute("src") || "" : "";
    if (__appRuntimeContext.DOM.overlaySlotEditorSample) {
      __appRuntimeContext.DOM.overlaySlotEditorSample.src = sampleSrc;
      __appRuntimeContext.DOM.overlaySlotEditorSample.classList.toggle("hidden", !sampleSrc);
    }
    __appRuntimeContext.DOM.overlaySlotEditorArtwork.onload = () => {
      const width = __appRuntimeContext.DOM.overlaySlotEditorArtwork.naturalWidth;
      const height = __appRuntimeContext.DOM.overlaySlotEditorArtwork.naturalHeight;
      if (width && height && __appRuntimeContext.DOM.overlaySlotEditorCanvas) {
        __appRuntimeContext.DOM.overlaySlotEditorCanvas.style.aspectRatio = `${width} / ${height}`;
      }
      renderOverlaySlotEditorZone();
    };
    __appRuntimeContext.DOM.overlaySlotEditorArtwork.src = __appRuntimeContext.getAssetEntrySrc(asset);
    __appRuntimeContext.DOM.overlaySlotEditorModal.classList.remove("hidden");
    bindOverlaySlotEditorPointer();
    renderOverlaySlotEditorZone();
  }

  function replaceSavedPhotoSlotInThemes(asset, photoSlots) {
    const category = asset.category === "template" ? "template" : "overlay";
    const arrayName = category === "template" ? "templates" : "overlays";
    const assetSrc = __appRuntimeContext.getAssetEntrySrc(asset);
    __appRuntimeContext.forEachThemeEntry((theme) => {
      if (!Array.isArray(theme[arrayName])) return;
      theme[arrayName] = theme[arrayName].map((entry) => {
        if (__appRuntimeContext.getAssetEntrySrc(entry) !== assetSrc) return entry;
        if (category === "overlay" && typeof entry === "string") {
          return { src: entry, name: asset.name, photoSlots: __appRuntimeContext.cloneThemeValue(photoSlots) };
        }
        return { ...entry, photoSlots: __appRuntimeContext.cloneThemeValue(photoSlots) };
      });
    });
    __appRuntimeContext.saveThemesToStorage();
  }

  async function saveOverlaySlotEditor() {
    if (!__appRuntimeContext.activeOverlaySlotEditorAsset || !__appRuntimeContext.overlaySlotEditorSlot) return;
    const photoSlots = __appRuntimeContext.overlaySlotEditorSlots.map((slot) => normalizeOverlaySlotEditorSlot(slot));
    const asset = __appRuntimeContext.activeOverlaySlotEditorAsset;
    await updateAssetLibraryItem(asset.id, { photoSlots }, asset);
    replaceSavedPhotoSlotInThemes(asset, photoSlots);
    if (__appRuntimeContext.activeTheme) {
      __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
      __appRuntimeContext.renderOptions();
    }
    closeOverlaySlotEditor();
    __appRuntimeContext.showToast("Photo window saved. It will use this exact placement on the final photo.");
  }

  return {
    saveTheme,
    readFileAsDataURL,
    getAssetIndex,
    normalizeManagedLocalAssetReference,
    objectReferencesLocalAsset,
    localAssetStillReferenced,
    pruneAssetIndexForUrl,
    cleanupUnusedLocalAsset,
    scheduleLocalAssetCleanup,
    slugifyThemeAssetScope,
    getThemeAssetUploadOptionsForKey,
    getManagedLocalAssetFilename,
    migrateManagedLocalAsset,
    migrateManagedLocalStringList,
    migrateManagedLocalTemplateList,
    migrateManagedLocalSingle,
    migrateThemeManagedLocalAssets,
    migrateEventManagedLocalAssets,
    migrateAllManagedLocalAssets,
    fileSha256Hex,
    extFromName,
    buildIdleScreenEntryFromUrl,
    normalizeAssetLibraryPayload,
    saveAssetLibraryLocal,
    loadAssetLibraryLocal,
    mergeLibraryAsset,
    syncAssetLibraryRemoteAsset,
    loadAssetLibraryRemote,
    scheduleAssetLibraryRender,
    updateAssetLibraryItem,
    deleteAssetLibraryItem,
    getAssetDisplayName,
    getAssetCreatedAtLabel,
    createCanonicalAssetRow,
    collectThemeAssetRows,
    mergeCanonicalAssetWithStoredRecord,
    getCanonicalAssetCollection,
    getAllAssetLibraryRows,
    getAssetLibraryTrackingKey,
    readAssetLibraryKeyList,
    saveAssetLibraryKeyList,
    getAssetLibraryFavoriteKeys,
    isAssetLibraryFavorite,
    toggleAssetLibraryFavorite,
    getAssetLibraryRecentKeys,
    recordAssetLibraryRecent,
    getVisibleAssetLibraryRows,
    getMainAssetLibraryCategory,
    getFilteredAssetLibraryRows,
    clearAssetLibraryFilters,
    isAssetHiddenByCurrentLibraryFilters,
    getAssetThemeDefaultCount,
    promptForAssetTags,
    promptForAssetName,
    getContainedImageRect,
    getIdleScreenEditorMedia,
    renderIdleScreenEditorZone,
    bindIdleScreenEditorPointer,
    closeIdleScreenEditor,
    openIdleScreenEditor,
    saveIdleScreenEditor,
    createDefaultOverlayPhotoSlot,
    normalizeOverlaySlotEditorSlot,
    renderOverlaySlotEditorZone,
    bindOverlaySlotEditorPointer,
    closeOverlaySlotEditor,
    openOverlaySlotEditor,
    replaceSavedPhotoSlotInThemes,
    saveOverlaySlotEditor,
  };
}
