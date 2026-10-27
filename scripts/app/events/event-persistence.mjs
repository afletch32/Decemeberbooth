export function createEventPersistenceModule(__appRuntimeContext) {
  function createEucalyptusWeddingTheme(partner1, partner2, date) {
    const coupleNames = `${partner1} & ${partner2}`;
    const assetBase = `${__appRuntimeContext.WEDDING_THEME_ASSETS}/`;
    return {
      name: `${coupleNames} Wedding`,
      eventTypes: ["wedding"],
      fontPairingStyle: "wedding",
      accent: "#55715e",
      accent2: "#e4d2a8",
      fontHeading: "'Great Vibes', cursive",
      fontBody: "'Lora', serif",
      bannerText: coupleNames,
      captureLabel: "Take Photo",
      backgrounds: [
        `${assetBase}eucalyptus-wedding-background-portrait.webp`,
        `${assetBase}eucalyptus-wedding-background-landscape.webp`,
      ],
      idleScreens: [
        {
          src: `${assetBase}eucalyptus-wedding-idle-portrait.webp`,
          name: "Eucalyptus Wedding welcome portrait",
          role: "idle",
          orientation: "portrait",
          buttonZones: { start: { x: 50, y: 82, width: 58, height: 20 } },
        },
        {
          src: `${assetBase}eucalyptus-wedding-idle-landscape.webp`,
          name: "Eucalyptus Wedding welcome landscape",
          role: "idle",
          orientation: "landscape",
          buttonZones: { start: { x: 50, y: 82, width: 42, height: 20 } },
        },
        {
          src: `${assetBase}eucalyptus-wedding-photo-choice-portrait.webp`,
          name: "Eucalyptus Wedding photo choice portrait",
          role: "photo-choice",
          orientation: "portrait",
          buttonZones: {
            singlePhoto: { x: 33, y: 51, width: 36, height: 34 },
            photoStrip: { x: 67, y: 51, width: 36, height: 34 },
          },
        },
        {
          src: `${assetBase}eucalyptus-wedding-photo-choice-landscape.webp`,
          name: "Eucalyptus Wedding photo choice landscape",
          role: "photo-choice",
          orientation: "landscape",
          buttonZones: {
            singlePhoto: { x: 31, y: 52, width: 36, height: 42 },
            photoStrip: { x: 69, y: 52, width: 36, height: 42 },
          },
        },
      ],
      thankYouScreens: [
        {
          src: `${assetBase}eucalyptus-wedding-thank-you-portrait.webp`,
          name: "Eucalyptus Wedding Thank You portrait",
          orientation: "portrait",
        },
        {
          src: `${assetBase}eucalyptus-wedding-thank-you-landscape.webp`,
          name: "Eucalyptus Wedding Thank You landscape",
          orientation: "landscape",
        },
      ],
      overlays: [
        {
          id: "eucalyptus-wedding-portrait",
          name: "Eucalyptus Wedding Portrait",
          src: `${assetBase}eucalyptus-wedding-overlay-portrait.png`,
          type: "overlay",
          category: "wedding",
          orientation: "portrait",
          aspectRatio: "2:3",
          foreground: { type: "image", src: `${assetBase}eucalyptus-wedding-overlay-portrait.png` },
          photoSlots: [{ x: 0.112, y: 0.072, width: 0.777, height: 0.777, objectFit: "cover" }],
          textFields: [
            { key: "couple_names", xPct: 0.16, yPct: 0.858, wPct: 0.68, hPct: 0.035, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 48, minFontSize: 24, color: "#405745", align: "center" },
            { key: "event_date", xPct: 0.2, yPct: 0.908, wPct: 0.6, hPct: 0.026, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 25, minFontSize: 15, color: "#6e755f", align: "center" },
          ],
        },
        {
          id: "eucalyptus-wedding-landscape",
          name: "Eucalyptus Wedding Landscape",
          src: `${assetBase}eucalyptus-wedding-overlay-landscape.png`,
          type: "overlay",
          category: "wedding",
          orientation: "landscape",
          aspectRatio: "3:2",
          foreground: { type: "image", src: `${assetBase}eucalyptus-wedding-overlay-landscape.png` },
          photoSlots: [{ x: 0.05, y: 0.10, width: 0.90, height: 0.80, objectFit: "cover" }],
          textFields: [
            { key: "couple_names", xPct: 0.2, yPct: 0.905, wPct: 0.6, hPct: 0.032, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 43, minFontSize: 22, color: "#405745", align: "center" },
            { key: "event_date", xPct: 0.25, yPct: 0.949, wPct: 0.5, hPct: 0.023, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 22, minFontSize: 14, color: "#6e755f", align: "center" },
          ],
        },
      ],
      templates: [
        {
          src: `${assetBase}eucalyptus-wedding-three-photo-strip.png`,
          name: "Eucalyptus Wedding Three-Photo Strip",
          layout: "photo_strip_3",
          photoSlots: [
            { x: 0.125, y: 0.083, width: 0.75, height: 0.24, sourceIndex: 0 },
            { x: 0.125, y: 0.354, width: 0.75, height: 0.248, sourceIndex: 1 },
            { x: 0.125, y: 0.636, width: 0.75, height: 0.237, sourceIndex: 2 },
          ],
          textFields: [
            { key: "couple_names", xPct: 0.17, yPct: 0.902, wPct: 0.66, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#405745", align: "center" },
            { key: "event_date", xPct: 0.25, yPct: 0.94, wPct: 0.5, hPct: 0.02, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 21, minFontSize: 14, color: "#6e755f", align: "center" },
          ],
        },
      ],
      welcome: {
        title: coupleNames,
        prompt: "Touch to start",
      },
      eventDate: date,
      vibeSummary: "Eucalyptus greenery, ivory, and warm gold",
    };
  }

  function createMinimalWeddingTheme(partner1, partner2, date) {
    const theme = createEucalyptusWeddingTheme(partner1, partner2, date);
    const assetBase = "/assets/themes/minimal-wedding/";
    const coupleNames = `${partner1} & ${partner2}`;
    theme.name = `${coupleNames} Wedding`;
    theme.accent = "#252525";
    theme.accent2 = "#efede8";
    theme.fontHeading = "'Lora', serif";
    theme.fontBody = "'Lora', serif";
    theme.vibeSummary = "Monochrome keepsake prints with delicate botanical details";
    theme.overlays = [
      {
        id: "minimal-wedding-portrait",
        name: "Minimal Wedding Portrait",
        src: `${assetBase}minimal-wedding-overlay-portrait.png`,
        type: "overlay",
        category: "wedding",
        orientation: "portrait",
        aspectRatio: "2:3",
        foreground: { type: "image", src: `${assetBase}minimal-wedding-overlay-portrait.png` },
        photoSlots: [{ x: 0.154, y: 0.117, width: 0.692, height: 0.669, objectFit: "cover" }],
        textFields: [
          { key: "couple_names", xPct: 0.16, yPct: 0.816, wPct: 0.68, hPct: 0.035, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 48, minFontSize: 24, color: "#262626", align: "center" },
          { key: "event_date", xPct: 0.2, yPct: 0.866, wPct: 0.6, hPct: 0.026, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 25, minFontSize: 15, color: "#555555", align: "center" },
        ],
      },
      {
        id: "minimal-wedding-landscape",
        name: "Minimal Wedding Landscape",
        src: `${assetBase}minimal-wedding-overlay-landscape.png`,
        type: "overlay",
        category: "wedding",
        orientation: "landscape",
        aspectRatio: "3:2",
        foreground: { type: "image", src: `${assetBase}minimal-wedding-overlay-landscape.png` },
        photoSlots: [{ x: 0.052, y: 0.103, width: 0.898, height: 0.776, objectFit: "cover" }],
        textFields: [
          { key: "couple_names", xPct: 0.2, yPct: 0.905, wPct: 0.6, hPct: 0.032, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 43, minFontSize: 22, color: "#262626", align: "center" },
          { key: "event_date", xPct: 0.25, yPct: 0.949, wPct: 0.5, hPct: 0.023, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 22, minFontSize: 14, color: "#555555", align: "center" },
        ],
      },
    ];
    theme.templates = [
      {
        src: `${assetBase}minimal-wedding-three-photo-strip.png`,
        name: "Minimal Wedding Three-Photo Strip",
        layout: "photo_strip_3",
        photoSlots: [
          { x: 0.099, y: 0.086, width: 0.356, height: 0.226, sourceIndex: 0 },
          { x: 0.099, y: 0.335, width: 0.356, height: 0.226, sourceIndex: 1 },
          { x: 0.099, y: 0.585, width: 0.356, height: 0.235, sourceIndex: 2 },
          { x: 0.545, y: 0.086, width: 0.352, height: 0.226, sourceIndex: 0 },
          { x: 0.545, y: 0.335, width: 0.352, height: 0.226, sourceIndex: 1 },
          { x: 0.545, y: 0.585, width: 0.352, height: 0.235, sourceIndex: 2 },
        ],
        textFields: [
          { key: "couple_names", xPct: 0.07, yPct: 0.845, wPct: 0.4, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#262626", align: "center" },
          { key: "event_date", xPct: 0.07, yPct: 0.89, wPct: 0.4, hPct: 0.03, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 30, minFontSize: 26, color: "#333333", align: "center" },
          { key: "couple_names", xPct: 0.53, yPct: 0.845, wPct: 0.4, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#262626", align: "center" },
          { key: "event_date", xPct: 0.53, yPct: 0.89, wPct: 0.4, hPct: 0.03, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 30, minFontSize: 26, color: "#333333", align: "center" },
        ],
      },
    ];
    theme.backgrounds = [
      `${assetBase}minimal-wedding-background-portrait.webp`,
      `${assetBase}minimal-wedding-background-landscape.webp`,
    ];
    theme.idleScreens = [
      {
        src: `${assetBase}minimal-wedding-idle-portrait.webp`,
        name: "Minimal Wedding welcome portrait",
        role: "idle",
        orientation: "portrait",
        buttonZones: { start: { x: 50, y: 52, width: 74, height: 17 } },
      },
      {
        src: `${assetBase}minimal-wedding-idle-landscape.webp`,
        name: "Minimal Wedding welcome landscape",
        role: "idle",
        orientation: "landscape",
        buttonZones: { start: { x: 50, y: 61, width: 48, height: 20 } },
      },
      {
        src: `${assetBase}minimal-wedding-photo-choice-portrait.webp`,
        name: "Minimal Wedding photo choice portrait",
        role: "photo-choice",
        orientation: "portrait",
        buttonZones: {
          singlePhoto: { x: 50, y: 43, width: 72, height: 27 },
          photoStrip: { x: 50, y: 71, width: 72, height: 27 },
        },
      },
      {
        src: `${assetBase}minimal-wedding-photo-choice-landscape.webp`,
        name: "Minimal Wedding photo choice landscape",
        role: "photo-choice",
        orientation: "landscape",
        buttonZones: {
          singlePhoto: { x: 31, y: 55, width: 38, height: 49 },
          photoStrip: { x: 70, y: 55, width: 38, height: 49 },
        },
      },
    ];
    theme.thankYouScreens = [
      {
        src: `${assetBase}minimal-wedding-thank-you-portrait.webp`,
        name: "Minimal Wedding thank you portrait",
        orientation: "portrait",
      },
      {
        src: `${assetBase}minimal-wedding-thank-you-landscape.webp`,
        name: "Minimal Wedding thank you landscape",
        orientation: "landscape",
      },
    ];
    theme.welcome = { title: coupleNames, prompt: "Touch to start" };
    return theme;
  }

  function syncWeddingThemeChoice(style = "eucalyptus") {
    const normalizedStyle = style === "minimal" ? "minimal" : "eucalyptus";
    document.querySelectorAll('input[name="weddingThemeChoice"]').forEach((input) => {
      input.checked = input.value === normalizedStyle;
    });
  }

  function createWeddingTheme(style, partner1, partner2, date) {
    return style === "minimal"
      ? createMinimalWeddingTheme(partner1, partner2, date)
      : createEucalyptusWeddingTheme(partner1, partner2, date);
  }

  function getStoredEvents() {
    try {
      const raw = localStorage.getItem(__appRuntimeContext.EVENTS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function setStoredEvents(events, options = {}) {
    const list = Array.isArray(events) ? events.slice() : [];
    const migratedHalloweenBackgrounds = __appRuntimeContext.migrateHalloweenEventAssets(list);
    list.sort((a, b) => {
      const ad = a && a.date ? new Date(a.date).getTime() : 0;
      const bd = b && b.date ? new Date(b.date).getTime() : 0;
      if (ad !== bd) return bd - ad;
      const an = a && a.name ? a.name.toLowerCase() : "";
      const bn = b && b.name ? b.name.toLowerCase() : "";
      return an.localeCompare(bn);
    });
    localStorage.setItem(__appRuntimeContext.EVENTS_STORAGE_KEY, JSON.stringify(list));
    if (!options.skipRemoteSync || migratedHalloweenBackgrounds)
      __appRuntimeContext.scheduleEventsRemoteSync();
  }

  function getActiveEventId() {
    return localStorage.getItem(__appRuntimeContext.ACTIVE_EVENT_KEY) || "";
  }

  function setActiveEventId(id, options = {}) {
    if (id) localStorage.setItem(__appRuntimeContext.ACTIVE_EVENT_KEY, id);
    else localStorage.removeItem(__appRuntimeContext.ACTIVE_EVENT_KEY);
    if (id) __appRuntimeContext.activeSessionTextDetails = {};
    if (__appRuntimeContext.DOM.eventProfileSelect) __appRuntimeContext.DOM.eventProfileSelect.value = id || "";
    __appRuntimeContext.updateStaffPrintQueueUrl();
    if (!options.skipRemoteSync) __appRuntimeContext.scheduleEventsRemoteSync();
  }

  function getActiveEvent() {
    const id = getActiveEventId();
    if (!id) return null;
    const events = getStoredEvents();
    return events.find((event) => event && event.id === id) || null;
  }

  function ensureEventOverrides(event) {
    if (!event.overrides || typeof event.overrides !== "object") {
      event.overrides = {
        backgrounds: [],
        overlays: [],
        templates: [],
        backgroundIndex: 0,
        greenBackgrounds: [],
        greenBackgroundIndex: 0,
      };
    }
    if (!Array.isArray(event.overrides.backgrounds))
      event.overrides.backgrounds = [];
    if (!Array.isArray(event.overrides.overlays)) event.overrides.overlays = [];
    if (!Array.isArray(event.overrides.templates)) event.overrides.templates = [];
    if (!Array.isArray(event.overrides.thankYouScreens)) event.overrides.thankYouScreens = [];
    if (typeof event.overrides.backgroundIndex !== "number")
      event.overrides.backgroundIndex = 0;
    if (!Array.isArray(event.overrides.greenBackgrounds))
      event.overrides.greenBackgrounds = [];
    if (typeof event.overrides.greenBackgroundIndex !== "number")
      event.overrides.greenBackgroundIndex = 0;
    return event.overrides;
  }

  function getActiveEventOverrides() {
    const active = getActiveEvent();
    if (!active)
      return {
        backgrounds: [],
        overlays: [],
        templates: [],
        thankYouScreens: [],
        backgroundIndex: 0,
        greenBackgrounds: [],
        greenBackgroundIndex: 0,
      };
    return ensureEventOverrides(active);
  }

  function hasOwnEventTextValue(active, key) {
    return !!(
      active &&
      Object.prototype.hasOwnProperty.call(active, key) &&
      typeof active[key] === "string"
    );
  }

  function getSavedEventTextValue(active, key) {
    return hasOwnEventTextValue(active, key) ? active[key] : "";
  }

  function isDefaultEventTextValue(value, fallback = "") {
    const current = typeof value === "string" ? value.trim() : "";
    const defaultValue = typeof fallback === "string" ? fallback.trim() : "";
    return !!current && !!defaultValue && current === defaultValue;
  }

  function setTextFieldValueAndPlaceholder(
    node,
    value = "",
    placeholder = "",
    disabled = false
  ) {
    if (!node) return;
    const safeValue = typeof value === "string" ? value : "";
    const safePlaceholder = typeof placeholder === "string" ? placeholder : "";
    node.placeholder = safePlaceholder;
    if (typeof document === "undefined" || document.activeElement !== node) {
      node.value = isDefaultEventTextValue(safeValue, safePlaceholder)
        ? ""
        : safeValue;
    }
    node.disabled = !!disabled;
  }

  function describeAssetSummaryCounts({
    backgrounds = 0,
    greenBackgrounds = 0,
    overlays = 0,
    templates = 0,
    hasLogo = false,
    hasCharacter = false,
  } = {}) {
    const parts = [];
    if (backgrounds)
      parts.push(`${backgrounds} background${backgrounds === 1 ? "" : "s"}`);
    if (greenBackgrounds)
      parts.push(
        `${greenBackgrounds} green BG${greenBackgrounds === 1 ? "" : "s"}`
      );
    if (overlays) parts.push(`${overlays} overlay${overlays === 1 ? "" : "s"}`);
    if (templates)
      parts.push(`${templates} template${templates === 1 ? "" : "s"}`);
    if (hasLogo) parts.push("logo");
    return parts.length ? parts.join(", ") : "none";
  }

  function getEventEditorTheme(theme = null) {
    const active = getActiveEvent();
    const eventThemeKey = getEventEditorThemeKey();
    return (
      theme ||
      __appRuntimeContext.resolveThemeByKey(eventThemeKey) ||
      __appRuntimeContext.activeTheme ||
      __appRuntimeContext.getSelectedThemeTarget() ||
      null
    );
  }

  function getEventEditorThemeKey() {
    const active = getActiveEvent();
    return (
      (active && active.themeKey) ||
      __appRuntimeContext.getSelectedThemeKey() ||
      ""
    );
  }

  function isWeddingEventTheme(themeObj = null) {
    const active = getActiveEvent();
    const savedType = getSavedEventTextValue(
      active || __appRuntimeContext.activeSessionTextDetails,
      "eventType"
    );
    if (savedType) return __appRuntimeContext.normalizeEventStyle(savedType) === "wedding";
    const themeKey = getEventEditorThemeKey();
    const theme = themeObj || __appRuntimeContext.resolveThemeByKey(themeKey);
    return (
      __appRuntimeContext.normalizeEventStyle(__appRuntimeContext.inferThemeEventStyle(themeKey, theme)) === "wedding"
    );
  }

  function isBirthdayEventTheme(themeObj = null) {
    const active = getActiveEvent();
    const savedType = getSavedEventTextValue(
      active || __appRuntimeContext.activeSessionTextDetails,
      "eventType"
    );
    if (savedType) return __appRuntimeContext.normalizeEventStyle(savedType) === "birthday";
    const themeKey = getEventEditorThemeKey();
    const theme = themeObj || __appRuntimeContext.resolveThemeByKey(themeKey);
    return (
      __appRuntimeContext.normalizeEventStyle(__appRuntimeContext.inferThemeEventStyle(themeKey, theme)) === "birthday"
    );
  }

  function syncWeddingOnlyEventFields(themeObj = null) {
    const showWeddingFields =
      __appRuntimeContext.weddingSetupRequested || isWeddingEventTheme(themeObj);
    document.querySelectorAll(".wedding-only-event-field").forEach((node) => {
      node.classList.toggle("hidden", !showWeddingFields);
    });
  }

  function syncWeddingSetupMode() {
    const active = getActiveEvent();
    const editingWedding = !!(
      active && active.eventType === "wedding" && active.weddingTheme
    );
    const weddingSelected = __appRuntimeContext.weddingSetupRequested || editingWedding;
    if (editingWedding && !__appRuntimeContext.weddingThemeChoiceDirty) {
      syncWeddingThemeChoice(active.weddingThemeStyle || "eucalyptus");
    }
    document.querySelector(".setup-session-card")?.classList.toggle("wedding-setup-mode", weddingSelected);
    __appRuntimeContext.syncEventPrintPriceVisibility();
    if (__appRuntimeContext.DOM.weddingSetupAction) __appRuntimeContext.DOM.weddingSetupAction.hidden = weddingSelected;
    if (__appRuntimeContext.DOM.weddingEventSetup) __appRuntimeContext.DOM.weddingEventSetup.hidden = !weddingSelected;
    if (__appRuntimeContext.DOM.themeQuickPicker) __appRuntimeContext.DOM.themeQuickPicker.classList.toggle("hidden", weddingSelected);
    if (__appRuntimeContext.DOM.generalThemeBrowse) __appRuntimeContext.DOM.generalThemeBrowse.classList.toggle("hidden", weddingSelected);
    if (__appRuntimeContext.DOM.eventNameSetupField) __appRuntimeContext.DOM.eventNameSetupField.classList.toggle("hidden", weddingSelected);
    if (__appRuntimeContext.DOM.createWeddingEventBtn) {
      __appRuntimeContext.DOM.createWeddingEventBtn.textContent = editingWedding
        ? "Save Wedding Theme"
        : "Create Wedding Theme";
    }
    if (__appRuntimeContext.DOM.cancelWeddingSetupBtn) __appRuntimeContext.DOM.cancelWeddingSetupBtn.hidden = editingWedding;
  }

  function syncBirthdayOnlyEventFields(themeObj = null) {
    const showBirthdayFields = isBirthdayEventTheme(themeObj);
    document.querySelectorAll(".birthday-only-event-field").forEach((node) => {
      node.classList.toggle("hidden", !showBirthdayFields);
    });
  }

  function getEventEditorTextValue(active, key, fallback = "") {
    if (hasOwnEventTextValue(active, key)) return active[key];
    return fallback;
  }

  function syncEventSetupEditor(theme = null) {
    const active = getActiveEvent();
    const themeObj = getEventEditorTheme(theme);
    const hasActiveEvent = !!active;
    const hasEditableTarget = hasActiveEvent || !!themeObj;
    const textSource = hasActiveEvent ? active : __appRuntimeContext.activeSessionTextDetails;
    syncWeddingOnlyEventFields(themeObj);
    syncBirthdayOnlyEventFields(themeObj);
    syncWeddingSetupMode();
    const setDisabled = (node) => {
      if (!node) return;
      node.disabled = !hasEditableTarget;
    };

    if (__appRuntimeContext.DOM.eventNameInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventNameInput,
        getSavedEventTextValue(textSource, "name"),
        "Event name",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventPartner1Input)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventPartner1Input,
        getSavedEventTextValue(textSource, "partner1"),
        "Partner 1",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventPartner2Input)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventPartner2Input,
        getSavedEventTextValue(textSource, "partner2"),
        "Partner 2",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventBirthdayNameInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventBirthdayNameInput,
        getSavedEventTextValue(textSource, "birthdayName"),
        "Birthday person",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventExpoCompanyInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventExpoCompanyInput,
        getSavedEventTextValue(textSource, "expoCompany"),
        "Company name",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventDateInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventDateInput,
        getSavedEventTextValue(textSource, "date"),
        "Wedding date",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventGeneralDateInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventGeneralDateInput,
        getSavedEventTextValue(textSource, "date"),
        "e.g., April 2026",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventBannerTextInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventBannerTextInput,
        getSavedEventTextValue(textSource, "bannerText"),
        hasEditableTarget ? __appRuntimeContext.resolveThemeBannerText() : "Top booth banner",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventWelcomeTitleInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventWelcomeTitleInput,
        getSavedEventTextValue(textSource, "welcomeTitle"),
        hasEditableTarget ? __appRuntimeContext.resolveThemeWelcomeTitle() : "Welcome screen title",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventStartButtonTextInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventStartButtonTextInput,
        getSavedEventTextValue(textSource, "startButtonText"),
        hasEditableTarget ? __appRuntimeContext.resolveThemeStartButtonText() : "Touch to start",
        !hasEditableTarget
      );
    if (__appRuntimeContext.DOM.eventCaptureLabelInput)
      setTextFieldValueAndPlaceholder(
        __appRuntimeContext.DOM.eventCaptureLabelInput,
        getSavedEventTextValue(textSource, "captureLabel"),
        hasEditableTarget
          ? __appRuntimeContext.resolveThemeCaptureLabel() || __appRuntimeContext.resolveBoothCaptureButtonLabel(__appRuntimeContext.mode)
          : "Take Photo",
        !hasEditableTarget
      );
    const bannerSize = __appRuntimeContext.getBannerSize(themeObj);
    if (__appRuntimeContext.DOM.eventBannerSizeInput) {
      __appRuntimeContext.DOM.eventBannerSizeInput.value = String(bannerSize);
      __appRuntimeContext.DOM.eventBannerSizeInput.disabled = !hasEditableTarget;
    }
    if (__appRuntimeContext.DOM.eventBannerSizeValue)
      __appRuntimeContext.DOM.eventBannerSizeValue.textContent = `${bannerSize}px`;
    const welcomeSize = __appRuntimeContext.resolveWelcomeTitleSize(themeObj);
    if (__appRuntimeContext.DOM.eventWelcomeTitleSizeInput) {
      __appRuntimeContext.DOM.eventWelcomeTitleSizeInput.value = String(welcomeSize);
      __appRuntimeContext.DOM.eventWelcomeTitleSizeInput.disabled = !hasEditableTarget;
    }
    if (__appRuntimeContext.DOM.eventWelcomeTitleSizeValue)
      __appRuntimeContext.DOM.eventWelcomeTitleSizeValue.textContent = `${welcomeSize}px`;

    if (__appRuntimeContext.DOM.eventBaseThemeName) {
      const eventThemeKey = hasActiveEvent ? active.themeKey : "";
      __appRuntimeContext.DOM.eventBaseThemeName.textContent =
        themeObj && themeObj.name
          ? themeObj.name
          : eventThemeKey || "No base theme selected";
    }
    if (__appRuntimeContext.DOM.eventBaseThemeAssetsSummary) {
      const themeBackgrounds = themeObj
        ? __appRuntimeContext.getBaseBackgroundList(themeObj).length
        : 0;
      const themeGreenBackgrounds = Array.isArray(
        themeObj && themeObj.greenBackgrounds
      )
        ? themeObj.greenBackgrounds.filter(Boolean).length
        : 0;
      const themeOverlays = themeObj ? __appRuntimeContext.getBaseOverlayList(themeObj).length : 0;
      const themeTemplates = themeObj ? __appRuntimeContext.getBaseTemplateList(themeObj).length : 0;
      __appRuntimeContext.DOM.eventBaseThemeAssetsSummary.textContent = `Inherited assets: ${describeAssetSummaryCounts(
        {
          backgrounds: themeBackgrounds,
          greenBackgrounds: themeGreenBackgrounds,
          overlays: themeOverlays,
          templates: themeTemplates,
          hasLogo: !!(themeObj && themeObj.logo),
        }
      )}`;
    }
    if (__appRuntimeContext.DOM.eventThemeReferenceText) {
      if (!hasActiveEvent) {
        __appRuntimeContext.DOM.eventThemeReferenceText.textContent =
          "Theme sessions use the selected theme plus one-off session assets. Saved event edits are optional.";
      } else {
        const overrides = ensureEventOverrides(active);
        const eventSpecific = describeAssetSummaryCounts({
          backgrounds: overrides.backgrounds.length,
          greenBackgrounds: overrides.greenBackgrounds.length,
          overlays: overrides.overlays.length,
          templates: overrides.templates.length,
          hasLogo: !!active.logo,
            });
        __appRuntimeContext.DOM.eventThemeReferenceText.textContent = `Base theme: ${
          themeObj && themeObj.name ? themeObj.name : "None"
        }. Event-only assets: ${eventSpecific}.`;
      }
    }
  }

  function updateActiveEventDetails({
    name,
    date,
    themeKey,
    eventType,
    overrides,
    bannerText,
    welcomeTitle,
    welcomeTitleSize,
    startButtonText,
    captureLabel,
    guestScreenOrientation,
    partner1,
    partner2,
    birthdayName,
    expoCompany,
    bannerSize,
    logo,
  }) {
    const events = getStoredEvents();
    const id = getActiveEventId();
    if (!id) return;
    const idx = events.findIndex((event) => event && event.id === id);
    if (idx < 0) return;
    const target = events[idx];
    if (typeof name === "string") target.name = name;
    if (typeof date === "string") target.date = date;
    if (typeof themeKey === "string") target.themeKey = themeKey;
    if (typeof eventType === "string") target.eventType = __appRuntimeContext.normalizeEventStyle(eventType);
    if (typeof partner1 === "string") target.partner1 = partner1;
    if (typeof partner2 === "string") target.partner2 = partner2;
    if (typeof birthdayName === "string") target.birthdayName = birthdayName;
    if (typeof expoCompany === "string") target.expoCompany = expoCompany;
    if (overrides && typeof overrides === "object") target.overrides = overrides;
    if (typeof bannerText === "string") target.bannerText = bannerText;
    if (typeof welcomeTitle === "string") target.welcomeTitle = welcomeTitle;
    if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
      target.welcomeTitleSize = welcomeTitleSize;
    } else if (welcomeTitleSize === null) {
      delete target.welcomeTitleSize;
    }
    if (typeof bannerSize === "number" && bannerSize > 0) {
      target.bannerSize = bannerSize;
    } else if (bannerSize === null) {
      delete target.bannerSize;
    }
    if (typeof startButtonText === "string")
      target.startButtonText = startButtonText;
    if (typeof captureLabel === "string") target.captureLabel = captureLabel;
    if (typeof guestScreenOrientation === "string") {
      target.guestScreenOrientation = __appRuntimeContext.normalizeIdleScreenOrientation(
        guestScreenOrientation
      );
    }
    if (typeof logo === "string") {
      if (logo) target.logo = logo;
      else delete target.logo;
    }
    setStoredEvents(events);
    populateEventProfileSelect(id);
    updateEventOverridesSummary();
    const themeObj = getEventEditorTheme();
    __appRuntimeContext.applyThemeBasics(themeObj || __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget() || {});
    syncEventSetupEditor(themeObj);
    __appRuntimeContext.renderCurrentAssets(themeObj);
    updateCurrentEventAssetsPanel(themeObj);
    __appRuntimeContext.updateStylePreview();
  }

  function updateActiveThemeTextDetails({
    bannerText,
    welcomeTitle,
    welcomeTitleSize,
    startButtonText,
    captureLabel,
    bannerSize,
  }) {
    const target = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
    if (!target || typeof target !== "object") return;
    __appRuntimeContext.applyThemeText(target, {
      bannerText,
      welcomeTitle,
      startButtonText,
      captureLabel,
    });
    if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
      target.welcomeTitleSize = welcomeTitleSize;
    } else if (welcomeTitleSize === null) {
      delete target.welcomeTitleSize;
    }
    if (typeof bannerSize === "number" && bannerSize > 0) {
      target.bannerSize = bannerSize;
    } else if (bannerSize === null) {
      delete target.bannerSize;
    }
    if (__appRuntimeContext.activeTheme === target) {
      __appRuntimeContext.applyThemeBasics(target);
    }
    __appRuntimeContext.saveThemesToStorage();
    syncEventSetupEditor(target);
    __appRuntimeContext.renderCurrentAssets(target);
    updateCurrentEventAssetsPanel(target);
    __appRuntimeContext.updateStylePreview();
  }

  function syncEventInputsFromActive() {
    const active = getActiveEvent();
    if (!active) {
      updateEventOverridesSummary();
      syncEventSetupEditor();
      return;
    }
    syncEventSetupEditor(getEventEditorTheme());
    updateEventOverridesSummary();
  }

  function populateEventProfileSelect(preferredId) {
    if (!__appRuntimeContext.DOM.eventProfileSelect) return;
    const events = getStoredEvents();
    __appRuntimeContext.DOM.eventProfileSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select an event";
    __appRuntimeContext.DOM.eventProfileSelect.appendChild(placeholder);
    const counts = {};
    events.forEach((event) => {
      if (!event) return;
      const key = `${event.name || ""}__${event.date || ""}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    events.forEach((event) => {
      if (!event || !event.id) return;
      const option = document.createElement("option");
      const labelParts = [event.name || "Untitled event"];
      if (event.date) labelParts.push(`(${event.date})`);
      const key = `${event.name || ""}__${event.date || ""}`;
      if (counts[key] > 1 && event.createdAt) {
        const time = new Date(event.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        labelParts.push(`• ${time}`);
      }
      option.value = event.id;
      option.textContent = labelParts.join(" ");
      __appRuntimeContext.DOM.eventProfileSelect.appendChild(option);
    });
    const resolved =
      preferredId && events.some((event) => event && event.id === preferredId)
        ? preferredId
        : "";
    __appRuntimeContext.DOM.eventProfileSelect.value = resolved;
  }

  function getEventNameForUploads() {
    const active = getActiveEvent();
    if (active && active.name) return active.name;
    const nameInput = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventNameInput);
    if (nameInput) return nameInput;
    if (__appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.welcome && __appRuntimeContext.activeTheme.welcome.title)
      return __appRuntimeContext.activeTheme.welcome.title;
    const key = __appRuntimeContext.getSelectedThemeKey();
    const stored = key ? getStoredEventName(key) : "";
    return stored || key || "event";
  }

  function getEventDateForUploads() {
    const active = getActiveEvent();
    if (active && active.date) return active.date;
    const input =
      (__appRuntimeContext.DOM.eventDateInput && __appRuntimeContext.DOM.eventDateInput.value) ||
      (__appRuntimeContext.DOM.eventGeneralDateInput && __appRuntimeContext.DOM.eventGeneralDateInput.value) ||
      "";
    if (input) return input;
    const key = __appRuntimeContext.getSelectedThemeKey();
    return key ? getStoredEventDate(key) : "";
  }

  function getQuickStartFolderDate() {
    const active = getActiveEvent();
    if (active) return "";
    const explicitSessionName =
      getSavedEventTextValue(__appRuntimeContext.activeSessionTextDetails, "name") ||
      __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventNameInput);
    if (explicitSessionName) return "";
    const raw = __appRuntimeContext.getQuickStartSessionDate();
    const safe = (raw || "").toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return "";
    return safe;
  }

  function getQuickStartFolderLabel() {
    const date = getQuickStartFolderDate();
    return date ? `QS(${date})` : "";
  }

  function getEventUploadSlug() {
    const active = getActiveEvent();
    if (active && active.id) {
      const eventKey = __appRuntimeContext.slugifyEventText(active.id);
      if (eventKey) return `event-${eventKey}`;
    }
    const sessionName = __appRuntimeContext.slugifyEventText(__appRuntimeContext.getSessionUploadName());
    if (sessionName) return sessionName;
    const quickStartDate = getQuickStartFolderDate();
    if (quickStartDate) return quickStartDate;
    const name = __appRuntimeContext.slugifyEventText(getEventNameForUploads());
    const date = __appRuntimeContext.slugifyEventText(getEventDateForUploads());
    if (name && date) return `${name}-${date}`;
    return name || date || __appRuntimeContext.getCurrentEventSlug() || "event";
  }

  function createNewEventFromSelection() {
    const themeKey = __appRuntimeContext.getSelectedThemeKey();
    if (!themeKey) {
      alert("Select a theme before creating an event.");
      return;
    }
    const inputName = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventNameInput);
    const name = inputName || prompt("New event name:");
    if (!name) return;
    const date = __appRuntimeContext.DOM.eventGeneralDateInput
      ? __appRuntimeContext.DOM.eventGeneralDateInput.value.trim()
      : "";
    const slug = __appRuntimeContext.slugifyEventText(name);
    if (!slug) {
      alert("Enter a valid event name.");
      return;
    }
    const events = getStoredEvents();
    const idBase = [slug, __appRuntimeContext.slugifyEventText(date)].filter(Boolean).join("-");
    const id = `${idBase || "event"}-${Date.now().toString(36)}`;
    const newEvent = {
      id,
      name,
      date,
      themeKey,
      eventType: "general",
      partner1: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventPartner1Input),
      partner2: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventPartner2Input),
      birthdayName: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventBirthdayNameInput),
      expoCompany: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventExpoCompanyInput),
      printPrice: 3,
      createdAt: new Date().toISOString(),
      overrides: {
        backgrounds: [],
        overlays: [],
        templates: [],
        backgroundIndex: 0,
      },
    };
    events.push(newEvent);
    setStoredEvents(events);
    setActiveEventId(id);
    populateEventProfileSelect(id);
    __appRuntimeContext.syncEventPrintPriceInput();
    syncEventInputsFromActive();
    __appRuntimeContext.updateStylePreview();
    __appRuntimeContext.showToast(`Event "${name}" created`);
  }

  function createWeddingEventFromSetup() {
    const partner1 = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventPartner1Input);
    const partner2 = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventPartner2Input);
    const date = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.eventDateInput);
    const validation = __appRuntimeContext.validateCreatePathEventDetails("wedding", {
      partner1,
      partner2,
      date,
    });
    if (!validation.ok) {
      alert(validation.message);
      const fieldIds = {
        partner1: "eventPartner1Input",
        partner2: "eventPartner2Input",
        date: "eventDateInput",
      };
      document.getElementById(fieldIds[validation.fields[0]])?.focus();
      return;
    }

    const name = `${partner1} & ${partner2} Wedding`;
    const weddingThemeStyle = document.querySelector(
      'input[name="weddingThemeChoice"]:checked'
    )?.value === "minimal" ? "minimal" : "eucalyptus";
    const active = getActiveEvent();
    if (active && active.eventType === "wedding" && active.weddingTheme) {
      const events = getStoredEvents();
      const index = events.findIndex((event) => event && event.id === active.id);
      if (index < 0) return;
      const themeKey = active.themeKey || `wedding:${active.id}`;
      events[index] = {
        ...events[index],
        name,
        date,
        eventType: "wedding",
        partner1,
        partner2,
        weddingThemeStyle,
        themeKey,
        weddingTheme: createWeddingTheme(weddingThemeStyle, partner1, partner2, date),
      };
      setStoredEvents(events);
      __appRuntimeContext.weddingThemeChoiceDirty = false;
      populateEventProfileSelect(active.id);
      __appRuntimeContext.loadTheme(themeKey);
      syncEventInputsFromActive();
      __appRuntimeContext.showToast("Wedding theme updated");
      return;
    }

    const slug = __appRuntimeContext.slugifyEventText(`${partner1}-${partner2}-wedding`);
    const id = `${slug}-${Date.now().toString(36)}`;
    const themeKey = `wedding:${id}`;
    const newEvent = {
      id,
      name,
      date,
      themeKey,
      eventType: "wedding",
      partner1,
      partner2,
      weddingThemeStyle,
      printPrice: 3,
      createdAt: new Date().toISOString(),
      weddingTheme: createWeddingTheme(weddingThemeStyle, partner1, partner2, date),
      overrides: {
        backgrounds: [],
        overlays: [],
        templates: [],
        backgroundIndex: 0,
      },
    };
    const events = getStoredEvents();
    events.push(newEvent);
    setStoredEvents(events);
    __appRuntimeContext.weddingThemeChoiceDirty = false;
    setActiveEventId(id);
    populateEventProfileSelect(id);
    __appRuntimeContext.setEventSelection(themeKey);
    __appRuntimeContext.loadTheme(themeKey);
    __appRuntimeContext.syncEventPrintPriceInput();
    syncEventInputsFromActive();
    __appRuntimeContext.updateStylePreview();
    __appRuntimeContext.showToast(`Wedding theme for ${partner1} & ${partner2} created`);
  }

  function updateEventOverridesSummary() {
    if (!__appRuntimeContext.DOM.eventOverridesSummary) return;
    const active = getActiveEvent();
    if (!active) {
      __appRuntimeContext.DOM.eventOverridesSummary.textContent =
        "No saved event selected. Theme session assets stay one-off for this run.";
      updateEventDependentControls(false);
      updateCurrentEventAssetsPanel();
      return;
    }
    const overrides = getActiveEventOverrides();
    const summary = describeAssetSummaryCounts({
      backgrounds: overrides.backgrounds.length,
      greenBackgrounds: overrides.greenBackgrounds.length,
      overlays: overrides.overlays.length,
      templates: overrides.templates.length,
      hasLogo: !!active.logo,
    });
    __appRuntimeContext.DOM.eventOverridesSummary.textContent =
      summary === "none"
        ? "No event-only assets yet."
        : `Event-only assets: ${summary}`;
    updateEventDependentControls(true);
    updateCurrentEventAssetsPanel();
  }

  function updateEventDependentControls(hasActiveEvent = !!getActiveEvent()) {
    const hasTheme = hasActiveEvent || !!(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
    if (__appRuntimeContext.DOM.currentAssetsContent)
      __appRuntimeContext.DOM.currentAssetsContent.classList.toggle("hidden", !hasTheme);
    if (__appRuntimeContext.DOM.eventGalleryActions)
      __appRuntimeContext.DOM.eventGalleryActions.classList.toggle("hidden", !hasTheme);
    if (__appRuntimeContext.DOM.currentEventAssetsSummary) __appRuntimeContext.DOM.currentEventAssetsSummary.hidden = true;
    if (__appRuntimeContext.DOM.currentThemeAssetsSummary) __appRuntimeContext.DOM.currentThemeAssetsSummary.hidden = true;
    if (__appRuntimeContext.DOM.clearEventOverridesBtn)
      __appRuntimeContext.DOM.clearEventOverridesBtn.classList.toggle("hidden", !hasActiveEvent);
    if (__appRuntimeContext.DOM.eventToSubThemeBtn)
      __appRuntimeContext.DOM.eventToSubThemeBtn.classList.toggle("hidden", !hasActiveEvent);
  }

  function updateCurrentEventAssetsPanel(theme = null) {
    if (
      !__appRuntimeContext.DOM.currentEventName ||
      !__appRuntimeContext.DOM.currentEventTheme ||
      !__appRuntimeContext.DOM.currentEventAssetsSummary ||
      !__appRuntimeContext.DOM.currentThemeAssetsSummary
    )
      return;
    const active = getActiveEvent();
    if (!active) {
      updateEventDependentControls(false);
      const themeObj = theme || __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
      if (__appRuntimeContext.DOM.eventGalleryLink)
        __appRuntimeContext.DOM.eventGalleryLink.textContent = getEventGalleryStatusText();
      syncEventSetupEditor();
      return;
    }
    updateEventDependentControls(true);
    if (__appRuntimeContext.DOM.eventGalleryLink)
      __appRuntimeContext.DOM.eventGalleryLink.textContent = getEventGalleryStatusText();
    syncEventSetupEditor(theme || getEventEditorTheme());
  }

  async function handleEventOnlyAssetInput(kind, fileList) {
    const active = getActiveEvent();
    if (!active) {
      alert("Create or select an event first.");
      return;
    }
    if (!fileList || fileList.length === 0) return;
    const overrides = ensureEventOverrides(active);
    const files = Array.from(fileList);
    const tasks = files.map(async (file) => {
      const url = await __appRuntimeContext.uploadAsset(
        file,
        kind,
        getEventAssetUploadOptions(active, kind)
      );
      if (!url) return;
      if (kind === "templates") {
        overrides.templates.push({ src: url, layout: "double_column" });
      } else if (kind === "overlays") {
        overrides.overlays.push(url);
      } else if (kind === "backgrounds") {
        overrides.backgrounds.push(url);
      } else if (kind === "greenBackgrounds") {
        overrides.greenBackgrounds.push(url);
      }
    });
    await Promise.all(tasks);
    updateActiveEventDetails({ overrides });
    updateEventOverridesSummary();
    if (kind === "templates" && __appRuntimeContext.DOM.eventOnlyTemplates)
      __appRuntimeContext.DOM.eventOnlyTemplates.value = "";
    if (kind === "overlays" && __appRuntimeContext.DOM.eventOnlyOverlays)
      __appRuntimeContext.DOM.eventOnlyOverlays.value = "";
    if (kind === "backgrounds" && __appRuntimeContext.DOM.eventOnlyBackgrounds)
      __appRuntimeContext.DOM.eventOnlyBackgrounds.value = "";
    __appRuntimeContext.renderOptions();
  }

  async function handleEventSingleAssetInput(kind, fileList) {
    const active = getActiveEvent();
    if (!active) {
      alert("Create or select an event first.");
      return;
    }
    const file = fileList && fileList[0];
    if (!file) return;
    const url = await __appRuntimeContext.uploadAsset(
      file,
      kind,
      getEventAssetUploadOptions(active, kind)
    );
    if (!url) return;
    if (kind === "logo") updateActiveEventDetails({ logo: url });
    __appRuntimeContext.renderOptions();
  }

  function clearEventOverrides() {
    const active = getActiveEvent();
    if (!active) {
      alert("Create or select an event first.");
      return;
    }
    if (!confirm("Clear event-only assets?")) return;
    const overrides = {
      backgrounds: [],
      overlays: [],
      templates: [],
      backgroundIndex: 0,
      greenBackgrounds: [],
      greenBackgroundIndex: 0,
    };
    updateActiveEventDetails({ overrides });
    updateEventOverridesSummary();
    __appRuntimeContext.renderOptions();
  }

  function getEventFolderBase() {
    const base = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.cloudFolderInput) || "photobooth/events";
    return base.replace(/\/+$/g, "");
  }

  function getEventUploadFolderPath() {
    const base = getEventFolderBase();
    const quickStartDate = getQuickStartFolderDate();
    if (quickStartDate)
      return __appRuntimeContext.buildDateSessionFolderPath({ base, date: quickStartDate });
    const name = __appRuntimeContext.slugifyEventText(__appRuntimeContext.getSessionUploadName());
    const date = __appRuntimeContext.slugifyEventText(__appRuntimeContext.getSessionUploadDate());
    const fallback = __appRuntimeContext.getCurrentEventSlug() || "event";
    return __appRuntimeContext.buildEventFolderPath({ base, name, date, fallback });
  }

  function getThemeAssetUploadFolderPath(kind = "") {
    const base = getEventFolderBase();
    const themeSlug = __appRuntimeContext.getCurrentEventSlug() || "event";
    const cleanKind = (kind || "misc").toString().replace(/^\/+|\/+$/g, "");
    return `${base}/${themeSlug}/${cleanKind}`;
  }

  function getEventAssetUploadOptions(event = getActiveEvent(), kind = "") {
    const base = getEventFolderBase();
    const name = __appRuntimeContext.slugifyEventText(event && event.name);
    const date = __appRuntimeContext.slugifyEventText(event && event.date);
    const fallback =
      __appRuntimeContext.slugifyEventText(event && event.id) || __appRuntimeContext.getCurrentEventSlug() || "event";
    return {
      folder: __appRuntimeContext.buildEventAssetFolderPath({ base, name, date, fallback, kind }),
    };
  }

  function getEventGalleryUrl() {
    const cfg = __appRuntimeContext.getCloudinaryConfig();
    if (!cfg || !cfg.cloud) return "";
    const eventId = getActiveEventId();
    if (eventId) {
      const event = getActiveEvent() || {};
      const name = event.name || getEventNameForUploads() || "Event";
      const date = event.date || getEventDateForUploads();
      const legacyTag = __appRuntimeContext.slugifyEventText(date ? `${name}-${date}` : name);
      const params = new URLSearchParams({
        cloud: cfg.cloud,
        tag: `event-${__appRuntimeContext.slugifyEventText(eventId)}`,
        legacyTag,
        title: date ? `${name} (${date})` : name,
        event: eventId,
        theme: event.themeKey || getEventGalleryThemeKey(),
      });
      return `${location.origin}/gallery?${params.toString()}`;
    }
    const tag = getEventUploadSlug();
    const quickStartDate = getQuickStartFolderDate();
    const title = encodeURIComponent(
      quickStartDate
        ? `Photos - ${quickStartDate}`
        : `${getEventNameForUploads()}${
            getEventDateForUploads() ? " (" + getEventDateForUploads() + ")" : ""
          }`
    );
    const cloud = encodeURIComponent(cfg.cloud);
    return `${
      location.origin
    }/gallery?cloud=${cloud}&tag=${encodeURIComponent(tag)}&legacyTag=${encodeURIComponent(getLegacyEventGalleryTag())}&title=${title}&event=${encodeURIComponent(getActiveEventId())}&theme=${encodeURIComponent(getEventGalleryThemeKey())}`;
  }

  function getLegacyEventGalleryTag() {
    const sessionName = __appRuntimeContext.slugifyEventText(__appRuntimeContext.getSessionUploadName());
    if (sessionName) return sessionName;
    const quickStartDate = getQuickStartFolderDate();
    if (quickStartDate) return quickStartDate;
    const name = __appRuntimeContext.slugifyEventText(getEventNameForUploads());
    const date = __appRuntimeContext.slugifyEventText(getEventDateForUploads());
    return name && date ? `${name}-${date}` : name || date || "";
  }

  function getEventGalleryThemeKey() {
    return getActiveEvent()?.themeKey || __appRuntimeContext.getSelectedThemeKey() || "";
  }

  function getEventGalleryStatusText() {
    const link = getEventGalleryUrl();
    if (link) return link;
    return "Set Cloudinary Cloud Name to enable the gallery link.";
  }

  function getEventGalleryTitle() {
    const quickStartDate = getQuickStartFolderDate();
    return quickStartDate
      ? `Photos - ${quickStartDate}`
      : `${getEventNameForUploads()}${
          getEventDateForUploads() ? " (" + getEventDateForUploads() + ")" : ""
        }`;
  }

  function getEventNamesMap() {
    try {
      return JSON.parse(localStorage.getItem("photoboothEventNames") || "{}");
    } catch (_) {
      return {};
    }
  }

  function getStoredEventName(key) {
    if (!key) return "";
    const map = getEventNamesMap();
    return map[key] || "";
  }

  function saveStoredEventName(key, name) {
    if (!key) return;
    const map = getEventNamesMap();
    if (name) map[key] = name;
    else delete map[key];
    localStorage.setItem("photoboothEventNames", JSON.stringify(map));
  }

  function getEventDatesMap() {
    try {
      return JSON.parse(localStorage.getItem("photoboothEventDates") || "{}");
    } catch (_) {
      return {};
    }
  }

  function getStoredEventDate(key) {
    if (!key) return "";
    const map = getEventDatesMap();
    return map[key] || "";
  }

  function saveStoredEventDate(key, dateValue) {
    if (!key) return;
    const map = getEventDatesMap();
    if (dateValue) map[key] = dateValue;
    else delete map[key];
    localStorage.setItem("photoboothEventDates", JSON.stringify(map));
  }

  function exportCurrentEvent() {
    const key = __appRuntimeContext.getSelectedThemeKey();
    if (!key || !__appRuntimeContext.activeTheme) {
      alert("Select an event first.");
      return;
    }
    const active = getActiveEvent();
    const name =
      (active && active.name) ||
      getStoredEventName(key) ||
      (__appRuntimeContext.activeTheme.welcome && __appRuntimeContext.activeTheme.welcome.title) ||
      key;
    const payload = {
      key,
      name,
      exported_at: new Date().toISOString(),
      theme: __appRuntimeContext.activeTheme,
      event: active
        ? {
            id: active.id,
            name: active.name,
            date: active.date,
            themeKey: active.themeKey,
            overrides: active.overrides,
          }
        : null,
    };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement("a");
    const slug = (name || key).toLowerCase().replace(/[^a-z0-9\-]+/g, "-");
    a.href = dataStr;
    a.download = `photobooth-event-${slug || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    __appRuntimeContext.showToast("Event exported");
  }

  async function uploadImageToCloudinary(blob, options = {}) {
    const cfg = __appRuntimeContext.getCloudinaryConfig();
    if ((!cfg.use && !options.force) || !cfg.cloud || !cfg.preset) return "";
    try {
      const form = new FormData();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const baseName = `${options.baseName || "photo"}-${ts}.png`;
      const file = new File([blob], baseName, { type: blob.type || "image/png" });
      form.append("file", file);
      form.append("upload_preset", cfg.preset);
      if (options.folder) form.append("folder", options.folder);
      if (options.tags) form.append("tags", options.tags);
      if (options.transformation) form.append("transformation", options.transformation);
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`,
        { method: "POST", body: form }
      );
      const json = await resp.json();
      return __appRuntimeContext.getCloudinaryDerivedUrl(json);
    } catch (e) {
      console.warn("Cloudinary upload failed", e);
    }
    return "";
  }

  function updateActiveSessionTextDetails(changes = {}) {
    if (!changes || typeof changes !== "object") return;
    [
      "name",
      "date",
      "eventType",
      "bannerText",
      "welcomeTitle",
      "startButtonText",
      "captureLabel",
      "partner1",
      "partner2",
      "birthdayName",
      "expoCompany",
      "guestScreenOrientation",
    ].forEach((key) => {
      if (typeof changes[key] === "string") {
        __appRuntimeContext.activeSessionTextDetails[key] = changes[key];
      }
    });
    __appRuntimeContext.updateStylePreview();
  }

  async function uploadVideoToCloudinary(blob, options = {}) {
    const cfg = __appRuntimeContext.getCloudinaryConfig();
    if ((!cfg.use && !options.force) || !cfg.cloud || !cfg.preset) return "";
    try {
      const form = new FormData();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const baseName = `${options.baseName || "message"}-${ts}.webm`;
      const file = new File([blob], baseName, {
        type: blob.type || "video/webm",
      });
      form.append("file", file);
      form.append("upload_preset", cfg.preset);
      if (options.folder) form.append("folder", options.folder);
      if (options.tags) form.append("tags", options.tags);
      if (options.transformation) form.append("transformation", options.transformation);
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${cfg.cloud}/video/upload`,
        { method: "POST", body: form }
      );
      const json = await resp.json();
      return __appRuntimeContext.getCloudinaryDerivedUrl(json);
    } catch (e) {
      console.warn("Cloudinary video upload failed", e);
    }
    return "";
  }

  return {
    createEucalyptusWeddingTheme,
    createMinimalWeddingTheme,
    syncWeddingThemeChoice,
    createWeddingTheme,
    getStoredEvents,
    setStoredEvents,
    getActiveEventId,
    setActiveEventId,
    getActiveEvent,
    ensureEventOverrides,
    getActiveEventOverrides,
    hasOwnEventTextValue,
    getSavedEventTextValue,
    isDefaultEventTextValue,
    setTextFieldValueAndPlaceholder,
    describeAssetSummaryCounts,
    getEventEditorTheme,
    getEventEditorThemeKey,
    isWeddingEventTheme,
    isBirthdayEventTheme,
    syncWeddingOnlyEventFields,
    syncWeddingSetupMode,
    syncBirthdayOnlyEventFields,
    getEventEditorTextValue,
    syncEventSetupEditor,
    updateActiveEventDetails,
    updateActiveThemeTextDetails,
    syncEventInputsFromActive,
    populateEventProfileSelect,
    getEventNameForUploads,
    getEventDateForUploads,
    getQuickStartFolderDate,
    getQuickStartFolderLabel,
    getEventUploadSlug,
    createNewEventFromSelection,
    createWeddingEventFromSetup,
    updateEventOverridesSummary,
    updateEventDependentControls,
    updateCurrentEventAssetsPanel,
    handleEventOnlyAssetInput,
    handleEventSingleAssetInput,
    clearEventOverrides,
    getEventFolderBase,
    getEventUploadFolderPath,
    getThemeAssetUploadFolderPath,
    getEventAssetUploadOptions,
    getEventGalleryUrl,
    getLegacyEventGalleryTag,
    getEventGalleryThemeKey,
    getEventGalleryStatusText,
    getEventGalleryTitle,
    getEventNamesMap,
    getStoredEventName,
    saveStoredEventName,
    getEventDatesMap,
    getStoredEventDate,
    saveStoredEventDate,
    exportCurrentEvent,
    uploadImageToCloudinary,
    updateActiveSessionTextDetails,
    uploadVideoToCloudinary,
  };
}
