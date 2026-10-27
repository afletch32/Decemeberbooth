export function createRenderingModule(__appRuntimeContext) {
  function populateThemeSelector(preferredKey, attempt = 0) {
    console.log("Themes object:", __appRuntimeContext.themes);
    const activeWedding = __appRuntimeContext.getActiveEvent();
    if (
      activeWedding &&
      activeWedding.eventType === "wedding" &&
      activeWedding.themeKey &&
      activeWedding.weddingTheme
    ) {
      __appRuntimeContext.themeAdminState.setThemeOptions(
        __appRuntimeContext.getSelectableThemeEntries().map((entry) => ({
          value: entry.key,
          textContent: entry.label,
        }))
      );
      setEventSelection(activeWedding.themeKey);
      __appRuntimeContext.syncWeddingSetupMode();
      updateThemeEditorSummary();
      return activeWedding.themeKey;
    }
    const selectedType = getSelectedEventType();
    const entries = __appRuntimeContext.getSetupThemeEntries().filter((entry) =>
      shouldIncludeThemeForSelectedType(entry.key, entry.theme, selectedType)
    );
    __appRuntimeContext.themeAdminState.setThemeOptions(
      entries.map((entry) => ({ value: entry.key, textContent: entry.label }))
    );
    // Populate cards directly from the catalog so a stale theme selection
    // cannot leave the picker blank while loadTheme resolves its fallback.
    __appRuntimeContext.renderThemeQuickPicker();
    if (entries.length === 0) {
      if (attempt === 0) {
        __appRuntimeContext.resetThemesToBuiltins("no selectable themes for dropdown");
        __appRuntimeContext.ensureBuiltinThemes();
        try {
          __appRuntimeContext.normalizeAllThemes();
        } catch (_e) {}
        if (__appRuntimeContext.removeLegacyFlatBuiltinThemes()) {
          localStorage.setItem("photoboothThemes", JSON.stringify(__appRuntimeContext.themes));
        }
        return populateThemeSelector(preferredKey, attempt + 1);
      }
      updateThemeEditorSummary();
      return null;
    }
    const resolved = resolvePreferredThemeKey(preferredKey);
    if (resolved) setEventSelection(resolved);
    const selectedKey = __appRuntimeContext.getSelectedThemeKey() || null;
    __appRuntimeContext.populateCreatePathThemeSelect(selectedKey || "");
    updateThemeEditorSummary();
    return selectedKey;
  }

  function getSelectedEventType() {
    return __appRuntimeContext.normalizeEventStyle(__appRuntimeContext.THEME_EDITOR.eventType.value) || "general";
  }

  function syncEventTypeTiles() {
    const selectedType = getSelectedEventType();
    document.querySelectorAll("[data-event-type-tile]").forEach((button) => {
      const isActive =
        __appRuntimeContext.normalizeEventStyle(button.dataset.eventTypeTile) === selectedType;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function setSelectedEventType(nextType) {
    const normalized = __appRuntimeContext.normalizeEventStyle(nextType) || "general";
    __appRuntimeContext.THEME_EDITOR.eventType.value = normalized;
    syncEventTypeTiles();
    populateThemeSelector(__appRuntimeContext.getSelectedThemeKey());
  }

  function getThemeEventTypePriority(item, selectedType) {
    if (!item) return 99;
    const inferredType = __appRuntimeContext.inferThemeEventStyle(item.value, item.theme);
    const normalizedSelected = __appRuntimeContext.normalizeEventStyle(selectedType);
    if (normalizedSelected === "general") {
      if (inferredType === "general") return 0;
      if (inferredType === "birthday") return 1;
      if (inferredType === "community") return 2;
      return 3;
    }
    if (inferredType === normalizedSelected) return 0;
    if (normalizedSelected === "party" && inferredType === "birthday") return 0;
    if (
      (normalizedSelected === "wedding" || normalizedSelected === "expo") &&
      inferredType === "general"
    )
      return 1;
    if (normalizedSelected === "community" && inferredType === "general")
      return 1;
    if (normalizedSelected === "party" && inferredType === "general") return 1;
    return 2;
  }

  function themeSupportsEventType(item, selectedType) {
    if (!item || !item.theme) return false;
    const normalizedSelected = __appRuntimeContext.normalizeEventStyle(selectedType);
    if (normalizedSelected === "general") return true;
    const explicitTypes = Array.isArray(item.theme.eventTypes)
      ? item.theme.eventTypes
          .map((entry) => __appRuntimeContext.normalizeEventStyle(entry))
          .filter(Boolean)
      : [];
    if (explicitTypes.length) {
      if (explicitTypes.includes(normalizedSelected)) return true;
      if (normalizedSelected === "party" && explicitTypes.includes("birthday"))
        return true;
      return false;
    }
    const inferredType = __appRuntimeContext.inferThemeEventStyle(item.value, item.theme);
    if (inferredType === normalizedSelected) return true;
    if (normalizedSelected === "party" && inferredType === "birthday")
      return true;
    return inferredType === "general";
  }

  function isHolidayThemeKey(themeKey) {
    if (!themeKey) return false;
    return resolveThemeStorage(themeKey).bucket === "holidays";
  }

  function shouldIncludeThemeForSelectedType(themeKey, theme, selectedType) {
    const normalizedSelected = __appRuntimeContext.normalizeEventStyle(selectedType);
    if (!theme) return false;
    if (normalizedSelected === "wedding" && isHolidayThemeKey(themeKey)) {
      return false;
    }
    return themeSupportsEventType({ value: themeKey, theme }, normalizedSelected);
  }

  function shouldIncludeCreatePathTheme(themeKey, theme, selectedType) {
    const normalizedSelected = __appRuntimeContext.normalizeEventStyle(selectedType);
    if (!theme) return false;
    if (normalizedSelected === "general") return true;
    const themeText = [
      themeKey,
      theme.name,
      theme.vibeSummary,
      theme.welcome && theme.welcome.title,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (
      normalizedSelected === "wedding" &&
      (isHolidayThemeKey(themeKey) ||
        /(halloween|christmas|valentine|santa|new year|spooky|boo|winter wonderland)/.test(
          themeText
        ))
    ) {
      return false;
    }
    const explicitTypes = Array.isArray(theme.eventTypes)
      ? theme.eventTypes
          .map((entry) => __appRuntimeContext.normalizeEventStyle(entry))
          .filter(Boolean)
      : [];
    const inferred = __appRuntimeContext.inferThemeEventStyle(themeKey, theme);
    if (inferred !== "general") return inferred === normalizedSelected;
    return explicitTypes.includes(normalizedSelected) && themeText.includes(normalizedSelected);
  }

  function getEventTypeCopy(selectedType) {
    const normalized = __appRuntimeContext.normalizeEventStyle(selectedType);
    const copy = {
      wedding: {
        label: "Wedding",
        note: "Romantic, polished setups with elegant typography and simple booth visuals.",
        themeNote: "Showing themes that fit wedding and formal booth setups.",
      },
      expo: {
        label: "Expo",
        note: "Fast-to-read setups for vendor booths and conferences.",
        themeNote: "Showing themes that fit vendor booths and conferences.",
      },
      birthday: {
        label: "Party",
        note: "Energetic, celebratory setups that feel playful and guest-friendly.",
        themeNote:
          "Showing themes that fit parties, birthdays, and high-energy celebrations.",
      },
      community: {
        label: "Community",
        note: "Welcoming, flexible setups for schools, fundraisers, churches, and public events.",
        themeNote:
          "Showing themes that fit schools, fundraisers, churches, and community events.",
      },
      general: {
        label: "General",
        note: "Balanced default setups that can be adapted quickly for almost any booth.",
        themeNote:
          "Showing versatile themes that can be adapted quickly for most events.",
      },
    };
    return copy[normalized] || copy.general;
  }

  function showToast(message, duration = 2000) {
    const t = __appRuntimeContext.DOM.toast;
    if (!t) return;
    t.textContent = message;
    t.classList.add("show");
    if (__appRuntimeContext.toastTimer) clearTimeout(__appRuntimeContext.toastTimer);
    __appRuntimeContext.toastTimer = setTimeout(() => {
      t.classList.remove("show");
    }, duration);
  }

  function setVideoImportStatus(message) {
    if (!__appRuntimeContext.DOM.videoImportStatus) return;
    __appRuntimeContext.DOM.videoImportStatus.textContent = message || "Ready for video import.";
    if (__appRuntimeContext.DOM.booth360Status && __appRuntimeContext.currentMode === "360") {
      __appRuntimeContext.DOM.booth360Status.textContent = message || "360 Mode Active";
    }
  }

  function showMessage(message, duration = 1800) {
    setVideoImportStatus(message);
    showToast(message, duration);
  }

  function set360Status(title, note = "", isWarning = false) {
    if (__appRuntimeContext.DOM.booth360StatusText)
      __appRuntimeContext.DOM.booth360StatusText.textContent = title || "360 Mode Active";
    if (__appRuntimeContext.DOM.booth360StatusNote) __appRuntimeContext.DOM.booth360StatusNote.textContent = note || "";
    if (__appRuntimeContext.DOM.booth360Status) {
      __appRuntimeContext.DOM.booth360Status.style.borderColor = isWarning ? "var(--danger)" : "";
      __appRuntimeContext.DOM.booth360Status.style.boxShadow = isWarning
        ? "0 0 0 4px rgba(220, 79, 113, 0.15)"
        : "";
    }
  }

  function updateCaptureModeUi() {
    const is360Mode = __appRuntimeContext.currentMode === "360";
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.toggle("mode-360", is360Mode);
    if (__appRuntimeContext.DOM.modeToggle) {
      __appRuntimeContext.DOM.modeToggle.textContent = is360Mode
        ? "Switch to Photo Mode"
        : "Switch to 360 Mode";
    }
    if (__appRuntimeContext.DOM.captureBtn) __appRuntimeContext.DOM.captureBtn.classList.toggle("hidden", is360Mode);
    if (__appRuntimeContext.DOM.boothControls)
      __appRuntimeContext.DOM.boothControls.classList.toggle("hidden", is360Mode);
    if (__appRuntimeContext.DOM.options) __appRuntimeContext.DOM.options.classList.toggle("hidden", is360Mode);
    if (__appRuntimeContext.DOM.videoImportPanel)
      __appRuntimeContext.DOM.videoImportPanel.classList.toggle("hidden", !is360Mode);
    if (__appRuntimeContext.DOM.booth360Panel)
      __appRuntimeContext.DOM.booth360Panel.classList.toggle("hidden", !is360Mode);
    if (
      __appRuntimeContext.DOM.booth360Status &&
      is360Mode &&
      !__appRuntimeContext.isImporting360Video &&
      !__appRuntimeContext.isRunning360Sequence
    ) {
      set360Status(
        "Ready for a remote-triggered 360 take",
        "Start recording on the iPhone first, then use the arm remote to run the spin while the booth handles countdown and upload."
      );
    }
    if (is360Mode) {
      __appRuntimeContext.setMobileSettingsOpen(false);
    }
    __appRuntimeContext.syncMobileSettingsUi();
  }

  function setCaptureMode(nextMode = "photo") {
    __appRuntimeContext.currentMode = nextMode === "360" ? "360" : "photo";
    updateCaptureModeUi();
  }

  function playStopAlert() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        440,
        context.currentTime + 0.3
      );
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } catch (_) {}
  }

  async function run360Countdown(signal) {
    for (let n = 3; n > 0; n -= 1) {
      await __appRuntimeContext.showCountdown(String(n), signal);
    }
    await __appRuntimeContext.showCountdown("GO", signal);
  }

  async function start360Sequence() {
    if (__appRuntimeContext.currentMode !== "360") return;

    // If already spinning, the next remote press stops the arm immediately
    if (__appRuntimeContext.isRunning360Sequence) {
      if (__appRuntimeContext.spinAbortController) __appRuntimeContext.spinAbortController.abort();
      return;
    }

    if (__appRuntimeContext.DOM.start360Btn) __appRuntimeContext.DOM.start360Btn.disabled = true;
    if (__appRuntimeContext.DOM.triggerZone) __appRuntimeContext.DOM.triggerZone.disabled = true;

    __appRuntimeContext.isRunning360Sequence = true;
    __appRuntimeContext.spinAbortController = new AbortController();
    const { signal } = __appRuntimeContext.spinAbortController;

    try {
      set360Status(
        "Get ready",
        "iPhone should already be recording before the countdown begins."
      );
      showMessage("Get ready");
      await run360Countdown(signal);
      set360Status(
        "🎥 Spin in progress",
        "Keep the platform moving while the iPhone records the full take."
      );
      setVideoImportStatus("🎥 Recording...");
      await __appRuntimeContext.setMotorPower(true); // START THE MOTOR
      await __appRuntimeContext.delay(__appRuntimeContext.APP_CONFIG.TIMERS.SPIN_DURATION, signal);
      await __appRuntimeContext.setMotorPower(false); // STOP THE MOTOR
      playStopAlert();
      set360Status(
        "🛑 STOP ARM",
        "Spin complete. Stop the motor arm and finish the iPhone recording.",
        true
      );
      setVideoImportStatus("Stop recording on iPhone");
      await __appRuntimeContext.delay(1000);
      set360Status(
        "📲 Send the clip",
        "AirDrop the video or tap upload. Processing starts automatically."
      );
      setVideoImportStatus("📲 AirDrop your video or tap to upload.");
    } catch (err) {
      if (err.name === "AbortError") {
        set360Status("🛑 MANUAL STOP", "Operator stopped the spin early.");
        setVideoImportStatus("Spin stopped manually.");
      }
    } finally {
      await __appRuntimeContext.setMotorPower(false); // Safety: Always ensure motor is cut
      __appRuntimeContext.isRunning360Sequence = false;
      __appRuntimeContext.spinAbortController = null;
      if (__appRuntimeContext.DOM.start360Btn) __appRuntimeContext.DOM.start360Btn.disabled = false;
      if (__appRuntimeContext.DOM.triggerZone) __appRuntimeContext.DOM.triggerZone.disabled = false;
    }
  }

  function isImportableVideoFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith("video/")) return true;
    return /\.(mp4|mov|m4v|webm|qt|hevc)$/i.test(file.name || "");
  }

  function onFileReceived() {
    set360Status(
      "📥 Video received",
      "The booth has the clip now. Processing starts automatically."
    );
    showMessage("📥 Video received");
    window.setTimeout(() => {
      if (!__appRuntimeContext.isImporting360Video) {
        setVideoImportStatus("🎬 Processing...");
      }
    }, 500);
  }

  async function process360Video(file) {
    if (!isImportableVideoFile(file)) {
      showMessage("Choose a video file.");
      return;
    }
    if (__appRuntimeContext.isImporting360Video) {
      showMessage("Already processing a video.");
      return;
    }
    __appRuntimeContext.isImporting360Video = true;
    const previewPlaceholder =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    try {
      set360Status(
        "🎬 Processing clip",
        "Trimming, building the replay, and preparing the share link."
      );
      setVideoImportStatus("🎬 Processing...");
      __appRuntimeContext.setLiveClip(file);
      __appRuntimeContext.showFinal(previewPlaceholder, {
        shareType: "video",
        shareBlob: file,
        skipShare: true,
      });
      set360Status(
        "☁️ Uploading",
        "Publishing the finished 360 clip so the QR code can open it."
      );
      setVideoImportStatus("☁️ Uploading...");
      if (__appRuntimeContext.DOM.shareStatus) {
        __appRuntimeContext.DOM.shareStatus.textContent = "Uploading video…";
        __appRuntimeContext.DOM.shareStatus.style.display = "inline-flex";
      }
      const uploadResult = await __appRuntimeContext.uploadCaptureOnce({
        previewUrl: previewPlaceholder,
        mediaBlob: file,
        resourceType: "video",
        modeName: "360",
      });
      const publicUrl = uploadResult.publicUrl;
      if (!publicUrl) {
        if (__appRuntimeContext.DOM.qrHint) {
          __appRuntimeContext.DOM.qrHint.textContent = __appRuntimeContext.cloudinaryEnabled()
            ? "Upload failed. Try sending the video again."
            : "Enable Cloudinary in Admin to generate a QR code for videos.";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
        if (__appRuntimeContext.DOM.shareStatus) __appRuntimeContext.DOM.shareStatus.textContent = "Upload failed";
        setVideoImportStatus("Upload failed");
        return;
      }

      __appRuntimeContext.lastShareUrl = publicUrl;
      const qrRendered = __appRuntimeContext.DOM.qrCode
        ? await __appRuntimeContext.renderQrCode(__appRuntimeContext.DOM.qrCode, publicUrl)
        : false;
      if (__appRuntimeContext.DOM.qrCodeContainer) {
        __appRuntimeContext.DOM.qrCodeContainer.dataset.ready = qrRendered ? "true" : "false";
        __appRuntimeContext.DOM.qrCodeContainer.classList.remove("hidden");
      }
      if (__appRuntimeContext.DOM.qrHint) {
        __appRuntimeContext.DOM.qrHint.textContent = qrRendered
          ? ""
          : "Open the link button if the QR does not appear.";
        __appRuntimeContext.DOM.qrHint.style.display = qrRendered ? "none" : "block";
      }
      if (__appRuntimeContext.DOM.shareStatus) __appRuntimeContext.DOM.shareStatus.textContent = qrRendered ? "Link ready" : "QR failed";
      set360Status(
        qrRendered ? "Ready to share" : "Link ready",
        qrRendered
          ? "QR code is ready for guests to scan."
          : "The share link is ready, but the QR code did not render."
      );
      setVideoImportStatus(qrRendered ? "Ready" : "QR failed");
    } catch (error) {
      console.error("360 video processing failed", error);
      if (__appRuntimeContext.DOM.shareStatus) {
        __appRuntimeContext.DOM.shareStatus.textContent = "Processing failed";
        __appRuntimeContext.DOM.shareStatus.style.display = "inline-flex";
      }
      if (__appRuntimeContext.DOM.qrHint) {
        __appRuntimeContext.DOM.qrHint.textContent =
          "Processing failed. Try a shorter clip or re-send the video.";
        __appRuntimeContext.DOM.qrHint.style.display = "block";
      }
      set360Status(
        "Processing failed",
        "Try sending the clip again or use a shorter recording."
      );
      setVideoImportStatus("Processing failed");
    } finally {
      __appRuntimeContext.isImporting360Video = false;
      if (__appRuntimeContext.DOM.videoInput) __appRuntimeContext.DOM.videoInput.value = "";
    }
  }

  function handleImportedVideoFile(file) {
    if (!file) return;
    onFileReceived();
    window.setTimeout(() => {
      process360Video(file).catch((error) => {
        console.error("Imported video failed", error);
        setVideoImportStatus("Processing failed");
      });
    }, 500);
  }

  function setupVideoImportControls() {
    setVideoImportStatus("Ready for video import.");
    if (__appRuntimeContext.DOM.videoInput) {
      __appRuntimeContext.DOM.videoInput.addEventListener("change", (event) => {
        const input = event.target;
        const file = input && input.files ? input.files[0] : null;
        if (file) handleImportedVideoFile(file);
      });
    }

    if (__appRuntimeContext.DOM.airdropZone && __appRuntimeContext.DOM.videoInput) {
      __appRuntimeContext.DOM.airdropZone.addEventListener("click", () => __appRuntimeContext.DOM.videoInput.click());
      __appRuntimeContext.DOM.airdropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          __appRuntimeContext.DOM.videoInput.click();
        }
      });
      ["dragenter", "dragover"].forEach((type) => {
        __appRuntimeContext.DOM.airdropZone.addEventListener(type, (event) => {
          event.preventDefault();
          __appRuntimeContext.DOM.airdropZone.classList.add("drag-active");
        });
      });
      ["dragleave", "drop"].forEach((type) => {
        __appRuntimeContext.DOM.airdropZone.addEventListener(type, () => {
          __appRuntimeContext.DOM.airdropZone.classList.remove("drag-active");
        });
      });
    }

    document.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    document.addEventListener("drop", (event) => {
      event.preventDefault();
      if (__appRuntimeContext.DOM.airdropZone) __appRuntimeContext.DOM.airdropZone.classList.remove("drag-active");
      const file =
        event.dataTransfer && event.dataTransfer.files
          ? event.dataTransfer.files[0]
          : null;
      if (file) handleImportedVideoFile(file);
    });
  }

  function setup360ModeControls() {
    if (__appRuntimeContext.DOM.modeToggle) {
      __appRuntimeContext.DOM.modeToggle.addEventListener("click", () => {
        setCaptureMode(__appRuntimeContext.currentMode === "360" ? "photo" : "360");
      });
    }
    if (__appRuntimeContext.DOM.start360Btn) {
      __appRuntimeContext.DOM.start360Btn.addEventListener("click", () => {
        start360Sequence();
      });
    }
    if (__appRuntimeContext.DOM.triggerZone) {
      __appRuntimeContext.DOM.triggerZone.addEventListener("click", () => {
        start360Sequence();
      });
      __appRuntimeContext.DOM.triggerZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          start360Sequence();
        }
      });
    }
    document.addEventListener("keydown", (event) => {
      // Common keys emitted by generic/unbranded Bluetooth remotes
      const remoteTriggerKeys = [
        "Space",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Camera",
        "MediaPlayPause",
      ];

      if (
        !remoteTriggerKeys.includes(event.code) &&
        !remoteTriggerKeys.includes(event.key)
      )
        return;

      const target = event.target;
      const tag =
        target && target.tagName ? String(target.tagName).toLowerCase() : "";

      // Don't trigger if the user is actually typing in a field
      if (
        ["input", "textarea", "select"].includes(tag) ||
        target?.isContentEditable ||
        event.repeat
      )
        return;

      event.preventDefault();
      if (__appRuntimeContext.currentMode === "360") {
        start360Sequence();
        return;
      }

      // Keyboard-emulating Bluetooth shutters use the same path as the booth
      // button, preserving Instant Capture, countdown, strip, layout, and
      // message behavior selected by the operator.
      __appRuntimeContext.handlePrimaryAction();
    });
    updateCaptureModeUi();
  }

  function setEventSelection(key) {
    if (!key) return false;
    key = normalizeThemeSelectionKey(key);
    const active = __appRuntimeContext.getActiveEvent();
    if (
      __appRuntimeContext.weddingSetupRequested &&
      !key.startsWith("wedding:")
    ) return false;
    if (
      active &&
      active.eventType === "wedding" &&
      active.weddingTheme &&
      active.themeKey !== key
    ) return false;
    if (
      active &&
      active.eventType === "wedding" &&
      active.themeKey === key &&
      active.weddingTheme &&
      key.startsWith("wedding:")
    ) {
      __appRuntimeContext.setLastThemeKey(key);
      updateThemeEditorSummary();
      return true;
    }
    if (!__appRuntimeContext.themeAdminState.setSelectedThemeKey(key)) return false;
    __appRuntimeContext.setLastThemeKey(key);
    updateThemeEditorSummary();
    return true;
  }

  function getStartupThemeKey() {
    const activeEvent = __appRuntimeContext.getActiveEvent();
    // An explicitly active saved event remains authoritative. Otherwise, reopen
    // the exact theme the operator used most recently.
    return (activeEvent && activeEvent.themeKey) || __appRuntimeContext.getLastThemeKey() || __appRuntimeContext.DEFAULT_THEME_KEY;
  }

  function resolvePreferredThemeKey(preferredKey) {
    preferredKey = normalizeThemeSelectionKey(preferredKey);
    const options = __appRuntimeContext.getThemeOptions();
    const hasKey = (key) => !!key && options.some((opt) => opt.value === key);
    if (hasKey(preferredKey)) return preferredKey;
    if (hasKey(__appRuntimeContext.DEFAULT_THEME_KEY)) return __appRuntimeContext.DEFAULT_THEME_KEY;
    const generalOption = options.find(
      (opt) => typeof opt.value === "string" && opt.value.startsWith("general:")
    );
    if (generalOption) return generalOption.value;
    const generalStandalone = options.find((opt) => opt.value === "general");
    if (generalStandalone) return generalStandalone.value;
    return options.length ? options[0].value : null;
  }

  function isSelectableThemeKey(themeKey) {
    const normalizedKey = normalizeThemeSelectionKey(themeKey);
    const active = __appRuntimeContext.getActiveEvent();
    if (
      active &&
      active.eventType === "wedding" &&
      active.themeKey === normalizedKey &&
      active.weddingTheme
    ) return true;
    return __appRuntimeContext.getSelectableThemeEntries().some((entry) => entry.key === normalizedKey);
  }

  function resolveThemeByKey(themeKey) {
    themeKey = normalizeThemeSelectionKey(themeKey);
    if (!themeKey) return null;
    const active = __appRuntimeContext.getActiveEvent();
    if (
      active &&
      active.eventType === "wedding" &&
      active.themeKey === themeKey &&
      active.weddingTheme
    ) return active.weddingTheme;
    if (themeKey.includes(":")) {
      const [rootKey, leafKey] = themeKey.split(":");
      const root = __appRuntimeContext.themes[rootKey];
      if (!root) return null;
      if (root.themes && root.themes[leafKey]) return root.themes[leafKey];
      if (root.holidays && root.holidays[leafKey]) return root.holidays[leafKey];
      return null;
    }
    return __appRuntimeContext.themes[themeKey] || null;
  }

  function normalizeThemeSelectionKey(themeKey) {
    const key = String(themeKey || "").trim();
    if (!key || key.includes(":")) return key;
    const builtinGroup = __appRuntimeContext.BUILTIN_THEMES[key];
    if (!builtinGroup || typeof builtinGroup !== "object") return key;
    for (const bucket of ["themes", "holidays"]) {
      const children = builtinGroup[bucket];
      if (!children || typeof children !== "object") continue;
      const firstChildKey = Object.keys(children)[0];
      if (firstChildKey) return `${key}:${firstChildKey}`;
    }
    return key;
  }

  function resolveThemeStorage(key) {
    if (!key) return { parent: __appRuntimeContext.themes, bucket: null, root: null };
    if (!key.includes(":")) {
      return { parent: __appRuntimeContext.themes, bucket: null, root: key };
    }
    const [rootKey, leafKey] = key.split(":");
    const parent = __appRuntimeContext.themes[rootKey];
    if (!parent || typeof parent !== "object") {
      return { parent: __appRuntimeContext.themes, bucket: null, root: rootKey };
    }
    if (parent.themes && parent.themes[leafKey]) {
      return { parent, bucket: "themes", root: rootKey };
    }
    if (parent.holidays && parent.holidays[leafKey]) {
      return { parent, bucket: "holidays", root: rootKey };
    }
    return { parent: __appRuntimeContext.themes, bucket: null, root: rootKey };
  }

  function applyThemeFontStyles(theme) {
    const headingCss =
      (theme && (theme.fontHeading || theme.font)) || "'Comic Neue', cursive";
    const bodyCss =
      (theme && (theme.fontBody || theme.font)) || "'Comic Neue', cursive";
    [__appRuntimeContext.DOM.boothScreen, __appRuntimeContext.DOM.welcomeScreen].forEach((screen) => {
      if (!screen) return;
      screen.style.setProperty("--font-heading", headingCss);
      screen.style.setProperty("--font-body", bodyCss);
      screen.style.setProperty("--font", bodyCss);
      screen.style.setProperty("--font-label", bodyCss);
    });
    if (__appRuntimeContext.DOM.eventTitle) __appRuntimeContext.DOM.eventTitle.style.fontFamily = headingCss || bodyCss;
    if (__appRuntimeContext.DOM.welcomeTitle)
      __appRuntimeContext.DOM.welcomeTitle.style.fontFamily = headingCss || bodyCss;
    __appRuntimeContext.ensureFontLoadedForFontString(headingCss);
    __appRuntimeContext.ensureFontLoadedForFontString(bodyCss);
  }

  function resolveHexColorValue(color, fallback = "#7abf92") {
    if (typeof color === "string" && /^#([0-9a-f]{6})$/i.test(color.trim()))
      return color.trim();
    const converted = colorToHex(color || "");
    if (converted && /^#([0-9a-f]{6})$/i.test(converted)) return converted;
    return fallback;
  }

  function mixRgbValue(a, b, ratio = 0.5) {
    const safeRatio = Math.max(0, Math.min(1, Number(ratio)));
    const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
    return {
      r: clamp(a.r + (b.r - a.r) * safeRatio),
      g: clamp(a.g + (b.g - a.g) * safeRatio),
      b: clamp(a.b + (b.b - a.b) * safeRatio),
    };
  }

  function rgbToHexValue(rgb) {
    const toHex = (value) =>
      Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function buildActionPalette(theme) {
    const accentHex = resolveHexColorValue(theme && theme.accent, "#6fb883");
    const accent2Hex = resolveHexColorValue(theme && theme.accent2, "#ffffff");
    const white = { r: 255, g: 255, b: 255 };
    const base = __appRuntimeContext.hexToRgb(accentHex);
    const secondary = __appRuntimeContext.hexToRgb(accent2Hex);
    const start = rgbToHexValue(mixRgbValue(base, white, 0.62));
    const mid = rgbToHexValue(mixRgbValue(base, secondary, 0.3));
    const end = rgbToHexValue(mixRgbValue(secondary, white, 0.2));
    const border = rgbToHexValue(mixRgbValue(base, white, 0.78));
    const outline = rgbToHexValue(
      mixRgbValue(base, { r: 20, g: 40, b: 30 }, 0.24)
    );
    const textLightness =
      (base.r * 0.299 + base.g * 0.587 + base.b * 0.114) / 255;
    const text = textLightness > 0.62 ? "#1f3a28" : "#f7fff9";
    return { start, mid, end, border, outline, text };
  }

  function applyThemeBasics(theme) {
    const usesArtworkOwnedHeader = theme && theme.name === "Spring Hill Hawks";
    if (__appRuntimeContext.DOM.boothHeader) {
      __appRuntimeContext.DOM.boothHeader.classList.toggle("theme-header-hidden", usesArtworkOwnedHeader);
    }
    document.documentElement.style.setProperty(
      "--accent",
      theme.accent || "orange"
    );
    document.documentElement.style.setProperty(
      "--accent2",
      theme.accent2 || "white"
    );
    const palette = buildActionPalette(theme);
    document.documentElement.style.setProperty(
      "--action-grad-start",
      palette.start
    );
    document.documentElement.style.setProperty("--action-grad-mid", palette.mid);
    document.documentElement.style.setProperty("--action-grad-end", palette.end);
    document.documentElement.style.setProperty("--action-border", palette.border);
    document.documentElement.style.setProperty(
      "--action-outline",
      palette.outline
    );
    document.documentElement.style.setProperty("--action-text", palette.text);
    applyThemeFontStyles(theme);
    applyThemeShareScreen(theme);
    __appRuntimeContext.applyBannerSize(theme);
    __appRuntimeContext.applyWelcomeTitleSize(theme);
    applyThemeBackground(theme);
  }

  function applyThemeShareScreen(theme) {
    const screens = Array.isArray(theme && theme.shareScreens) ? theme.shareScreens : [];
    const thankYouScreens = Array.isArray(theme && theme.thankYouScreens)
      ? theme.thankYouScreens
      : [];
    const eventThankYouScreens = __appRuntimeContext.getActiveEventOverrides().thankYouScreens;
    const orientation = __appRuntimeContext.getGuestScreenOrientation();
    const selectedThankYou =
      eventThankYouScreens.find(
        (entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) === orientation
      ) ||
      eventThankYouScreens[0] ||
      thankYouScreens.find(
        (entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) === orientation
      ) ||
      thankYouScreens[0] ||
      null;
    const selected =
      screens.find((entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) === orientation) ||
      screens[0] ||
      selectedThankYou;
    const selectedBackground = __appRuntimeContext.getActiveBackground(theme);
    const fallbackBackground = !__appRuntimeContext.isVideoAsset(selectedBackground)
      ? selectedBackground
      : __appRuntimeContext.getEffectiveBackgroundList(theme).find((entry) => {
          if (__appRuntimeContext.isVideoAsset(entry)) return false;
          const source = __appRuntimeContext.getAssetEntrySrc(entry).toLowerCase();
          return source.includes(`-${orientation}.`) || source.includes(`-${orientation}-`);
        }) || __appRuntimeContext.getEffectiveBackgroundList(theme).find((entry) => !__appRuntimeContext.isVideoAsset(entry));
    const src = __appRuntimeContext.getAssetEntrySrc(selected) || __appRuntimeContext.getAssetEntrySrc(fallbackBackground);
    const goodbyeSrc =
      __appRuntimeContext.getAssetEntrySrc(selectedThankYou) ||
      src ||
      __appRuntimeContext.getActiveBackground(theme);
    if (!__appRuntimeContext.DOM.boothScreen) return;
    if (src) {
      __appRuntimeContext.DOM.boothScreen.style.setProperty("--theme-share-screen-image", `url("${src}")`);
      __appRuntimeContext.DOM.boothScreen.classList.add("has-theme-share-screen");
    } else {
      __appRuntimeContext.DOM.boothScreen.style.removeProperty("--theme-share-screen-image");
      __appRuntimeContext.DOM.boothScreen.classList.remove("has-theme-share-screen");
    }
    if (goodbyeSrc) {
      __appRuntimeContext.DOM.boothScreen.style.setProperty(
        "--theme-goodbye-screen-image",
        `url("${goodbyeSrc}")`
      );
      __appRuntimeContext.DOM.boothScreen.classList.add("has-theme-goodbye-screen");
    } else {
      __appRuntimeContext.DOM.boothScreen.style.removeProperty("--theme-goodbye-screen-image");
      __appRuntimeContext.DOM.boothScreen.classList.remove("has-theme-goodbye-screen");
    }
  }

  function refreshFontSelectForTheme(theme) {
    __appRuntimeContext.setupFontPicker().then(__appRuntimeContext.syncSessionFontSearch).catch(() => {});
  }

  function syncAdminUiWithTheme(themeKey, theme) {
    const currentKey =
      themeKey || __appRuntimeContext.getSelectedThemeKey();
    const active = __appRuntimeContext.getActiveEvent();
    const storedName = active ? active.name : __appRuntimeContext.getStoredEventName(currentKey);
    const storedDate = active ? active.date : __appRuntimeContext.getStoredEventDate(currentKey);
    const sessionDate = __appRuntimeContext.getDateSessionSlug();
    const sessionName = __appRuntimeContext.getSessionUploadName();
    __appRuntimeContext.syncBannerText();
    if (__appRuntimeContext.DOM.logo) {
      const logoSrc = __appRuntimeContext.resolveEventLogo(theme);
      if (logoSrc) {
        __appRuntimeContext.DOM.logo.src = logoSrc;
        __appRuntimeContext.DOM.logo.classList.remove("hidden");
      } else {
        __appRuntimeContext.DOM.logo.src = "";
        __appRuntimeContext.DOM.logo.classList.add("hidden");
      }
    }
    __appRuntimeContext.selectedOverlay = null;
    __appRuntimeContext.lastPhotoOverlay = null;
    if (__appRuntimeContext.DOM.liveOverlay) __appRuntimeContext.DOM.liveOverlay.src = "";
    refreshFontSelectForTheme(theme);
    if (__appRuntimeContext.DOM.options) __appRuntimeContext.renderOptions();
    syncThemeEditorWithActiveTheme();
    if (__appRuntimeContext.DOM.eventNameInput) __appRuntimeContext.DOM.eventNameInput.value = storedName || "";
    if (__appRuntimeContext.DOM.eventDateInput) __appRuntimeContext.DOM.eventDateInput.value = storedDate || sessionDate || "";
    if (__appRuntimeContext.DOM.eventGeneralDateInput) __appRuntimeContext.DOM.eventGeneralDateInput.value = storedDate || sessionDate || "";
    __appRuntimeContext.syncGuestScreenOrientationControl();
    __appRuntimeContext.syncEventSetupEditor(theme);
    __appRuntimeContext.renderThemeSoundEditor(currentKey, theme);
    updateStylePreview();
  }

  function loadTheme(themeKey) {
    themeKey = normalizeThemeSelectionKey(themeKey);
    console.log("Loading theme:", themeKey);
    if (!themeKey) {
      console.warn("No theme key provided to loadTheme");
      return;
    }
    if (!isSelectableThemeKey(themeKey)) {
      const fallbackKey = resolvePreferredThemeKey(__appRuntimeContext.DEFAULT_THEME_KEY);
      if (!fallbackKey || fallbackKey === themeKey) {
        console.warn("Theme is incomplete and cannot be loaded:", themeKey);
        return;
      }
      console.warn("Theme is incomplete; loading fallback instead:", themeKey, fallbackKey);
      themeKey = fallbackKey;
    }
    const theme = resolveThemeByKey(themeKey);
    if (!theme) {
      console.warn("Theme not found for key:", themeKey);
      return;
    }
    if (themeKey === "general:summer") __appRuntimeContext.resetActiveSessionAssets();
    setEventSelection(themeKey);
    if (__appRuntimeContext.activeSessionThemeKey && __appRuntimeContext.activeSessionThemeKey !== themeKey) {
      __appRuntimeContext.resetActiveSessionAssets();
    }
    __appRuntimeContext.activeSessionThemeKey = themeKey;
    __appRuntimeContext.activeTheme = theme;
    const globalLogo = __appRuntimeContext.getGlobalLogo();
    if (globalLogo !== null) __appRuntimeContext.applyGlobalLogoToTheme(__appRuntimeContext.activeTheme, globalLogo);

    applyThemeBasics(theme);
    __appRuntimeContext.preloadThemeOrientationAssets(theme);
    __appRuntimeContext.cacheActiveThemeOrientation(theme);
    __appRuntimeContext.logEffectiveAssetState(theme, "loadTheme");
    syncAdminUiWithTheme(themeKey, theme);
    __appRuntimeContext.renderAssetLibrary();
    __appRuntimeContext.updateLaunchSummary();
    __appRuntimeContext.syncSessionThemeSearch();
    __appRuntimeContext.syncSessionFontSearch();
    __appRuntimeContext.deferNonCriticalTask(() => __appRuntimeContext.loadAssetLibraryRemote().catch(() => __appRuntimeContext.renderAssetLibrary()));
  }

  function colorToHex(colorStr) {
    try {
      const el = document.createElement("span");
      el.style.color = colorStr;
      document.body.appendChild(el);
      const rgb = getComputedStyle(el).color; // e.g., 'rgb(255, 165, 0)'
      document.body.removeChild(el);
      const m = rgb.match(/rgba?\((\d+), ?(\d+), ?(\d+)/);
      if (!m) return "";
      const r = parseInt(m[1]).toString(16).padStart(2, "0");
      const g = parseInt(m[2]).toString(16).padStart(2, "0");
      const b = parseInt(m[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    } catch (_e) {
      return "";
    }
  }

  function updateThemeEditorSummary() {
    updateStylePreview();
  }

  function syncThemeEditorWithActiveTheme() {
    if (!__appRuntimeContext.activeTheme) return;
    applyThemeEditorBasics(__appRuntimeContext.activeTheme);
    applyThemeEditorColors(__appRuntimeContext.activeTheme);
    renderCurrentAssets(__appRuntimeContext.activeTheme);
    __appRuntimeContext.updateCurrentEventAssetsPanel(__appRuntimeContext.activeTheme);
    __appRuntimeContext.syncBannerSizeUI(__appRuntimeContext.activeTheme);
    __appRuntimeContext.syncWelcomeTitleSizeUI(__appRuntimeContext.activeTheme);
    updateThemeEditorSummary();
  }

  function updateStylePreview() {
    __appRuntimeContext.syncBannerText();
    __appRuntimeContext.syncWelcomeText();
    __appRuntimeContext.syncCaptureButtonText();
    if (__appRuntimeContext.DOM.eventGalleryLink) {
      __appRuntimeContext.DOM.eventGalleryLink.textContent = __appRuntimeContext.getEventGalleryStatusText();
    }
  }

  function applyThemeEditorBasics(theme) {
    __appRuntimeContext.THEME_EDITOR.name.value = theme.name || "";
    __appRuntimeContext.setupFontPicker().then(__appRuntimeContext.syncSessionFontSearch).catch(() => {});
    __appRuntimeContext.THEME_EDITOR.welcomeTitle.value =
      (theme.welcome && theme.welcome.title) || "";
    __appRuntimeContext.THEME_EDITOR.welcomePrompt.value =
      (theme.welcome && theme.welcome.prompt) || "";
  }

  function applyThemeEditorColors(theme) {
    const primary =
      theme.accent && theme.accent.startsWith("#")
        ? theme.accent
        : colorToHex(theme.accent || "");
    const secondary =
      theme.accent2 && theme.accent2.startsWith("#")
        ? theme.accent2
        : colorToHex(theme.accent2 || "");
    if (primary) __appRuntimeContext.THEME_EDITOR.accent.value = primary;
    if (secondary) __appRuntimeContext.THEME_EDITOR.accent2.value = secondary;
  }

  function setThemeAccentValue(theme, key, color) {
    if (!theme || (key !== "accent" && key !== "accent2")) return;
    theme[key] = color;
    applyThemeBasics(theme);
    applyThemeEditorColors(theme);
    __appRuntimeContext.saveThemesToStorage();
    renderCurrentAssets(theme);
    updateStylePreview();
    if (__appRuntimeContext.DOM.options) __appRuntimeContext.renderOptions();
  }

  function removeGreen(ctx, width, height) {
    const frame = ctx.getImageData(0, 0, width, height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (g > 110 && g > r * 1.3 && g > b * 1.3) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(frame, 0, 0);
  }

  async function ensureAiSegmentation() {
    if (__appRuntimeContext.aiSegmentation) return __appRuntimeContext.aiSegmentation;
    if (__appRuntimeContext.aiSegmentationPromise) return __appRuntimeContext.aiSegmentationPromise;
    if (typeof window === "undefined") return null;
    try {
      await __appRuntimeContext.loadSelfieSegmentationLibrary();
    } catch (_) {
      return null;
    }
    __appRuntimeContext.aiSegmentationPromise = new Promise((resolve) => {
      const segmenter = new window.SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      segmenter.setOptions({ modelSelection: 0 });
      segmenter.onResults((results) => {
        if (typeof __appRuntimeContext.aiSegmentationResolver === "function") {
          __appRuntimeContext.aiSegmentationResolver(results);
        }
        __appRuntimeContext.aiSegmentationResolver = null;
      });
      __appRuntimeContext.aiSegmentation = segmenter;
      resolve(segmenter);
    });
    return __appRuntimeContext.aiSegmentationPromise;
  }

  async function getAiSegmentationMask(sourceCanvas) {
    const segmenter = await ensureAiSegmentation();
    if (!segmenter) return null;
    return new Promise((resolve) => {
      __appRuntimeContext.aiSegmentationResolver = (results) => {
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = sourceCanvas.width;
        maskCanvas.height = sourceCanvas.height;
        const maskCtx = maskCanvas.getContext("2d");
        if (maskCtx && results && results.segmentationMask) {
          maskCtx.imageSmoothingEnabled = true;
          maskCtx.imageSmoothingQuality = "high";
          maskCtx.drawImage(
            results.segmentationMask,
            0,
            0,
            maskCanvas.width,
            maskCanvas.height
          );
          resolve(refineAiSegmentationMask(maskCanvas));
        } else {
          resolve(null);
        }
      };
      segmenter.send({ image: sourceCanvas }).catch(() => resolve(null));
    });
  }

  function refineAiSegmentationMask(maskCanvas) {
    if (!maskCanvas) return null;
    const width = maskCanvas.width;
    const height = maskCanvas.height;
    const sourceCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceCtx || !width || !height) return maskCanvas;
    const source = sourceCtx.getImageData(0, 0, width, height);
    const pixels = source.data;
    let hasTransparentPixels = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 250) {
        hasTransparentPixels = true;
        break;
      }
    }
    for (let index = 0; index < pixels.length; index += 4) {
      const luma = Math.round(
        pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
      );
      pixels[index] = 255;
      pixels[index + 1] = 255;
      pixels[index + 2] = 255;
      pixels[index + 3] = hasTransparentPixels ? pixels[index + 3] : luma;
    }
    sourceCtx.putImageData(source, 0, 0);
    const feathered = document.createElement("canvas");
    feathered.width = width;
    feathered.height = height;
    const featheredCtx = feathered.getContext("2d");
    if (!featheredCtx) return maskCanvas;
    featheredCtx.filter = "blur(2px)";
    featheredCtx.drawImage(maskCanvas, 0, 0);
    featheredCtx.filter = "none";
    return feathered;
  }

  function applyAiMaskToCanvas(sourceCanvas, maskCanvas) {
    if (!maskCanvas) return sourceCanvas;
    const c = document.createElement("canvas");
    c.width = sourceCanvas.width;
    c.height = sourceCanvas.height;
    const ctx = c.getContext("2d");
    if (!ctx) return sourceCanvas;
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";
    return c;
  }

  function renderCurrentAssets(theme) {
    // Helpers
    const advancedAssetsPanel = __appRuntimeContext.DOM.currentAssets
      ? __appRuntimeContext.DOM.currentAssets.closest("details")
      : null;
    const advancedAssetsOpen = !advancedAssetsPanel || advancedAssetsPanel.open;
    const active = __appRuntimeContext.getActiveEvent();
    const lockBaseThemeAssets = !!active;
    const removedBackgrounds = new Set(
      Array.isArray(theme && theme.backgroundsRemoved)
        ? theme.backgroundsRemoved
        : []
    );
    const baseBgList = __appRuntimeContext.getBaseBackgroundList(theme);
    const bgList = __appRuntimeContext.getBackgroundList(theme);
    const baseGreenList = Array.isArray(theme && theme.greenBackgrounds)
      ? theme.greenBackgrounds.filter(Boolean)
      : [];
    const greenBgList = __appRuntimeContext.getGreenBackgroundList(theme);
    const eventOverrides = __appRuntimeContext.getActiveEventOverrides();
    const hasSessionBackgrounds =
      Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds) &&
      __appRuntimeContext.activeSessionAssets.backgrounds.length > 0;
    const hasSessionGreenBackgrounds =
      Array.isArray(__appRuntimeContext.activeSessionAssets.greenBackgrounds) &&
      __appRuntimeContext.activeSessionAssets.greenBackgrounds.length > 0;
    const hasEventBackgrounds =
      Array.isArray(eventOverrides.backgrounds) &&
      eventOverrides.backgrounds.length > 0;
    const hasEventGreenBackgrounds =
      Array.isArray(eventOverrides.greenBackgrounds) &&
      eventOverrides.greenBackgrounds.length > 0;
    const selectedBg = bgList.length
      ? bgList.indexOf(__appRuntimeContext.getActiveBackground(theme))
      : -1;
    const selectedGreenBg = greenBgList.length
      ? greenBgList.indexOf(__appRuntimeContext.getActiveGreenBackground(theme))
      : -1;
    const setSingle = (wrap, src, type, isEventOwned = false) => {
      if (!wrap) return;
      wrap.innerHTML = "";
      if (src) {
        const item = __appRuntimeContext.createAssetTile(src);
        wrap.appendChild(item);
      } else {
        const span = document.createElement("span");
        span.style.color = "#888";
        span.textContent = "None";
        wrap.appendChild(span);
      }
    };
    const getLocalIndex = (kind, src) => {
      if (!src) return -1;
      if (kind === "overlay") {
        if (!Array.isArray(theme.overlays)) return -1;
        return theme.overlays.findIndex(
          (item) => (typeof item === "string" ? item : item.src) === src
        );
      }
      if (kind === "template") {
        if (!Array.isArray(theme.templates)) return -1;
        return theme.templates.findIndex((item) => item && item.src === src);
      }
      return -1;
    };
    const setGrid = (
      wrap,
      list,
      withBadge = false,
      kind = "",
      allowReorder = true,
      selectedValue = "",
      options = {}
    ) => {
      if (!wrap) return;
      if (
        ["background", "overlay", "template"].includes(kind) &&
        !__appRuntimeContext.getAssetPanelControls(kind).panel?.classList.contains("open")
      ) {
        wrap.replaceChildren();
        return;
      }
      if (kind === "background" || kind === "overlay" || kind === "template") {
        __appRuntimeContext.setAssetPanelMessage(kind, null);
      }
      const selectedSources = options.showSelected
        ? __appRuntimeContext.createAssetSelectionSet(selectedValue)
        : new Set();
      const assignedTray = options.assignedTray === true;
      wrap.innerHTML = "";
      let shown = 0;
      let hasSelected = false;
      (list || []).forEach((entry, idx) => {
        const src = __appRuntimeContext.getAssetEntrySrc(entry);
        if (!src) return;
        const fromFolder = typeof entry === "object" && !!entry.__folder;
        const isEvent = typeof entry === "object" && !!entry.__event;
        const isSession =
          assignedTray ||
          (typeof entry === "object" && !!entry.__session) ||
          (kind === "background" &&
            Array.isArray(__appRuntimeContext.activeSessionAssets.backgrounds) &&
            __appRuntimeContext.activeSessionAssets.backgrounds.includes(src));
        const isLibrary = typeof entry === "object" && !!entry.__library;
        const localIndex = getLocalIndex(kind, src);
        const badge =
          withBadge && typeof entry === "object" && entry.layout
            ? entry.layout
            : null;
        const item = __appRuntimeContext.createAssetTile(src, { badge });
        if (selectedSources.has(src)) {
          item.classList.add("selected");
          item.setAttribute("aria-selected", "true");
          hasSelected = true;
        } else {
          item.setAttribute("aria-selected", "false");
        }
        if (!assignedTray && (kind === "background" || kind === "overlay")) {
          item.addEventListener("click", () => {
            if (kind === "background") {
              __appRuntimeContext.selectSessionBackground(src);
            } else if (kind === "overlay") {
              __appRuntimeContext.selectSessionOverlay(entry);
            }
          });
        }
        item.draggable =
          !assignedTray &&
          allowReorder &&
          !lockBaseThemeAssets &&
          !fromFolder &&
          !isEvent &&
          !isSession &&
          !isLibrary &&
          localIndex >= 0;
        item.dataset.index = localIndex;
        // Drag & drop reordering
        if (
          allowReorder &&
          !lockBaseThemeAssets &&
          !fromFolder &&
          !isEvent &&
          !isSession &&
          !isLibrary &&
          localIndex >= 0
        ) {
          item.addEventListener("dragstart", (ev) => {
            ev.dataTransfer.setData("text/plain", String(localIndex));
            ev.dataTransfer.effectAllowed = "move";
          });
          item.addEventListener("dragover", (ev) => {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = "move";
          });
          item.addEventListener("drop", (ev) => {
            ev.preventDefault();
            const from = parseInt(ev.dataTransfer.getData("text/plain"), 10);
            const to = parseInt(item.dataset.index, 10);
            if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) {
              __appRuntimeContext.reorderAssets(kind, from, to);
            }
          });
        }
        wrap.appendChild(item);
        shown++;
      });
      wrap.classList.toggle("has-selection", hasSelected);
      if ((list || []).length === 0 || shown === 0) {
        const span = document.createElement("span");
        span.className = "asset-panel-state";
        span.textContent =
          wrap.dataset.emptyText || "No items available.";
        wrap.appendChild(span);
      }
    };
    // Green screen backgrounds grid
    if (__appRuntimeContext.DOM.currentGreenBackgrounds && advancedAssetsOpen) {
      const wrap = __appRuntimeContext.DOM.currentGreenBackgrounds;
      wrap.innerHTML = "";
      if (greenBgList.length === 0) {
        const span = document.createElement("span");
        span.style.color = "#888";
        span.textContent = "None";
        wrap.appendChild(span);
      } else {
        greenBgList.forEach((src, idx) => {
          const item = document.createElement("div");
          item.className = "asset-item";
          const media = __appRuntimeContext.createAssetPreviewMedia(src);
          media.onerror = () => __appRuntimeContext.renderMissingThumbnail(item, src);
          item.appendChild(media);
          wrap.appendChild(item);
        });
      }
    }
    setSingle(__appRuntimeContext.DOM.currentLogo, __appRuntimeContext.resolveEventLogo(theme), "logo");
    // Accent colors
    if (__appRuntimeContext.DOM.currentAccents) {
      __appRuntimeContext.DOM.currentAccents.innerHTML = "";
      const cssAccent = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      const cssAccent2 = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent2")
        .trim();
      const addColor = (label, key, color) => {
        const item = document.createElement("div");
        item.className = "color-item";
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "color-swatch";
        sw.style.background = color || "transparent";
        const hex =
          color && color.startsWith("#")
            ? color
            : colorToHex(color || "") || color || "none";
        const text = document.createElement("span");
        text.textContent = `${label}: ${hex}`;
        const picker = document.createElement("input");
        picker.type = "color";
        picker.className = "visually-hidden";
        picker.value = hex && hex.startsWith("#") ? hex : "#ffffff";
        sw.title = "Click to pick a color";
        sw.addEventListener("click", () => picker.click());
        picker.addEventListener("input", () =>
          setThemeAccentValue(theme, key, picker.value)
        );
        item.appendChild(sw);
        item.appendChild(text);
        item.appendChild(picker);

        const palette = document.createElement("div");
        palette.className = "color-palette";
        __appRuntimeContext.ACCENT_PRESET_COLORS.forEach((preset) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "color-swatch preset";
          btn.style.background = preset;
          btn.title = preset;
          btn.addEventListener("click", () =>
            setThemeAccentValue(theme, key, preset)
          );
          palette.appendChild(btn);
        });
        const wrapper = document.createElement("div");
        wrapper.appendChild(item);
        wrapper.appendChild(palette);
        __appRuntimeContext.DOM.currentAccents.appendChild(wrapper);
      };
      addColor("Accent", "accent", theme.accent || cssAccent || "#ff7a18");
      addColor("Accent 2", "accent2", theme.accent2 || cssAccent2 || "#ffffff");
    }
  }

  function goAdmin() {
    __appRuntimeContext.hideFinal();
    __appRuntimeContext.applyEditModeState(false);
    if (__appRuntimeContext.DOM.boothScreen)
      __appRuntimeContext.DOM.boothScreen.classList.remove("share-mode", "countdown-mode");
    if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.classList.add("faded");
    __appRuntimeContext.DOM.boothScreen.classList.add("hidden");
    __appRuntimeContext.DOM.adminScreen.classList.remove("hidden");
    document.body.classList.add("admin-open");
    document.documentElement.classList.add("admin-open");
    __appRuntimeContext.setBoothControlsVisible(true);
  }

  function clearLoopingVideo(video) {
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.dataset.src = "";
    video.classList.add("hidden");
    video.load();
  }

  function setLoopingVideoSource(video, src) {
    if (!video || !src) return false;
    if (video.dataset.src !== src) {
      video.crossOrigin = "anonymous";
      video.src = src;
      video.dataset.src = src;
      video.load();
    }
    video.classList.remove("hidden");
    video.play().catch(() => {});
    return true;
  }

  function applyThemeBackground(theme) {
    if (!theme) return;
    let bg = __appRuntimeContext.getActiveBackground(theme) || "";
    if (!bg || bg.endsWith("/")) {
      const list = __appRuntimeContext.getBackgroundList(theme);
      if (list && list.length) bg = list[0];
    }
    if (bg && !bg.endsWith("/") && __appRuntimeContext.isVideoAsset(bg)) {
      __appRuntimeContext.DOM.boothScreen.style.backgroundImage = "";
      setLoopingVideoSource(__appRuntimeContext.DOM.boothBackgroundVideo, bg);
    } else if (bg && !bg.endsWith("/")) {
      clearLoopingVideo(__appRuntimeContext.DOM.boothBackgroundVideo);
      __appRuntimeContext.DOM.boothScreen.style.backgroundImage = `url(${bg})`;
    } else {
      clearLoopingVideo(__appRuntimeContext.DOM.boothBackgroundVideo);
      __appRuntimeContext.DOM.boothScreen.style.backgroundImage = "";
    }
    if (__appRuntimeContext.DOM.welcomeScreen)
      __appRuntimeContext.DOM.welcomeScreen.style.backgroundImage =
        __appRuntimeContext.DOM.boothScreen.style.backgroundImage;
  }

  function getActivePhotoOverlay() {
    if (!__appRuntimeContext.selectedOverlay && !__appRuntimeContext.lastPhotoOverlay) return null;
    const src = __appRuntimeContext.selectedOverlay || __appRuntimeContext.lastPhotoOverlay;
    const overlays = __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme);
    return (
      overlays.find((item) => item && item.src === src) ||
      __appRuntimeContext.normalizeOverlayDefinition({ src })
    );
  }

  function clearPhotoSlotLayer() {
    if (__appRuntimeContext.DOM.photoSlotLayer) {
      __appRuntimeContext.DOM.photoSlotLayer.innerHTML = "";
      __appRuntimeContext.DOM.photoSlotLayer.dataset.overlaySrc = "";
      __appRuntimeContext.DOM.photoSlotLayer.dataset.mode = "";
    }
  }

  function resolveStillPhotoUrl(source) {
    if (!source) return "";
    if (typeof source === "string") return source;
    if (typeof source.toDataURL === "function") {
      try {
        return source.toDataURL("image/png");
      } catch (_) {
        return "";
      }
    }
    return "";
  }

  function applyOverlayBackgroundLayer(overlay) {
    if (!__appRuntimeContext.DOM.overlayBackground) return;
    const photoBackground =
      __appRuntimeContext.activeTheme && (__appRuntimeContext.getAiBackgroundEnabled() || __appRuntimeContext.getGreenScreenEnabled())
        ? __appRuntimeContext.getActiveGreenBackground(__appRuntimeContext.activeTheme)
        : "";
    const background =
      (overlay && overlay.background) ||
      (photoBackground
        ? {
            type: __appRuntimeContext.isVideoAsset(photoBackground) ? "video" : "image",
            src: photoBackground,
          }
        : null);
    __appRuntimeContext.DOM.overlayBackground.style.backgroundImage = "";
    __appRuntimeContext.DOM.overlayBackground.style.backgroundColor = "";
    clearLoopingVideo(__appRuntimeContext.DOM.photoBackgroundVideo);
    if (!background) return;
    if (background.type === "color") {
      __appRuntimeContext.DOM.overlayBackground.style.backgroundColor = background.value || "#ffffff";
    } else if (
      (background.type === "video" || __appRuntimeContext.isVideoAsset(background.src)) &&
      background.src
    ) {
      setLoopingVideoSource(__appRuntimeContext.DOM.photoBackgroundVideo, background.src);
    } else if (background.type === "image" && background.src) {
      __appRuntimeContext.DOM.overlayBackground.style.backgroundImage = `url(${__appRuntimeContext.withBust(
        background.src
      )})`;
    }
  }

  function applyOverlayForegroundLayer(overlay) {
    if (!__appRuntimeContext.DOM.liveOverlay) return;
    const foregroundSrc =
      overlay && overlay.foreground && overlay.foreground.type === "image"
        ? __appRuntimeContext.getAssetEntrySrc(overlay.foreground.src)
        : "";
    const src = overlay
      ? foregroundSrc ||
        __appRuntimeContext.getAssetEntrySrc(overlay.renderSrc) ||
        __appRuntimeContext.resolveOverlayRenderSrc(__appRuntimeContext.activeTheme, overlay.src)
      : "";
    if (!src) {
      if (__appRuntimeContext.DOM.liveOverlay.src) __appRuntimeContext.DOM.liveOverlay.src = "";
      __appRuntimeContext.DOM.liveOverlay.style.display = "none";
      return;
    }
    const busted = __appRuntimeContext.withBust(src);
    if (__appRuntimeContext.DOM.liveOverlay.src !== busted) {
      __appRuntimeContext.DOM.liveOverlay.src = busted;
    }
    __appRuntimeContext.DOM.liveOverlay.style.display = "block";
  }

  function renderOverlayPhotoSlots(overlay, options = {}) {
    const layer = __appRuntimeContext.DOM.photoSlotLayer;
    if (!layer) return;
    const slots = __appRuntimeContext.overlayUsesPhotoSlots(overlay) ? overlay.photoSlots : [];
    layer.innerHTML = "";
    layer.dataset.overlaySrc = overlay && overlay.src ? overlay.src : "";
    layer.dataset.mode = options.mode || "live";
    if (!slots.length) return;
    const isLive = options.mode === "live";
    const stillUrl = resolveStillPhotoUrl(options.source);
    slots.forEach((slot) => {
      const slotEl = document.createElement("div");
      slotEl.className = "photo-slot";
      slotEl.style.left = `${slot.x * 100}%`;
      slotEl.style.top = `${slot.y * 100}%`;
      slotEl.style.width = `${slot.width * 100}%`;
      slotEl.style.height = `${slot.height * 100}%`;
      if (slot.borderRadius > 0) {
        slotEl.style.borderRadius = `${slot.borderRadius * 100}%`;
      }
      if (Number.isFinite(slot.rotation) && slot.rotation !== 0) {
        slotEl.style.transform = `rotate(${slot.rotation}deg)`;
      }
      const media = document.createElement(isLive ? "video" : "img");
      media.className = "photo-slot-media";
      media.classList.toggle("is-live", isLive);
      media.style.objectFit = slot.objectFit || "cover";
      media.style.objectPosition = slot.objectPosition || "center";
      const processedPreviewStream = isLive ? __appRuntimeContext.getLivePreviewStream() : null;
      if (isLive && !processedPreviewStream) {
        media.style.setProperty("transform", "scaleX(-1)", "important");
        media.style.setProperty("-webkit-transform", "scaleX(-1)", "important");
      }
      if (isLive) {
        media.autoplay = true;
        media.playsInline = true;
        media.muted = true;
        const previewStream = processedPreviewStream || __appRuntimeContext.stream;
        if (previewStream) {
          try {
            media.srcObject = previewStream;
          } catch (_) {}
          if (typeof media.play === "function") {
            media.play().catch(() => {});
          }
        }
      } else if (stillUrl) {
        media.alt = "";
        media.src = stillUrl;
      } else {
        slotEl.classList.add("is-empty");
      }
      slotEl.appendChild(media);
      layer.appendChild(slotEl);
    });
  }

  function syncOverlayPreviewSurface(options = {}) {
    if (
      __appRuntimeContext.capturePreviewFrozen &&
      options.mode === "live" &&
      !options.allowLiveDuringFreeze
    ) {
      return;
    }
    const overlay = options.overlay || getActivePhotoOverlay();
    const slotsEnabled = __appRuntimeContext.overlayUsesPhotoSlots(overlay);
    if (!slotsEnabled && overlay) {
      __appRuntimeContext.resolveOverlayReservedPhotoMarker(overlay).then((resolvedOverlay) => {
        if (!resolvedOverlay || resolvedOverlay === overlay) return;
        const activeOverlay = getActivePhotoOverlay();
        if (
          activeOverlay &&
          overlay &&
          __appRuntimeContext.getAssetEntrySrc(activeOverlay) === __appRuntimeContext.getAssetEntrySrc(overlay)
        ) {
          syncOverlayPreviewSurface({ ...options, overlay: resolvedOverlay });
        }
      });
    }
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.classList.toggle("hidden", slotsEnabled);
      __appRuntimeContext.DOM.video.style.display = "none";
    }
    if (__appRuntimeContext.DOM.livePreviewCanvas) {
      __appRuntimeContext.DOM.livePreviewCanvas.classList.toggle("hidden", slotsEnabled);
      __appRuntimeContext.DOM.livePreviewCanvas.style.display = slotsEnabled ? "none" : "block";
    }
    if (__appRuntimeContext.DOM.lastShot && !options.keepLastShot) {
      __appRuntimeContext.DOM.lastShot.style.display = "none";
      __appRuntimeContext.DOM.lastShot.removeAttribute("src");
    }
    applyOverlayBackgroundLayer(overlay);
    applyOverlayForegroundLayer(overlay);
    if (slotsEnabled) {
      renderOverlayPhotoSlots(overlay, {
        mode: options.mode || "live",
        source: options.source || null,
      });
    } else {
      clearPhotoSlotLayer();
    }
  }

  function clearOverlayPreviewSurface() {
    clearPhotoSlotLayer();
    if (__appRuntimeContext.DOM.overlayBackground) {
      __appRuntimeContext.DOM.overlayBackground.style.backgroundImage = "";
      __appRuntimeContext.DOM.overlayBackground.style.backgroundColor = "";
    }
    clearLoopingVideo(__appRuntimeContext.DOM.photoBackgroundVideo);
    if (__appRuntimeContext.DOM.liveOverlay) {
      __appRuntimeContext.DOM.liveOverlay.src = "";
      __appRuntimeContext.DOM.liveOverlay.style.display = "none";
    }
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.classList.remove("hidden");
      __appRuntimeContext.DOM.video.style.display = "none";
    }
    if (__appRuntimeContext.DOM.livePreviewCanvas) {
      __appRuntimeContext.DOM.livePreviewCanvas.classList.remove("hidden");
      __appRuntimeContext.DOM.livePreviewCanvas.style.display = "block";
    }
  }

  function setMode(m) {
    if (m === "message" && !__appRuntimeContext.getRecordingModeEnabled()) {
      m = "live-photo";
    }
    __appRuntimeContext.mode = __appRuntimeContext.normalizeBoothModeValue(m);
    const captureMode = __appRuntimeContext.getSelectedCaptureMode(__appRuntimeContext.mode);
    __appRuntimeContext.applyBoothModeClass(__appRuntimeContext.mode);
    if (__appRuntimeContext.DOM.captureBtn) {
      __appRuntimeContext.DOM.captureBtn.textContent = __appRuntimeContext.resolveBoothCaptureButtonLabel(__appRuntimeContext.mode);
      __appRuntimeContext.DOM.captureBtn.classList.toggle("message-mode", __appRuntimeContext.mode === "message");
      __appRuntimeContext.DOM.captureBtn.disabled = false;
    }
    // In strip/layout/message mode, ensure no photo overlay is shown over the template preview.
    if (captureMode === "strip" || captureMode === "layout" || __appRuntimeContext.mode === "message") {
      if (__appRuntimeContext.selectedOverlay) __appRuntimeContext.lastPhotoOverlay = __appRuntimeContext.selectedOverlay;
      __appRuntimeContext.selectedOverlay = null;
      clearOverlayPreviewSurface();
    }
    if (captureMode === "photo") {
      syncPhotoOverlayOrientationWithAssets();
      if (
        !__appRuntimeContext.selectedOverlay &&
        __appRuntimeContext.lastPhotoOverlay &&
        photoOverlayMatchesOrientation(__appRuntimeContext.lastPhotoOverlay, __appRuntimeContext.photoOverlayOrientation)
      ) {
        __appRuntimeContext.selectedOverlay = __appRuntimeContext.lastPhotoOverlay;
      }
      syncOverlayPreviewSurface({ mode: "live" });
    }
    __appRuntimeContext.applyPreviewOrientation();
    __appRuntimeContext.logBoothFrameState("mode-change", __appRuntimeContext.mode);
    __appRuntimeContext.renderOptionsForMode(__appRuntimeContext.mode);
    __appRuntimeContext.syncBoothModeButtons();
    __appRuntimeContext.syncCaptureStatusIndicators();
    __appRuntimeContext.setMobileSettingsOpen(false);
    syncOverlayPickerUi();
    requestAnimationFrame(__appRuntimeContext.syncFrameSizeVars);
  }

  function getPhotoOverlayBySrc(src) {
    if (!src) return null;
    return __appRuntimeContext.filterAssetsForMode(__appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme), "photo").find(
      (overlay) => overlay && overlay.src === src
    );
  }

  function photoOverlayMatchesOrientation(src, orientation = __appRuntimeContext.photoOverlayOrientation) {
    const overlay = getPhotoOverlayBySrc(src);
    if (!overlay) return false;
    const resolved = __appRuntimeContext.getPhotoOverlayOrientation(overlay);
    return !resolved || resolved === orientation;
  }

  function getFirstPhotoOverlayForOrientation(orientation = __appRuntimeContext.photoOverlayOrientation) {
    const overlays = __appRuntimeContext.filterPhotoOverlaysByOrientation(
      __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme),
      orientation
    );
    return overlays[0] || null;
  }

  function syncPhotoOverlayOrientationWithAssets() {
    const current = __appRuntimeContext.normalizePhotoOverlayOrientation(__appRuntimeContext.photoOverlayOrientation) || "portrait";
    __appRuntimeContext.photoOverlayOrientation = current;
    const currentOverlays = __appRuntimeContext.filterPhotoOverlaysByOrientation(
      __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme),
      current
    );
    const opposite = current === "portrait" ? "landscape" : "portrait";
    const oppositeOverlays = __appRuntimeContext.filterPhotoOverlaysByOrientation(
      __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme),
      opposite
    );
    if (!currentOverlays.length && oppositeOverlays.length) {
      __appRuntimeContext.photoOverlayOrientation = opposite;
    }
    if (
      __appRuntimeContext.selectedOverlay &&
      !photoOverlayMatchesOrientation(__appRuntimeContext.selectedOverlay, __appRuntimeContext.photoOverlayOrientation)
    ) {
      __appRuntimeContext.lastPhotoOverlayByOrientation[current] = __appRuntimeContext.selectedOverlay;
      __appRuntimeContext.selectedOverlay = null;
      __appRuntimeContext.lastPhotoOverlay = null;
    }
    const remembered = __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation];
    if (!__appRuntimeContext.selectedOverlay && photoOverlayMatchesOrientation(remembered, __appRuntimeContext.photoOverlayOrientation)) {
      __appRuntimeContext.selectedOverlay = remembered;
      __appRuntimeContext.lastPhotoOverlay = remembered;
    }
  }

  function syncOverlayPickerUi() {
    if (!__appRuntimeContext.DOM.overlayPickerButton) return;
    const show = !!(
      __appRuntimeContext.DOM.boothScreen &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("hidden") &&
      __appRuntimeContext.DOM.boothScreen.classList.contains("booth-ready") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("welcome-active") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("share-mode") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("countdown-mode") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("finalizing-mode") &&
      __appRuntimeContext.getSelectedCaptureMode() === "photo"
    );
    __appRuntimeContext.DOM.overlayPickerButton.classList.toggle("hidden", !show);
  }

  function getSelectedFilterDef() {
    return (
      __appRuntimeContext.FILTER_EFFECTS.find((filterDef) => filterDef.id === __appRuntimeContext.selectedFilter) ||
      __appRuntimeContext.FILTER_EFFECTS[0]
    );
  }

  function getSelectedFilterBeautySettings() {
    const filterDef = getSelectedFilterDef();
    return filterDef || { beauty: {}, lighting: {} };
  }

  function getSelectedFilterCloudinaryTransformation() {
    const filterDef = getSelectedFilterDef();
    return typeof filterDef?.cloudinaryTransformation === "string"
      ? filterDef.cloudinaryTransformation.trim()
      : "";
  }

  function getDeliveredFilterPreviewUrl(localUrl, uploadResult) {
    const deliveredUrl = String(uploadResult?.publicUrl || "").trim();
    return getSelectedFilterCloudinaryTransformation() && /^https?:/i.test(deliveredUrl)
      ? deliveredUrl
      : localUrl;
  }

  function setPhotoOverlayOrientation(nextOrientation) {
    const next = __appRuntimeContext.normalizePhotoOverlayOrientation(nextOrientation);
    if (!next || next === __appRuntimeContext.photoOverlayOrientation) return;
    if (__appRuntimeContext.selectedOverlay) {
      __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation] = __appRuntimeContext.selectedOverlay;
    }
    __appRuntimeContext.photoOverlayOrientation = next;
    __appRuntimeContext.selectedOverlay = null;
    __appRuntimeContext.lastPhotoOverlay = null;
    const remembered = __appRuntimeContext.lastPhotoOverlayByOrientation[next];
    if (photoOverlayMatchesOrientation(remembered, next)) {
      __appRuntimeContext.selectedOverlay = remembered;
      __appRuntimeContext.lastPhotoOverlay = remembered;
    }
    __appRuntimeContext.renderOptionsForMode(__appRuntimeContext.mode);
    syncOverlayPreviewSurface({ mode: "live" });
    __appRuntimeContext.applyPreviewOrientation();
    __appRuntimeContext.logBoothFrameState("overlay-orientation-change", __appRuntimeContext.mode);
    __appRuntimeContext.setMobileSettingsOpen(false);
    syncOverlayPickerUi();
  }

  function applyFilterToVideo() {
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.style.filter = "";
    }
    if (__appRuntimeContext.DOM.lastShot) __appRuntimeContext.DOM.lastShot.style.filter = "";
    document.querySelectorAll(".photo-slot-media").forEach((media) => {
      media.style.filter = "";
    });
  }

  function applyFilterToCanvas(ctx, width, height) {
    const filterDef = getSelectedFilterDef();
    if (!filterDef || !filterDef.css || !ctx) return;
    const imageData = ctx.getImageData(0, 0, width, height);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.filter = filterDef.css;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = "none";
  }

  function applySelectedFilterToCanvas(canvas) {
    if (!canvas) return canvas;
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) applyFilterToCanvas(ctx, canvas.width, canvas.height);
    } catch (error) {
      console.warn("Photo filter failed", error);
    }
    return canvas;
  }

  async function applySelectedBeautyToCanvas(canvas) {
    if (!canvas) return canvas;
    const settings = getSelectedFilterBeautySettings();
    if (!settings || !settings.beauty) return canvas;
    try {
      if (!__appRuntimeContext.beautyEngineModulePromise) {
        __appRuntimeContext.beautyEngineModulePromise = import("./beauty/engine.mjs");
      }
      const { applyBeautyFrame } = await __appRuntimeContext.beautyEngineModulePromise;
      return await applyBeautyFrame({
        canvas,
        video: __appRuntimeContext.DOM.video,
        settings,
      });
    } catch (error) {
      console.warn("Beauty filter failed", error);
      return canvas;
    }
  }

  return {
    populateThemeSelector,
    getSelectedEventType,
    syncEventTypeTiles,
    setSelectedEventType,
    getThemeEventTypePriority,
    themeSupportsEventType,
    isHolidayThemeKey,
    shouldIncludeThemeForSelectedType,
    shouldIncludeCreatePathTheme,
    getEventTypeCopy,
    showToast,
    setVideoImportStatus,
    showMessage,
    set360Status,
    updateCaptureModeUi,
    setCaptureMode,
    playStopAlert,
    run360Countdown,
    start360Sequence,
    isImportableVideoFile,
    onFileReceived,
    process360Video,
    handleImportedVideoFile,
    setupVideoImportControls,
    setup360ModeControls,
    setEventSelection,
    getStartupThemeKey,
    resolvePreferredThemeKey,
    isSelectableThemeKey,
    resolveThemeByKey,
    normalizeThemeSelectionKey,
    resolveThemeStorage,
    applyThemeFontStyles,
    resolveHexColorValue,
    mixRgbValue,
    rgbToHexValue,
    buildActionPalette,
    applyThemeBasics,
    applyThemeShareScreen,
    refreshFontSelectForTheme,
    syncAdminUiWithTheme,
    loadTheme,
    colorToHex,
    updateThemeEditorSummary,
    syncThemeEditorWithActiveTheme,
    updateStylePreview,
    applyThemeEditorBasics,
    applyThemeEditorColors,
    setThemeAccentValue,
    removeGreen,
    ensureAiSegmentation,
    getAiSegmentationMask,
    refineAiSegmentationMask,
    applyAiMaskToCanvas,
    renderCurrentAssets,
    goAdmin,
    clearLoopingVideo,
    setLoopingVideoSource,
    applyThemeBackground,
    getActivePhotoOverlay,
    clearPhotoSlotLayer,
    resolveStillPhotoUrl,
    applyOverlayBackgroundLayer,
    applyOverlayForegroundLayer,
    renderOverlayPhotoSlots,
    syncOverlayPreviewSurface,
    clearOverlayPreviewSurface,
    setMode,
    getPhotoOverlayBySrc,
    photoOverlayMatchesOrientation,
    getFirstPhotoOverlayForOrientation,
    syncPhotoOverlayOrientationWithAssets,
    syncOverlayPickerUi,
    getSelectedFilterDef,
    getSelectedFilterBeautySettings,
    getSelectedFilterCloudinaryTransformation,
    getDeliveredFilterPreviewUrl,
    setPhotoOverlayOrientation,
    applyFilterToVideo,
    applyFilterToCanvas,
    applySelectedFilterToCanvas,
    applySelectedBeautyToCanvas,
  };
}
