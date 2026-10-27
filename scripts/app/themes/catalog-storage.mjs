export function createCatalogStorageModule(__appRuntimeContext) {
  function saveThemesToStorage() {
    // Normalize to avoid duplicates across overlays/templates, and strip empties
    ensureBuiltinThemes();
    if (!hasCoreBuiltins(__appRuntimeContext.themes)) {
      resetThemesToBuiltins("core themes missing before save");
    }
    try {
      __appRuntimeContext.normalizeAllThemes();
    } catch (_e) {}
    localStorage.setItem("photoboothThemes", JSON.stringify(__appRuntimeContext.themes));
    // Best-effort remote sync
    __appRuntimeContext.scheduleThemesRemoteSync();
  }

  function addMissingDefaults(target, source) {
    if (!source || typeof source !== "object") return;
    if (!target || typeof target !== "object") return;
    for (const key of Object.keys(source)) {
      const src = source[key];
      const tgt = target ? target[key] : undefined;
      if (Array.isArray(src)) {
        if (!Array.isArray(tgt) || tgt.length === 0) {
          target[key] = src.slice();
        }
      } else if (src && typeof src === "object") {
        if (!tgt || typeof tgt !== "object") {
          target[key] = __appRuntimeContext.cloneThemeValue(src);
        } else {
          addMissingDefaults(tgt, src);
        }
      } else {
        const needs =
          tgt === undefined ||
          tgt === null ||
          (typeof tgt === "string" && tgt.trim() === "");
        if (needs) {
          target[key] = src;
        }
      }
    }
  }

  function pruneMisplacedBuiltinThemes(target) {
    if (!target || typeof target !== "object") return;
    for (const rootKey of Object.keys(target)) {
      const group = target[rootKey];
      if (!group || typeof group !== "object") continue;
      if (__appRuntimeContext.BUILTIN_THEMES[rootKey] && __appRuntimeContext.BUILTIN_THEMES[rootKey].name) {
        group.name = __appRuntimeContext.BUILTIN_THEMES[rootKey].name;
      }
      for (const extraKey of Object.keys(group)) {
        if (!["name", "themes", "holidays"].includes(extraKey)) {
          delete group[extraKey];
        }
      }
      for (const bucket of ["themes", "holidays"]) {
        if (!group[bucket] || typeof group[bucket] !== "object") continue;
        for (const key of Object.keys(group[bucket])) {
          const loc = __appRuntimeContext.BUILTIN_THEME_LOCATIONS[key];
          if (loc && (loc.root !== rootKey || loc.bucket !== bucket)) {
            delete group[bucket][key];
          }
        }
      }
    }
  }

  function pruneUnapprovedBuiltinThemes(target) {
    return __appRuntimeContext.pruneUnapprovedThemes(target, __appRuntimeContext.APPROVED_THEME_KEYS);
  }

  function ensureBuiltinThemes() {
    if (!__appRuntimeContext.themes || typeof __appRuntimeContext.themes !== "object") __appRuntimeContext.themes = {};
    migrateLegacyBuiltinRootThemeDefaults();
    for (const rootKey of Object.keys(__appRuntimeContext.BUILTIN_THEMES)) {
      const builtinGroup = __appRuntimeContext.BUILTIN_THEMES[rootKey];
      if (!builtinGroup || typeof builtinGroup !== "object") continue;
      if (!__appRuntimeContext.themes[rootKey] || typeof __appRuntimeContext.themes[rootKey] !== "object") {
        __appRuntimeContext.themes[rootKey] = __appRuntimeContext.cloneThemeValue(builtinGroup);
        continue;
      }
      const targetGroup = __appRuntimeContext.themes[rootKey];
      // Ensure optgroup metadata like name exists
      addMissingDefaults(targetGroup, builtinGroup);
      for (const bucket of ["themes", "holidays"]) {
        if (!builtinGroup[bucket] || typeof builtinGroup[bucket] !== "object")
          continue;
        if (!targetGroup[bucket] || typeof targetGroup[bucket] !== "object") {
          targetGroup[bucket] = {};
        }
        const targetBucket = targetGroup[bucket];
        for (const subKey of Object.keys(builtinGroup[bucket])) {
          if (!__appRuntimeContext.APPROVED_THEME_KEYS.has(`${rootKey}:${subKey}`)) continue;
          const builtinTheme = builtinGroup[bucket][subKey];
          if (!targetBucket[subKey] || typeof targetBucket[subKey] !== "object") {
            targetBucket[subKey] = __appRuntimeContext.cloneThemeValue(builtinTheme);
          } else {
            addMissingDefaults(targetBucket[subKey], builtinTheme);
          }
        }
      }
    }
    pruneMisplacedBuiltinThemes(__appRuntimeContext.themes);
    const removedUnapprovedThemes = pruneUnapprovedBuiltinThemes(__appRuntimeContext.themes);
    for (const rootKey of Object.keys(__appRuntimeContext.themes)) {
      if (rootKey === "_meta") continue;
      const group = __appRuntimeContext.themes[rootKey];
      if (!group || typeof group !== "object") continue;
      const hasApprovedThemes = ["themes", "holidays"].some((bucket) =>
        Object.keys(group[bucket] || {}).some((leafKey) =>
          __appRuntimeContext.APPROVED_THEME_KEYS.has(`${rootKey}:${leafKey}`)
        )
      );
      if (!hasApprovedThemes) delete __appRuntimeContext.themes[rootKey];
    }
    return removedUnapprovedThemes;
  }

  function migrateOptimizedAveryScreenAssets(target = __appRuntimeContext.themes) {
    const theme = target?.general?.themes?.averyBirthday;
    if (!theme || typeof theme !== "object") return false;
    const screens = Array.isArray(theme.idleScreens) ? theme.idleScreens : [];
    const replacements = {
      "/assets/themes/avery-birthday/avery-birthday-idle-portrait.webp": "/assets/themes/avery-birthday/avery-birthday-idle-portrait.webp",
      "/assets/themes/avery-birthday/avery-birthday-idle-landscape.webp": "/assets/themes/avery-birthday/avery-birthday-idle-landscape.webp",
      "/assets/themes/avery-birthday/avery-birthday-photo-choice-portrait.webp": "/assets/themes/avery-birthday/avery-birthday-photo-choice-portrait.webp",
      "/assets/themes/avery-birthday/avery-birthday-photo-choice-landscape.webp": "/assets/themes/avery-birthday/avery-birthday-photo-choice-landscape.webp",
    };
    let migrated = false;
    screens.forEach((screen) => {
      const nextSrc = screen && replacements[screen.src];
      if (!nextSrc) return;
      screen.src = nextSrc;
      migrated = true;
    });
    const legacyBirthdayBackground =
      "https://res.cloudinary.com/afletch32/image/upload/v1783788398/photobooth/events/assets/birthday-background-1_wbydtd.png";
    if (
      Array.isArray(theme.backgrounds) &&
      theme.backgrounds.length === 1 &&
      theme.backgrounds[0] === legacyBirthdayBackground
    ) {
      theme.backgrounds = [
        "/assets/themes/avery-birthday/avery-birthday-background-landscape.webp",
      ];
      migrated = true;
    }
    const overlayDefaults =
      __appRuntimeContext.BUILTIN_THEMES.general?.themes?.averyBirthday?.overlays || [];
    const removedOverlaySources = new Set(
      (Array.isArray(theme.overlaysRemoved) ? theme.overlaysRemoved : [])
        .map(__appRuntimeContext.getAssetEntrySrc)
        .filter(Boolean)
    );
    if (!Array.isArray(theme.overlays)) theme.overlays = [];
    const missingOverlayDefaults = overlayDefaults.filter((overlay) => {
      const src = __appRuntimeContext.getAssetEntrySrc(overlay);
      if (
        !src ||
        removedOverlaySources.has(src) ||
        theme.overlays.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry) === src)
      ) {
        return false;
      }
      return true;
    });
    if (missingOverlayDefaults.length) {
      theme.overlays = [
        ...missingOverlayDefaults.map(__appRuntimeContext.cloneThemeValue),
        ...theme.overlays,
      ];
      migrated = true;
    }
    const builtinOverlayBackgrounds = new Map(
      overlayDefaults
        .map((overlay) => [__appRuntimeContext.getAssetEntrySrc(overlay), overlay && overlay.background])
        .filter(([src, background]) => src && background)
    );
    theme.overlays.forEach((overlay) => {
      if (!overlay || typeof overlay !== "object" || overlay.background) return;
      const pairedBackground = builtinOverlayBackgrounds.get(__appRuntimeContext.getAssetEntrySrc(overlay));
      if (!pairedBackground) return;
      overlay.background = __appRuntimeContext.cloneThemeValue(pairedBackground);
      migrated = true;
    });
    const backgroundDefaults =
      __appRuntimeContext.BUILTIN_THEMES.general?.themes?.averyBirthday?.backgrounds || [];
    const removedBackgroundSources = new Set(
      (Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : [])
        .map(__appRuntimeContext.getAssetEntrySrc)
        .filter(Boolean)
    );
    if (!Array.isArray(theme.backgrounds)) theme.backgrounds = [];
    const missingBackgroundDefaults = backgroundDefaults.filter((background) => {
      const src = __appRuntimeContext.getAssetEntrySrc(background);
      return (
        src &&
        !removedBackgroundSources.has(src) &&
        !theme.backgrounds.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry) === src)
      );
    });
    if (missingBackgroundDefaults.length) {
      theme.backgrounds = [
        ...missingBackgroundDefaults.map(__appRuntimeContext.cloneThemeValue),
        ...theme.backgrounds,
      ];
      migrated = true;
    }
    const greenBackgroundDefaults =
      __appRuntimeContext.BUILTIN_THEMES.general?.themes?.averyBirthday?.greenBackgrounds || [];
    if (!Array.isArray(theme.greenBackgrounds)) theme.greenBackgrounds = [];
    const missingGreenBackgroundDefaults = greenBackgroundDefaults.filter((background) => {
      const src = __appRuntimeContext.getAssetEntrySrc(background);
      return src && !theme.greenBackgrounds.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry) === src);
    });
    if (missingGreenBackgroundDefaults.length) {
      theme.greenBackgrounds = [
        ...missingGreenBackgroundDefaults.map(__appRuntimeContext.cloneThemeValue),
        ...theme.greenBackgrounds,
      ];
      migrated = true;
    }
    return migrated;
  }

  function migrateAmandaNorthScreenAssets(target = __appRuntimeContext.themes) {
    const theme = target?.youth?.themes?.ane;
    const defaults = __appRuntimeContext.BUILTIN_THEMES.youth?.themes?.ane;
    if (!theme || !defaults) return false;
    let migrated = false;
    if (theme.name === "ANE" || theme.name === "Amanda North") {
      theme.name = defaults.name;
      migrated = true;
    }
    ["idleScreens", "backgrounds", "shareScreens"].forEach((field) => {
      const existing = Array.isArray(theme[field]) ? theme[field] : [];
      const missing = (Array.isArray(defaults[field]) ? defaults[field] : []).filter(
        (entry) => {
          const src = __appRuntimeContext.getAssetEntrySrc(entry);
          return src && !existing.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src);
        }
      );
      if (!missing.length) return;
      theme[field] = [...existing, ...missing.map(__appRuntimeContext.cloneThemeValue)];
      migrated = true;
    });
    const streamNight = target?.youth?.themes?.streamNight;
    const streamNightDefaults = __appRuntimeContext.BUILTIN_THEMES.youth?.themes?.streamNight;
    if (
      streamNight &&
      streamNightDefaults &&
      streamNight.name === "STREAM Night"
    ) {
      streamNight.name = streamNightDefaults.name;
      migrated = true;
    }
    return migrated;
  }

  function migrateSummerThemeAssets(target = __appRuntimeContext.themes) {
    const theme = target?.general?.themes?.summer;
    const defaults = __appRuntimeContext.BUILTIN_THEMES.general?.themes?.summer;
    if (!theme || !defaults) return false;
    const canonicalFields = ["backgrounds", "idleScreens", "thankYouScreens"];
    let migrated = false;
    canonicalFields.forEach((field) => {
      const expected = Array.isArray(defaults[field]) ? defaults[field] : [];
      const current = Array.isArray(theme[field]) ? theme[field] : [];
      const same =
        current.length === expected.length &&
        current.every(
          (entry, index) =>
            __appRuntimeContext.getAssetEntrySrc(entry) === __appRuntimeContext.getAssetEntrySrc(expected[index])
        );
      if (same) return;
      theme[field] = __appRuntimeContext.cloneThemeValue(expected);
      migrated = true;
    });
    if (Array.isArray(theme.overlays) && theme.overlays.length) {
      theme.overlays = [];
      migrated = true;
    }
    if (Array.isArray(theme.templates) && theme.templates.length) {
      theme.templates = [];
      migrated = true;
    }
    return migrated;
  }

  function migrateSpringHillHawksAssets(target = __appRuntimeContext.themes) {
    const theme = target?.school?.themes?.hawks;
    const defaults = __appRuntimeContext.BUILTIN_THEMES.school?.themes?.hawks;
    if (!theme || !defaults) return false;
    let migrated = false;
    const isCheerSpecificAsset = (entry) =>
      __appRuntimeContext.getAssetEntrySrc(entry).includes("/assets/themes/spring-hill-hawks-cheer/");

    if (
      theme.name === "Hawks" ||
      theme.name === "Hawks Cheer" ||
      theme.name === "Spring Hill Hawks Cheer"
    ) {
      theme.name = defaults.name;
      migrated = true;
    }
    if (
      !theme.logo ||
      theme.logo === "/assets/school/hawks/logo.png" ||
      theme.logo ===
        "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-logo.png"
    ) {
      theme.logo = defaults.logo;
      migrated = true;
    }
    if (
      !theme.accent2 ||
      String(theme.accent2).toLowerCase() === "white" ||
      String(theme.accent2).toLowerCase() === "#ffffff"
    ) {
      theme.accent2 = defaults.accent2;
      migrated = true;
    }
    if (!theme.font || theme.font === "'Comic Neue', cursive") {
      theme.font = defaults.font;
      migrated = true;
    }
    if (
      theme.welcome?.title === "Go Hawks!" ||
      theme.welcome?.title === "Spring Hill Hawks Cheer"
    ) {
      theme.welcome.title = defaults.welcome.title;
      theme.welcome.prompt = defaults.welcome.prompt;
      migrated = true;
    }

    ["idleScreens", "thankYouScreens"].forEach((field) => {
      const stored = Array.isArray(theme[field]) ? theme[field] : [];
      const existing = stored.filter((entry) => {
        if (field === "thankYouScreens") {
          return __appRuntimeContext.getAssetEntrySrc(entry).includes(
            "/assets/themes/spring-hill-hawks/"
          );
        }
        return !isCheerSpecificAsset(entry);
      });
      if (existing.length !== stored.length) migrated = true;
      const missing = (Array.isArray(defaults[field]) ? defaults[field] : []).filter(
        (entry) => {
          const src = __appRuntimeContext.getAssetEntrySrc(entry);
          return src && !existing.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src);
        }
      );
      if (missing.length || existing.length !== stored.length) {
        theme[field] = [...missing.map(__appRuntimeContext.cloneThemeValue), ...existing];
        migrated = true;
      }
    });

    const storedBackgrounds = Array.isArray(theme.backgrounds)
      ? theme.backgrounds
      : [];
    const existingBackgrounds = storedBackgrounds.filter(
      (entry) => !isCheerSpecificAsset(entry)
    );
    if (existingBackgrounds.length !== storedBackgrounds.length) migrated = true;
    const removedBackgrounds = new Set(
      (Array.isArray(theme.backgroundsRemoved) ? theme.backgroundsRemoved : [])
        .map(__appRuntimeContext.getAssetEntrySrc)
        .filter(Boolean)
    );
    const foundationBackgrounds = defaults.backgrounds.slice(0, 2);
    const missingBackgrounds = foundationBackgrounds.filter((entry) => {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      return (
        src &&
        !removedBackgrounds.has(src) &&
        !existingBackgrounds.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src)
      );
    });
    if (
      missingBackgrounds.length ||
      existingBackgrounds.length !== storedBackgrounds.length
    ) {
      theme.backgrounds = [
        ...missingBackgrounds.map(__appRuntimeContext.cloneThemeValue),
        ...existingBackgrounds,
      ];
      migrated = true;
    }

    return migrated;
  }

  function migrateSpringHillHawksStadiumAssets(target = __appRuntimeContext.themes) {
    const theme = target?.school?.themes?.hawksTitansStadium;
    const defaults = __appRuntimeContext.BUILTIN_THEMES.school?.themes?.hawksTitansStadium;
    if (!theme || !defaults) return false;
    let migrated = false;

    if (theme.name === "Spring Hill Hawks at Titans Stadium") {
      theme.name = defaults.name;
      migrated = true;
    }
    if (theme.welcome?.title === "Hawks Take Titans Stadium") {
      theme.welcome.title = defaults.welcome.title;
      migrated = true;
    }

    const defaultBackgrounds = Array.isArray(defaults.backgrounds)
      ? defaults.backgrounds
      : [];
    const currentBackgrounds = Array.isArray(theme.backgrounds)
      ? theme.backgrounds
      : [];
    const missingBackgrounds = defaultBackgrounds.filter(
      (entry) => !currentBackgrounds.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === __appRuntimeContext.getAssetEntrySrc(entry))
    );
    if (missingBackgrounds.length) {
      theme.backgrounds = [...missingBackgrounds.map(__appRuntimeContext.cloneThemeValue), ...currentBackgrounds];
      migrated = true;
    }

    const mergeScreens = (field) => {
      const current = Array.isArray(theme[field]) ? theme[field].slice() : [];
      const screens = Array.isArray(defaults[field]) ? defaults[field] : [];
      screens.forEach((screen) => {
        const matchIndex = current.findIndex((entry) =>
          entry &&
          entry.role === screen.role &&
          __appRuntimeContext.normalizeIdleScreenOrientation(entry.orientation) ===
            __appRuntimeContext.normalizeIdleScreenOrientation(screen.orientation)
        );
        if (matchIndex === -1) {
          current.push(__appRuntimeContext.cloneThemeValue(screen));
          migrated = true;
        } else if (
          __appRuntimeContext.normalizeIdleScreenOrientation(screen.orientation) === "portrait" &&
          current[matchIndex].src !== screen.src
        ) {
          current[matchIndex] = {
            ...current[matchIndex],
            ...__appRuntimeContext.cloneThemeValue(screen),
          };
          migrated = true;
        }
      });
      if (current.length !== (theme[field] || []).length) theme[field] = current;
    };
    mergeScreens("idleScreens");

    const mergeAssets = (field) => {
      const current = Array.isArray(theme[field]) ? theme[field].slice() : [];
      const assets = Array.isArray(defaults[field]) ? defaults[field] : [];
      assets.forEach((asset) => {
        const src = __appRuntimeContext.getAssetEntrySrc(asset);
        const matchIndex = current.findIndex((entry) => __appRuntimeContext.getAssetEntrySrc(entry) === src);
        if (matchIndex === -1) {
          current.push(__appRuntimeContext.cloneThemeValue(asset));
          migrated = true;
        } else if (
          src === "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg" &&
          JSON.stringify(current[matchIndex]) !== JSON.stringify(asset)
        ) {
          current[matchIndex] = __appRuntimeContext.cloneThemeValue(asset);
          migrated = true;
        }
      });
      theme[field] = current;
    };
    mergeAssets("overlays");
    mergeAssets("templates");
    return migrated;
  }

  function migrateSpringHillHawksCheerAssets(target = __appRuntimeContext.themes) {
    const themeGroup = target?.school?.themes;
    const defaults = __appRuntimeContext.BUILTIN_THEMES.school?.themes?.hawksCheer;
    if (!themeGroup || !defaults) return false;
    let migrated = false;
    if (!themeGroup.hawksCheer) {
      themeGroup.hawksCheer = __appRuntimeContext.cloneThemeValue(defaults);
      migrated = true;
    }

    const theme = themeGroup.hawksCheer;
    if (theme.name !== defaults.name) {
      theme.name = defaults.name;
      migrated = true;
    }
    const hawksTheme = themeGroup.hawks;
    const pizzaAssetPrefix = "/assets/themes/spring-hill-hawks/pizza/";
    const cheerOverlayAssetPrefix =
      "/assets/themes/spring-hill-hawks-cheer/overlays/";
    const replacedHawksCheerAssetSources = new Set([
      "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-single-photo-portrait.png",
      "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-double-2x6-three-photo-strips.png",
      "/assets/themes/spring-hill-hawks-cheer/overlays/spring-hill-hawks-cheer-no-pizza-single-photo-portrait.png",
      "/assets/themes/spring-hill-hawks-cheer/overlays/spring-hill-hawks-cheer-no-pizza-double-2x6-three-photo-strips.png",
    ]);
    const isReplacedHawksCheerAsset = (entry) =>
      replacedHawksCheerAssetSources.has(__appRuntimeContext.getAssetEntrySrc(entry));
    const isHawksCheerAsset = (entry) => {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      return (
        src.startsWith(pizzaAssetPrefix) ||
        src.startsWith(cheerOverlayAssetPrefix)
      );
    };
    [
      ["overlays", "overlaysRemoved"],
      ["templates", "templatesRemoved"],
    ].forEach(([field, removedField]) => {
      const existingCheerEntries = Array.isArray(theme[field]) ? theme[field] : [];
      const cheerEntries = existingCheerEntries.filter(
        (entry) => !isReplacedHawksCheerAsset(entry)
      );
      const removed = new Set(
        (Array.isArray(theme[removedField]) ? theme[removedField] : [])
          .map(__appRuntimeContext.getAssetEntrySrc)
          .filter(Boolean)
      );
      const hawksEntries = Array.isArray(hawksTheme && hawksTheme[field])
        ? hawksTheme[field]
        : [];
      const movedCheerEntries = hawksEntries.filter(
        (entry) => isHawksCheerAsset(entry) && !isReplacedHawksCheerAsset(entry)
      );
      const defaultCheerEntries = (Array.isArray(defaults[field]) ? defaults[field] : [])
        .filter(isHawksCheerAsset);
      const additions = [...defaultCheerEntries, ...movedCheerEntries].filter(
        (entry, index, entries) => {
          const src = __appRuntimeContext.getAssetEntrySrc(entry);
          return (
            src &&
            !removed.has(src) &&
            !cheerEntries.some((current) => __appRuntimeContext.getAssetEntrySrc(current) === src) &&
            entries.findIndex((candidate) => __appRuntimeContext.getAssetEntrySrc(candidate) === src) === index
          );
        }
      );
      if (additions.length || cheerEntries.length !== existingCheerEntries.length) {
        theme[field] = [...additions.map(__appRuntimeContext.cloneThemeValue), ...cheerEntries];
        migrated = true;
      }
      if (hawksEntries.some(isHawksCheerAsset) && hawksTheme) {
        hawksTheme[field] = hawksEntries.filter(
          (entry) => !isHawksCheerAsset(entry)
        );
        migrated = true;
      }
    });
    if (!theme.logo) {
      theme.logo = defaults.logo;
      migrated = true;
    }

    ["idleScreens", "thankYouScreens", "backgrounds"].forEach((field) => {
      const existing = Array.isArray(theme[field]) ? theme[field] : [];
      const filtered =
        field === "thankYouScreens"
          ? existing.filter((entry) =>
              __appRuntimeContext.getAssetEntrySrc(entry).includes(
                "/assets/themes/spring-hill-hawks-cheer/"
              )
            )
          : existing;
      const missing = (Array.isArray(defaults[field]) ? defaults[field] : []).filter(
        (entry) => {
          const src = __appRuntimeContext.getAssetEntrySrc(entry);
          return src && !filtered.some((item) => __appRuntimeContext.getAssetEntrySrc(item) === src);
        }
      );
      if (!missing.length && filtered.length === existing.length) return;
      theme[field] = [...missing.map(__appRuntimeContext.cloneThemeValue), ...filtered];
      migrated = true;
    });

    return migrated;
  }

  function migrateLegacyBuiltinRootThemeDefaults() {
    for (const rootKey of Object.keys(__appRuntimeContext.BUILTIN_THEMES)) {
      const builtinGroup = __appRuntimeContext.BUILTIN_THEMES[rootKey];
      const storedGroup = __appRuntimeContext.themes[rootKey];
      if (!builtinGroup || !storedGroup || typeof storedGroup !== "object")
        continue;
      if (storedGroup.themes || storedGroup.holidays) continue;

      const bucket = builtinGroup.themes ? "themes" : builtinGroup.holidays ? "holidays" : "";
      const builtinChildren = bucket ? builtinGroup[bucket] : null;
      const leafKey = builtinChildren && Object.keys(builtinChildren)[0];
      if (!leafKey) continue;

      const defaultFields = [
        "backgrounds",
        "overlays",
        "templates",
        "backgroundsRemoved",
        "overlaysRemoved",
        "templatesRemoved",
      ];
      const savedDefaults = defaultFields.filter((field) =>
        Array.isArray(storedGroup[field])
      );
      if (!savedDefaults.length) continue;

      storedGroup[bucket] = storedGroup[bucket] || {};
      const target =
        storedGroup[bucket][leafKey] || __appRuntimeContext.cloneThemeValue(builtinChildren[leafKey]);
      savedDefaults.forEach((field) => {
        target[field] = __appRuntimeContext.cloneThemeValue(storedGroup[field]);
      });
      storedGroup[bucket][leafKey] = target;
    }
  }

  function hasCoreBuiltins(obj) {
    try {
      return !!(
        obj &&
        obj.general &&
        obj.general.themes &&
        obj.general.themes.averyBirthday &&
        obj.general.themes.summer &&
        obj.fall &&
        obj.fall.holidays &&
        obj.fall.holidays.halloween
      );
    } catch (_) {
      return false;
    }
  }

  function resetThemesToBuiltins(reason) {
    console.warn("Resetting themes to built-ins:", reason || "unknown");
    __appRuntimeContext.themes = __appRuntimeContext.cloneThemeValue(__appRuntimeContext.BUILTIN_THEMES);
    try {
      localStorage.removeItem("photoboothThemes");
    } catch (_) {}
  }

  function mergePlainObject(baseObj, overrideObj) {
    const baseClone =
      baseObj && typeof baseObj === "object" && !Array.isArray(baseObj)
        ? __appRuntimeContext.cloneThemeValue(baseObj)
        : {};
    if (
      !overrideObj ||
      typeof overrideObj !== "object" ||
      Array.isArray(overrideObj)
    ) {
      if (Array.isArray(overrideObj)) return overrideObj.slice();
      return baseClone;
    }
    const out = baseClone || {};
    for (const key of Object.keys(overrideObj)) {
      const value = overrideObj[key];
      if (Array.isArray(value)) out[key] = value.slice();
      else if (value && typeof value === "object")
        out[key] = mergePlainObject(out[key], value);
      else out[key] = value;
    }
    return out;
  }

  function applyThemeFallbacks(baseLeaf, merged, storedLeaf) {
    if (
      !baseLeaf ||
      typeof baseLeaf !== "object" ||
      !merged ||
      typeof merged !== "object"
    )
      return;
    applyBackgroundFallback(baseLeaf, merged, storedLeaf);
    applyTemplatesFallback(baseLeaf, merged, storedLeaf);
    applyOverlaysFallback(baseLeaf, merged, storedLeaf);
    applyArrayFallback(baseLeaf, merged, "backgroundsRemoved");
    applyArrayFallback(baseLeaf, merged, "overlaysRemoved");
    applyArrayFallback(baseLeaf, merged, "templatesRemoved");
    mergeWelcomeAndMeta(baseLeaf, merged);
  }

  function applyBackgroundFallback(baseLeaf, merged, storedLeaf) {
    const baseList = __appRuntimeContext.arrayFromMaybeList(baseLeaf.backgrounds);
    const baseSingle = __appRuntimeContext.stringOrEmpty(baseLeaf.background);
    const mergedList = __appRuntimeContext.arrayFromMaybeList(merged.backgrounds);
    const mergedSingle = __appRuntimeContext.stringOrEmpty(merged.background);
    const storedList = __appRuntimeContext.arrayFromMaybeList(storedLeaf && storedLeaf.backgrounds);
    const storedSingle = __appRuntimeContext.stringOrEmpty(storedLeaf && storedLeaf.background);
    const storedAllowsFallback =
      !storedLeaf || (!storedList.length && !storedSingle);

    if (!storedAllowsFallback) return;
    if (!baseList.length && !baseSingle) return;
    if (mergedList.length || mergedSingle) return;

    if (baseList.length) merged.backgrounds = baseList.slice();
    if (baseSingle) merged.background = baseLeaf.background;
    if (typeof baseLeaf.backgroundIndex === "number") {
      merged.backgroundIndex = baseLeaf.backgroundIndex;
    }
  }

  function applyTemplatesFallback(baseLeaf, merged, storedLeaf) {
    const storedArrayExists = Array.isArray(storedLeaf && storedLeaf.templates);
    const baseTemplates = Array.isArray(baseLeaf.templates)
      ? baseLeaf.templates
      : null;
    const mergedTemplates = Array.isArray(merged.templates)
      ? merged.templates
      : null;
    if (
      baseTemplates &&
      baseTemplates.length &&
      (!mergedTemplates || mergedTemplates.length === 0) &&
      !storedArrayExists
    ) {
      merged.templates = baseTemplates.map((tpl) => mergePlainObject(tpl, {}));
    }
  }

  function applyOverlaysFallback(baseLeaf, merged, storedLeaf) {
    const storedArrayExists = Array.isArray(storedLeaf && storedLeaf.overlays);
    const storedOverlays = storedArrayExists ? storedLeaf.overlays : [];
    const baseOverlays = Array.isArray(baseLeaf.overlays)
      ? baseLeaf.overlays
      : null;
    const storedOverlaysCorrupted =
      storedOverlays.length > 0 &&
      (!storedOverlays.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry)) ||
        (hasOverlayDefinitionSource(baseOverlays) &&
          !hasOverlayDefinitionSource(storedOverlays)));
    const mergedOverlays = Array.isArray(merged.overlays)
      ? merged.overlays
      : null;
    if (
      baseOverlays &&
      baseOverlays.length &&
      (((!mergedOverlays || mergedOverlays.length === 0) &&
        !storedArrayExists) ||
        storedOverlaysCorrupted)
    ) {
      merged.overlays = baseOverlays.map(__appRuntimeContext.cloneThemeValue);
    }
  }

  function hasOverlayDefinitionSource(entries) {
    return (
      Array.isArray(entries) &&
      entries.some(
        (entry) =>
          entry && typeof entry === "object" && !!__appRuntimeContext.getAssetEntrySrc(entry)
      )
    );
  }

  function hasCorruptedThemeOverlayEntries(value, path = []) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value.overlays) && value.overlays.length > 0) {
      const [rootKey, bucketKey, themeKey] = path;
      const baseTheme = __appRuntimeContext.BUILTIN_THEMES[rootKey]?.[bucketKey]?.[themeKey];
      const storedSources = value.overlays.some((entry) => __appRuntimeContext.getAssetEntrySrc(entry));
      const lostBuiltinOverlayDefinitions =
        baseTheme &&
        hasOverlayDefinitionSource(baseTheme.overlays) &&
        !hasOverlayDefinitionSource(value.overlays);
      if (!storedSources || lostBuiltinOverlayDefinitions) return true;
    }
    return Object.entries(value).some(([key, entry]) =>
      hasCorruptedThemeOverlayEntries(entry, [...path, key])
    );
  }

  function applyArrayFallback(baseLeaf, merged, prop) {
    if (Array.isArray(baseLeaf[prop]) && !Array.isArray(merged[prop])) {
      merged[prop] = baseLeaf[prop].slice();
    }
  }

  function mergeWelcomeAndMeta(baseLeaf, merged) {
    if (baseLeaf.welcome)
      merged.welcome = mergePlainObject(baseLeaf.welcome, merged.welcome);
    if (baseLeaf.accent && !merged.accent) merged.accent = baseLeaf.accent;
    if (baseLeaf.accent2 && !merged.accent2) merged.accent2 = baseLeaf.accent2;
    if (baseLeaf.font && !merged.font) merged.font = baseLeaf.font;
    if (baseLeaf.fontHeading && !merged.fontHeading)
      merged.fontHeading = baseLeaf.fontHeading;
    if (baseLeaf.fontBody && !merged.fontBody)
      merged.fontBody = baseLeaf.fontBody;
  }

  function mergeThemeLeaf(baseLeaf, storedLeaf) {
    if (storedLeaf === null || storedLeaf === undefined) {
      return __appRuntimeContext.cloneThemeValue(baseLeaf);
    }
    if (Array.isArray(storedLeaf)) return storedLeaf.slice();
    if (typeof storedLeaf !== "object") return storedLeaf;
    const merged = mergePlainObject(baseLeaf, storedLeaf);
    applyThemeFallbacks(baseLeaf, merged, storedLeaf);
    return merged;
  }

  function fixBuiltinThemePlacements(target) {
    if (!target || typeof target !== "object") return;
    for (const rootKey of Object.keys(target)) {
      const group = target[rootKey];
      if (!group || typeof group !== "object") continue;
      for (const bucket of ["themes", "holidays"]) {
        const sub = group[bucket];
        if (!sub || typeof sub !== "object") continue;
        for (const subKey of Object.keys({ ...sub })) {
          const loc = __appRuntimeContext.BUILTIN_THEME_LOCATIONS[subKey];
          if (!loc || (loc.root === rootKey && loc.bucket === bucket)) continue;
          const currentTheme = sub[subKey];
          delete sub[subKey];
          if (!target[loc.root])
            target[loc.root] = __appRuntimeContext.cloneThemeValue(
              __appRuntimeContext.BUILTIN_THEMES[loc.root] || { name: loc.root }
            );
          if (!target[loc.root][loc.bucket]) target[loc.root][loc.bucket] = {};
          const base =
            __appRuntimeContext.BUILTIN_THEMES[loc.root] && __appRuntimeContext.BUILTIN_THEMES[loc.root][loc.bucket]
              ? __appRuntimeContext.BUILTIN_THEMES[loc.root][loc.bucket][subKey]
              : null;
          target[loc.root][loc.bucket][subKey] = mergeThemeLeaf(
            base,
            currentTheme
          );
        }
      }
    }
  }

  function mergeStoredThemes(base, stored) {
    if (
      !base ||
      typeof base !== "object" ||
      !stored ||
      typeof stored !== "object"
    )
      return;
    for (const key of Object.keys(stored)) {
      const storedGroup = stored[key];
      if (
        storedGroup &&
        typeof storedGroup === "object" &&
        !Array.isArray(storedGroup)
      ) {
        const bucketKey = storedGroup.themes
          ? "themes"
          : storedGroup.holidays
          ? "holidays"
          : null;
        const baseGroup = base[key];
        if (bucketKey) {
          if (!baseGroup || typeof baseGroup !== "object") {
            base[key] = __appRuntimeContext.cloneThemeValue(storedGroup);
            continue;
          }
          if (!baseGroup[bucketKey]) baseGroup[bucketKey] = {};
          const baseBucket = baseGroup[bucketKey];
          const storedBucket = storedGroup[bucketKey] || {};
          for (const subKey of Object.keys(storedBucket)) {
            baseBucket[subKey] = mergeThemeLeaf(
              baseBucket[subKey],
              storedBucket[subKey]
            );
          }
          for (const prop of Object.keys(storedGroup)) {
            if (prop === "themes" || prop === "holidays") continue;
            const val = storedGroup[prop];
            if (Array.isArray(val)) baseGroup[prop] = val.slice();
            else if (val && typeof val === "object")
              baseGroup[prop] = mergePlainObject(baseGroup[prop], val);
            else baseGroup[prop] = val;
          }
        } else {
          base[key] = mergeThemeLeaf(baseGroup, storedGroup);
        }
      } else {
        base[key] = __appRuntimeContext.cloneThemeValue(storedGroup);
      }
    }
  }

  function loadThemesFromStorage() {
    if (!hasCoreBuiltins(__appRuntimeContext.themes)) {
      resetThemesToBuiltins("missing core themes before storage merge");
    }
    const storedThemes = localStorage.getItem("photoboothThemes");
    if (storedThemes) {
      try {
        const parsed = JSON.parse(storedThemes);
        const repairedOverlayDefaults = hasCorruptedThemeOverlayEntries(parsed);
        mergeStoredThemes(__appRuntimeContext.themes, parsed);
        fixBuiltinThemePlacements(__appRuntimeContext.themes);
        const removedUnapprovedBuiltinThemes = ensureBuiltinThemes();
        __appRuntimeContext.refreshBeautyPresetEffects();
        const migratedAveryScreens = migrateOptimizedAveryScreenAssets(__appRuntimeContext.themes);
        const migratedAmandaNorthScreens = migrateAmandaNorthScreenAssets(__appRuntimeContext.themes);
        const migratedSummerAssets = migrateSummerThemeAssets(__appRuntimeContext.themes);
        const migratedHalloweenAssets = __appRuntimeContext.migrateHalloweenThemeAssets(__appRuntimeContext.themes);
        const migratedSpringHillHawks = migrateSpringHillHawksAssets(__appRuntimeContext.themes);
        const migratedSpringHillHawksStadium =
          migrateSpringHillHawksStadiumAssets(__appRuntimeContext.themes);
        const migratedSpringHillHawksCheer =
          migrateSpringHillHawksCheerAssets(__appRuntimeContext.themes);
        try {
          __appRuntimeContext.normalizeAllThemes();
        } catch (_e) {}
        if (!hasCoreBuiltins(__appRuntimeContext.themes)) {
          resetThemesToBuiltins("stored themes missing core entries");
        }
        if (
          repairedOverlayDefaults ||
          migratedAveryScreens ||
          migratedAmandaNorthScreens ||
          migratedSummerAssets ||
          migratedHalloweenAssets ||
          migratedSpringHillHawks ||
          migratedSpringHillHawksStadium ||
          migratedSpringHillHawksCheer ||
          removedUnapprovedBuiltinThemes
        )
          saveThemesToStorage();
      } catch (err) {
        console.warn("Failed to parse stored themes", err);
      }
    }
    const globalLogo = __appRuntimeContext.getGlobalLogo();
    if (globalLogo !== null) __appRuntimeContext.applyGlobalLogoToAllThemes(globalLogo);
    // Attempt remote load and prefer remote if available
    __appRuntimeContext.deferNonCriticalTask(() => __appRuntimeContext.loadThemesRemote().catch(() => {}));
  }

  function openLayoutBuilder() {
    const url = new URL("./overlay-maker.html", window.location.href);
    const themeKey = __appRuntimeContext.getSelectedThemeKey();
    if (themeKey) url.searchParams.set("themeKey", themeKey);
    window.open(url.toString(), "_blank", "noopener");
  }

  function loadEventsFromStorage() {
    const events = __appRuntimeContext.getStoredEvents();
    if (__appRuntimeContext.migrateHalloweenEventAssets(events)) __appRuntimeContext.setStoredEvents(events);
    __appRuntimeContext.populateEventProfileSelect(__appRuntimeContext.getActiveEventId());
    __appRuntimeContext.deferNonCriticalTask(() => __appRuntimeContext.loadEventsRemote().catch(() => {}));
  }

  async function handleOverlayFolderPick(e) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const target = __appRuntimeContext.getSelectedThemeTarget();
    if (!key || !target) {
      alert("Select a theme first.");
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files || []).filter((f) =>
      /^image\//i.test(f.type)
    );
    if (!files.length) {
      e.target.value = "";
      return;
    }
    if (!Array.isArray(target.overlays)) target.overlays = [];
    const promises = files.map((f) =>
      __appRuntimeContext.uploadAsset(f, "overlays").then((u) => {
        if (u) target.overlays.push(u);
      })
    );
    await Promise.all(promises);
    try {
      __appRuntimeContext.normalizeThemeObject(target);
    } catch (_e) {}
    saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.syncThemeEditorWithActiveTheme();
    __appRuntimeContext.showToast(`Imported ${files.length} overlays`);
    e.target.value = "";
  }

  async function handleTemplateFolderPick(e) {
    const key = __appRuntimeContext.getSelectedThemeKey();
    const target = __appRuntimeContext.getSelectedThemeTarget();
    if (!key || !target) {
      alert("Select a theme first.");
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files || []).filter((f) =>
      /^image\//i.test(f.type)
    );
    if (!files.length) {
      e.target.value = "";
      return;
    }
    if (!Array.isArray(target.templates)) target.templates = [];
    const promises = files.map((f) =>
      __appRuntimeContext.uploadAsset(f, "templates").then((u) => {
        if (u) target.templates.push({ src: u, layout: "double_column" });
      })
    );
    await Promise.all(promises);
    try {
      __appRuntimeContext.normalizeThemeObject(target);
    } catch (_e) {}
    saveThemesToStorage();
    __appRuntimeContext.loadTheme(key);
    __appRuntimeContext.syncThemeEditorWithActiveTheme();
    __appRuntimeContext.showToast(`Imported ${files.length} templates`);
    e.target.value = "";
  }

  return {
    saveThemesToStorage,
    addMissingDefaults,
    pruneMisplacedBuiltinThemes,
    pruneUnapprovedBuiltinThemes,
    ensureBuiltinThemes,
    migrateOptimizedAveryScreenAssets,
    migrateAmandaNorthScreenAssets,
    migrateSummerThemeAssets,
    migrateSpringHillHawksAssets,
    migrateSpringHillHawksStadiumAssets,
    migrateSpringHillHawksCheerAssets,
    migrateLegacyBuiltinRootThemeDefaults,
    hasCoreBuiltins,
    resetThemesToBuiltins,
    mergePlainObject,
    applyThemeFallbacks,
    applyBackgroundFallback,
    applyTemplatesFallback,
    applyOverlaysFallback,
    hasOverlayDefinitionSource,
    hasCorruptedThemeOverlayEntries,
    applyArrayFallback,
    mergeWelcomeAndMeta,
    mergeThemeLeaf,
    fixBuiltinThemePlacements,
    mergeStoredThemes,
    loadThemesFromStorage,
    openLayoutBuilder,
    loadEventsFromStorage,
    handleOverlayFolderPick,
    handleTemplateFolderPick,
  };
}
