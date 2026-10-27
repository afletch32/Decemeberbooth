export function createEventProfileModule(__appRuntimeContext) {
  function setupEventProfileControls() {
    if (__appRuntimeContext.DOM.quickStartCancel)
      __appRuntimeContext.DOM.quickStartCancel.addEventListener("click", __appRuntimeContext.hideQuickStartModal);
    if (__appRuntimeContext.DOM.quickStartConfirm) {
      __appRuntimeContext.DOM.quickStartConfirm.addEventListener("click", __appRuntimeContext.confirmQuickStartFromModal);
    }
    if (__appRuntimeContext.DOM.quickStartModal) {
      __appRuntimeContext.DOM.quickStartModal.addEventListener("click", (event) => {
        if (event.target === __appRuntimeContext.DOM.quickStartModal) __appRuntimeContext.hideQuickStartModal();
      });
      __appRuntimeContext.DOM.quickStartModal.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        __appRuntimeContext.confirmQuickStartFromModal();
      });
    }
    if (__appRuntimeContext.DOM.createPathThemeSelect) {
      __appRuntimeContext.DOM.createPathThemeSelect.addEventListener("change", () => {
        __appRuntimeContext.disableShowcaseDemo();
        const key = __appRuntimeContext.DOM.createPathThemeSelect.value || "";
        if (!key) return;
        __appRuntimeContext.setActiveEventId("");
        __appRuntimeContext.setQuickStartSessionDate(__appRuntimeContext.getLocalIsoDate());
        __appRuntimeContext.setEventSelection(key);
        __appRuntimeContext.loadTheme(key);
      });
    }
    if (__appRuntimeContext.DOM.guestScreenOrientation) {
      __appRuntimeContext.DOM.guestScreenOrientation.addEventListener("change", () => {
        __appRuntimeContext.setGuestScreenOrientation(__appRuntimeContext.DOM.guestScreenOrientation.value);
      });
    }
    __appRuntimeContext.DOM.screenOrientationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!__appRuntimeContext.DOM.guestScreenOrientation || button.disabled) return;
        __appRuntimeContext.DOM.guestScreenOrientation.value = button.dataset.screenOrientation;
        __appRuntimeContext.DOM.guestScreenOrientation.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      });
    });
    if (__appRuntimeContext.DOM.sessionThemeToggle) {
      __appRuntimeContext.DOM.sessionThemeToggle.addEventListener("click", () =>
        __appRuntimeContext.toggleSetupCombobox("theme")
      );
    }
    if (__appRuntimeContext.DOM.sessionThemeSearch) {
      __appRuntimeContext.DOM.sessionThemeSearch.addEventListener("input", () =>
        __appRuntimeContext.renderSessionThemeOptions(__appRuntimeContext.DOM.sessionThemeSearch.value)
      );
      __appRuntimeContext.DOM.sessionThemeSearch.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          __appRuntimeContext.disableShowcaseDemo();
          __appRuntimeContext.selectFirstVisibleComboboxOption("theme");
        } else if (event.key === "Escape") {
          __appRuntimeContext.closeSetupCombobox("theme");
        }
      });
    }
    if (__appRuntimeContext.DOM.sessionFontToggle) {
      __appRuntimeContext.DOM.sessionFontToggle.addEventListener("click", () =>
        __appRuntimeContext.toggleSetupCombobox("font")
      );
    }
    if (__appRuntimeContext.DOM.sessionFontSearch) {
      __appRuntimeContext.DOM.sessionFontSearch.addEventListener("input", () =>
        __appRuntimeContext.renderSessionFontOptions(__appRuntimeContext.DOM.sessionFontSearch.value)
      );
      __appRuntimeContext.DOM.sessionFontSearch.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          __appRuntimeContext.selectFirstVisibleComboboxOption("font");
        } else if (event.key === "Escape") {
          __appRuntimeContext.closeSetupCombobox("font");
        }
      });
    }
    document.addEventListener("click", (event) => {
      if (
        !event.target.closest("[data-setup-combobox=\"theme\"]") &&
        !event.target.closest("[data-setup-combobox=\"font\"]")
      ) {
        __appRuntimeContext.closeSetupCombobox("theme");
        __appRuntimeContext.closeSetupCombobox("font");
      }
    });
    document.querySelectorAll("[data-demo-theme]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (__appRuntimeContext.applyShowcaseDemoTheme(button.dataset.demoTheme)) {
          __appRuntimeContext.showToast(`${button.textContent} ready.`);
          __appRuntimeContext.showWelcome("idle");
        }
      });
    });
    document.querySelectorAll("[data-welcome-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        __appRuntimeContext.beginModeSelection(button.dataset.welcomeMode, event);
      });
    });
    __appRuntimeContext.populateCreatePathThemeSelect(
      __appRuntimeContext.getSelectedThemeKey()
    );
    __appRuntimeContext.syncSessionThemeSearch();
    __appRuntimeContext.syncSessionFontSearch();
    if (__appRuntimeContext.DOM.eventProfileSelect) {
      __appRuntimeContext.DOM.eventProfileSelect.addEventListener("change", (event) => {
        __appRuntimeContext.disableShowcaseDemo();
        const id = event.target.value || "";
        __appRuntimeContext.weddingSetupRequested = false;
        __appRuntimeContext.weddingThemeChoiceDirty = false;
        __appRuntimeContext.setActiveEventId(id);
        __appRuntimeContext.syncEventInputsFromActive();
        __appRuntimeContext.syncEventPrintPriceInput();
        __appRuntimeContext.loadPayPalPrintConfigStatus();
        const active = __appRuntimeContext.getActiveEvent();
        __appRuntimeContext.syncWeddingThemeChoice(active?.weddingThemeStyle || "eucalyptus");
        if (active && active.themeKey) {
          __appRuntimeContext.setEventSelection(active.themeKey);
          __appRuntimeContext.loadTheme(active.themeKey);
        }
        __appRuntimeContext.updateStylePreview();
      });
    }
    if (__appRuntimeContext.DOM.saveEventPrintPriceBtn) {
      __appRuntimeContext.DOM.saveEventPrintPriceBtn.addEventListener("click", __appRuntimeContext.saveActiveEventPrintPrice);
    }
    if (__appRuntimeContext.DOM.eventPrintPriceInput) {
      __appRuntimeContext.DOM.eventPrintPriceInput.addEventListener("input", () => {
        __appRuntimeContext.DOM.eventPrintPriceInput.dataset.dirty = "true";
        __appRuntimeContext.DOM.eventPrintPriceInput.dataset.eventId = __appRuntimeContext.getActiveEvent()?.id || "";
      });
    }
  }

  function setupBoothButtons() {
    const startCameraBtn = document.getElementById("startCameraButton");
    if (startCameraBtn) startCameraBtn.addEventListener("click", __appRuntimeContext.startCamera);
    else console.warn("Start Camera button not found in DOM.");

    const startBoothBtn = document.getElementById("startBoothButton");
    if (startBoothBtn) {
      startBoothBtn.addEventListener("click", __appRuntimeContext.startBooth);
    }
    else console.warn("Start Booth button not found in DOM.");

    if (__appRuntimeContext.DOM.launchModeSingleBtn) {
      __appRuntimeContext.DOM.launchModeSingleBtn.addEventListener("click", () =>
        __appRuntimeContext.setSetupLaunchMode("single_photo")
      );
    }
    if (__appRuntimeContext.DOM.launchModeStripBtn) {
      __appRuntimeContext.DOM.launchModeStripBtn.addEventListener("click", () =>
        __appRuntimeContext.setSetupLaunchMode("strip")
      );
    }
  }

  function setupMobileSettingsControls() {
    if (__appRuntimeContext.DOM.mobileSettingsClose) {
      __appRuntimeContext.DOM.mobileSettingsClose.addEventListener("click", () =>
        __appRuntimeContext.setMobileSettingsOpen(false)
      );
    }
    if (__appRuntimeContext.DOM.mobileSettingsBackdrop) {
      __appRuntimeContext.DOM.mobileSettingsBackdrop.addEventListener("click", () =>
        __appRuntimeContext.setMobileSettingsOpen(false)
      );
    }
    if (__appRuntimeContext.DOM.overlayPickerButton) {
      __appRuntimeContext.DOM.overlayPickerButton.addEventListener("click", () =>
        __appRuntimeContext.setMobileSettingsOpen(true)
      );
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        __appRuntimeContext.setMobileSettingsOpen(false);
      }
    });
  }

  function setupVideoListeners() {
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.addEventListener("loadedmetadata", () => {
        __appRuntimeContext.updateCaptureAspect();
        __appRuntimeContext.applyPreviewOrientation();
      });
    }
  }

  function setupFinalPreviewListeners() {
    if (!__appRuntimeContext.DOM.finalPreview || !__appRuntimeContext.DOM.finalPreviewContent) return;
    __appRuntimeContext.DOM.finalPreview.addEventListener("click", () => __appRuntimeContext.exitFinalPreview());
    __appRuntimeContext.DOM.finalPreviewContent.addEventListener("click", (event) => {
      const interactiveTarget = event.target.closest(
        "button, a, input, textarea, select, label, [role=\"button\"]"
      );
      if (interactiveTarget) event.stopPropagation();
    });
  }

  return {
    setupEventProfileControls,
    setupBoothButtons,
    setupMobileSettingsControls,
    setupVideoListeners,
    setupFinalPreviewListeners,
  };
}
