export function createEditorManagementModule(__appRuntimeContext) {
  async function setupFontPicker() {
    if (!__appRuntimeContext.fontPickerSetupPromise) {
      __appRuntimeContext.fontPickerSetupPromise = (async () => {
        await __appRuntimeContext.reloadFontPickerOptions();
        __appRuntimeContext.fontPickerInitialized = true;
      })();
    } else if (__appRuntimeContext.fontPickerInitialized) {
      await __appRuntimeContext.reloadFontPickerOptions();
    }
    return __appRuntimeContext.fontPickerSetupPromise;
  }

  function setThemeEditorMode(mode) {
    let resolved = mode || __appRuntimeContext.THEME_EDITOR.mode.value;
    if (resolved === "clone") resolved = "edit";
    __appRuntimeContext.THEME_EDITOR.mode.value = resolved;
    const isCreate = resolved === "create";
    if (__appRuntimeContext.DOM.themeCloneSection) __appRuntimeContext.DOM.themeCloneSection.classList.add("hidden");
    if (__appRuntimeContext.DOM.themeCloneName) __appRuntimeContext.DOM.themeCloneName.value = "";

    if (isCreate) {
      resetCreateThemeModal();
      showCreateThemeModal();
      __appRuntimeContext.themeAdminState.resetEditorDraft();
      clearThemeFileInputs();
      setupFontPicker()
        .then(() => {
          __appRuntimeContext.syncSessionFontSearch();
        })
        .catch(() => {});
    } else {
      hideCreateThemeModal();
      resetCreateThemeModal();
      __appRuntimeContext.syncThemeEditorWithActiveTheme();
    }
    __appRuntimeContext.updateThemeEditorSummary();
  }

  function normalizeFontFamilyName(name) {
    return (name || "")
      .toString()
      .replace(/^['"]|['"]$/g, "")
      .trim();
  }

  function buildGoogleFontsURL(fonts) {
    const items = (Array.isArray(fonts) ? fonts : []).filter(
      (font) => font && font.name
    );
    if (!items.length) return "";
    const fams = items
      .map((font) => {
        const fam = encodeURIComponent(font.name).replace(/%20/g, "+");
        const weights =
          Array.isArray(font.weights) && font.weights.length
            ? Array.from(new Set(font.weights)).sort((a, b) => a - b)
            : [400];
        if (font.ital) {
          const pairs = [
            ...weights.map((w) => `0,${w}`),
            ...weights.map((w) => `1,${w}`),
          ].join(";");
          return `family=${fam}:ital,wght@${pairs}`;
        }
        return `family=${fam}:wght@${weights.join(";")}`;
      })
      .join("&");
    return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
  }

  function getSelectedThemeKey() {
    const active = __appRuntimeContext.getActiveEvent();
    if (
      active &&
      active.eventType === "wedding" &&
      active.themeKey &&
      active.weddingTheme
    ) return active.themeKey;
    return __appRuntimeContext.themeAdminState.getSelectedThemeKey();
  }

  function getThemeOptions() {
    return __appRuntimeContext.themeAdminState.getThemeOptions();
  }

  function getSelectedThemeTarget() {
    const key = getSelectedThemeKey();
    return __appRuntimeContext.resolveThemeByKey(key);
  }

  async function updateSelectedTheme(reason = "") {
    const key = getSelectedThemeKey();
    const target = getSelectedThemeTarget();
    if (!key || !target) {
      alert("Select a theme first.");
      clearThemeFileInputs();
      return;
    }
    const name = __appRuntimeContext.THEME_EDITOR.name.value || target.name || "New Theme";
    const slug = slugifyThemeName(name);
    if (!slug) {
      alert("Enter a valid name for the new sub theme.");
      clearThemeFileInputs();
      return;
    }

    const location = __appRuntimeContext.resolveThemeStorage(key);
    let parent = location.parent;
    let bucket = location.bucket;
    let rootKey = location.root || "";
    if (
      !bucket &&
      rootKey &&
      __appRuntimeContext.themes[rootKey] &&
      typeof __appRuntimeContext.themes[rootKey] === "object"
    ) {
      parent = __appRuntimeContext.themes[rootKey];
      if (!parent.themes) parent.themes = {};
      bucket = "themes";
    }

    if (bucket) {
      if (!parent[bucket]) parent[bucket] = {};
      if (parent[bucket][slug]) {
        alert("A sub theme with that name already exists.");
        clearThemeFileInputs();
        return;
      }
    } else if (__appRuntimeContext.themes[slug]) {
      alert("A theme with that name already exists.");
      clearThemeFileInputs();
      return;
    }

    const newTheme = __appRuntimeContext.cloneThemeValue(target);
    applyThemeBasicsFromEditor(newTheme);
    newTheme.name = name;
    newTheme.welcome = newTheme.welcome || {};
    newTheme.welcome.title = newTheme.welcome.title || name;

    let assetChanges = null;
    try {
      assetChanges = await uploadThemeAssetsFromEditor(newTheme);
    } catch (err) {
      console.error("Failed to upload theme assets", err);
      clearThemeFileInputs();
      alert("Could not create the sub theme. Check the console for details.");
      return;
    }
    if (assetChanges && assetChanges.logoUrl) {
      __appRuntimeContext.setGlobalLogo(assetChanges.logoUrl, { quiet: true, skipSave: true });
    } else {
      const currentGlobalLogo = __appRuntimeContext.getGlobalLogo();
      if (currentGlobalLogo !== null)
        __appRuntimeContext.applyGlobalLogoToTheme(newTheme, currentGlobalLogo);
    }
    try {
      __appRuntimeContext.normalizeThemeObject(newTheme);
    } catch (_e) {}
    if (bucket) {
      parent[bucket][slug] = newTheme;
    } else {
      __appRuntimeContext.themes[slug] = newTheme;
    }
    __appRuntimeContext.saveThemesToStorage();

    const newKey = bucket && rootKey ? `${rootKey}:${slug}` : slug;
    __appRuntimeContext.populateThemeSelector(newKey);
    __appRuntimeContext.setEventSelection(newKey);
    __appRuntimeContext.loadTheme(newKey);
    clearThemeFileInputs();
    __appRuntimeContext.syncThemeEditorWithActiveTheme();
    __appRuntimeContext.showToast(`Sub theme "${name}" created`);
  }

  async function updateCurrentThemeAssets(reason = "") {
    const key = getSelectedThemeKey();
    const target = getSelectedThemeTarget();
    if (!key || !target) {
      alert("Select a theme first.");
      clearThemeFileInputs();
      return;
    }

    let assetChanges = null;
    __appRuntimeContext.setAssetPanelMessage("overlay", "loading", "Loading overlays…");
    __appRuntimeContext.setAssetPanelMessage("template", "loading", "Loading templates…");
    try {
      assetChanges = await uploadThemeAssetsFromEditor(target);
    } catch (err) {
      console.error("Failed to upload theme assets", err);
      __appRuntimeContext.setAssetPanelMessage("overlay", "error", "Couldn’t load overlay thumbnails.");
      __appRuntimeContext.setAssetPanelMessage("template", "error", "Couldn’t load template thumbnails.");
      clearThemeFileInputs();
      alert("Could not update the theme assets. Check the console for details.");
      return;
    }
    if (assetChanges && assetChanges.logoUrl) {
      __appRuntimeContext.setGlobalLogo(assetChanges.logoUrl, { quiet: true, skipSave: true });
    } else {
      const currentGlobalLogo = __appRuntimeContext.getGlobalLogo();
      if (currentGlobalLogo !== null)
        __appRuntimeContext.applyGlobalLogoToTheme(target, currentGlobalLogo);
    }
    try {
      __appRuntimeContext.normalizeThemeObject(target);
    } catch (_e) {}
    __appRuntimeContext.saveThemesToStorage();

    __appRuntimeContext.populateThemeSelector(key);
    __appRuntimeContext.setEventSelection(key);
    __appRuntimeContext.loadTheme(key);
    clearThemeFileInputs();
    __appRuntimeContext.syncThemeEditorWithActiveTheme();
    if (assetChanges && assetChanges.overlaysAdded > 0) {
      __appRuntimeContext.setAssetPanelOpen("overlay", true);
    }
    if (assetChanges && assetChanges.templatesAdded > 0) {
      __appRuntimeContext.setAssetPanelOpen("template", true);
    }
    __appRuntimeContext.setAssetPanelMessage("overlay", null);
    __appRuntimeContext.setAssetPanelMessage("template", null);
    __appRuntimeContext.showToast(describeThemeUpdate(assetChanges, reason));
  }

  function createSubThemeFromEvent() {
    const active = __appRuntimeContext.getActiveEvent();
    if (!active) {
      alert("Select an event first.");
      return;
    }
    const overrides = __appRuntimeContext.getActiveEventOverrides();
    const hasOverrides =
      (overrides.backgrounds && overrides.backgrounds.length) ||
      (overrides.greenBackgrounds && overrides.greenBackgrounds.length) ||
      (overrides.overlays && overrides.overlays.length) ||
      (overrides.templates && overrides.templates.length);
    if (!hasOverrides) {
      alert("This event has no custom assets to save as a sub theme.");
      return;
    }

    const baseKey =
      active.themeKey || getSelectedThemeKey();
    const baseTheme = __appRuntimeContext.getThemeByKey(baseKey) || getSelectedThemeTarget();
    if (!baseTheme) {
      alert("Select a theme first.");
      return;
    }

    const defaultName = `${baseTheme.name || "Theme"} - ${
      active.name || "Event"
    }`;
    const name = (
      prompt("Name for the new sub theme:", defaultName) || ""
    ).trim();
    if (!name) return;
    const slug = slugifyThemeName(name);
    if (!slug) {
      alert("Enter a valid sub theme name.");
      return;
    }

    const location = __appRuntimeContext.resolveThemeStorage(baseKey);
    let parent = location.parent;
    let bucket = location.bucket;
    let rootKey = location.root || "";
    if (
      !bucket &&
      rootKey &&
      __appRuntimeContext.themes[rootKey] &&
      typeof __appRuntimeContext.themes[rootKey] === "object"
    ) {
      parent = __appRuntimeContext.themes[rootKey];
      if (!parent.themes) parent.themes = {};
      bucket = "themes";
    }
    if (bucket) {
      if (!parent[bucket]) parent[bucket] = {};
      if (parent[bucket][slug]) {
        alert("A sub theme with that name already exists.");
        return;
      }
    } else if (__appRuntimeContext.themes[slug]) {
      alert("A theme with that name already exists.");
      return;
    }

    const newTheme = __appRuntimeContext.cloneThemeValue(baseTheme);
    newTheme.name = name;
    newTheme.welcome = newTheme.welcome || {};
    newTheme.welcome.title = newTheme.welcome.title || name;

    const baseBackgrounds = __appRuntimeContext.getBaseBackgroundList(baseTheme);
    const baseGreen = Array.isArray(baseTheme.greenBackgrounds)
      ? baseTheme.greenBackgrounds.filter(Boolean)
      : [];
    const baseOverlays = __appRuntimeContext.getBaseOverlayList(baseTheme).map((o) => o.src);
    const baseTemplates = __appRuntimeContext.getBaseTemplateList(baseTheme).map((t) => t);

    if (overrides.backgrounds && overrides.backgrounds.length) {
      newTheme.backgrounds = __appRuntimeContext.mergeUniqueUrls(
        overrides.backgrounds,
        baseBackgrounds
      );
      newTheme.background = newTheme.backgrounds[0] || newTheme.background || "";
      newTheme.backgroundIndex = 0;
    }
    if (overrides.greenBackgrounds && overrides.greenBackgrounds.length) {
      newTheme.greenBackgrounds = __appRuntimeContext.mergeUniqueUrls(
        overrides.greenBackgrounds,
        baseGreen
      );
      newTheme.greenBackgroundIndex = 0;
    }
    if (overrides.overlays && overrides.overlays.length) {
      newTheme.overlays = __appRuntimeContext.mergeUniqueUrls(overrides.overlays, baseOverlays);
    }
    if (overrides.templates && overrides.templates.length) {
      const mergedTemplates = [];
      const seen = new Set();
      const pushTemplate = (t) => {
        if (!t || !t.src) return;
        if (seen.has(t.src)) return;
        seen.add(t.src);
        mergedTemplates.push({
          src: t.src,
          layout: t.layout || "double_column",
          slots: t.slots,
        });
      };
      overrides.templates.forEach((t) =>
        pushTemplate(typeof t === "string" ? { src: t } : t)
      );
      baseTemplates.forEach((t) => pushTemplate(t));
      newTheme.templates = mergedTemplates;
    }
    if (active.logo) newTheme.logo = active.logo;
    if (typeof active.bannerText === "string" && active.bannerText)
      newTheme.bannerText = active.bannerText;
    if (typeof active.welcomeTitle === "string" && active.welcomeTitle) {
      newTheme.welcome = newTheme.welcome || {};
      newTheme.welcome.title = active.welcomeTitle;
    }
    if (typeof active.startButtonText === "string" && active.startButtonText) {
      newTheme.welcome = newTheme.welcome || {};
      newTheme.welcome.prompt = active.startButtonText;
    }
    if (typeof active.captureLabel === "string" && active.captureLabel)
      newTheme.captureLabel = active.captureLabel;
    if (typeof active.bannerSize === "number" && active.bannerSize > 0)
      newTheme.bannerSize = active.bannerSize;
    if (
      typeof active.welcomeTitleSize === "number" &&
      active.welcomeTitleSize > 0
    )
      newTheme.welcomeTitleSize = active.welcomeTitleSize;
    if (bucket) parent[bucket][slug] = newTheme;
    else __appRuntimeContext.themes[slug] = newTheme;

    __appRuntimeContext.saveThemesToStorage();
    const newKey = bucket && rootKey ? `${rootKey}:${slug}` : slug;
    __appRuntimeContext.setEventSelection(newKey);
    __appRuntimeContext.loadTheme(newKey);
    __appRuntimeContext.updateActiveEventDetails({
      themeKey: newKey,
      overrides: {
        backgrounds: [],
        overlays: [],
        templates: [],
        backgroundIndex: 0,
        greenBackgrounds: [],
        greenBackgroundIndex: 0,
      },
    });
    __appRuntimeContext.showToast(`Sub theme "${name}" created`);
  }

  function describeThemeUpdate(changes, reason) {
    if (!changes) return "Theme updated";
    const parts = [];
    if (changes.backgroundsAdded) {
      parts.push(
        `Added ${changes.backgroundsAdded} background${
          changes.backgroundsAdded === 1 ? "" : "s"
        }`
      );
    }
    if (changes.greenBackgroundsAdded) {
      parts.push(
        `Added ${changes.greenBackgroundsAdded} green BG${
          changes.greenBackgroundsAdded === 1 ? "" : "s"
        }`
      );
    }
    if (changes.overlaysAdded) {
      parts.push(
        `Added ${changes.overlaysAdded} overlay${
          changes.overlaysAdded === 1 ? "" : "s"
        }`
      );
    }
    if (changes.templatesAdded) {
      parts.push(
        `Added ${changes.templatesAdded} template${
          changes.templatesAdded === 1 ? "" : "s"
        }`
      );
    }
    if (changes.logoUrl) {
      parts.push("Logo applied to all themes");
    }
    if (parts.length) return parts.join(" • ");
    if (reason === "logo") return "Logo unchanged";
    return "Theme updated";
  }

  function valueFromInput(node) {
    return node && typeof node.value === "string" ? node.value.trim() : "";
  }

  function normalizeBannerText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function fitTextToBox(node, maxWidth, maxHeight = 0, minSize = 18) {
    if (!node) return;
    const availableWidth = Math.max(0, Number(maxWidth) || 0);
    if (!availableWidth) return;
    const measured = parseFloat(
      node.dataset.baseFontSize ||
        node.style.fontSize ||
        window.getComputedStyle(node).fontSize ||
        "0"
    );
    if (!Number.isFinite(measured) || measured <= 0) return;
    let nextSize = measured;
    node.style.fontSize = `${nextSize}px`;
    while (
      (node.scrollWidth > availableWidth ||
        (maxHeight > 0 && node.scrollHeight > maxHeight)) &&
      nextSize > minSize
    ) {
      nextSize -= 1;
      node.style.fontSize = `${nextSize}px`;
    }
  }

  function fitBannerTextToViewport() {
    if (!__appRuntimeContext.DOM.eventTitle || !__appRuntimeContext.DOM.boothHeader) return;
    const availableWidth = __appRuntimeContext.DOM.boothHeader.clientWidth - 140;
    fitTextToBox(__appRuntimeContext.DOM.eventTitle, availableWidth, 0, 18);
  }

  function fitWelcomeTitleToViewport() {
    if (!__appRuntimeContext.DOM.welcomeTitle || !__appRuntimeContext.DOM.welcomeOverlay) return;
    const availableWidth = __appRuntimeContext.DOM.welcomeOverlay.clientWidth - 72;
    const availableHeight = Math.min(window.innerHeight * 0.42, 360);
    fitTextToBox(__appRuntimeContext.DOM.welcomeTitle, availableWidth, availableHeight, 18);
  }

  function getBannerSize(theme) {
    const active = __appRuntimeContext.getActiveEvent();
    if (active && typeof active.bannerSize === "number" && active.bannerSize > 0)
      return active.bannerSize;
    if (theme && typeof theme.bannerSize === "number" && theme.bannerSize > 0)
      return theme.bannerSize;
    return 64;
  }

  function applyBannerSize(theme) {
    const size = getBannerSize(theme || __appRuntimeContext.activeTheme);
    if (__appRuntimeContext.DOM.eventTitle) {
      __appRuntimeContext.DOM.eventTitle.dataset.baseFontSize = String(size);
      __appRuntimeContext.DOM.eventTitle.style.fontSize = `${size}px`;
    }
    fitBannerTextToViewport();
  }

  function syncBannerSizeUI(theme) {
    const size = getBannerSize(theme || __appRuntimeContext.activeTheme);
    __appRuntimeContext.THEME_EDITOR.bannerSize.value = String(size);
  }

  function getThemeWelcomeTitleSize(theme) {
    if (
      theme &&
      typeof theme.welcomeTitleSize === "number" &&
      theme.welcomeTitleSize > 0
    ) {
      return theme.welcomeTitleSize;
    }
    return 56;
  }

  function resolveWelcomeTitleSize(theme) {
    const active = __appRuntimeContext.getActiveEvent();
    if (
      active &&
      typeof active.welcomeTitleSize === "number" &&
      active.welcomeTitleSize > 0
    ) {
      return active.welcomeTitleSize;
    }
    return getThemeWelcomeTitleSize(theme || __appRuntimeContext.activeTheme);
  }

  function applyWelcomeTitleSize(theme) {
    const size = resolveWelcomeTitleSize(theme);
    if (size && size > 0) {
      document.documentElement.style.setProperty(
        "--welcome-title-size",
        `${size}px`
      );
      if (__appRuntimeContext.DOM.welcomeTitle) {
        __appRuntimeContext.DOM.welcomeTitle.dataset.baseFontSize = String(size);
        __appRuntimeContext.DOM.welcomeTitle.style.fontSize = `${size}px`;
      }
    } else {
      document.documentElement.style.removeProperty("--welcome-title-size");
      if (__appRuntimeContext.DOM.welcomeTitle) {
        delete __appRuntimeContext.DOM.welcomeTitle.dataset.baseFontSize;
        __appRuntimeContext.DOM.welcomeTitle.style.fontSize = "";
      }
    }
    fitWelcomeTitleToViewport();
  }

  function syncWelcomeTitleSizeUI(theme) {
    const size = getThemeWelcomeTitleSize(theme || __appRuntimeContext.activeTheme);
    __appRuntimeContext.THEME_EDITOR.welcomeTitleSize.value = String(size);
  }

  function resolveBannerText() {
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.hasOwnEventTextValue(active, "bannerText"))
      return normalizeBannerText(active.bannerText);
    if (__appRuntimeContext.hasOwnEventTextValue(__appRuntimeContext.activeSessionTextDetails, "bannerText")) {
      const sessionText = normalizeBannerText(__appRuntimeContext.activeSessionTextDetails.bannerText);
      if (sessionText) return sessionText;
    }
    return resolveThemeBannerText();
  }

  function syncBannerText() {
    const bannerText = resolveBannerText();
    if (__appRuntimeContext.DOM.eventTitle) __appRuntimeContext.DOM.eventTitle.textContent = bannerText;
    fitBannerTextToViewport();
  }

  function resolveThemeBannerText() {
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget();
    const themeText =
      target && typeof target.bannerText === "string"
        ? normalizeBannerText(target.bannerText)
        : "";
    if (themeText) return themeText;
    if (target && target.welcome && target.welcome.title)
      return target.welcome.title;
    const selection = __appRuntimeContext.getFontPickerSelection();
    const heading = selection.heading || selection.body;
    if (heading) return __appRuntimeContext.getFontPreviewText(heading);
    return "Welcome!";
  }

  function resolveCaptureLabel() {
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.hasOwnEventTextValue(active, "captureLabel")) {
      const eventLabel = active.captureLabel.trim();
      if (eventLabel) return eventLabel;
    }
    if (__appRuntimeContext.hasOwnEventTextValue(__appRuntimeContext.activeSessionTextDetails, "captureLabel")) {
      const sessionLabel = __appRuntimeContext.activeSessionTextDetails.captureLabel.trim();
      if (sessionLabel) return sessionLabel;
    }
    const themeLabel = resolveThemeCaptureLabel();
    if (themeLabel) return themeLabel;
    return resolveBoothCaptureButtonLabel(__appRuntimeContext.mode);
  }

  function syncCaptureButtonText() {
    if (__appRuntimeContext.DOM.captureBtn) __appRuntimeContext.DOM.captureBtn.textContent = resolveCaptureLabel();
  }

  function getBoothPersonalitySource() {
    const active = __appRuntimeContext.getActiveEvent();
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget() || {};
    const pieces = [
      active && active.name,
      active && active.date,
      target && target.name,
      getSelectedThemeKey(),
      target && target.bannerText,
      target && target.welcome && target.welcome.title,
    ];
    return pieces.filter(Boolean).join(" ").toLowerCase();
  }

  function getBoothPersonality() {
    const source = getBoothPersonalitySource();
    if (/christmas|holiday|santa|xmas|winter/.test(source)) {
      return {
        welcome: "Capture a little holiday magic.",
        save: "Take the magic with you.",
        print: "Take home your holiday keepsake.",
        thanks: "Thank you! Enjoy your photos!",
      };
    }
    if (/wedding|bride|groom|married|love|ring/.test(source)) {
      return {
        welcome: "Celebrate the moment.",
        save: "Take this moment with you.",
        print: "Take home a keepsake from the celebration.",
        thanks: "Thank you! Enjoy the celebration!",
      };
    }
    if (/birthday|bday|party|cake/.test(source)) {
      return {
        welcome: "Let's make this birthday unforgettable.",
        save: "Take the party with you.",
        print: "Take home a birthday keepsake.",
        thanks: "Thank you! Enjoy your photos!",
      };
    }
    if (/football|hawks|team|school|game|eagles|tigers|wildcats|panthers/.test(source)) {
      const team = source.includes("hawks") ? "Go Hawks! " : "";
      return {
        welcome: `${team}Ready to make some memories?`,
        save: "Take the win with you.",
        print: "Take home your game-day keepsake.",
        thanks: "Thank you! See you again!",
      };
    }
    return {
      welcome: "Ready to make some memories?",
      save: "Take them with you.",
      print: "Take home your keepsake.",
      thanks: "Thank you! Enjoy your photos!",
    };
  }

  function syncBoothPersonality() {
    const personality = getBoothPersonality();
    if (__appRuntimeContext.DOM.welcomeHostLine) __appRuntimeContext.DOM.welcomeHostLine.textContent = personality.welcome;
    if (__appRuntimeContext.DOM.boothHostPrompt) {
      __appRuntimeContext.DOM.boothHostPrompt.innerHTML = "";
    }
    if (__appRuntimeContext.DOM.qrCodeContainer) {
      const heading = __appRuntimeContext.DOM.qrCodeContainer.querySelector("h2");
      if (heading) heading.textContent = personality.save;
    }
    if (__appRuntimeContext.DOM.qrSaveCopy) __appRuntimeContext.DOM.qrSaveCopy.textContent = "Scan to save your photos.";
  }

  function syncWelcomeLogo() {
    if (!__appRuntimeContext.DOM.welcomeEventLogo) return;
    __appRuntimeContext.DOM.welcomeEventLogo.innerHTML = "";
    const logoSrc =
      (__appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.logo) ||
      (__appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.logoUrl) ||
      "";
    if (!logoSrc) {
      __appRuntimeContext.DOM.welcomeEventLogo.classList.add("hidden");
      return;
    }
    const img = document.createElement("img");
    img.src = __appRuntimeContext.withBust(logoSrc);
    img.alt = "";
    img.onload = () => __appRuntimeContext.DOM.welcomeEventLogo.classList.remove("hidden");
    img.onerror = () => __appRuntimeContext.DOM.welcomeEventLogo.classList.add("hidden");
    __appRuntimeContext.DOM.welcomeEventLogo.appendChild(img);
  }

  function resolveThemeCaptureLabel() {
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget();
    if (
      target &&
      typeof target.captureLabel === "string" &&
      target.captureLabel.trim()
    ) {
      return target.captureLabel.trim();
    }
    return "";
  }

  function resolveBoothCaptureButtonLabel(targetMode = __appRuntimeContext.mode) {
    const normalizedMode = __appRuntimeContext.normalizeBoothModeValue(targetMode);
    if (normalizedMode === "message") {
      return __appRuntimeContext.isMessageRecording ? "Stop Recording" : "Start Recording";
    }
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.hasOwnEventTextValue(active, "captureLabel")) {
      const eventLabel = active.captureLabel.trim();
      if (eventLabel) return eventLabel;
    }
    if (__appRuntimeContext.hasOwnEventTextValue(__appRuntimeContext.activeSessionTextDetails, "captureLabel")) {
      const sessionLabel = __appRuntimeContext.activeSessionTextDetails.captureLabel.trim();
      if (sessionLabel) return sessionLabel;
    }
    const themeLabel = resolveThemeCaptureLabel();
    if (themeLabel) return themeLabel;
    if (normalizedMode === "strip") return "Start Strip";
    if (normalizedMode === "layout") return "Start Layout";
    if (normalizedMode === "live-photo" && __appRuntimeContext.getLivePhotoEnabled()) {
      return "Take Live Photo";
    }
    if (normalizedMode === "still-photo") return "Take Photo";
    return "Take Photo";
  }

  function resolveBoothHelperText(targetMode = __appRuntimeContext.mode) {
    return "";
  }

  function syncBoothHelperText() {
    if (!__appRuntimeContext.DOM.boothHelperText) return;
    __appRuntimeContext.DOM.boothHelperText.textContent = resolveBoothHelperText(__appRuntimeContext.mode);
  }

  function resolveWelcomeTitle() {
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.hasOwnEventTextValue(active, "welcomeTitle"))
      return active.welcomeTitle.trim();
    if (__appRuntimeContext.hasOwnEventTextValue(__appRuntimeContext.activeSessionTextDetails, "welcomeTitle")) {
      const sessionTitle = __appRuntimeContext.activeSessionTextDetails.welcomeTitle.trim();
      if (sessionTitle) return sessionTitle;
    }
    return resolveThemeWelcomeTitle();
  }

  function resolveStartButtonText() {
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.hasOwnEventTextValue(active, "startButtonText")) {
      const eventLabel = active.startButtonText.trim();
      if (eventLabel) return eventLabel;
    }
    if (__appRuntimeContext.hasOwnEventTextValue(__appRuntimeContext.activeSessionTextDetails, "startButtonText")) {
      const sessionLabel = __appRuntimeContext.activeSessionTextDetails.startButtonText.trim();
      if (sessionLabel) return sessionLabel;
    }
    return resolveThemeStartButtonText();
  }

  function syncWelcomeText() {
    const title = resolveWelcomeTitle();
    if (__appRuntimeContext.DOM.welcomeTitle) __appRuntimeContext.DOM.welcomeTitle.textContent = title;
    const prompt = resolveStartButtonText();
    if (__appRuntimeContext.DOM.startButton) __appRuntimeContext.DOM.startButton.textContent = prompt;
    syncBoothPersonality();
    syncWelcomeLogo();
    applyWelcomeTitleSize(__appRuntimeContext.activeTheme);
  }

  function resolveThemeWelcomeTitle() {
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget();
    if (target && target.welcome && target.welcome.title)
      return target.welcome.title;
    return "Welcome!";
  }

  function resolveThemeStartButtonText() {
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget();
    if (target && target.welcome && target.welcome.prompt)
      return target.welcome.prompt;
    return "Tap here to start";
  }

  function resolveThemeWelcomeTitleSizeValue() {
    const target = __appRuntimeContext.activeTheme || getSelectedThemeTarget();
    return getThemeWelcomeTitleSize(target);
  }

  function slugifyThemeName(name) {
    return (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  function ensureCreateThemeAssets() {
    if (!__appRuntimeContext.createThemeAssets) {
      __appRuntimeContext.createThemeAssets = {
        backgrounds: [],
        overlays: [],
        templates: [],
        logos: [],
      };
    }
    return __appRuntimeContext.createThemeAssets;
  }

  function resetCreateThemeAssets() {
    __appRuntimeContext.createThemeAssets = {
      backgrounds: [],
      overlays: [],
      templates: [],
      logos: [],
      characters: [],
    };
  }

  function resetCreateThemeModal() {
    resetCreateThemeAssets();
    if (__appRuntimeContext.DOM.createThemeName) __appRuntimeContext.DOM.createThemeName.value = "";
    if (__appRuntimeContext.DOM.createThemeSummary)
      __appRuntimeContext.DOM.createThemeSummary.textContent = "Drop a theme folder to begin.";
    if (__appRuntimeContext.DOM.createThemeDropZone)
      __appRuntimeContext.DOM.createThemeDropZone.classList.remove("dragover");
    __appRuntimeContext.updateThemeEditorSummary();
  }

  function showCreateThemeModal() {
    if (__appRuntimeContext.DOM.createThemeModal) __appRuntimeContext.DOM.createThemeModal.classList.add("show");
    updateCreateThemeSummary();
    if (__appRuntimeContext.DOM.createThemeName) __appRuntimeContext.DOM.createThemeName.focus();
  }

  function hideCreateThemeModal() {
    if (__appRuntimeContext.DOM.createThemeModal) __appRuntimeContext.DOM.createThemeModal.classList.remove("show");
  }

  function updateCreateThemeSummary() {
    const summary = __appRuntimeContext.DOM.createThemeSummary;
    if (!summary) return;
    if (!__appRuntimeContext.createThemeAssets) {
      summary.textContent = "Drop a theme folder to begin.";
      __appRuntimeContext.updateThemeEditorSummary();
      return;
    }
    const parts = [];
    const {
      backgrounds = [],
      overlays = [],
      templates = [],
      logos = [],
    } = __appRuntimeContext.createThemeAssets;
    if (backgrounds.length)
      parts.push(
        `${backgrounds.length} background${backgrounds.length === 1 ? "" : "s"}`
      );
    if (overlays.length)
      parts.push(`${overlays.length} overlay${overlays.length === 1 ? "" : "s"}`);
    if (templates.length)
      parts.push(
        `${templates.length} template${templates.length === 1 ? "" : "s"}`
      );
    if (logos.length)
      parts.push(`${logos.length} logo${logos.length === 1 ? "" : "s"}`);
    if (characters.length)
      parts.push(
        `${characters.length} character${characters.length === 1 ? "" : "s"}`
      );
    summary.textContent = parts.length
      ? `Assets ready: ${parts.join(", ")}`
      : "No assets detected yet.";
    __appRuntimeContext.updateThemeEditorSummary();
  }

  function handleCreateThemeDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    if (__appRuntimeContext.DOM.createThemeDropZone)
      __appRuntimeContext.DOM.createThemeDropZone.classList.add("dragover");
  }

  function handleCreateThemeDragLeave(event) {
    event.preventDefault();
    if (__appRuntimeContext.DOM.createThemeDropZone)
      __appRuntimeContext.DOM.createThemeDropZone.classList.remove("dragover");
  }

  async function handleCreateThemeDrop(event) {
    event.preventDefault();
    if (__appRuntimeContext.DOM.createThemeDropZone)
      __appRuntimeContext.DOM.createThemeDropZone.classList.remove("dragover");
    const files = await extractFilesFromDataTransfer(event.dataTransfer);
    if (files.length) {
      handleCreateThemeFiles(files);
    }
  }

  function handleCreateThemeFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    resetCreateThemeAssets();
    const assets = ensureCreateThemeAssets();
    files.forEach((file) => {
      const category = categorizeThemeAsset(file);
      if (!category) return;
      assets[category].push(file);
    });
    updateCreateThemeSummary();
  }

  function categorizeThemeAsset(file) {
    const rel = (
      file.webkitRelativePath ||
      file._relativePath ||
      file.name ||
      ""
    ).toLowerCase();
    if (rel.includes("overlay")) return "overlays";
    if (rel.includes("template")) return "templates";
    if (rel.includes("background")) return "backgrounds";
    if (rel.includes("logo")) return "logos";
    return null;
  }

  async function extractFilesFromDataTransfer(dataTransfer) {
    const files = [];
    if (!dataTransfer) return files;
    if (dataTransfer.items && dataTransfer.items.length) {
      const items = Array.from(dataTransfer.items).filter(
        (item) => item.kind === "file"
      );
      const nested = await Promise.all(
        items.map(async (item) => {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            return traverseFileEntry(entry).catch(() => []);
          }
          const file = item.getAsFile();
          return file ? [file] : [];
        })
      );
      nested.forEach((list) => files.push(...list));
    } else if (dataTransfer.files && dataTransfer.files.length) {
      files.push(...Array.from(dataTransfer.files));
    }
    return files;
  }

  function readAllDirectoryEntries(reader) {
    return new Promise((resolve) => {
      const entries = [];
      const readEntries = () => {
        reader.readEntries(
          (batch) => {
            if (!batch.length) {
              resolve(entries);
            } else {
              entries.push(...batch);
              readEntries();
            }
          },
          () => resolve(entries)
        );
      };
      readEntries();
    });
  }

  async function traverseFileEntry(entry, path = "") {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) =>
        entry.file(resolve, reject)
      ).catch(() => null);
      if (!file) return [];
      file._relativePath = path + entry.name;
      return [file];
    }
    if (entry.isDirectory) {
      const entries = await readAllDirectoryEntries(entry.createReader());
      const nested = await Promise.all(
        entries.map((ent) => traverseFileEntry(ent, path + entry.name + "/"))
      );
      return nested.flat();
    }
    return [];
  }

  async function confirmCreateTheme() {
    const name =
      valueFromInput(__appRuntimeContext.DOM.createThemeName) || __appRuntimeContext.THEME_EDITOR.name.value;
    const slug = slugifyThemeName(name);
    if (!slug) {
      alert("Enter a valid name for the new theme.");
      return;
    }
    if (__appRuntimeContext.themes[slug]) {
      alert("A theme with that name already exists.");
      return;
    }
    const assets = ensureCreateThemeAssets();
    const hasAny =
      assets.backgrounds.length +
        assets.overlays.length +
        assets.templates.length +
        assets.logos.length >
      0;
    if (!hasAny) {
      const proceed = confirm("No assets were detected. Create an empty theme?");
      if (!proceed) return;
    }
    const baseTheme = __appRuntimeContext.cloneThemeValue(__appRuntimeContext.BUILTIN_THEMES.general.themes.summer || {});
    const newTheme = __appRuntimeContext.mergePlainObject(baseTheme, {});
    newTheme.name = name;
    newTheme.background = "";
    newTheme.backgrounds = [];
    newTheme.overlays = [];
    newTheme.templates = [];
    newTheme.logo = "";
    newTheme.welcome = __appRuntimeContext.mergePlainObject(
      baseTheme.welcome || {},
      newTheme.welcome || {}
    );
    newTheme.welcome.title = newTheme.welcome.title || name;

    const tasks = [];
    const existingGlobalLogo = __appRuntimeContext.getGlobalLogo();
    assets.backgrounds.forEach((file, index) => {
      tasks.push(
        __appRuntimeContext.uploadAsset(file, "backgrounds").then((url) => {
          if (!url) return;
          ensureArray(newTheme, "backgrounds");
          newTheme.backgrounds.push(url);
          if (!newTheme.background) newTheme.background = url;
        })
      );
    });
    assets.overlays.forEach((file) => {
      tasks.push(
        __appRuntimeContext.uploadAsset(file, "overlays").then((url) => {
          if (!url) return;
          ensureArray(newTheme, "overlays");
          newTheme.overlays.push(url);
        })
      );
    });
    assets.templates.forEach((file) => {
      tasks.push(
        __appRuntimeContext.uploadAsset(file, "templates").then((url) => {
          if (!url) return;
          ensureArray(newTheme, "templates");
          newTheme.templates.push({ src: url, layout: "double_column" });
        })
      );
    });
    if (assets.logos.length) {
      const logoFile = assets.logos[0];
      tasks.push(
        __appRuntimeContext.uploadAsset(logoFile, "logo").then((url) => {
          if (url) newTheme.logo = url;
        })
      );
    }

    try {
      await Promise.all(tasks);
      __appRuntimeContext.themes[slug] = newTheme;
      if (newTheme.logo) {
        __appRuntimeContext.setGlobalLogo(newTheme.logo, { quiet: true, skipSave: true });
      } else if (existingGlobalLogo) {
        newTheme.logo = existingGlobalLogo;
      }
      __appRuntimeContext.saveThemesToStorage();
      __appRuntimeContext.populateThemeSelector(slug);
      __appRuntimeContext.setEventSelection(slug);
      __appRuntimeContext.loadTheme(slug);
      __appRuntimeContext.THEME_EDITOR.name.value = newTheme.name;
      __appRuntimeContext.THEME_EDITOR.mode.value = "edit";
      setThemeEditorMode("edit");
      hideCreateThemeModal();
      resetCreateThemeModal();
      __appRuntimeContext.showToast(`Theme "${name}" created`);
    } catch (err) {
      console.error("Failed to create theme", err);
      alert("Could not create theme. See console for details.");
    }
  }

  function handleCloneTheme() {
    if (!__appRuntimeContext.activeTheme) {
      alert("Select a theme to clone first.");
      return;
    }
    const name = valueFromInput(__appRuntimeContext.DOM.themeCloneName);
    const slug = slugifyThemeName(name);
    if (!slug) {
      alert("Enter a name for the cloned theme.");
      return;
    }
    const currentKey = getSelectedThemeKey();
    const location = __appRuntimeContext.resolveThemeStorage(currentKey);
    const cloned = __appRuntimeContext.cloneThemeValue(__appRuntimeContext.activeTheme);
    cloned.name = name;
    cloned.welcome = __appRuntimeContext.mergePlainObject(
      __appRuntimeContext.activeTheme.welcome || {},
      cloned.welcome || {}
    );
    if (cloned.welcome) cloned.welcome.title = cloned.welcome.title || name;

    let newKey = slug;
    if (
      location.bucket &&
      location.parent &&
      typeof location.parent === "object"
    ) {
      if (!location.parent[location.bucket])
        location.parent[location.bucket] = {};
      if (location.parent[location.bucket][slug]) {
        alert("A theme with that name already exists in this category.");
        return;
      }
      location.parent[location.bucket][slug] = cloned;
      newKey = `${location.root}:${slug}`;
    } else {
      if (__appRuntimeContext.themes[slug]) {
        alert("A theme with that name already exists.");
        return;
      }
      __appRuntimeContext.themes[slug] = cloned;
    }

    __appRuntimeContext.saveThemesToStorage();
    __appRuntimeContext.populateThemeSelector(newKey);
    __appRuntimeContext.setEventSelection(newKey);
    __appRuntimeContext.loadTheme(newKey);
    if (__appRuntimeContext.DOM.themeCloneName) __appRuntimeContext.DOM.themeCloneName.value = "";
    __appRuntimeContext.THEME_EDITOR.mode.value = "edit";
    setThemeEditorMode("edit");
    __appRuntimeContext.showToast(`Cloned theme as "${name}"`);
  }

  function applyThemeBasicsFromEditor(target) {
    target.name = __appRuntimeContext.THEME_EDITOR.name.value || target.name;
    target.accent = __appRuntimeContext.THEME_EDITOR.accent.value || target.accent;
    target.accent2 = __appRuntimeContext.THEME_EDITOR.accent2.value || target.accent2;
    const picker = __appRuntimeContext.getFontPickerSelection();
    if (picker.heading) {
      target.fontHeading = __appRuntimeContext.composeFontString(picker.heading);
      __appRuntimeContext.ensureFontLoaded(picker.heading, false);
    }
    if (picker.body) {
      target.fontBody = __appRuntimeContext.composeFontString(picker.body);
      __appRuntimeContext.ensureFontLoaded(picker.body, false);
    }
    target.font = __appRuntimeContext.composeFontString(
      picker.body ||
        picker.heading ||
        __appRuntimeContext.primaryFontFamily(target.font || "") ||
        "Comic Neue"
    );
    target.welcome = target.welcome || {};
    target.welcome.title = __appRuntimeContext.THEME_EDITOR.welcomeTitle.value;
    target.welcome.prompt = __appRuntimeContext.THEME_EDITOR.welcomePrompt.value;
  }

  function resolveEventLogo(theme) {
    const active = __appRuntimeContext.getActiveEvent();
    if (__appRuntimeContext.activeSessionAssets.logo) return __appRuntimeContext.activeSessionAssets.logo;
    if (active && typeof active.logo === "string" && active.logo)
      return active.logo;
    return theme && theme.logo ? theme.logo : "";
  }

  function applyCharacterPosition(theme) {
    const pos = getCharacterPosition(theme);
    document.documentElement.style.setProperty("--char-x", `${pos.left}%`);
    document.documentElement.style.setProperty("--char-bottom", `${pos.bottom}%`);
    document.documentElement.style.setProperty("--char-height", `${pos.height}%`);
    if (__appRuntimeContext.DOM.characterXInput) __appRuntimeContext.DOM.characterXInput.value = String(pos.left);
    if (__appRuntimeContext.DOM.characterXValue) __appRuntimeContext.DOM.characterXValue.textContent = `${pos.left}%`;
    if (__appRuntimeContext.DOM.characterBottomInput)
      __appRuntimeContext.DOM.characterBottomInput.value = String(pos.bottom);
    if (__appRuntimeContext.DOM.characterBottomValue)
      __appRuntimeContext.DOM.characterBottomValue.textContent = `${pos.bottom}%`;
    if (__appRuntimeContext.DOM.characterHeightInput)
      __appRuntimeContext.DOM.characterHeightInput.value = String(pos.height);
    if (__appRuntimeContext.DOM.characterHeightValue)
      __appRuntimeContext.DOM.characterHeightValue.textContent = `${pos.height}%`;
  }

  function ensureArray(target, prop) {
    if (!Array.isArray(target[prop])) target[prop] = [];
  }

  async function uploadThemeAssetsFromEditor(target) {
    const tasks = [];
    let backgroundsAdded = 0;
    let greenBackgroundsAdded = 0;
    let overlaysAdded = 0;
    let templatesAdded = 0;
    let logoUrl = "";
    let characterUrl = "";

    const backgroundFile =
      __appRuntimeContext.DOM.themeBackground && __appRuntimeContext.DOM.themeBackground.files
        ? __appRuntimeContext.DOM.themeBackground.files[0]
        : null;
    if (backgroundFile) {
      tasks.push(
        __appRuntimeContext.uploadAsset(backgroundFile, "backgrounds").then((url) => {
          if (!url) return;
          if (Array.isArray(target.backgrounds)) target.backgrounds.push(url);
          else if (target.background) {
            target.backgrounds = [target.background, url];
            delete target.backgroundIndex;
          } else target.background = url;
          backgroundsAdded += 1;
        })
      );
    }

    const greenBackgroundFiles =
      __appRuntimeContext.DOM.themeGreenBackgrounds && __appRuntimeContext.DOM.themeGreenBackgrounds.files
        ? Array.from(__appRuntimeContext.DOM.themeGreenBackgrounds.files)
        : [];
    if (greenBackgroundFiles.length) {
      if (!Array.isArray(target.greenBackgrounds)) target.greenBackgrounds = [];
      greenBackgroundFiles.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(file, "greenBackgrounds").then((url) => {
            if (!url) return;
            target.greenBackgrounds.push(url);
            greenBackgroundsAdded += 1;
          })
        );
      });
    }

    const logoFile =
      __appRuntimeContext.DOM.themeLogo && __appRuntimeContext.DOM.themeLogo.files ? __appRuntimeContext.DOM.themeLogo.files[0] : null;
    if (logoFile) {
      tasks.push(
        __appRuntimeContext.uploadAsset(logoFile, "logo").then((url) => {
          if (!url) return;
          target.logo = url;
          logoUrl = url;
        })
      );
    }

    const overlayFiles =
      __appRuntimeContext.DOM.themeOverlays && __appRuntimeContext.DOM.themeOverlays.files
        ? Array.from(__appRuntimeContext.DOM.themeOverlays.files)
        : [];
    if (overlayFiles.length) {
      ensureArray(target, "overlays");
      overlayFiles.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(file, "overlays").then((url) => {
            if (!url) return;
            target.overlays.push(url);
            overlaysAdded += 1;
          })
        );
      });
    }

    const templateFiles =
      __appRuntimeContext.DOM.themeTemplates && __appRuntimeContext.DOM.themeTemplates.files
        ? Array.from(__appRuntimeContext.DOM.themeTemplates.files)
        : [];
    if (templateFiles.length) {
      ensureArray(target, "templates");
      templateFiles.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(file, "templates").then((url) => {
            if (!url) return;
            target.templates.push({ src: url, layout: "double_column" });
            templatesAdded += 1;
          })
        );
      });
    }

    await Promise.all(tasks);
    return {
      backgroundsAdded,
      greenBackgroundsAdded,
      overlaysAdded,
      templatesAdded,
      logoUrl,
    };
  }

  function clearThemeFileInputs() {
    if (__appRuntimeContext.DOM.themeBackground) __appRuntimeContext.DOM.themeBackground.value = "";
    if (__appRuntimeContext.DOM.themeLogo) __appRuntimeContext.DOM.themeLogo.value = "";
    if (__appRuntimeContext.DOM.themeGreenBackgrounds) __appRuntimeContext.DOM.themeGreenBackgrounds.value = "";
    if (__appRuntimeContext.DOM.themeOverlays) __appRuntimeContext.DOM.themeOverlays.value = "";
    if (__appRuntimeContext.DOM.themeTemplates) __appRuntimeContext.DOM.themeTemplates.value = "";
  }

  return {
    setupFontPicker,
    setThemeEditorMode,
    normalizeFontFamilyName,
    buildGoogleFontsURL,
    getSelectedThemeKey,
    getThemeOptions,
    getSelectedThemeTarget,
    updateSelectedTheme,
    updateCurrentThemeAssets,
    createSubThemeFromEvent,
    describeThemeUpdate,
    valueFromInput,
    normalizeBannerText,
    fitTextToBox,
    fitBannerTextToViewport,
    fitWelcomeTitleToViewport,
    getBannerSize,
    applyBannerSize,
    syncBannerSizeUI,
    getThemeWelcomeTitleSize,
    resolveWelcomeTitleSize,
    applyWelcomeTitleSize,
    syncWelcomeTitleSizeUI,
    resolveBannerText,
    syncBannerText,
    resolveThemeBannerText,
    resolveCaptureLabel,
    syncCaptureButtonText,
    getBoothPersonalitySource,
    getBoothPersonality,
    syncBoothPersonality,
    syncWelcomeLogo,
    resolveThemeCaptureLabel,
    resolveBoothCaptureButtonLabel,
    resolveBoothHelperText,
    syncBoothHelperText,
    resolveWelcomeTitle,
    resolveStartButtonText,
    syncWelcomeText,
    resolveThemeWelcomeTitle,
    resolveThemeStartButtonText,
    resolveThemeWelcomeTitleSizeValue,
    slugifyThemeName,
    ensureCreateThemeAssets,
    resetCreateThemeAssets,
    resetCreateThemeModal,
    showCreateThemeModal,
    hideCreateThemeModal,
    updateCreateThemeSummary,
    handleCreateThemeDragOver,
    handleCreateThemeDragLeave,
    handleCreateThemeDrop,
    handleCreateThemeFiles,
    categorizeThemeAsset,
    extractFilesFromDataTransfer,
    readAllDirectoryEntries,
    traverseFileEntry,
    confirmCreateTheme,
    handleCloneTheme,
    applyThemeBasicsFromEditor,
    resolveEventLogo,
    applyCharacterPosition,
    ensureArray,
    uploadThemeAssetsFromEditor,
    clearThemeFileInputs,
  };
}
