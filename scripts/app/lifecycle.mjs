export function createLifecycleModule(__appRuntimeContext) {
  function isLocalDevHost() {
    const hostname = window.location.hostname || "";
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  function deferNonCriticalTask(task) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => task(), { timeout: 2000 });
    } else {
      window.setTimeout(task, 250);
    }
  }

  async function connectMotorRelay() {
    if (!("serial" in navigator)) {
      __appRuntimeContext.showToast("Web Serial not supported in this browser.");
      return;
    }
    try {
      __appRuntimeContext.relayPort = await navigator.serial.requestPort();
      await __appRuntimeContext.relayPort.open({ baudRate: 9600 });
      __appRuntimeContext.showToast("360 Motor Relay Connected");
    } catch (err) {
      console.error("Relay connection failed", err);
      __appRuntimeContext.showToast("Relay connection failed.");
    }
  }

  async function setMotorPower(isOn) {
    if (!__appRuntimeContext.relayPort || !__appRuntimeContext.relayPort.writable) return;
    const writer = __appRuntimeContext.relayPort.writable.getWriter();
    try {
      await writer.write(isOn ? __appRuntimeContext.RELAY_COMMANDS.ON : __appRuntimeContext.RELAY_COMMANDS.OFF);
    } catch (err) {
      console.error("Failed to send relay command", err);
    } finally {
      writer.releaseLock();
    }
  }

  async function clearPhotoboothServiceWorkerState() {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    } catch (error) {
      console.warn("Service worker unregister failed:", error);
    }

    if (!("caches" in window)) return;

    try {
      const cacheKeys = await caches.keys();
      const photoboothCaches = cacheKeys.filter((key) => key.startsWith("pb-"));
      await Promise.all(photoboothCaches.map((key) => caches.delete(key)));
    } catch (error) {
      console.warn("Service worker cache cleanup failed:", error);
    }
  }

  function init() {
    __appRuntimeContext.setupLaunchMode = __appRuntimeContext.loadSetupLaunchMode();
    __appRuntimeContext.syncSetupLaunchModeUi();
    __appRuntimeContext.setupBoothButtons();
    __appRuntimeContext.setupMobileSettingsControls();
    __appRuntimeContext.setupVideoListeners();
    __appRuntimeContext.setupFinalPreviewListeners();
    __appRuntimeContext.setupThemeEditorControls();
    __appRuntimeContext.setupCreateThemeModalControls();
    __appRuntimeContext.setupCreateEventModalControls();
    __appRuntimeContext.setupVideoImportControls();
    __appRuntimeContext.setup360ModeControls();
    __appRuntimeContext.setupOfflineControls();
    __appRuntimeContext.setupAllowRetakesToggle();
    __appRuntimeContext.setupLivePhotoToggle();
    __appRuntimeContext.setupRecordingModeToggle();
    __appRuntimeContext.setupInstantCaptureToggle();
    __appRuntimeContext.setupCountdownFiveToggle();
    __appRuntimeContext.setupThemeSoundToggle();
    __appRuntimeContext.setupThemeSoundControls();
    __appRuntimeContext.setupLowLightToggle();
    __appRuntimeContext.setupGreenScreenToggle();
    __appRuntimeContext.setupAiBackgroundToggle();
    __appRuntimeContext.setupBeautyPresetEditor();
    __appRuntimeContext.setupCameraZoomControls();
    __appRuntimeContext.setupEditModeControls();
    __appRuntimeContext.setupEventNameInput();
    __appRuntimeContext.setupEventVisualEditorControls();
    __appRuntimeContext.setupEventDateInput();
    __appRuntimeContext.setupEventProfileControls();
    __appRuntimeContext.setupAssetPanelControls();
    __appRuntimeContext.setupSetupTabs();
    __appRuntimeContext.setupWelcomeInteractions();
    __appRuntimeContext.loadCloudinarySettings();
    __appRuntimeContext.loadPrintSettings();
    __appRuntimeContext.setThemeEditorMode(__appRuntimeContext.THEME_EDITOR.mode.value);
    __appRuntimeContext.loadEmailJsSettings();
    __appRuntimeContext.updatePendingUI();
    __appRuntimeContext.flushPendingUploads();
    __appRuntimeContext.flushPendingGalleryRecords();
    __appRuntimeContext.applyPreviewOrientation();
    __appRuntimeContext.applyViewportProfile();
    __appRuntimeContext.syncMobileSettingsUi();
    __appRuntimeContext.updateSystemStatusStrip();
    __appRuntimeContext.updateLaunchSummary();
    setInterval(__appRuntimeContext.updateSystemStatusStrip, 3000);
  }

  function setupInstallPrompt() {
    let deferredPrompt = null;
    const btn = __appRuntimeContext.DOM.installBtn;
    if (btn) btn.classList.add("hidden");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (btn) btn.classList.remove("hidden");
    });
    if (btn)
      btn.onclick = async () => {
        if (!deferredPrompt) {
          // iOS Safari has no beforeinstallprompt; show a hint
          alert("On iPhone/iPad: tap Share → Add to Home Screen");
          return;
        }
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } catch (_) {}
        deferredPrompt = null;
        btn.classList.add("hidden");
      };
  }

  function installLifecycle() {
    window.addEventListener("beforeunload", () => {
      if (__appRuntimeContext.relayPort && __appRuntimeContext.relayPort.writable) {
        setMotorPower(false);
      }
    });

    if ("serviceWorker" in navigator) {
      let serviceWorkerControllerReloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (serviceWorkerControllerReloaded) return;
        serviceWorkerControllerReloaded = true;
        window.location.reload();
      });

      window.addEventListener("load", async () => {
        if (isLocalDevHost()) {
          await clearPhotoboothServiceWorkerState();
          console.log("Service worker disabled for local development.");
          return;
        }

        try {
          const swUrl = new URL("sw.js", window.location.href);
          const reg = await navigator.serviceWorker.register(swUrl.href);
          // Nudge the SW to check for updates on load
          try {
            await reg.update();
          } catch (_) {}
          console.log("SW registered:", reg && reg.scope);
        } catch (registrationError) {
          console.warn("SW registration failed:", registrationError);
        }
      });
    }

    document.addEventListener("DOMContentLoaded", async () => {
      console.log("DOMContentLoaded event fired.");
      // Warm the QR library before guests reach the share screen.
      void __appRuntimeContext.loadQrCodeLibrary().catch(() => {});
      __appRuntimeContext.loadThemesFromStorage();
      __appRuntimeContext.loadEventsFromStorage();
      __appRuntimeContext.loadFontsFromStorage();
      __appRuntimeContext.loadAssetLibraryLocal();
      if (__appRuntimeContext.repairCorruptedBackgroundDefaults()) __appRuntimeContext.saveThemesToStorage();
      deferNonCriticalTask(() => __appRuntimeContext.loadAssetLibraryRemote().catch(() => __appRuntimeContext.renderAssetLibrary()));
      __appRuntimeContext.setupFontPicker().catch((e) => {
        console.warn("Font picker setup failed", e);
      });
      const initialKey = __appRuntimeContext.populateThemeSelector(__appRuntimeContext.getStartupThemeKey());
      __appRuntimeContext.populateEventProfileSelect(__appRuntimeContext.getActiveEventId());
      if (initialKey) __appRuntimeContext.loadTheme(initialKey);
      __appRuntimeContext.syncEventInputsFromActive();
      __appRuntimeContext.goAdmin(); // Start on admin screen
      ["click", "mousemove", "keydown", "touchstart"].forEach((evt) =>
        document.addEventListener(evt, __appRuntimeContext.resetIdleTimer)
      );
      __appRuntimeContext.resetIdleTimer();
      init();
      __appRuntimeContext.applyBoothTestModeFromUrl();
      setupInstallPrompt();
      __appRuntimeContext.ensureRemoteSeed();
      __appRuntimeContext.updateThemeEditorSummary();
      __appRuntimeContext.updateCountdownFontSize();
      __appRuntimeContext.applyViewportProfile();
      requestAnimationFrame(__appRuntimeContext.syncFrameSizeVars);
      window.addEventListener("resize", () => {
        __appRuntimeContext.updateCountdownFontSize();
        __appRuntimeContext.applyViewportProfile();
        __appRuntimeContext.syncMobileSettingsUi();
        __appRuntimeContext.fitBannerTextToViewport();
        __appRuntimeContext.fitWelcomeTitleToViewport();
        if (__appRuntimeContext.DOM.welcomeScreen && __appRuntimeContext.DOM.welcomeScreen.classList.contains("custom-idle-screen")) {
          const idleEntry = __appRuntimeContext.selectIdleScreenEntry();
          if (idleEntry) __appRuntimeContext.positionIdleStartHotspot(idleEntry);
        } else if (__appRuntimeContext.DOM.welcomeScreen && __appRuntimeContext.DOM.welcomeScreen.classList.contains("custom-photo-choice-screen")) {
          const photoChoiceEntry = __appRuntimeContext.selectPhotoChoiceScreenEntry();
          if (photoChoiceEntry) __appRuntimeContext.positionPhotoChoiceHotspots(photoChoiceEntry);
        }
        requestAnimationFrame(__appRuntimeContext.syncFrameSizeVars);
        requestAnimationFrame(() => __appRuntimeContext.logBoothViewportOverflow());
      });
      window.addEventListener("orientationchange", () => {
        requestAnimationFrame(() => {
          __appRuntimeContext.updateCountdownFontSize();
          __appRuntimeContext.applyViewportProfile();
          __appRuntimeContext.syncMobileSettingsUi();
          __appRuntimeContext.fitBannerTextToViewport();
          __appRuntimeContext.fitWelcomeTitleToViewport();
          if (__appRuntimeContext.DOM.welcomeScreen && __appRuntimeContext.DOM.welcomeScreen.classList.contains("custom-idle-screen")) {
            const idleEntry = __appRuntimeContext.selectIdleScreenEntry();
            if (idleEntry) __appRuntimeContext.applyCustomIdleScreen(idleEntry);
          } else if (__appRuntimeContext.DOM.welcomeScreen && __appRuntimeContext.DOM.welcomeScreen.classList.contains("custom-photo-choice-screen")) {
            const photoChoiceEntry = __appRuntimeContext.selectPhotoChoiceScreenEntry();
            if (photoChoiceEntry) __appRuntimeContext.applyCustomPhotoChoiceScreen(photoChoiceEntry);
          }
          __appRuntimeContext.syncFrameSizeVars();
          __appRuntimeContext.logBoothViewportOverflow();
        });
      });
    });

    window.addEventListener("storage", (event) => {
      if (!event || event.key !== __appRuntimeContext.APP_CONFIG.STORAGE_KEYS.THEMES) return;
      __appRuntimeContext.loadThemesFromStorage();
      const selectedKey = __appRuntimeContext.getSelectedThemeKey();
      const preferredKey = selectedKey || __appRuntimeContext.DEFAULT_THEME_KEY;
      const resolvedKey = __appRuntimeContext.populateThemeSelector(preferredKey);
      if (resolvedKey) {
        __appRuntimeContext.setEventSelection(resolvedKey);
        __appRuntimeContext.loadTheme(resolvedKey);
      }
    });

    window.addEventListener("message", (event) => {
      if (!event || event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type !== "photobooth-assets-updated") return;
      __appRuntimeContext.loadThemesFromStorage();
      const preferredKey =
        (typeof data.themeKey === "string" && data.themeKey) ||
        (__appRuntimeContext.getSelectedThemeKey() || __appRuntimeContext.DEFAULT_THEME_KEY);
      const resolvedKey = __appRuntimeContext.populateThemeSelector(preferredKey);
      if (resolvedKey) {
        __appRuntimeContext.setEventSelection(resolvedKey);
        __appRuntimeContext.loadTheme(resolvedKey);
      }
      __appRuntimeContext.showToast("Builder asset added");
    });

    Object.assign(window, {
      __photoboothQA: {
        auditLayout: __appRuntimeContext.auditBoothLayout,
        enterState: __appRuntimeContext.enterBoothQaState,
        isTestMode: __appRuntimeContext.isBoothTestMode,
        showFinal: __appRuntimeContext.showFinal,
      },
      __photoboothTest: {
        composeStrip: __appRuntimeContext.composeStrip,
        finalizeToPrint: __appRuntimeContext.finalizeToPrint,
        processCanvasThroughImagingPipeline: __appRuntimeContext.processCanvasThroughImagingPipeline,
        ensureGuestPhotoProcessed: __appRuntimeContext.ensureGuestPhotoProcessed,
        getActiveEvent: () => __appRuntimeContext.getActiveEvent(),
        getEventById: (id) => __appRuntimeContext.getStoredEvents().find((event) => event && event.id === id) || null,
        getSelectedThemeKey: () => __appRuntimeContext.getSelectedThemeKey(),
        createWeddingTheme: __appRuntimeContext.createEucalyptusWeddingTheme,
        getThemeByKey: (themeKey) => __appRuntimeContext.resolveThemeByKey(themeKey),
        getThemes: () => __appRuntimeContext.themes,
        getBaseBackgroundList: (theme = __appRuntimeContext.activeTheme) => __appRuntimeContext.getBaseBackgroundList(theme),
        getBaseTemplateList: (theme = __appRuntimeContext.activeTheme) => __appRuntimeContext.getBaseTemplateList(theme),
        getBaseOverlayList: (theme = __appRuntimeContext.activeTheme) => __appRuntimeContext.getBaseOverlayList(theme),
        getAllThemeBackgroundCatalogList: __appRuntimeContext.getAllThemeBackgroundCatalogList,
        getAllAssetLibraryRows: __appRuntimeContext.getAllAssetLibraryRows,
        getAssetThemeDefaultCount: __appRuntimeContext.getAssetThemeDefaultCount,
        repairCorruptedBackgroundDefaults: __appRuntimeContext.repairCorruptedBackgroundDefaults,
        openAssetThemeDefaultsModal: __appRuntimeContext.openAssetThemeDefaultsModal,
        getEffectiveBackgroundList: () => __appRuntimeContext.getEffectiveBackgroundList(__appRuntimeContext.activeTheme),
        getEffectiveOverlayList: () => __appRuntimeContext.getEffectiveOverlayList(__appRuntimeContext.activeTheme),
        getEffectiveTemplateList: () => __appRuntimeContext.getEffectiveTemplateList(__appRuntimeContext.activeTheme),
        removeSessionAssetBySrc: __appRuntimeContext.removeSessionAssetBySrc,
        getOverlayList: () => __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme),
        getActiveTheme: () => __appRuntimeContext.activeTheme,
        getPhotoOverlayOrientation: (entry) => __appRuntimeContext.getPhotoOverlayOrientation(entry),
        getPhotoOverlayFormat: () => __appRuntimeContext.photoOverlayOrientation,
        setPhotoOverlayFormat: (orientation) => __appRuntimeContext.setPhotoOverlayOrientation(orientation),
        getResolvedCaptureAspectRatio: () => __appRuntimeContext.getResolvedCaptureAspectRatio(),
        getPrintSizeForOrientation: (orientation) =>
          __appRuntimeContext.getPrintSizeForOrientation(orientation),
        createPrintCanvas: (orientation) => __appRuntimeContext.createPrintCanvas(orientation).canvas,
        getOutputSurfaceTrace: () => __appRuntimeContext.getOutputSurfaceTraceSnapshot(),
        patchActiveTheme: (patch = {}) => {
          if (!__appRuntimeContext.activeTheme || !patch || typeof patch !== "object") return null;
          Object.assign(__appRuntimeContext.activeTheme, patch);
          __appRuntimeContext.applyThemeBasics(__appRuntimeContext.activeTheme);
          __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme);
          __appRuntimeContext.updateCurrentEventAssetsPanel(__appRuntimeContext.activeTheme);
          __appRuntimeContext.renderOptions();
          __appRuntimeContext.updateStylePreview();
          return __appRuntimeContext.activeTheme;
        },
        getOverlayFixedAsset: __appRuntimeContext.getOverlayFixedAsset,
        normalizeOverlayDefinition: (entry) => __appRuntimeContext.normalizeOverlayDefinition(entry),
        setTestOverlays: (overlays = []) => {
          if (!__appRuntimeContext.activeTheme || typeof __appRuntimeContext.activeTheme !== "object") return [];
          __appRuntimeContext.activeTheme.overlays = Array.isArray(overlays)
            ? overlays
                .map((item) => __appRuntimeContext.normalizeOverlayDefinition(item))
                .filter(Boolean)
            : [];
          const overlayList = __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme);
          __appRuntimeContext.selectedOverlay = overlayList[0] ? overlayList[0].src : null;
          __appRuntimeContext.lastPhotoOverlay = __appRuntimeContext.selectedOverlay;
          __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation] = __appRuntimeContext.selectedOverlay;
          __appRuntimeContext.renderOptions();
          __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
          return overlayList;
        },
        probeOverlayAutofill: (overlaySrc, width = 1800, height = 1350, eventOverride = null) => {
          const overlayDefinition = __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme).find(
            (item) => item && item.src === overlaySrc
          );
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          const calls = [];
          const originalFillText = ctx.fillText.bind(ctx);
          ctx.fillText = (text, ...args) => {
            calls.push(String(text));
            return originalFillText(text, ...args);
          };
          __appRuntimeContext.drawTemplateTextFields(
            ctx,
            width,
            height,
            overlayDefinition && overlayDefinition.textFields,
            eventOverride || __appRuntimeContext.getActiveEvent(),
            __appRuntimeContext.activeTheme
          );
          return calls;
        },
        probeTemplateAutofill: (template, width = 1200, height = 1800, eventOverride = null) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          const calls = [];
          const originalFillText = ctx.fillText.bind(ctx);
          ctx.fillText = (text, ...args) => {
            calls.push(String(text));
            return originalFillText(text, ...args);
          };
          __appRuntimeContext.drawTemplateTextFields(
            ctx,
            width,
            height,
            template && template.textFields,
            eventOverride || __appRuntimeContext.getActiveEvent(),
            __appRuntimeContext.activeTheme
          );
          return calls;
        },
      },
      cancelHideTimer: __appRuntimeContext.cancelHideTimer,
      capturePhotoFlow: __appRuntimeContext.capturePhotoFlow,
      clearAnalytics: __appRuntimeContext.clearAnalytics,
      closeConfirm: __appRuntimeContext.closeConfirm,
      confirmTemplate: __appRuntimeContext.confirmTemplate,
      copyEventGalleryLink: __appRuntimeContext.copyEventGalleryLink,
      createNewEventFromSelection: __appRuntimeContext.createNewEventFromSelection,
      connectMotorRelay,
      copyShareLink: __appRuntimeContext.copyShareLink,
      copyStaffPrintQueueUrl: __appRuntimeContext.copyStaffPrintQueueUrl,
      downloadShareImage: __appRuntimeContext.downloadShareImage,
      exitFinalPreview: __appRuntimeContext.exitFinalPreview,
      exportCurrentEvent: __appRuntimeContext.exportCurrentEvent,
      goAdmin: __appRuntimeContext.goAdmin,
      goBackFromBooth: __appRuntimeContext.goBackFromBooth,
      goBackFromWelcome: __appRuntimeContext.goBackFromWelcome,
      beginModeSelection: __appRuntimeContext.beginModeSelection,
      beginWelcome: __appRuntimeContext.beginWelcome,
      hideWelcome: __appRuntimeContext.hideWelcome,
      startBooth: __appRuntimeContext.startBoothFromAdmin,
      startCamera: __appRuntimeContext.startCameraFlow,
      handlePrimaryAction: __appRuntimeContext.handlePrimaryAction,
      makeAvailableOffline: __appRuntimeContext.makeAvailableOffline,
      migrateAllManagedLocalAssets: __appRuntimeContext.migrateAllManagedLocalAssets,
      openShareLink: __appRuntimeContext.openShareLink,
      openLayoutBuilder: __appRuntimeContext.openLayoutBuilder,
      openEventGalleryLink: __appRuntimeContext.openEventGalleryLink,
      retakePhoto: __appRuntimeContext.retakePhoto,
      saveCloudinarySettings: __appRuntimeContext.saveCloudinarySettings,
      savePrintSettings: __appRuntimeContext.savePrintSettings,
      saveEmailJsSettings: __appRuntimeContext.saveEmailJsSettings,
      saveTheme: __appRuntimeContext.saveTheme,
      sendPendingNow: __appRuntimeContext.sendPendingNow,
      sendTestEmail: __appRuntimeContext.sendTestEmail,
      setMode: __appRuntimeContext.setMode,
      setSetupLaunchMode: __appRuntimeContext.setSetupLaunchMode,
      syncNow: __appRuntimeContext.syncNow,
      toggleAnalytics: __appRuntimeContext.toggleAnalytics,
      undoLastRemoval: __appRuntimeContext.undoLastRemoval,
    });
  }

  return {
    isLocalDevHost,
    deferNonCriticalTask,
    connectMotorRelay,
    setMotorPower,
    clearPhotoboothServiceWorkerState,
    init,
    setupInstallPrompt,
    installLifecycle,
  };
}
