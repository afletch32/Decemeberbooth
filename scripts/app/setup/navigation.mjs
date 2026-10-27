export function createNavigationModule(__appRuntimeContext) {
  function setSetupSection(section = "event") {
    __appRuntimeContext.activeSetupSection = section;
    document.querySelectorAll("[data-setup-tab]").forEach((btn) => {
      const isActive = btn.dataset.setupTab === section;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    document.querySelectorAll("[data-setup-section]").forEach((panel) => {
      const show = panel.dataset.setupSection === section;
      panel.classList.toggle("hidden", !show);
      panel.hidden = !show;
      panel.setAttribute("aria-hidden", show ? "false" : "true");
      if (show && panel.tagName === "DETAILS" && !panel.open) panel.open = true;
    });
  }

  function scrollSetupSectionIntoView(section) {
    const panel = document.querySelector(`[data-setup-section="${section}"]`);
    if (!panel || typeof panel.scrollIntoView !== "function") return;
    panel.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function setupSetupTabs() {
    [__appRuntimeContext.DOM.setupTabEvent, __appRuntimeContext.DOM.setupTabCapture, __appRuntimeContext.DOM.setupTabShare].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        const section = btn.dataset.setupTab || "event";
        setSetupSection(section);
        requestAnimationFrame(() => scrollSetupSectionIntoView(section));
      });
    });
    document.querySelectorAll("[data-setup-next]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.setupNext || "event";
        setSetupSection(section);
        requestAnimationFrame(() => scrollSetupSectionIntoView(section));
      });
    });
    setSetupSection(__appRuntimeContext.activeSetupSection);
  }

  function applyViewportProfile() {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const height =
      window.innerHeight || document.documentElement.clientHeight || 0;
    let next = width < 768 ? "phone" : width < 1180 ? "tablet" : "desktop";
    if (height > 0) {
      if (height < 760) {
        next = "phone";
      } else if (height < 900 && next === "desktop") {
        next = "tablet";
      }
    }
    document.body.classList.remove(
      "viewport-phone",
      "viewport-tablet",
      "viewport-desktop",
      "viewport-short"
    );
    document.body.classList.add(`viewport-${next}`);
    if (height > 0 && height < 980) {
      document.body.classList.add("viewport-short");
    }
  }

  function hasLiveVideoStream() {
    if (!__appRuntimeContext.stream) return false;
    try {
      return __appRuntimeContext.stream.getVideoTracks().some((track) => track.readyState === "live");
    } catch (_) {
      return false;
    }
  }

  function updateSystemStatusStrip() {
    if (__appRuntimeContext.DOM.statusCamera) {
      __appRuntimeContext.DOM.statusCamera.textContent = __appRuntimeContext.demoMode
        ? "Demo Mode"
        : hasLiveVideoStream()
        ? "Ready"
        : "Not Started";
    }
    if (__appRuntimeContext.DOM.statusUpload) {
      const cfg = __appRuntimeContext.getCloudinaryConfig();
      const uploadReady = cfg && cfg.use && cfg.cloud && cfg.preset;
      __appRuntimeContext.DOM.statusUpload.textContent = uploadReady
        ? "Cloudinary Connected"
        : "Local Server Upload";
    }
    if (__appRuntimeContext.DOM.statusSync) {
      const raw =
        __appRuntimeContext.DOM.syncStatus && __appRuntimeContext.DOM.syncStatus.textContent
          ? __appRuntimeContext.DOM.syncStatus.textContent.trim()
          : "";
      __appRuntimeContext.DOM.statusSync.textContent = raw || "Idle";
    }
    if (__appRuntimeContext.DOM.statusQueue) {
      let count = 0;
      try {
        count = __appRuntimeContext.getPendingUploads().length;
      } catch (_) {
        count = 0;
      }
      __appRuntimeContext.DOM.statusQueue.textContent = `${count} Pending`;
    }
    updateLaunchSummary();
  }

  function loadSetupLaunchMode() {
    try {
      const stored = localStorage.getItem(__appRuntimeContext.SETUP_LAUNCH_MODE_STORAGE_KEY);
      if (stored === "strip" || stored === "single_photo") {
        return stored;
      }
    } catch (_) {}
    return "single_photo";
  }

  function setSetupLaunchMode(modeValue) {
    __appRuntimeContext.setupLaunchMode = modeValue === "strip" ? "strip" : "single_photo";
    try {
      localStorage.setItem(__appRuntimeContext.SETUP_LAUNCH_MODE_STORAGE_KEY, __appRuntimeContext.setupLaunchMode);
    } catch (_) {}
    syncSetupLaunchModeUi();
    updateLaunchSummary();
  }

  function syncSetupLaunchModeUi() {
    const isStrip = __appRuntimeContext.setupLaunchMode === "strip";
    if (__appRuntimeContext.DOM.launchModeSingleBtn) {
      __appRuntimeContext.DOM.launchModeSingleBtn.classList.toggle("active", !isStrip);
      __appRuntimeContext.DOM.launchModeSingleBtn.setAttribute(
        "aria-pressed",
        (!isStrip).toString()
      );
    }
    if (__appRuntimeContext.DOM.launchModeStripBtn) {
      __appRuntimeContext.DOM.launchModeStripBtn.classList.toggle("active", isStrip);
      __appRuntimeContext.DOM.launchModeStripBtn.setAttribute("aria-pressed", isStrip.toString());
    }
  }

  function getLaunchBackgroundCountLabel() {
    const backgroundCount = __appRuntimeContext.getBackgroundList(__appRuntimeContext.activeTheme).length;
    return `${backgroundCount} selected`;
  }

  function getLaunchOverlayCountLabel() {
    const overlayCount = __appRuntimeContext.getAssignedOverlayList(__appRuntimeContext.activeTheme).length;
    return `${overlayCount} selected`;
  }

  function getLaunchTemplateCountLabel() {
    const templateCount = __appRuntimeContext.getSessionEffectiveAssetSourceSet("template").size;
    return `${templateCount} selected`;
  }

  function setLaunchSummaryText(targetIds, value) {
    targetIds.forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  }

  function setLaunchSummaryThumbnail(nodeId, src, label) {
    const node = document.getElementById(nodeId);
    if (!node) return;
    node.innerHTML = "";
    if (!src) {
      const empty = document.createElement("div");
      empty.className = "setup-session-preview-tile";
      empty.style.minHeight = "120px";
      empty.style.alignItems = "center";
      empty.style.justifyContent = "center";
      empty.textContent = `No ${label.toLowerCase()} selected`;
      node.appendChild(empty);
      return;
    }
    node.appendChild(__appRuntimeContext.createAssetTile(src));
  }

  function renderLaunchAssetList(container, entries = [], categoryLabel = "asset") {
    if (!container) return;
    const visibleEntries = Array.isArray(entries) ? entries : [];
    const signature = JSON.stringify(
      visibleEntries.map((entry) => [
        __appRuntimeContext.getAssetEntrySrc(entry),
        __appRuntimeContext.getAssetDisplayName(entry),
      ])
    );
    if (container.dataset.assetSignature === signature) return;
    container.dataset.assetSignature = signature;
    container.replaceChildren();

    if (!visibleEntries.length) {
      const empty = document.createElement("p");
      empty.className = "setup-session-asset-empty";
      empty.textContent = `No ${categoryLabel}s selected.`;
      container.appendChild(empty);
      return;
    }

    visibleEntries.forEach((entry) => {
      const src = __appRuntimeContext.getAssetEntrySrc(entry);
      if (!src) return;
      const card = document.createElement("div");
      card.className = "setup-session-asset-card";
      const preview = __appRuntimeContext.createAssetTile(src);
      const media = preview.querySelector("img, video");
      if (media) {
        media.alt = __appRuntimeContext.getAssetDisplayName(entry);
        media.loading = "lazy";
      }
      const label = document.createElement("span");
      label.textContent = __appRuntimeContext.getAssetDisplayName(entry);
      label.title = label.textContent;
      card.append(preview, label);
      container.appendChild(card);
    });
  }

  function getLaunchSummaryThumbnailSrc(kind) {
    if (kind === "background") {
      const list = __appRuntimeContext.getBackgroundList(__appRuntimeContext.activeTheme);
      if (!list.length) return "";
      const index = Math.min(
        Math.max(__appRuntimeContext.activeSessionAssets.backgroundIndex || 0, 0),
        list.length - 1
      );
      return __appRuntimeContext.getAssetEntrySrc(list[index]);
    }
    if (kind === "overlay") {
      return __appRuntimeContext.getAssetEntrySrc(
        __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme)[0] || ""
      );
    }
    if (kind === "template") {
      return __appRuntimeContext.getAssetEntrySrc(
        __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme)[0] || ""
      );
    }
    if (kind === "idle-screen") {
      return new Set(
        (Array.isArray(target && target.idleScreens) ? target.idleScreens : [])
          .map(__appRuntimeContext.getAssetEntrySrc)
          .filter(Boolean)
      );
    }
    return "";
  }

  function getLaunchSummaryThumbnailLabel(kind) {
    if (kind === "background") {
      const list = __appRuntimeContext.getBackgroundList(__appRuntimeContext.activeTheme);
      if (!list.length) return "";
      const index = Math.min(
        Math.max(__appRuntimeContext.activeSessionAssets.backgroundIndex || 0, 0),
        list.length - 1
      );
      return __appRuntimeContext.getAssetDisplayName({ url: __appRuntimeContext.getAssetEntrySrc(list[index]) });
    }
    if (kind === "overlay") {
      const src = __appRuntimeContext.getAssetEntrySrc(
        __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme)[0] || ""
      );
      return src ? __appRuntimeContext.getAssetDisplayName({ url: src }) : "";
    }
    if (kind === "template") {
      const src = __appRuntimeContext.getAssetEntrySrc(
        __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme)[0] || ""
      );
      return src ? __appRuntimeContext.getAssetDisplayName({ url: src }) : "";
    }
    return "";
  }

  function updateLaunchSummary() {
    const backgroundCountLabel = getLaunchBackgroundCountLabel();
    const overlayCountLabel = getLaunchOverlayCountLabel();
    const templateCountLabel = getLaunchTemplateCountLabel();

    setLaunchSummaryText(["launchBackgroundCount"], backgroundCountLabel);
    setLaunchSummaryText(
      ["launchBackgroundSummary"],
      backgroundCountLabel
    );
    setLaunchSummaryThumbnail(
      "launchBackgroundThumb",
      getLaunchSummaryThumbnailSrc("background"),
      getLaunchSummaryThumbnailLabel("background") || "Background"
    );
    setLaunchSummaryText(["launchOverlayCount"], overlayCountLabel);
    setLaunchSummaryText(["launchOverlaySummary"], overlayCountLabel);
    setLaunchSummaryThumbnail(
      "launchOverlayThumb",
      getLaunchSummaryThumbnailSrc("overlay"),
      getLaunchSummaryThumbnailLabel("overlay") || "Overlay"
    );
    setLaunchSummaryText(["launchStripStatus"], templateCountLabel);
    setLaunchSummaryText(["launchTemplateSummary"], templateCountLabel);
    setLaunchSummaryThumbnail(
      "launchTemplateThumb",
      getLaunchSummaryThumbnailSrc("template"),
      getLaunchSummaryThumbnailLabel("template") || "Template"
    );
    renderLaunchAssetList(
      __appRuntimeContext.DOM.launchBackgroundAssets,
      __appRuntimeContext.getBackgroundList(__appRuntimeContext.activeTheme),
      "background"
    );
    renderLaunchAssetList(
      __appRuntimeContext.DOM.launchOverlayAssets,
      __appRuntimeContext.getAssignedOverlayList(__appRuntimeContext.activeTheme),
      "overlay"
    );
    renderLaunchAssetList(
      __appRuntimeContext.DOM.launchTemplateAssets,
      __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme),
      "template"
    );
  }

  function getEditScale(storageKey, fallback) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return __appRuntimeContext.clampZoom(parseFloat(stored), 0.6, 1.6);
    } catch (_) {}
    return fallback;
  }

  function getEditPosition(storageKey, fallback) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return __appRuntimeContext.clampZoom(parseFloat(stored), -200, 200);
    } catch (_) {}
    return fallback;
  }

  function applyEditScale(target) {
    const value = __appRuntimeContext.clampZoom(target.value, 0.6, 1.6);
    if (!target.cssVar) return;
    document.documentElement.style.setProperty(target.cssVar, String(value));
  }

  function applyEditPosition(target) {
    if (!target.posVar) return;
    const value = __appRuntimeContext.clampZoom(
      target.posValue || 0,
      target.posMin || -200,
      target.posMax || 200
    );
    document.documentElement.style.setProperty(target.posVar, `${value}px`);
  }

  function loadEditScales() {
    __appRuntimeContext.EDIT_SCALE_CONFIG.forEach((cfg) => {
      const fallback =
        typeof cfg.defaultValue === "number" ? cfg.defaultValue : 1;
      cfg.value = getEditScale(cfg.storageKey, fallback);
      if (cfg.posVar) cfg.posValue = getEditPosition(cfg.posKey, 0);
      applyEditScale(cfg);
      applyEditPosition(cfg);
    });
  }

  function setEditScale(target, value) {
    const normalized = __appRuntimeContext.clampZoom(value, target.min, target.max);
    target.value = normalized;
    try {
      localStorage.setItem(target.storageKey, String(normalized));
    } catch (_) {}
    applyEditScale(target);
    if (__appRuntimeContext.DOM.editScaleValue)
      __appRuntimeContext.DOM.editScaleValue.textContent = `${Math.round(normalized * 100)}%`;
  }

  function setEditPosition(target, value) {
    if (!target.posVar) return;
    const normalized = __appRuntimeContext.clampZoom(
      value,
      target.posMin || -200,
      target.posMax || 200
    );
    target.posValue = normalized;
    try {
      localStorage.setItem(target.posKey, String(normalized));
    } catch (_) {}
    applyEditPosition(target);
    if (__appRuntimeContext.DOM.editPositionValue)
      __appRuntimeContext.DOM.editPositionValue.textContent = `${Math.round(normalized)}px`;
  }

  function clearEditSelection() {
    if (__appRuntimeContext.activeEditTarget && Array.isArray(__appRuntimeContext.activeEditTarget.els)) {
      __appRuntimeContext.activeEditTarget.els.forEach((el) =>
        el.classList.remove("edit-target-active")
      );
    }
    __appRuntimeContext.activeEditTarget = null;
    if (__appRuntimeContext.DOM.editControls) __appRuntimeContext.DOM.editControls.classList.remove("show");
  }

  function selectEditTarget(targetId) {
    const config = __appRuntimeContext.EDIT_SCALE_CONFIG.find((cfg) => cfg.id === targetId);
    if (!config) return;
    const els = (__appRuntimeContext.EDIT_TARGET_MAP[targetId] && __appRuntimeContext.EDIT_TARGET_MAP[targetId]()) || [];
    clearEditSelection();
    __appRuntimeContext.activeEditTarget = { config, els };
    els.forEach((el) => el.classList.add("edit-target-active"));
    if (__appRuntimeContext.DOM.editControlsTitle) __appRuntimeContext.DOM.editControlsTitle.textContent = config.label;
    if (__appRuntimeContext.DOM.editScaleInput) {
      __appRuntimeContext.DOM.editScaleInput.min = String(config.min);
      __appRuntimeContext.DOM.editScaleInput.max = String(config.max);
      __appRuntimeContext.DOM.editScaleInput.value = String(config.value || 1);
    }
    if (__appRuntimeContext.DOM.editScaleValue)
      __appRuntimeContext.DOM.editScaleValue.textContent = `${Math.round(
        (config.value || 1) * 100
      )}%`;
    if (
      __appRuntimeContext.DOM.editPositionRow &&
      __appRuntimeContext.DOM.editPositionInput &&
      __appRuntimeContext.DOM.editPositionValue &&
      __appRuntimeContext.DOM.editPositionLabel
    ) {
      if (config.posVar) {
        __appRuntimeContext.DOM.editPositionRow.style.display = "flex";
        __appRuntimeContext.DOM.editPositionLabel.style.display = "block";
        __appRuntimeContext.DOM.editPositionInput.min = String(config.posMin || -200);
        __appRuntimeContext.DOM.editPositionInput.max = String(config.posMax || 200);
        __appRuntimeContext.DOM.editPositionInput.value = String(config.posValue || 0);
        __appRuntimeContext.DOM.editPositionValue.textContent = `${Math.round(
          config.posValue || 0
        )}px`;
      } else {
        __appRuntimeContext.DOM.editPositionRow.style.display = "none";
        __appRuntimeContext.DOM.editPositionLabel.style.display = "none";
      }
    }
    if (__appRuntimeContext.DOM.editControls) __appRuntimeContext.DOM.editControls.classList.add("show");
  }

  function handleEditableClick(targetId, event) {
    if (!__appRuntimeContext.editModeActive) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    selectEditTarget(targetId);
  }

  function applyEditModeState(active) {
    __appRuntimeContext.editModeActive = active;
    document.body.classList.toggle("edit-mode", __appRuntimeContext.editModeActive);
    if (!__appRuntimeContext.editModeActive) clearEditSelection();
  }

  function enterEditMode() {
    applyEditModeState(true);
    if (__appRuntimeContext.DOM.adminScreen) __appRuntimeContext.DOM.adminScreen.classList.add("hidden");
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("hidden");
    document.body.classList.remove("admin-open");
    document.documentElement.classList.remove("admin-open");
    __appRuntimeContext.startCamera(true);
    setEditView("booth");
    setTimeout(() => {
      if (__appRuntimeContext.editModeActive) __appRuntimeContext.hideWelcome();
    }, 600);
  }

  function exitEditMode() {
    applyEditModeState(false);
    __appRuntimeContext.goAdmin();
  }

  function setEditView(view) {
    const mode = view || "booth";
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("countdown-mode");
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("share-mode");
    if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.classList.add("faded");
    if (__appRuntimeContext.DOM.finalPreview) __appRuntimeContext.DOM.finalPreview.classList.remove("show");
    if (__appRuntimeContext.DOM.countdownOverlay) __appRuntimeContext.DOM.countdownOverlay.classList.remove("show");
    if (mode === "welcome") {
      if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.classList.remove("faded");
    } else if (mode === "countdown") {
      if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.add("countdown-mode");
      if (__appRuntimeContext.DOM.countdownOverlay) __appRuntimeContext.DOM.countdownOverlay.classList.add("show");
    } else if (mode === "share") {
      if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.add("share-mode");
      if (__appRuntimeContext.DOM.finalPreview) __appRuntimeContext.DOM.finalPreview.classList.add("show");
      if (__appRuntimeContext.editModeActive && __appRuntimeContext.DOM.qrCodeContainer)
        __appRuntimeContext.DOM.qrCodeContainer.classList.remove("hidden");
      if (__appRuntimeContext.editModeActive && __appRuntimeContext.DOM.finalStrip) {
        if (!__appRuntimeContext.DOM.finalStrip.dataset.prevSrc) {
          __appRuntimeContext.DOM.finalStrip.dataset.prevSrc =
            __appRuntimeContext.DOM.finalStrip.getAttribute("src") || "";
        }
        if (!__appRuntimeContext.DOM.finalStrip.getAttribute("src")) {
          __appRuntimeContext.DOM.finalStrip.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
        }
        __appRuntimeContext.DOM.finalStrip.dataset.editPlaceholder = "true";
      }
    } else if (__appRuntimeContext.editModeActive && __appRuntimeContext.DOM.qrCodeContainer) {
      __appRuntimeContext.DOM.qrCodeContainer.classList.add("hidden");
    }
    if (
      __appRuntimeContext.editModeActive &&
      mode !== "share" &&
      __appRuntimeContext.DOM.finalStrip &&
      __appRuntimeContext.DOM.finalStrip.dataset.editPlaceholder === "true"
    ) {
      const prev = __appRuntimeContext.DOM.finalStrip.dataset.prevSrc || "";
      __appRuntimeContext.DOM.finalStrip.src = prev;
      delete __appRuntimeContext.DOM.finalStrip.dataset.editPlaceholder;
      delete __appRuntimeContext.DOM.finalStrip.dataset.prevSrc;
    }
  }

  function setupEditModeControls() {
    const markEditable = (els) => {
      els.forEach((el) => {
        if (el) el.setAttribute("data-editable", "true");
      });
    };
    if (__appRuntimeContext.DOM.editLayoutBtn)
      __appRuntimeContext.DOM.editLayoutBtn.addEventListener("click", enterEditMode);
    if (__appRuntimeContext.DOM.editModeExitBtn)
      __appRuntimeContext.DOM.editModeExitBtn.addEventListener("click", exitEditMode);
    if (__appRuntimeContext.DOM.editControlsClose)
      __appRuntimeContext.DOM.editControlsClose.addEventListener("click", clearEditSelection);
    if (__appRuntimeContext.DOM.editScaleInput) {
      __appRuntimeContext.DOM.editScaleInput.addEventListener("input", () => {
        if (!__appRuntimeContext.activeEditTarget) return;
        setEditScale(
          __appRuntimeContext.activeEditTarget.config,
          parseFloat(__appRuntimeContext.DOM.editScaleInput.value)
        );
      });
    }
    if (__appRuntimeContext.DOM.editPositionInput) {
      __appRuntimeContext.DOM.editPositionInput.addEventListener("input", () => {
        if (!__appRuntimeContext.activeEditTarget) return;
        setEditPosition(
          __appRuntimeContext.activeEditTarget.config,
          parseFloat(__appRuntimeContext.DOM.editPositionInput.value)
        );
      });
    }
    if (__appRuntimeContext.DOM.videoContainer) {
      markEditable([__appRuntimeContext.DOM.videoContainer]);
      __appRuntimeContext.DOM.videoContainer.addEventListener(
        "click",
        (e) => handleEditableClick("camera", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.options) {
      markEditable([__appRuntimeContext.DOM.options]);
      __appRuntimeContext.DOM.options.addEventListener(
        "click",
        (e) => handleEditableClick("options", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.boothHeader) {
      markEditable([__appRuntimeContext.DOM.boothHeader]);
      __appRuntimeContext.DOM.boothHeader.addEventListener(
        "click",
        (e) => handleEditableClick("header", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.welcomeTitle) {
      markEditable([__appRuntimeContext.DOM.welcomeTitle]);
      __appRuntimeContext.DOM.welcomeTitle.addEventListener(
        "click",
        (e) => handleEditableClick("welcomeTitle", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.startButton) {
      markEditable([__appRuntimeContext.DOM.startButton]);
      __appRuntimeContext.DOM.startButton.addEventListener(
        "click",
        (e) => handleEditableClick("startButton", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.eventTitle) {
      markEditable([__appRuntimeContext.DOM.eventTitle]);
      __appRuntimeContext.DOM.eventTitle.addEventListener(
        "click",
        (e) => handleEditableClick("eventTitle", e),
        true
      );
    }
    if (__appRuntimeContext.DOM.captureBtn) {
      markEditable([__appRuntimeContext.DOM.captureBtn]);
      __appRuntimeContext.DOM.captureBtn.addEventListener(
        "click",
        (e) => handleEditableClick("captureButton", e),
        true
      );
    }
    document.querySelectorAll("#controls .mode-btn").forEach((btn) => {
      markEditable([btn]);
      btn.addEventListener(
        "click",
        (e) => handleEditableClick("modeButtons", e),
        true
      );
    });
    document.querySelectorAll("[data-edit-view]").forEach((btn) => {
      btn.addEventListener("click", () => setEditView(btn.dataset.editView));
    });
    if (__appRuntimeContext.DOM.boothScreen) {
      __appRuntimeContext.DOM.boothScreen.addEventListener("click", (e) => {
        if (!__appRuntimeContext.editModeActive) return;
        if (e.target.closest("#editControls")) return;
        if (e.target.closest("[data-editable]")) return;
        clearEditSelection();
      });
    }
    loadEditScales();
  }

  function setupEventNameInput() {
    if (!__appRuntimeContext.DOM.eventNameInput) return;
    __appRuntimeContext.DOM.eventNameInput.addEventListener("input", () => {
      const name = __appRuntimeContext.DOM.eventNameInput.value.trim();
      const active = __appRuntimeContext.getActiveEvent();
      if (active) {
        __appRuntimeContext.updateActiveEventDetails({ name });
      } else {
        const key = __appRuntimeContext.getSelectedThemeKey();
        __appRuntimeContext.updateActiveSessionTextDetails({ name });
        if (key) __appRuntimeContext.saveStoredEventName(key, name);
      }
      __appRuntimeContext.updateStylePreview();
    });
  }

  function setupEventVisualEditorControls() {
    const bindTextInput = (node, key) => {
      if (!node) return;
      node.addEventListener("input", () => {
        const active = __appRuntimeContext.getActiveEvent();
        const nextValue = node.value.trim();
        if (active) {
          __appRuntimeContext.updateActiveEventDetails({ [key]: nextValue });
        } else {
          __appRuntimeContext.updateActiveSessionTextDetails({ [key]: nextValue });
        }
      });
    };

    bindTextInput(__appRuntimeContext.DOM.eventBannerTextInput, "bannerText");
    bindTextInput(__appRuntimeContext.DOM.eventWelcomeTitleInput, "welcomeTitle");
    bindTextInput(__appRuntimeContext.DOM.eventStartButtonTextInput, "startButtonText");
    bindTextInput(__appRuntimeContext.DOM.eventCaptureLabelInput, "captureLabel");
    bindTextInput(__appRuntimeContext.DOM.eventPartner1Input, "partner1");
    bindTextInput(__appRuntimeContext.DOM.eventPartner2Input, "partner2");
    bindTextInput(__appRuntimeContext.DOM.eventBirthdayNameInput, "birthdayName");
    bindTextInput(__appRuntimeContext.DOM.eventExpoCompanyInput, "expoCompany");
    if (__appRuntimeContext.DOM.startWeddingSetupBtn) {
      __appRuntimeContext.DOM.startWeddingSetupBtn.addEventListener("click", () => {
        __appRuntimeContext.weddingSetupRequested = true;
        __appRuntimeContext.weddingThemeChoiceDirty = false;
        __appRuntimeContext.syncWeddingThemeChoice(__appRuntimeContext.getActiveEvent()?.weddingThemeStyle || "eucalyptus");
        __appRuntimeContext.syncWeddingOnlyEventFields(__appRuntimeContext.getEventEditorTheme());
        __appRuntimeContext.syncWeddingSetupMode();
        __appRuntimeContext.DOM.eventPartner1Input?.focus();
      });
    }
    if (__appRuntimeContext.DOM.cancelWeddingSetupBtn) {
      __appRuntimeContext.DOM.cancelWeddingSetupBtn.addEventListener("click", () => {
        __appRuntimeContext.weddingSetupRequested = false;
        __appRuntimeContext.weddingThemeChoiceDirty = false;
        __appRuntimeContext.syncWeddingOnlyEventFields(__appRuntimeContext.getEventEditorTheme());
        __appRuntimeContext.syncWeddingSetupMode();
        __appRuntimeContext.DOM.startWeddingSetupBtn?.focus();
      });
    }
    if (__appRuntimeContext.DOM.createWeddingEventBtn) {
      __appRuntimeContext.DOM.createWeddingEventBtn.addEventListener("click", __appRuntimeContext.createWeddingEventFromSetup);
    }
    document.querySelectorAll('input[name="weddingThemeChoice"]').forEach((input) => {
      input.addEventListener("change", () => {
        __appRuntimeContext.weddingThemeChoiceDirty = true;
      });
    });

    if (__appRuntimeContext.DOM.eventBannerSizeInput) {
      __appRuntimeContext.DOM.eventBannerSizeInput.addEventListener("input", () => {
        const active = __appRuntimeContext.getActiveEvent();
        const size = parseInt(__appRuntimeContext.DOM.eventBannerSizeInput.value, 10);
        if (!Number.isFinite(size)) return;
        if (__appRuntimeContext.DOM.eventBannerSizeValue)
          __appRuntimeContext.DOM.eventBannerSizeValue.textContent = `${size}px`;
        if (active) {
          __appRuntimeContext.updateActiveEventDetails({ bannerSize: size });
        } else {
          __appRuntimeContext.updateActiveThemeTextDetails({ bannerSize: size });
        }
      });
    }

    if (__appRuntimeContext.DOM.eventWelcomeTitleSizeInput) {
      __appRuntimeContext.DOM.eventWelcomeTitleSizeInput.addEventListener("input", () => {
        const active = __appRuntimeContext.getActiveEvent();
        const size = parseInt(__appRuntimeContext.DOM.eventWelcomeTitleSizeInput.value, 10);
        if (!Number.isFinite(size)) return;
        if (__appRuntimeContext.DOM.eventWelcomeTitleSizeValue)
          __appRuntimeContext.DOM.eventWelcomeTitleSizeValue.textContent = `${size}px`;
        if (active) {
          __appRuntimeContext.updateActiveEventDetails({ welcomeTitleSize: size });
        } else {
          __appRuntimeContext.updateActiveThemeTextDetails({ welcomeTitleSize: size });
        }
      });
    }
  }

  function setupWelcomeInteractions() {
    const bindWelcomeTarget = (node) => {
      if (!node || node.dataset.welcomeBound === "true") return;
      node.dataset.welcomeBound = "true";
      node.addEventListener("click", __appRuntimeContext.beginWelcome);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") __appRuntimeContext.beginWelcome(event);
      });
    };
    bindWelcomeTarget(__appRuntimeContext.DOM.startButton);
    if (
      document.body &&
      document.body.dataset.welcomeDelegationBound !== "true"
    ) {
      document.body.dataset.welcomeDelegationBound = "true";
      const delegatedWelcomeStart = (event) => {
        if (__appRuntimeContext.welcomeFlowStep !== "idle") return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (
          !target.closest("#welcomeScreen, #welcomeOverlay") ||
          target.closest(
            "button, a, input, select, textarea, label, [role=button], [data-demo-theme], .welcome-mode-btn, .welcome-back-button"
          )
        ) {
          return;
        }
        if (!__appRuntimeContext.DOM.welcomeScreen || __appRuntimeContext.DOM.welcomeScreen.classList.contains("faded")) {
          return;
        }
        __appRuntimeContext.beginWelcome(event);
      };
      document.addEventListener("click", delegatedWelcomeStart, true);
    }
  }

  function setupEventDateInput() {
    [__appRuntimeContext.DOM.eventDateInput, __appRuntimeContext.DOM.eventGeneralDateInput].filter(Boolean).forEach((input) => {
      input.addEventListener("input", () => {
        const dateValue = input.value.trim();
        const active = __appRuntimeContext.getActiveEvent();
        if (active) {
          __appRuntimeContext.updateActiveEventDetails({ date: dateValue });
        } else {
          const key = __appRuntimeContext.getSelectedThemeKey();
          __appRuntimeContext.updateActiveSessionTextDetails({ date: dateValue });
          if (key) __appRuntimeContext.saveStoredEventDate(key, dateValue);
        }
        __appRuntimeContext.updateStylePreview();
      });
    });
  }

  return {
    setSetupSection,
    scrollSetupSectionIntoView,
    setupSetupTabs,
    applyViewportProfile,
    hasLiveVideoStream,
    updateSystemStatusStrip,
    loadSetupLaunchMode,
    setSetupLaunchMode,
    syncSetupLaunchModeUi,
    getLaunchBackgroundCountLabel,
    getLaunchOverlayCountLabel,
    getLaunchTemplateCountLabel,
    setLaunchSummaryText,
    setLaunchSummaryThumbnail,
    renderLaunchAssetList,
    getLaunchSummaryThumbnailSrc,
    getLaunchSummaryThumbnailLabel,
    updateLaunchSummary,
    getEditScale,
    getEditPosition,
    applyEditScale,
    applyEditPosition,
    loadEditScales,
    setEditScale,
    setEditPosition,
    clearEditSelection,
    selectEditTarget,
    handleEditableClick,
    applyEditModeState,
    enterEditMode,
    exitEditMode,
    setEditView,
    setupEditModeControls,
    setupEventNameInput,
    setupEventVisualEditorControls,
    setupWelcomeInteractions,
    setupEventDateInput,
  };
}
