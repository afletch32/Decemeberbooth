export function createCaptureSettingsModule(__appRuntimeContext) {
  function setupOfflineControls() {
    if (__appRuntimeContext.DOM.offlineModeToggle) {
      __appRuntimeContext.DOM.offlineModeToggle.checked = __appRuntimeContext.getOfflinePref();
      __appRuntimeContext.DOM.offlineModeToggle.addEventListener("change", () => {
        __appRuntimeContext.setOfflinePref(__appRuntimeContext.DOM.offlineModeToggle.checked);
        __appRuntimeContext.updatePendingUI();
        __appRuntimeContext.showToast(
          __appRuntimeContext.DOM.offlineModeToggle.checked ? "Offline mode ON" : "Offline mode OFF"
        );
      });
    }
    if (__appRuntimeContext.DOM.forceCameraFileToggle) {
      __appRuntimeContext.DOM.forceCameraFileToggle.checked =
        localStorage.getItem("forceCameraOnFile") === "true";
      __appRuntimeContext.DOM.forceCameraFileToggle.addEventListener("change", () => {
        localStorage.setItem(
          "forceCameraOnFile",
          __appRuntimeContext.DOM.forceCameraFileToggle.checked ? "true" : "false"
        );
      });
    }
    window.addEventListener("online", () => {
      __appRuntimeContext.updatePendingUI();
      __appRuntimeContext.flushPendingUploads();
      __appRuntimeContext.flushPendingGalleryRecords();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      __appRuntimeContext.updatePendingUI();
      __appRuntimeContext.flushPendingUploads();
      __appRuntimeContext.flushPendingGalleryRecords();
    });
    window.addEventListener("offline", () => __appRuntimeContext.updatePendingUI());
  }

  function getLivePhotoEnabled() {
    try {
      const stored = localStorage.getItem("photoboothLivePhoto");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (_) {}
    return __appRuntimeContext.LIVE_PHOTO_DEFAULT;
  }

  function setLivePhotoEnabled(enabled) {
    try {
      localStorage.setItem("photoboothLivePhoto", enabled ? "true" : "false");
    } catch (_) {}
  }

  function setupLivePhotoToggle() {
    if (!__appRuntimeContext.DOM.livePhotoToggle) return;
    __appRuntimeContext.DOM.livePhotoToggle.checked = getLivePhotoEnabled();
    __appRuntimeContext.syncCaptureStatusIndicators();
    __appRuntimeContext.DOM.livePhotoToggle.addEventListener("change", () => {
      setLivePhotoEnabled(__appRuntimeContext.DOM.livePhotoToggle.checked);
      if (!__appRuntimeContext.DOM.livePhotoToggle.checked && __appRuntimeContext.mode === "live-photo") {
        __appRuntimeContext.setMode("still-photo");
        return;
      }
      __appRuntimeContext.syncBoothModeButtons();
      __appRuntimeContext.syncWelcomeModeButtons();
      __appRuntimeContext.syncCaptureStatusIndicators();
    });
  }

  function getAllowRetakes() {
    try {
      const stored = localStorage.getItem(__appRuntimeContext.ALLOW_RETAKES_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (_) {}
    return true;
  }

  function setAllowRetakes(enabled) {
    __appRuntimeContext.allowRetake = !!enabled;
    try {
      localStorage.setItem(__appRuntimeContext.ALLOW_RETAKES_STORAGE_KEY, __appRuntimeContext.allowRetake ? "true" : "false");
    } catch (_) {}
    if (__appRuntimeContext.DOM.reviewRetakeBtn) {
      __appRuntimeContext.DOM.reviewRetakeBtn.style.display = __appRuntimeContext.allowRetake ? "" : "none";
    }
  }

  function setupAllowRetakesToggle() {
    if (!__appRuntimeContext.DOM.allowRetakes) return;
    __appRuntimeContext.DOM.allowRetakes.checked = getAllowRetakes();
    __appRuntimeContext.allowRetake = __appRuntimeContext.DOM.allowRetakes.checked;
    __appRuntimeContext.DOM.allowRetakes.addEventListener("change", () => {
      setAllowRetakes(__appRuntimeContext.DOM.allowRetakes.checked);
    });
  }

  function setupRecordingModeToggle() {
    if (!__appRuntimeContext.DOM.recordingModeToggle) return;
    __appRuntimeContext.DOM.recordingModeToggle.checked = __appRuntimeContext.getRecordingModeEnabled();
    __appRuntimeContext.syncRecordingModeAvailability();
    __appRuntimeContext.DOM.recordingModeToggle.addEventListener("change", () => {
      __appRuntimeContext.setRecordingModeEnabled(__appRuntimeContext.DOM.recordingModeToggle.checked);
      __appRuntimeContext.syncRecordingModeAvailability();
    });
  }

  function getInstantCaptureEnabled() {
    try {
      return localStorage.getItem("photoboothInstantCapture") === "true";
    } catch (_) {
      return false;
    }
  }

  function setInstantCaptureEnabled(enabled) {
    try {
      localStorage.setItem(
        "photoboothInstantCapture",
        enabled ? "true" : "false"
      );
    } catch (_) {}
  }

  function setupInstantCaptureToggle() {
    const toggles = [
      __appRuntimeContext.DOM.instantCaptureToggle,
      __appRuntimeContext.DOM.boothInstantCaptureToggle,
    ].filter(Boolean);
    if (!toggles.length) return;
    const syncInstantCaptureToggles = (enabled) => {
      toggles.forEach((toggle) => {
        toggle.checked = enabled;
      });
    };
    syncInstantCaptureToggles(getInstantCaptureEnabled());
    __appRuntimeContext.syncCaptureStatusIndicators();
    toggles.forEach((toggle) => {
      toggle.addEventListener("change", () => {
        const enabled = !!toggle.checked;
        setInstantCaptureEnabled(enabled);
        syncInstantCaptureToggles(enabled);
        __appRuntimeContext.syncCaptureStatusIndicators();
      });
    });
  }

  function getCountdownFiveSecondsEnabled() {
    try {
      return localStorage.getItem("photoboothCountdownFiveSeconds") === "true";
    } catch (_) {
      return false;
    }
  }

  function setCountdownFiveSecondsEnabled(enabled) {
    try {
      localStorage.setItem(
        "photoboothCountdownFiveSeconds",
        enabled ? "true" : "false"
      );
    } catch (_) {}
  }

  function setupCountdownFiveToggle() {
    if (!__appRuntimeContext.DOM.countdownFiveToggle) return;
    __appRuntimeContext.DOM.countdownFiveToggle.checked = getCountdownFiveSecondsEnabled();
    __appRuntimeContext.DOM.countdownFiveToggle.addEventListener("change", () => {
      setCountdownFiveSecondsEnabled(__appRuntimeContext.DOM.countdownFiveToggle.checked);
    });
  }

  function getThemeSoundsEnabled() {
    try {
      return localStorage.getItem(__appRuntimeContext.THEME_SOUND_STORAGE_KEY) !== "false";
    } catch (_) {
      return true;
    }
  }

  function setThemeSoundsEnabled(enabled) {
    try {
      localStorage.setItem(__appRuntimeContext.THEME_SOUND_STORAGE_KEY, enabled ? "true" : "false");
    } catch (_) {}
    if (enabled) return;
    __appRuntimeContext.boothAudioEnabled = false;
    if (__appRuntimeContext.boothThemeAudio) {
      __appRuntimeContext.boothThemeAudio.pause();
      __appRuntimeContext.boothThemeAudio.currentTime = 0;
      __appRuntimeContext.boothThemeAudio = null;
    }
  }

  function setupThemeSoundToggle() {
    if (!__appRuntimeContext.DOM.themeSoundToggle) return;
    __appRuntimeContext.DOM.themeSoundToggle.checked = getThemeSoundsEnabled();
    __appRuntimeContext.DOM.themeSoundToggle.addEventListener("change", () => {
      const enabled = __appRuntimeContext.DOM.themeSoundToggle.checked;
      setThemeSoundsEnabled(enabled);
      if (enabled) {
        __appRuntimeContext.unlockBoothAudio();
        __appRuntimeContext.playBoothSound("success");
      }
    });
  }

  function getBuiltinThemeForKey(themeKey = "") {
    const key = __appRuntimeContext.normalizeThemeSelectionKey(themeKey);
    if (!key) return null;
    if (!key.includes(":")) {
      const direct = __appRuntimeContext.BUILTIN_THEMES[key];
      return direct && !direct.themes && !direct.holidays ? direct : null;
    }
    const [rootKey, leafKey] = key.split(":");
    const group = __appRuntimeContext.BUILTIN_THEMES[rootKey];
    if (!group) return null;
    return group.themes?.[leafKey] || group.holidays?.[leafKey] || null;
  }

  function getThemeSoundEditorTarget() {
    const key = __appRuntimeContext.normalizeThemeSelectionKey(
      __appRuntimeContext.getSelectedThemeKey() || __appRuntimeContext.activeSessionThemeKey
    );
    const theme = (key && __appRuntimeContext.resolveThemeByKey(key)) || __appRuntimeContext.activeTheme;
    return { key, theme };
  }

  function getThemeSoundUrl(theme, kind) {
    const effects = theme && theme.soundEffects;
    const src = effects && effects[kind];
    return typeof src === "string" ? src.trim() : "";
  }

  function getThemeSoundFilename(url = "") {
    const clean = String(url || "").split("?")[0].split("#")[0];
    try {
      return decodeURIComponent(clean.split("/").pop() || "");
    } catch (_) {
      return clean.split("/").pop() || "";
    }
  }

  function getThemeSoundSlotState(themeKey, theme, slot) {
    const builtinTheme = getBuiltinThemeForKey(themeKey);
    const builtinUrl = getThemeSoundUrl(builtinTheme, slot.key);
    const currentUrl = getThemeSoundUrl(theme, slot.key);
    const savedName =
      theme &&
      theme.soundEffectNames &&
      typeof theme.soundEffectNames[slot.key] === "string"
        ? theme.soundEffectNames[slot.key].trim()
        : "";
    const builtinAlternates =
      builtinTheme &&
      builtinTheme.soundEffects &&
      builtinTheme.soundEffects[`${slot.key}Alternates`];
    const currentAlternates =
      theme && theme.soundEffects && theme.soundEffects[`${slot.key}Alternates`];
    const custom =
      !!savedName ||
      currentUrl !== builtinUrl ||
      JSON.stringify(currentAlternates || []) !==
        JSON.stringify(builtinAlternates || []);
    const profileName = __appRuntimeContext.resolveThemeSoundProfileName(themeKey, theme);
    let label = `Using ${profileName} theme palette`;
    if (currentUrl) {
      if (!custom && builtinUrl === currentUrl) {
        label = Array.isArray(currentAlternates) && currentAlternates.length > 1
          ? "Using built-in alternating sounds"
          : "Using built-in theme sound";
      } else {
        label = `Uploaded: ${savedName || getThemeSoundFilename(currentUrl) || "Custom sound"}`;
      }
    }
    return { currentUrl, custom, label };
  }

  function setThemeSoundStatus(message = "") {
    if (__appRuntimeContext.DOM.themeSoundStatus) __appRuntimeContext.DOM.themeSoundStatus.textContent = message;
  }

  function renderThemeSoundEditor(themeKey = "", theme = null) {
    if (!__appRuntimeContext.DOM.themeSoundSlots) return;
    const resolvedKey = __appRuntimeContext.normalizeThemeSelectionKey(
      themeKey || __appRuntimeContext.getSelectedThemeKey() || __appRuntimeContext.activeSessionThemeKey
    );
    const resolvedTheme = theme || (resolvedKey && __appRuntimeContext.resolveThemeByKey(resolvedKey));
    if (__appRuntimeContext.DOM.themeSoundThemeName) {
      __appRuntimeContext.DOM.themeSoundThemeName.textContent =
        (resolvedTheme && resolvedTheme.name) || "the selected theme";
    }
    __appRuntimeContext.DOM.themeSoundSlots.innerHTML = "";
    if (!resolvedTheme || !resolvedKey) {
      setThemeSoundStatus("Select a theme to customize its sounds.");
      return;
    }
    __appRuntimeContext.THEME_SOUND_SLOTS.forEach((slot) => {
      const state = getThemeSoundSlotState(resolvedKey, resolvedTheme, slot);
      const row = document.createElement("div");
      row.className = "theme-sound-row";
      row.dataset.soundKind = slot.key;

      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = slot.label;
      const description = document.createElement("span");
      description.className = "theme-sound-description";
      description.textContent = slot.description;
      const current = document.createElement("span");
      current.className = "theme-sound-current";
      current.textContent = state.label;
      copy.append(title, description, current);

      const actions = document.createElement("div");
      actions.className = "theme-sound-actions";
      const preview = document.createElement("button");
      preview.type = "button";
      preview.dataset.themeSoundAction = "preview";
      preview.dataset.soundKind = slot.key;
      preview.textContent = "Preview";
      const upload = document.createElement("button");
      upload.type = "button";
      upload.dataset.themeSoundAction = "upload";
      upload.dataset.soundKind = slot.key;
      upload.textContent = state.currentUrl ? "Replace" : "Upload";
      const reset = document.createElement("button");
      reset.type = "button";
      reset.dataset.themeSoundAction = "reset";
      reset.dataset.soundKind = slot.key;
      reset.textContent = "Use Default";
      reset.disabled = !state.custom;
      actions.append(preview, upload, reset);
      if (slot.key === "start" || slot.key === "tap") {
        __appRuntimeContext.GLOBAL_BUTTON_SOUND_CHOICES.forEach((url) => {
          const choose = document.createElement("button");
          choose.type = "button";
          choose.dataset.themeSoundAction = "choose";
          choose.dataset.soundKind = slot.key;
          choose.dataset.soundUrl = url;
          choose.dataset.soundName = getThemeSoundFilename(url);
          choose.textContent = `Use ${getThemeSoundFilename(url).replace(/\.mp3$/i, "")}`;
          actions.appendChild(choose);
        });
      }
      row.append(copy, actions);
      __appRuntimeContext.DOM.themeSoundSlots.appendChild(row);
    });
    setThemeSoundStatus("");
  }

  function previewThemeSound(kind) {
    const slot = __appRuntimeContext.THEME_SOUND_SLOTS.find((item) => item.key === kind);
    if (!slot) return;
    if (!getThemeSoundsEnabled()) {
      __appRuntimeContext.showToast("Turn on Theme Sound Effects to preview sounds.");
      return;
    }
    __appRuntimeContext.unlockBoothAudio();
    __appRuntimeContext.playThemeCue(slot.key, slot.fallbackCue);
  }

  function assignThemeSound(themeKey, theme, kind, url, originalName) {
    if (!theme || !kind || !url) return;
    if (!theme.soundEffects || typeof theme.soundEffects !== "object") {
      theme.soundEffects = {};
    }
    if (!theme.soundEffectNames || typeof theme.soundEffectNames !== "object") {
      theme.soundEffectNames = {};
    }
    theme.soundEffects[kind] = url;
    const alternateKey = `${kind}Alternates`;
    const builtinTheme = getBuiltinThemeForKey(themeKey);
    const builtinAlternates =
      builtinTheme &&
      builtinTheme.soundEffects &&
      builtinTheme.soundEffects[alternateKey];
    if (
      Array.isArray(theme.soundEffects[alternateKey]) ||
      Array.isArray(builtinAlternates)
    ) {
      theme.soundEffects[alternateKey] = [url];
    } else {
      delete theme.soundEffects[alternateKey];
    }
    theme.soundEffectNames[kind] = originalName || getThemeSoundFilename(url);
    __appRuntimeContext.saveThemesToStorage();
    if (__appRuntimeContext.activeTheme === theme) __appRuntimeContext.activeTheme = theme;
    renderThemeSoundEditor(themeKey, theme);
  }

  async function uploadThemeSound(file, kind) {
    const validation = __appRuntimeContext.validateThemeSoundFile(file);
    if (!validation.valid) {
      setThemeSoundStatus(validation.message);
      __appRuntimeContext.showToast(validation.message);
      return "";
    }
    const { key, theme } = getThemeSoundEditorTarget();
    if (!key || !theme) {
      setThemeSoundStatus("Select a theme first.");
      return "";
    }
    const cfg = __appRuntimeContext.getCloudinaryConfig();
    if (!cfg.use || !cfg.cloud || !cfg.preset) {
      setThemeSoundStatus("Configure Cloudinary before uploading sounds.");
      __appRuntimeContext.showToast("Upload failed: configure Cloudinary first.");
      return "";
    }
    const hash = await __appRuntimeContext.fileSha256Hex(file);
    const folder = __appRuntimeContext.getThemeAssetUploadOptionsForKey(key, "sounds").folder;
    const indexKey = __appRuntimeContext.buildAssetIndexKey({ hash, folder });
    const uploadKey = `theme-sound::${indexKey}`;
    const index = __appRuntimeContext.getAssetIndex();
    if (index[indexKey]) {
      assignThemeSound(key, theme, kind, index[indexKey], file.name);
      setThemeSoundStatus(`${file.name} assigned to ${theme.name}.`);
      return index[indexKey];
    }
    if (__appRuntimeContext.activeManagedAssetUploads.has(uploadKey)) {
      return __appRuntimeContext.activeManagedAssetUploads.get(uploadKey);
    }
    const uploadPromise = (async () => {
      setThemeSoundStatus(`Uploading ${file.name}…`);
      const form = new FormData();
      const wrapped = new File(
        [file],
        `${kind}-${hash}.${validation.extension}`,
        { type: file.type || "application/octet-stream" }
      );
      form.append("file", wrapped);
      form.append("upload_preset", cfg.preset);
      form.append("folder", folder);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cfg.cloud}/video/upload`,
        { method: "POST", body: form }
      );
      let payload = {};
      try {
        payload = await response.json();
      } catch (_) {}
      if (!response.ok) {
        throw new Error(__appRuntimeContext.getCloudinaryUploadFailureMessage(payload, response.status));
      }
      const url = String(
        (payload && (payload.secure_url || payload.url)) || ""
      ).trim();
      if (!url) throw new Error("Cloudinary did not return a sound URL.");
      index[indexKey] = url;
      assignThemeSound(key, theme, kind, url, file.name);
      setThemeSoundStatus(`${file.name} assigned to ${theme.name}.`);
      __appRuntimeContext.showToast("Theme sound saved.");
      return url;
    })()
      .catch((error) => {
        console.error("Theme sound upload failed", error);
        const message =
          error && error.message
            ? `Upload failed: ${error.message}`
            : "Sound upload failed.";
        setThemeSoundStatus(message);
        __appRuntimeContext.showToast(message);
        return "";
      })
      .finally(() => {
        __appRuntimeContext.activeManagedAssetUploads.delete(uploadKey);
      });
    __appRuntimeContext.activeManagedAssetUploads.set(uploadKey, uploadPromise);
    return uploadPromise;
  }

  function resetThemeSound(kind) {
    const { key, theme } = getThemeSoundEditorTarget();
    if (!key || !theme || !kind) return;
    const builtinTheme = getBuiltinThemeForKey(key);
    const builtinEffects = builtinTheme && builtinTheme.soundEffects;
    if (!theme.soundEffects || typeof theme.soundEffects !== "object") {
      theme.soundEffects = {};
    }
    const alternateKey = `${kind}Alternates`;
    if (builtinEffects && typeof builtinEffects[kind] === "string") {
      theme.soundEffects[kind] = builtinEffects[kind];
    } else {
      delete theme.soundEffects[kind];
    }
    if (builtinEffects && Array.isArray(builtinEffects[alternateKey])) {
      theme.soundEffects[alternateKey] = __appRuntimeContext.cloneThemeValue(
        builtinEffects[alternateKey]
      );
    } else {
      delete theme.soundEffects[alternateKey];
    }
    if (theme.soundEffectNames && typeof theme.soundEffectNames === "object") {
      delete theme.soundEffectNames[kind];
      if (!Object.keys(theme.soundEffectNames).length) {
        delete theme.soundEffectNames;
      }
    }
    if (!Object.keys(theme.soundEffects).length) delete theme.soundEffects;
    __appRuntimeContext.saveThemesToStorage();
    if (__appRuntimeContext.boothThemeAudio) {
      __appRuntimeContext.boothThemeAudio.pause();
      __appRuntimeContext.boothThemeAudio.currentTime = 0;
      __appRuntimeContext.boothThemeAudio = null;
    }
    renderThemeSoundEditor(key, theme);
    setThemeSoundStatus("Theme default restored.");
    __appRuntimeContext.showToast("Theme sound reset.");
  }

  function setupThemeSoundControls() {
    if (__appRuntimeContext.DOM.themeSoundSlots) {
      __appRuntimeContext.DOM.themeSoundSlots.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-theme-sound-action]");
        if (!button) return;
        const kind = button.dataset.soundKind || "";
        const action = button.dataset.themeSoundAction || "";
    if (action === "preview") previewThemeSound(kind);
        if (action === "choose") {
          const { key, theme } = getThemeSoundEditorTarget();
          assignThemeSound(key, theme, kind, button.dataset.soundUrl, button.dataset.soundName);
          setThemeSoundStatus(`${button.dataset.soundName} assigned to ${theme.name}.`);
        }
        if (action === "upload" && __appRuntimeContext.DOM.themeSoundInput) {
          __appRuntimeContext.DOM.themeSoundInput.dataset.soundKind = kind;
          __appRuntimeContext.DOM.themeSoundInput.value = "";
          __appRuntimeContext.DOM.themeSoundInput.click();
        }
        if (action === "reset") resetThemeSound(kind);
      });
    }
    if (__appRuntimeContext.DOM.themeSoundInput) {
      __appRuntimeContext.DOM.themeSoundInput.addEventListener("change", async () => {
        const file = __appRuntimeContext.DOM.themeSoundInput.files?.[0];
        const kind = __appRuntimeContext.DOM.themeSoundInput.dataset.soundKind || "";
        if (!file || !kind) return;
        if (__appRuntimeContext.DOM.themeSoundSlots) {
          __appRuntimeContext.DOM.themeSoundSlots
            .querySelectorAll("button")
            .forEach((button) => {
              button.disabled = true;
            });
        }
        await uploadThemeSound(file, kind);
        renderThemeSoundEditor();
        __appRuntimeContext.DOM.themeSoundInput.value = "";
      });
    }
    renderThemeSoundEditor();
  }

  function getLowLightEnabled() {
    try {
      return localStorage.getItem("photoboothLowLight") === "true";
    } catch (_) {
      return false;
    }
  }

  function setLowLightEnabled(enabled) {
    try {
      localStorage.setItem("photoboothLowLight", enabled ? "true" : "false");
    } catch (_) {}
  }

  function setupLowLightToggle() {
    if (!__appRuntimeContext.DOM.lowLightToggle) return;
    __appRuntimeContext.DOM.lowLightToggle.checked = getLowLightEnabled();
    __appRuntimeContext.DOM.lowLightToggle.addEventListener("change", () => {
      setLowLightEnabled(__appRuntimeContext.DOM.lowLightToggle.checked);
    });
  }

  function getGreenScreenEnabled() {
    try {
      const stored = localStorage.getItem("photoboothGreenScreen");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (_) {}
    return __appRuntimeContext.GREEN_SCREEN_DEFAULT;
  }

  function setGreenScreenEnabled(enabled) {
    try {
      localStorage.setItem("photoboothGreenScreen", enabled ? "true" : "false");
    } catch (_) {}
  }

  function setupGreenScreenToggle() {
    if (!__appRuntimeContext.DOM.greenScreenToggle) return;
    __appRuntimeContext.DOM.greenScreenToggle.checked = getGreenScreenEnabled();
    __appRuntimeContext.DOM.greenScreenToggle.addEventListener("change", () => {
      setGreenScreenEnabled(__appRuntimeContext.DOM.greenScreenToggle.checked);
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    });
  }

  function getAiBackgroundEnabled() {
    try {
      const stored = localStorage.getItem("photoboothAiBackground");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (_) {}
    return __appRuntimeContext.AI_BACKGROUND_DEFAULT;
  }

  function setAiBackgroundEnabled(enabled) {
    try {
      localStorage.setItem("photoboothAiBackground", enabled ? "true" : "false");
    } catch (_) {}
  }

  function setupAiBackgroundToggle() {
    if (!__appRuntimeContext.DOM.aiBackgroundToggle) return;
    __appRuntimeContext.DOM.aiBackgroundToggle.checked = getAiBackgroundEnabled();
    if (__appRuntimeContext.DOM.aiBackgroundToggle.checked && __appRuntimeContext.DOM.greenScreenToggle) {
      __appRuntimeContext.DOM.greenScreenToggle.checked = false;
      setGreenScreenEnabled(false);
    }
    __appRuntimeContext.DOM.aiBackgroundToggle.addEventListener("change", async () => {
      const enabled = __appRuntimeContext.DOM.aiBackgroundToggle.checked;
      if (enabled) {
        __appRuntimeContext.DOM.aiBackgroundToggle.disabled = true;
        try {
          await __appRuntimeContext.loadSelfieSegmentationLibrary();
        } catch (_) {
          __appRuntimeContext.DOM.aiBackgroundToggle.checked = false;
          setAiBackgroundEnabled(false);
          __appRuntimeContext.showToast("AI background could not be loaded.");
          return;
        } finally {
          __appRuntimeContext.DOM.aiBackgroundToggle.disabled = false;
        }
      }
      setAiBackgroundEnabled(enabled);
      if (enabled && __appRuntimeContext.DOM.greenScreenToggle) {
        __appRuntimeContext.DOM.greenScreenToggle.checked = false;
        setGreenScreenEnabled(false);
      }
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    });
  }

  function getBeautyPresetOverrides() {
    const overrides = __appRuntimeContext.themes && __appRuntimeContext.themes._meta && __appRuntimeContext.themes._meta.beautyPresetOverrides;
    return overrides && typeof overrides === "object" ? overrides : {};
  }

  function refreshBeautyPresetEffects() {
    const overrides = getBeautyPresetOverrides();
    __appRuntimeContext.FILTER_EFFECTS = __appRuntimeContext.getGuestVisibleBeautyPresets().map((preset) => {
      const override = overrides[preset.id] || {};
      return {
        ...__appRuntimeContext.cloneThemeValue(preset),
        ...__appRuntimeContext.cloneThemeValue(override),
        beauty: { ...preset.beauty, ...(override.beauty || {}) },
        lighting: { ...preset.lighting, ...(override.lighting || {}) },
      };
    });
    const configuredGuestFilter = __appRuntimeContext.themes?._meta?.guestFilterId;
    if (__appRuntimeContext.FILTER_EFFECTS.some((preset) => preset.id === configuredGuestFilter)) {
      __appRuntimeContext.selectedFilter = configuredGuestFilter;
    } else if (!__appRuntimeContext.FILTER_EFFECTS.some((preset) => preset.id === __appRuntimeContext.selectedFilter)) {
      __appRuntimeContext.selectedFilter = __appRuntimeContext.FILTER_EFFECTS[0] ? __appRuntimeContext.FILTER_EFFECTS[0].id : "natural";
    }
  }

  function getEditableBeautyPreset() {
    return __appRuntimeContext.FILTER_EFFECTS.find((preset) => preset.id === __appRuntimeContext.DOM.beautyPresetSelect?.value) || __appRuntimeContext.FILTER_EFFECTS[0] || null;
  }

  function renderBeautyPresetEditor() {
    if (!__appRuntimeContext.DOM.beautyPresetSelect || !__appRuntimeContext.DOM.beautyPresetControls) return;
    const previous = __appRuntimeContext.DOM.beautyPresetSelect.value;
    __appRuntimeContext.DOM.beautyPresetSelect.innerHTML = "";
    __appRuntimeContext.FILTER_EFFECTS.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.icon || ""} ${preset.name}`.trim();
      __appRuntimeContext.DOM.beautyPresetSelect.appendChild(option);
    });
    __appRuntimeContext.DOM.beautyPresetSelect.value = __appRuntimeContext.FILTER_EFFECTS.some((preset) => preset.id === previous)
      ? previous
      : __appRuntimeContext.selectedFilter;
    const preset = getEditableBeautyPreset();
    __appRuntimeContext.DOM.beautyPresetControls.innerHTML = "";
    if (!preset) return;
    __appRuntimeContext.BEAUTY_PRESET_CONTROL_DEFINITIONS.forEach(([group, key, label, min, max]) => {
      const row = document.createElement("div");
      row.className = "beauty-preset-control";
      const inputId = `beautyPreset-${preset.id}-${key}`;
      const value = Number(preset[group] && preset[group][key]) || 0;
      row.innerHTML = `<label for="${inputId}">${label}</label><output for="${inputId}">${value}</output><input id="${inputId}" type="range" min="${min}" max="${max}" step="1" value="${value}">`;
      const input = row.querySelector("input");
      const output = row.querySelector("output");
      input.addEventListener("input", () => {
        const nextValue = Number(input.value);
        output.value = String(nextValue);
        output.textContent = String(nextValue);
        updateBeautyPresetValue(preset.id, group, key, nextValue, false);
      });
      input.addEventListener("change", () => {
        updateBeautyPresetValue(preset.id, group, key, Number(input.value), true);
      });
      __appRuntimeContext.DOM.beautyPresetControls.appendChild(row);
    });
  }

  function updateBeautyPresetValue(presetId, group, key, value, persist) {
    const overrides = getBeautyPresetOverrides();
    if (!__appRuntimeContext.themes._meta) __appRuntimeContext.themes._meta = {};
    if (!__appRuntimeContext.themes._meta.beautyPresetOverrides) __appRuntimeContext.themes._meta.beautyPresetOverrides = overrides;
    const presetOverride = overrides[presetId] || {};
    const groupOverride = { ...(presetOverride[group] || {}), [key]: value };
    overrides[presetId] = { ...presetOverride, [group]: groupOverride };
    refreshBeautyPresetEffects();
    if (persist) persistBeautyPresetEdits();
  }

  async function persistBeautyPresetEdits() {
    __appRuntimeContext.saveThemesToStorage();
    if (!__appRuntimeContext.canSyncRemote()) {
      __appRuntimeContext.showToast("Filter saved locally. Launch from the shared booth site to sync it.");
      return;
    }
    const saved = await __appRuntimeContext.syncThemesRemote();
    __appRuntimeContext.showToast(saved ? "Guest filter saved to shared booth settings." : "Filter saved locally; shared sync will retry.");
  }

  function resetBeautyPreset(presetId) {
    if (!presetId) return;
    const overrides = getBeautyPresetOverrides();
    if (!overrides[presetId]) return;
    delete overrides[presetId];
    refreshBeautyPresetEffects();
    renderBeautyPresetEditor();
    persistBeautyPresetEdits();
  }

  function setupBeautyPresetEditor() {
    if (!__appRuntimeContext.DOM.beautyPresetSelect || !__appRuntimeContext.DOM.beautyPresetControls) return;
    refreshBeautyPresetEffects();
    renderBeautyPresetEditor();
    __appRuntimeContext.DOM.beautyPresetSelect.addEventListener("change", () => {
      __appRuntimeContext.selectedFilter = __appRuntimeContext.DOM.beautyPresetSelect.value;
      if (!__appRuntimeContext.themes._meta) __appRuntimeContext.themes._meta = {};
      __appRuntimeContext.themes._meta.guestFilterId = __appRuntimeContext.selectedFilter;
      renderBeautyPresetEditor();
      persistBeautyPresetEdits();
    });
    if (__appRuntimeContext.DOM.resetBeautyPresetButton) {
      __appRuntimeContext.DOM.resetBeautyPresetButton.addEventListener("click", () => {
        resetBeautyPreset(__appRuntimeContext.DOM.beautyPresetSelect.value);
      });
    }
  }

  function getCameraZoom() {
    try {
      const stored = localStorage.getItem("photoboothCameraZoom");
      if (stored !== null) return __appRuntimeContext.clampZoom(parseFloat(stored), 1, 2.5);
    } catch (_) {}
    return __appRuntimeContext.CAMERA_ZOOM_DEFAULT;
  }

  function setCameraZoom(value) {
    const normalized = __appRuntimeContext.clampZoom(value, 1, 2.5);
    try {
      localStorage.setItem("photoboothCameraZoom", String(normalized));
    } catch (_) {}
    applyCameraZoom(normalized);
  }

  function applyCameraZoom(value) {
    const zoom = __appRuntimeContext.clampZoom(value, 1, 2.5);
    document.documentElement.style.setProperty("--camera-zoom", String(zoom));
    if (__appRuntimeContext.DOM.cameraZoomInput) __appRuntimeContext.DOM.cameraZoomInput.value = String(zoom);
    if (__appRuntimeContext.DOM.cameraZoomValue)
      __appRuntimeContext.DOM.cameraZoomValue.textContent = `${zoom.toFixed(2)}x`;
  }

  function setupCameraZoomControls() {
    if (!__appRuntimeContext.DOM.cameraZoomInput) return;
    const initial = getCameraZoom();
    applyCameraZoom(initial);
    __appRuntimeContext.DOM.cameraZoomInput.addEventListener("input", () => {
      setCameraZoom(__appRuntimeContext.DOM.cameraZoomInput.value);
    });
  }

  return {
    setupOfflineControls,
    getLivePhotoEnabled,
    setLivePhotoEnabled,
    setupLivePhotoToggle,
    getAllowRetakes,
    setAllowRetakes,
    setupAllowRetakesToggle,
    setupRecordingModeToggle,
    getInstantCaptureEnabled,
    setInstantCaptureEnabled,
    setupInstantCaptureToggle,
    getCountdownFiveSecondsEnabled,
    setCountdownFiveSecondsEnabled,
    setupCountdownFiveToggle,
    getThemeSoundsEnabled,
    setThemeSoundsEnabled,
    setupThemeSoundToggle,
    getBuiltinThemeForKey,
    getThemeSoundEditorTarget,
    getThemeSoundUrl,
    getThemeSoundFilename,
    getThemeSoundSlotState,
    setThemeSoundStatus,
    renderThemeSoundEditor,
    previewThemeSound,
    assignThemeSound,
    uploadThemeSound,
    resetThemeSound,
    setupThemeSoundControls,
    getLowLightEnabled,
    setLowLightEnabled,
    setupLowLightToggle,
    getGreenScreenEnabled,
    setGreenScreenEnabled,
    setupGreenScreenToggle,
    getAiBackgroundEnabled,
    setAiBackgroundEnabled,
    setupAiBackgroundToggle,
    getBeautyPresetOverrides,
    refreshBeautyPresetEffects,
    getEditableBeautyPreset,
    renderBeautyPresetEditor,
    updateBeautyPresetValue,
    persistBeautyPresetEdits,
    resetBeautyPreset,
    setupBeautyPresetEditor,
    getCameraZoom,
    setCameraZoom,
    applyCameraZoom,
    setupCameraZoomControls,
  };
}
