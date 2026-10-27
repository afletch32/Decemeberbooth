export function createEventEditorModule(__appRuntimeContext) {
  function setupCreateThemeModalControls() {
    if (__appRuntimeContext.DOM.createThemeDropZone) {
      __appRuntimeContext.DOM.createThemeDropZone.addEventListener(
        "dragover",
        __appRuntimeContext.handleCreateThemeDragOver
      );
      __appRuntimeContext.DOM.createThemeDropZone.addEventListener(
        "dragleave",
        __appRuntimeContext.handleCreateThemeDragLeave
      );
      __appRuntimeContext.DOM.createThemeDropZone.addEventListener("drop", __appRuntimeContext.handleCreateThemeDrop);
      __appRuntimeContext.DOM.createThemeDropZone.addEventListener("click", () =>
        __appRuntimeContext.DOM.createThemeFolderInput?.click()
      );
    }
    if (__appRuntimeContext.DOM.createThemeBrowseBtn)
      __appRuntimeContext.DOM.createThemeBrowseBtn.addEventListener("click", () =>
        __appRuntimeContext.DOM.createThemeFolderInput?.click()
      );
    if (__appRuntimeContext.DOM.createThemeFolderInput)
      __appRuntimeContext.DOM.createThemeFolderInput.addEventListener("change", (e) => {
        __appRuntimeContext.handleCreateThemeFiles(e.target.files);
        e.target.value = "";
      });
    if (__appRuntimeContext.DOM.createThemeCancel)
      __appRuntimeContext.DOM.createThemeCancel.addEventListener("click", () => {
        __appRuntimeContext.hideCreateThemeModal();
        __appRuntimeContext.resetCreateThemeModal();
        __appRuntimeContext.THEME_EDITOR.mode.value = "edit";
        __appRuntimeContext.setThemeEditorMode("edit");
      });
    if (__appRuntimeContext.DOM.createThemeConfirm)
      __appRuntimeContext.DOM.createThemeConfirm.addEventListener("click", __appRuntimeContext.confirmCreateTheme);
  }

  function setupCreateEventModalControls() {
    if (__appRuntimeContext.DOM.createEventModal) {
      __appRuntimeContext.DOM.createEventModal.addEventListener("click", (event) => {
        if (event.target === __appRuntimeContext.DOM.createEventModal) hideCreateEventModal();
      });
    }
    if (__appRuntimeContext.DOM.createEventUseThemeDefaults) {
      __appRuntimeContext.DOM.createEventUseThemeDefaults.addEventListener("change", () => {
        if (!__appRuntimeContext.DOM.createEventUseThemeDefaults) return;
        if (!__appRuntimeContext.DOM.createEventUseThemeDefaults.checked) {
          __appRuntimeContext.createEventTextOverrides = readCreateEventTextInputs();
        }
        applyCreateEventTextState(__appRuntimeContext.DOM.createEventUseThemeDefaults.checked);
      });
    }
    if (__appRuntimeContext.DOM.createEventWelcomeSize) {
      __appRuntimeContext.DOM.createEventWelcomeSize.addEventListener("input", () => {
        if (!__appRuntimeContext.DOM.createEventWelcomeSizeValue) return;
        __appRuntimeContext.DOM.createEventWelcomeSizeValue.textContent = `${__appRuntimeContext.DOM.createEventWelcomeSize.value}px`;
      });
    }
    if (__appRuntimeContext.DOM.createEventBackgrounds) {
      __appRuntimeContext.DOM.createEventBackgrounds.addEventListener("change", (event) => {
        handleCreateEventFiles("backgrounds", event.target.files);
        event.target.value = "";
      });
    }
    if (__appRuntimeContext.DOM.createEventGreenBackgrounds) {
      __appRuntimeContext.DOM.createEventGreenBackgrounds.addEventListener("change", (event) => {
        handleCreateEventFiles("greenBackgrounds", event.target.files);
        event.target.value = "";
      });
    }
    if (__appRuntimeContext.DOM.createEventOverlays) {
      __appRuntimeContext.DOM.createEventOverlays.addEventListener("change", (event) => {
        handleCreateEventFiles("overlays", event.target.files);
        event.target.value = "";
      });
    }
    if (__appRuntimeContext.DOM.createEventTemplates) {
      __appRuntimeContext.DOM.createEventTemplates.addEventListener("change", (event) => {
        handleCreateEventFiles("templates", event.target.files);
        event.target.value = "";
      });
    }
    if (__appRuntimeContext.DOM.createEventCancel)
      __appRuntimeContext.DOM.createEventCancel.addEventListener("click", () => {
        hideCreateEventModal();
        resetCreateEventAssets();
      });
    if (__appRuntimeContext.DOM.createEventConfirm)
      __appRuntimeContext.DOM.createEventConfirm.addEventListener("click", () => {
        confirmCreateEventModal().catch((err) => {
          console.error("Failed to save event", err);
          alert("Failed to save event. See console for details.");
        });
      });
  }

  function ensureCreateEventAssets() {
    if (!__appRuntimeContext.createEventAssets) {
      __appRuntimeContext.createEventAssets = {
        backgrounds: [],
        greenBackgrounds: [],
        overlays: [],
        templates: [],
      };
    }
    return __appRuntimeContext.createEventAssets;
  }

  function resetCreateEventAssets() {
    __appRuntimeContext.createEventAssets = {
      backgrounds: [],
      greenBackgrounds: [],
      overlays: [],
      templates: [],
    };
  }

  function updateCreateEventSummary() {
    if (!__appRuntimeContext.DOM.createEventSummary) return;
    const assets = ensureCreateEventAssets();
    const parts = [];
    if (assets.backgrounds.length)
      parts.push(
        `${assets.backgrounds.length} background${
          assets.backgrounds.length === 1 ? "" : "s"
        }`
      );
    if (assets.greenBackgrounds.length)
      parts.push(
        `${assets.greenBackgrounds.length} green BG${
          assets.greenBackgrounds.length === 1 ? "" : "s"
        }`
      );
    if (assets.overlays.length)
      parts.push(
        `${assets.overlays.length} overlay${
          assets.overlays.length === 1 ? "" : "s"
        }`
      );
    if (assets.templates.length)
      parts.push(
        `${assets.templates.length} template${
          assets.templates.length === 1 ? "" : "s"
        }`
      );
    const existing = __appRuntimeContext.getActiveEventOverrides();
    const existingParts = [];
    if (existing.backgrounds.length)
      existingParts.push(
        `${existing.backgrounds.length} background${
          existing.backgrounds.length === 1 ? "" : "s"
        }`
      );
    if (existing.greenBackgrounds.length)
      existingParts.push(
        `${existing.greenBackgrounds.length} green BG${
          existing.greenBackgrounds.length === 1 ? "" : "s"
        }`
      );
    if (existing.overlays.length)
      existingParts.push(
        `${existing.overlays.length} overlay${
          existing.overlays.length === 1 ? "" : "s"
        }`
      );
    if (existing.templates.length)
      existingParts.push(
        `${existing.templates.length} template${
          existing.templates.length === 1 ? "" : "s"
        }`
      );
    const selectedText = parts.length
      ? `Selected for upload: ${parts.join(", ")}`
      : "No assets selected yet.";
    const existingText = existingParts.length
      ? `Existing event assets: ${existingParts.join(", ")}`
      : "";
    __appRuntimeContext.DOM.createEventSummary.textContent = existingText
      ? `${selectedText} ${existingText}`
      : selectedText;
  }

  function getThemeTextDefaults() {
    return {
      bannerText: __appRuntimeContext.resolveThemeBannerText(),
      welcomeTitle: __appRuntimeContext.resolveThemeWelcomeTitle(),
      welcomeTitleSize: __appRuntimeContext.resolveThemeWelcomeTitleSizeValue(),
      startButtonText: __appRuntimeContext.resolveThemeStartButtonText(),
      captureLabel: __appRuntimeContext.resolveThemeCaptureLabel(),
    };
  }

  function readCreateEventTextInputs() {
    const size = __appRuntimeContext.DOM.createEventWelcomeSize
      ? parseInt(__appRuntimeContext.DOM.createEventWelcomeSize.value, 10)
      : NaN;
    return {
      bannerText: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.createEventBannerText),
      welcomeTitle: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.createEventWelcomeText),
      welcomeTitleSize: Number.isFinite(size) && size > 0 ? size : null,
      startButtonText: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.createEventStartText),
      captureLabel: __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.createEventCaptureText),
    };
  }

  function writeCreateEventTextInputs(values) {
    const next = values || {};
    if (__appRuntimeContext.DOM.createEventBannerText)
      __appRuntimeContext.DOM.createEventBannerText.value = next.bannerText || "";
    if (__appRuntimeContext.DOM.createEventWelcomeText)
      __appRuntimeContext.DOM.createEventWelcomeText.value = next.welcomeTitle || "";
    if (__appRuntimeContext.DOM.createEventWelcomeSize) {
      const size =
        typeof next.welcomeTitleSize === "number" && next.welcomeTitleSize > 0
          ? next.welcomeTitleSize
          : __appRuntimeContext.resolveThemeWelcomeTitleSizeValue();
      __appRuntimeContext.DOM.createEventWelcomeSize.value = String(size);
      if (__appRuntimeContext.DOM.createEventWelcomeSizeValue)
        __appRuntimeContext.DOM.createEventWelcomeSizeValue.textContent = `${size}px`;
    }
    if (__appRuntimeContext.DOM.createEventStartText)
      __appRuntimeContext.DOM.createEventStartText.value = next.startButtonText || "";
    if (__appRuntimeContext.DOM.createEventCaptureText)
      __appRuntimeContext.DOM.createEventCaptureText.value = next.captureLabel || "";
  }

  function setCreateEventTextInputsDisabled(isDisabled) {
    const inputs = [
      __appRuntimeContext.DOM.createEventBannerText,
      __appRuntimeContext.DOM.createEventWelcomeText,
      __appRuntimeContext.DOM.createEventWelcomeSize,
      __appRuntimeContext.DOM.createEventStartText,
      __appRuntimeContext.DOM.createEventCaptureText,
    ];
    inputs.forEach((input) => {
      if (!input) return;
      input.disabled = isDisabled;
    });
  }

  function applyCreateEventTextState(useDefaults) {
    if (useDefaults) {
      if (!__appRuntimeContext.createEventTextOverrides) {
        __appRuntimeContext.createEventTextOverrides = readCreateEventTextInputs();
      }
      writeCreateEventTextInputs(getThemeTextDefaults());
    } else {
      writeCreateEventTextInputs(
        __appRuntimeContext.createEventTextOverrides || getThemeTextDefaults()
      );
    }
    setCreateEventTextInputsDisabled(useDefaults);
  }

  function showCreateEventModal(mode = "create") {
    __appRuntimeContext.createEventMode = mode === "edit" ? "edit" : "create";
    if (!__appRuntimeContext.DOM.createEventModal) return;
    const themeDefaults = getThemeTextDefaults();
    if (__appRuntimeContext.createEventMode === "edit") {
      const active = __appRuntimeContext.getActiveEvent();
      if (!active) {
        alert("Choose an event first.");
        return;
      }
      if (__appRuntimeContext.DOM.createEventName) __appRuntimeContext.DOM.createEventName.value = active.name || "";
      if (__appRuntimeContext.DOM.createEventDate) __appRuntimeContext.DOM.createEventDate.value = active.date || "";
      const eventOverrides = __appRuntimeContext.getEventTextOverrides(active);
      const hasOverrides = __appRuntimeContext.hasEventTextOverrides(active);
      __appRuntimeContext.createEventTextOverrides = hasOverrides ? eventOverrides : themeDefaults;
      if (__appRuntimeContext.DOM.createEventUseThemeDefaults) {
        __appRuntimeContext.DOM.createEventUseThemeDefaults.checked = !hasOverrides;
      }
    } else {
      if (__appRuntimeContext.DOM.createEventName) __appRuntimeContext.DOM.createEventName.value = "";
      if (__appRuntimeContext.DOM.createEventDate) __appRuntimeContext.DOM.createEventDate.value = "";
      __appRuntimeContext.createEventTextOverrides = themeDefaults;
      if (__appRuntimeContext.DOM.createEventUseThemeDefaults) {
        __appRuntimeContext.DOM.createEventUseThemeDefaults.checked = false;
      }
    }
    applyCreateEventTextState(
      !!(
        __appRuntimeContext.DOM.createEventUseThemeDefaults && __appRuntimeContext.DOM.createEventUseThemeDefaults.checked
      )
    );
    resetCreateEventAssets();
    updateCreateEventSummary();
    __appRuntimeContext.DOM.createEventModal.classList.add("show");
  }

  function hideCreateEventModal() {
    if (__appRuntimeContext.DOM.createEventModal) __appRuntimeContext.DOM.createEventModal.classList.remove("show");
  }

  function handleCreateEventFiles(kind, fileList) {
    if (!fileList || fileList.length === 0) return;
    const assets = ensureCreateEventAssets();
    const files = Array.from(fileList);
    if (kind === "backgrounds") assets.backgrounds.push(...files);
    if (kind === "greenBackgrounds") assets.greenBackgrounds.push(...files);
    if (kind === "overlays") assets.overlays.push(...files);
    if (kind === "templates") assets.templates.push(...files);
    updateCreateEventSummary();
  }

  async function confirmCreateEventModal() {
    const themeKey = __appRuntimeContext.getSelectedThemeKey();
    if (!themeKey) {
      alert("Select a theme before saving.");
      return;
    }
    const name = __appRuntimeContext.valueFromInput(__appRuntimeContext.DOM.createEventName);
    if (!name) {
      alert("Enter an event name.");
      return;
    }
    const dateValue = __appRuntimeContext.DOM.createEventDate ? __appRuntimeContext.DOM.createEventDate.value.trim() : "";
    const useDefaults = !!(
      __appRuntimeContext.DOM.createEventUseThemeDefaults && __appRuntimeContext.DOM.createEventUseThemeDefaults.checked
    );
    const {
      bannerText,
      welcomeTitle,
      welcomeTitleSize,
      startButtonText,
      captureLabel,
    } = useDefaults
      ? {
          bannerText: "",
          welcomeTitle: "",
          welcomeTitleSize: null,
          startButtonText: "",
          captureLabel: "",
        }
      : readCreateEventTextInputs();
    const assets = ensureCreateEventAssets();
    let targetEvent = null;
    if (__appRuntimeContext.createEventMode === "edit") {
      targetEvent = __appRuntimeContext.getActiveEvent();
      if (!targetEvent) {
        alert("Choose an event first.");
        return;
      }
      __appRuntimeContext.updateActiveEventDetails({
        name,
        date: dateValue,
        themeKey,
        bannerText,
        welcomeTitle,
        welcomeTitleSize,
        startButtonText,
        captureLabel,
      });
    } else {
      const slug = __appRuntimeContext.slugifyEventText(name);
      const idBase = [slug, __appRuntimeContext.slugifyEventText(dateValue)]
        .filter(Boolean)
        .join("-");
      const id = `${idBase || "event"}-${Date.now().toString(36)}`;
      const newEvent = {
        id,
        name,
        date: dateValue,
        themeKey,
        bannerText,
        welcomeTitle,
        startButtonText,
        captureLabel,
        createdAt: new Date().toISOString(),
        overrides: {
          backgrounds: [],
          overlays: [],
          templates: [],
          backgroundIndex: 0,
        },
      };
      if (typeof welcomeTitleSize === "number" && welcomeTitleSize > 0) {
        newEvent.welcomeTitleSize = welcomeTitleSize;
      }
      const events = __appRuntimeContext.getStoredEvents();
      events.push(newEvent);
      __appRuntimeContext.setStoredEvents(events);
      __appRuntimeContext.setActiveEventId(id);
      __appRuntimeContext.populateEventProfileSelect(id);
      targetEvent = newEvent;
    }
    if (targetEvent) {
      const overrides = __appRuntimeContext.ensureEventOverrides(targetEvent);
      const tasks = [];
      assets.backgrounds.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(
            file,
            "backgrounds",
            __appRuntimeContext.getEventAssetUploadOptions(targetEvent, "backgrounds")
          ).then((url) => {
            if (url) overrides.backgrounds.push(url);
          })
        );
      });
      assets.greenBackgrounds.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(
            file,
            "greenBackgrounds",
            __appRuntimeContext.getEventAssetUploadOptions(targetEvent, "greenBackgrounds")
          ).then((url) => {
            if (url) overrides.greenBackgrounds.push(url);
          })
        );
      });
      assets.overlays.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(
            file,
            "overlays",
            __appRuntimeContext.getEventAssetUploadOptions(targetEvent, "overlays")
          ).then((url) => {
            if (url) overrides.overlays.push(url);
          })
        );
      });
      assets.templates.forEach((file) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(
            file,
            "templates",
            __appRuntimeContext.getEventAssetUploadOptions(targetEvent, "templates")
          ).then((url) => {
            if (url)
              overrides.templates.push({ src: url, layout: "double_column" });
          })
        );
      });
      if (tasks.length) await Promise.all(tasks);
      __appRuntimeContext.updateActiveEventDetails({ overrides });
    }
    __appRuntimeContext.syncEventInputsFromActive();
    __appRuntimeContext.updateStylePreview();
    hideCreateEventModal();
    resetCreateEventAssets();
  }

  return {
    setupCreateThemeModalControls,
    setupCreateEventModalControls,
    ensureCreateEventAssets,
    resetCreateEventAssets,
    updateCreateEventSummary,
    getThemeTextDefaults,
    readCreateEventTextInputs,
    writeCreateEventTextInputs,
    setCreateEventTextInputsDisabled,
    applyCreateEventTextState,
    showCreateEventModal,
    hideCreateEventModal,
    handleCreateEventFiles,
    confirmCreateEventModal,
  };
}
