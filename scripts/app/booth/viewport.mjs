export function createViewportModule(__appRuntimeContext) {
  function setBoothControlsVisible(show) {
    const hidden = !show;
    if (__appRuntimeContext.DOM.options) __appRuntimeContext.DOM.options.classList.toggle("hidden", hidden);
    if (__appRuntimeContext.DOM.boothHeader) __appRuntimeContext.DOM.boothHeader.classList.toggle("hidden", hidden);
    if (__appRuntimeContext.DOM.boothControls) __appRuntimeContext.DOM.boothControls.classList.toggle("hidden", hidden);
    if (__appRuntimeContext.DOM.boothBackBtn) __appRuntimeContext.DOM.boothBackBtn.classList.toggle("hidden", hidden);
    if (__appRuntimeContext.DOM.captureBtn) __appRuntimeContext.DOM.captureBtn.classList.toggle("hidden", hidden);
    if (__appRuntimeContext.DOM.boothScreen && show) {
      __appRuntimeContext.DOM.boothScreen.classList.add("booth-ready");
    }
    if (!show) {
      setMobileSettingsOpen(false);
    }
    __appRuntimeContext.syncOverlayPickerUi();
    syncMobileSettingsUi();
    requestAnimationFrame(() => logBoothViewportOverflow());
  }

  function logBoothViewportOverflow() {
    try {
      console.log({
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
      });
    } catch (_) {}
  }

  function normalizeBoothModeValue(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized || normalized === "photo") {
      return __appRuntimeContext.getLivePhotoEnabled() ? "live-photo" : "still-photo";
    }
    if (normalized === "live-photo") {
      return __appRuntimeContext.getLivePhotoEnabled() ? "live-photo" : "still-photo";
    }
    if (normalized === "still-photo") return "still-photo";
    if (normalized === "strip" || normalized === "photo-strip") return "strip";
    if (normalized === "layout" || normalized === "collage") return "layout";
    if (normalized === "message" || normalized === "recording") return "message";
    return __appRuntimeContext.getLivePhotoEnabled() ? "live-photo" : "still-photo";
  }

  function getSelectedCaptureMode(value = __appRuntimeContext.mode) {
    const normalized = normalizeBoothModeValue(value);
    if (normalized === "live-photo" || normalized === "still-photo") {
      return "photo";
    }
    if (normalized === "strip" || normalized === "layout") return normalized;
    if (normalized === "message") return "message";
    return "photo";
  }

  function getPrintSizeForOrientation(orientation = "landscape") {
    return __appRuntimeContext.PRINT_SIZES[orientation] || __appRuntimeContext.PRINT_SIZES.landscape;
  }

  function createPrintCanvas(orientation = "landscape") {
    const size = getPrintSizeForOrientation(orientation);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    return { canvas, ctx, size };
  }

  function normalizePhotoOverlayOrientation(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    if (normalized === "portrait" || normalized === "vertical") {
      return "portrait";
    }
    if (normalized === "landscape" || normalized === "horizontal") {
      return "landscape";
    }
    return "";
  }

  function getPhotoOverlayAspectForOrientation(orientation = __appRuntimeContext.photoOverlayOrientation) {
    const normalized = normalizePhotoOverlayOrientation(orientation) || "landscape";
    return getPrintSizeForOrientation(normalized).aspect;
  }

  function getLiveCameraAspectStyle() {
    if (getSelectedCaptureMode() !== "photo") return __appRuntimeContext.PRINT_SIZES.landscape.cssAspect;
    const normalized = normalizePhotoOverlayOrientation(__appRuntimeContext.photoOverlayOrientation) || "landscape";
    return getPrintSizeForOrientation(normalized).cssAspect;
  }

  function applyBoothModeClass(nextMode = __appRuntimeContext.mode) {
    const normalizedMode = normalizeBoothModeValue(nextMode);
    const captureMode = getSelectedCaptureMode(normalizedMode);
    const classes = [
      "mode-live-photo",
      "mode-still-photo",
      "mode-strip",
      "mode-message",
      "mode-layout",
    ];
    if (__appRuntimeContext.DOM.boothScreen) {
      __appRuntimeContext.DOM.boothScreen.classList.remove(...classes);
      __appRuntimeContext.DOM.boothScreen.classList.add(`mode-${normalizedMode}`);
      __appRuntimeContext.DOM.boothScreen.dataset.mode = normalizedMode;
      __appRuntimeContext.DOM.boothScreen.dataset.captureMode = captureMode;
    }
    requestAnimationFrame(() => logBoothViewportOverflow());
    return { normalizedMode, captureMode };
  }

  function getLiveCameraAspectValue() {
    return getSelectedCaptureMode() === "photo"
      ? getPhotoOverlayAspectForOrientation()
      : __appRuntimeContext.PRINT_SIZES.landscape.aspect;
  }

  function getLiveCameraWidthValue() {
    if (getSelectedCaptureMode() === "photo" && __appRuntimeContext.photoOverlayOrientation === "portrait") {
      return isMobileBoothViewport() ? "76vw" : "540px";
    }
    return isMobileBoothViewport() ? "86vw" : "860px";
  }

  function applyLiveCameraSizing() {
    if (__appRuntimeContext.DOM.boothScreen) {
      __appRuntimeContext.DOM.boothScreen.style.setProperty(
        "--live-camera-width",
        getLiveCameraWidthValue()
      );
      __appRuntimeContext.DOM.boothScreen.style.setProperty(
        "--live-camera-aspect",
        getLiveCameraAspectStyle()
      );
    }
    if (__appRuntimeContext.DOM.videoContainer) {
      __appRuntimeContext.DOM.videoContainer.style.width = "";
      __appRuntimeContext.DOM.videoContainer.style.aspectRatio = "";
    }
  }

  function getSelectionDebugSummary(targetMode = __appRuntimeContext.mode) {
    const captureMode = getSelectedCaptureMode(targetMode);
    const activeOverlay = __appRuntimeContext.getActivePhotoOverlay();
    const template =
      captureMode === "strip" || captureMode === "layout"
        ? __appRuntimeContext.pendingTemplate ||
          __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme).find(
            (item) => getAssetCaptureType(item) === captureMode
          ) ||
          null
        : null;
    return {
      mode: normalizeBoothModeValue(targetMode),
      captureMode,
      selectedOverlay: activeOverlay
        ? {
            id: activeOverlay.id || null,
            name: activeOverlay.name || activeOverlay.id || activeOverlay.src || "",
            type: activeOverlay.type || "photo",
          }
        : null,
      selectedTemplate: template
        ? {
            id: template.id || null,
            name: template.name || template.id || template.src || "",
            type: template.type || getAssetCaptureType(template) || "strip",
            layout: template.layout || null,
          }
        : null,
      photoOverlayOrientation: __appRuntimeContext.photoOverlayOrientation,
      liveCameraAspect: getLiveCameraAspectValue(),
      finalExportAspect:
        typeof __appRuntimeContext.captureAspectRatio === "number" && __appRuntimeContext.captureAspectRatio > 0
          ? __appRuntimeContext.captureAspectRatio
          : null,
    };
  }

  function logBoothFrameState(reason, targetMode = __appRuntimeContext.mode) {
    try {
      console.log("[booth-frame]", reason, getSelectionDebugSummary(targetMode));
    } catch (_) {}
  }

  function isStripLikeSlotGrid(slots) {
    if (!Array.isArray(slots) || slots.length < 2) return false;
    const first = slots[0];
    if (!first) return false;
    const sameX = slots.every(
      (slot) => Math.abs((slot.x || 0) - (first.x || 0)) <= 0.08
    );
    const sameWidth = slots.every(
      (slot) => Math.abs((slot.width || 0) - (first.width || 0)) <= 0.08
    );
    const verticalOrder = slots.every((slot, index) => {
      if (index === 0) return true;
      return (slot.y || 0) >= (slots[index - 1].y || 0);
    });
    return sameX && sameWidth && verticalOrder;
  }

  function getAssetCaptureType(asset) {
    if (!asset) return "photo";
    const rawType = String(
      asset.captureType || asset.layoutType || asset.type || ""
    )
      .trim()
      .toLowerCase();
    const explicitLayout = asset && (asset.layout || asset.layoutType);
    const rawLayout = explicitLayout ? __appRuntimeContext.normalizeTemplateLayout(explicitLayout) : "";
    const rawName = [
      asset.id,
      asset.name,
      asset.src,
      asset.renderSrc,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (rawType.includes("message")) return "message";
    if (rawType.includes("layout") || rawType.includes("collage")) return "layout";
    if (rawType.includes("strip")) return "strip";
    if (
      rawLayout === "double_column" ||
      rawLayout === "vertical" ||
      rawLayout === "photo_strip_2" ||
      rawLayout === "photo_strip_3" ||
      rawLayout === "photo_strip_4"
    ) {
      return "strip";
    }
    if (Array.isArray(asset.photoSlots) && asset.photoSlots.length > 1) {
      return isStripLikeSlotGrid(asset.photoSlots) ? "strip" : "layout";
    }
    if (rawName.includes("strip")) return "strip";
    if (rawName.includes("layout") || rawName.includes("collage")) {
      return "layout";
    }
    return "photo";
  }

  function inferPhotoOverlayOrientationFromText(asset) {
    const raw = [
      asset && asset.id,
      asset && asset.name,
      asset && asset.src,
      asset && asset.renderSrc,
      asset && asset.layout,
      asset && asset.layoutClass,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (/\b(landscape|horizontal|wide)\b/.test(raw)) return "landscape";
    if (/\b(portrait|vertical|tall)\b/.test(raw)) return "portrait";
    return "";
  }

  function getPhotoOverlayOrientation(asset) {
    if (!asset) return "";
    const explicit =
      normalizePhotoOverlayOrientation(asset.orientation) ||
      normalizePhotoOverlayOrientation(asset.overlayOrientation) ||
      normalizePhotoOverlayOrientation(asset.layoutClass) ||
      normalizePhotoOverlayOrientation(asset.layout);
    if (explicit) return explicit;
    const aspect =
      __appRuntimeContext.parseAspectRatioValue(asset.aspectRatio) ||
      __appRuntimeContext.parseAspectRatioValue(asset.layoutAspectRatio);
    if (aspect) return aspect >= 1 ? "landscape" : "portrait";
    const textOrientation = inferPhotoOverlayOrientationFromText(asset);
    if (textOrientation) return textOrientation;
    const src = String(asset.renderSrc || asset.src || "");
    return __appRuntimeContext.photoOverlayOrientationCache[src] || "";
  }

  function queuePhotoOverlayOrientationProbe(asset) {
    const src = String((asset && (asset.renderSrc || asset.src)) || "");
    if (!src || __appRuntimeContext.photoOverlayOrientationCache[src] || __appRuntimeContext.photoOverlayOrientationPending[src]) {
      return;
    }
    __appRuntimeContext.photoOverlayOrientationPending[src] = true;
    __appRuntimeContext.loadImage(__appRuntimeContext.resolveOverlayRenderSrc(__appRuntimeContext.activeTheme, src))
      .then((img) => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        if (width && height) {
          __appRuntimeContext.photoOverlayOrientationCache[src] =
            width >= height ? "landscape" : "portrait";
          if (getSelectedCaptureMode() === "photo") {
            __appRuntimeContext.renderOptions();
            __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
            __appRuntimeContext.renderAssetLibrary();
            __appRuntimeContext.updateLaunchSummary();
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        delete __appRuntimeContext.photoOverlayOrientationPending[src];
      });
  }

  function filterPhotoOverlaysByOrientation(overlays, orientation = __appRuntimeContext.photoOverlayOrientation) {
    const target = normalizePhotoOverlayOrientation(orientation) || "portrait";
    return filterAssetsForMode(overlays, "photo").filter((overlay) => {
      const overlayOrientation = getPhotoOverlayOrientation(overlay);
      if (!overlayOrientation) {
        queuePhotoOverlayOrientationProbe(overlay);
        return true;
      }
      return overlayOrientation === target;
    });
  }

  function filterAssetsForMode(assets, modeValue) {
    const captureMode = getSelectedCaptureMode(modeValue);
    return Array.isArray(assets)
      ? assets.filter((asset) => {
          const assetType = getAssetCaptureType(asset);
          if (captureMode === "photo") return assetType === "photo";
          if (captureMode === "strip") return assetType === "strip";
          if (captureMode === "layout") return assetType === "layout";
          return false;
        })
      : [];
  }

  function isMobileBoothViewport() {
    return (
      window.matchMedia("(max-width: 760px)").matches ||
      document.body.classList.contains("viewport-phone")
    );
  }

  function canShowFrameSettings() {
    return !!(
      __appRuntimeContext.DOM.boothScreen &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("hidden") &&
      __appRuntimeContext.DOM.boothScreen.classList.contains("booth-ready") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("welcome-active") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("share-mode") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("countdown-mode") &&
      !__appRuntimeContext.DOM.boothScreen.classList.contains("finalizing-mode")
    );
  }

  function setMobileSettingsOpen(open) {
    const shouldOpen = !!open && canShowFrameSettings();
    if (__appRuntimeContext.DOM.boothScreen) {
      __appRuntimeContext.DOM.boothScreen.classList.toggle("mobile-settings-open", shouldOpen);
    }
    if (__appRuntimeContext.DOM.mobileSettingsSheet) {
      __appRuntimeContext.DOM.mobileSettingsSheet.setAttribute(
        "aria-hidden",
        shouldOpen ? "false" : "true"
      );
    }
    if (__appRuntimeContext.DOM.overlayPickerButton) {
      __appRuntimeContext.DOM.overlayPickerButton.setAttribute(
        "aria-expanded",
        shouldOpen ? "true" : "false"
      );
    }
  }

  function syncMobileSettingsUi() {
    if (!canShowFrameSettings()) setMobileSettingsOpen(false);
  }

  function syncBoothModeButtons() {
    document.querySelectorAll("#controls .mode-btn").forEach((button) => {
      const buttonMode = button.dataset.mode || "";
      const hidden = buttonMode === "live-photo" && !__appRuntimeContext.getLivePhotoEnabled();
      button.classList.toggle("hidden", hidden);
      if (hidden && __appRuntimeContext.mode === "live-photo") __appRuntimeContext.mode = "still-photo";
      const isActive = buttonMode === __appRuntimeContext.mode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function syncWelcomeModeButtons() {
    document.querySelectorAll(".welcome-mode-btn[data-welcome-mode]").forEach((button) => {
      const buttonMode = button.dataset.welcomeMode || "";
      const hidden = buttonMode === "live-photo" && !__appRuntimeContext.getLivePhotoEnabled();
      button.classList.toggle("hidden", hidden);
    });
  }

  function syncCaptureStatusIndicators() {
    const showPhotoIndicators = getSelectedCaptureMode() === "photo";
    const showLivePhotoIndicator = showPhotoIndicators && __appRuntimeContext.mode === "live-photo";
    if (__appRuntimeContext.DOM.livePhotoStatus) {
      __appRuntimeContext.DOM.livePhotoStatus.classList.toggle(
        "hidden",
        !showLivePhotoIndicator || !__appRuntimeContext.getLivePhotoEnabled()
      );
    }
    if (__appRuntimeContext.DOM.instantCaptureStatus) {
      __appRuntimeContext.DOM.instantCaptureStatus.classList.toggle(
        "hidden",
        !showPhotoIndicators || !__appRuntimeContext.getInstantCaptureEnabled()
      );
    }
    if (__appRuntimeContext.DOM.captureStatusBar) {
      const hasVisibleStatus = !!__appRuntimeContext.DOM.captureStatusBar.querySelector(
        ".capture-status-pill:not(.hidden)"
      );
      __appRuntimeContext.DOM.captureStatusBar.classList.toggle("hidden", !hasVisibleStatus);
    }
  }

  function getRecordingModeEnabled() {
    try {
      const stored = localStorage.getItem(__appRuntimeContext.RECORDING_MODE_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (_) {}
    return true;
  }

  function setRecordingModeEnabled(enabled) {
    try {
      localStorage.setItem(
        __appRuntimeContext.RECORDING_MODE_STORAGE_KEY,
        enabled ? "true" : "false"
      );
    } catch (_) {}
  }

  function syncRecordingModeAvailability() {
    const enabled = getRecordingModeEnabled();
    if (__appRuntimeContext.DOM.recordingModeBtn) {
      __appRuntimeContext.DOM.recordingModeBtn.classList.toggle("hidden", !enabled);
    }
    if (!enabled && __appRuntimeContext.mode === "message") {
      __appRuntimeContext.setMode("live-photo");
      return;
    }
    syncBoothModeButtons();
  }

  return {
    setBoothControlsVisible,
    logBoothViewportOverflow,
    normalizeBoothModeValue,
    getSelectedCaptureMode,
    getPrintSizeForOrientation,
    createPrintCanvas,
    normalizePhotoOverlayOrientation,
    getPhotoOverlayAspectForOrientation,
    getLiveCameraAspectStyle,
    applyBoothModeClass,
    getLiveCameraAspectValue,
    getLiveCameraWidthValue,
    applyLiveCameraSizing,
    getSelectionDebugSummary,
    logBoothFrameState,
    isStripLikeSlotGrid,
    getAssetCaptureType,
    inferPhotoOverlayOrientationFromText,
    getPhotoOverlayOrientation,
    queuePhotoOverlayOrientationProbe,
    filterPhotoOverlaysByOrientation,
    filterAssetsForMode,
    isMobileBoothViewport,
    canShowFrameSettings,
    setMobileSettingsOpen,
    syncMobileSettingsUi,
    syncBoothModeButtons,
    syncWelcomeModeButtons,
    syncCaptureStatusIndicators,
    getRecordingModeEnabled,
    setRecordingModeEnabled,
    syncRecordingModeAvailability,
  };
}
