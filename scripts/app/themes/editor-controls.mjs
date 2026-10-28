export function createEditorControlsModule(__appRuntimeContext) {
  function setupThemeEditorControls() {
    __appRuntimeContext.THEME_EDITOR.mode.addEventListener("change", (e) =>
      __appRuntimeContext.setThemeEditorMode(e.target.value)
    );
    document.querySelectorAll("[data-event-type-tile]").forEach((button) => {
      button.addEventListener("click", () => {
        __appRuntimeContext.setSelectedEventType(button.dataset.eventTypeTile || "general");
      });
    });
    __appRuntimeContext.THEME_EDITOR.eventType.addEventListener("change", () => {
      __appRuntimeContext.syncEventTypeTiles();
      __appRuntimeContext.populateThemeSelector(__appRuntimeContext.getSelectedThemeKey());
    });
    if (__appRuntimeContext.DOM.themeCloneName)
      __appRuntimeContext.DOM.themeCloneName.addEventListener("input", __appRuntimeContext.updateThemeEditorSummary);
    if (__appRuntimeContext.DOM.createThemeName)
      __appRuntimeContext.DOM.createThemeName.addEventListener("input", __appRuntimeContext.updateThemeEditorSummary);
    __appRuntimeContext.THEME_EDITOR.bannerSize.addEventListener("input", () => {
        if (__appRuntimeContext.getActiveEvent()) {
          __appRuntimeContext.syncBannerSizeUI(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
          return;
        }
        const target = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
        if (!target) return;
        const size = parseInt(__appRuntimeContext.THEME_EDITOR.bannerSize.value, 10);
        if (!Number.isFinite(size)) return;
        target.bannerSize = size;
        __appRuntimeContext.applyBannerSize(target);
        __appRuntimeContext.syncBannerSizeUI(target);
        __appRuntimeContext.saveThemesToStorage();
    });
    __appRuntimeContext.THEME_EDITOR.welcomeTitleSize.addEventListener("input", () => {
        if (__appRuntimeContext.getActiveEvent()) {
          __appRuntimeContext.syncWelcomeTitleSizeUI(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
          return;
        }
        const target = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
        if (!target) return;
        const size = parseInt(__appRuntimeContext.THEME_EDITOR.welcomeTitleSize.value, 10);
        if (!Number.isFinite(size)) return;
        target.welcomeTitleSize = size;
        __appRuntimeContext.applyWelcomeTitleSize(target);
        __appRuntimeContext.syncWelcomeTitleSizeUI(target);
        __appRuntimeContext.saveThemesToStorage();
    });
    if (__appRuntimeContext.DOM.cloneThemeBtn)
      __appRuntimeContext.DOM.cloneThemeBtn.addEventListener("click", __appRuntimeContext.handleCloneTheme);
    if (__appRuntimeContext.DOM.addLogoBtn && __appRuntimeContext.DOM.themeLogo)
      __appRuntimeContext.DOM.addLogoBtn.addEventListener("click", () => __appRuntimeContext.DOM.themeLogo.click());
    if (__appRuntimeContext.DOM.addAssetsBtn && __appRuntimeContext.DOM.bulkAssetsInput)
      __appRuntimeContext.DOM.addAssetsBtn.addEventListener("click", () =>
        __appRuntimeContext.DOM.bulkAssetsInput.click()
      );
    if (__appRuntimeContext.DOM.bulkAssetsInput)
      __appRuntimeContext.DOM.bulkAssetsInput.addEventListener("change", () =>
        openBulkAssetModal(__appRuntimeContext.DOM.bulkAssetsInput.files)
      );
    if (__appRuntimeContext.DOM.bulkAssetCancel)
      __appRuntimeContext.DOM.bulkAssetCancel.addEventListener("click", closeBulkAssetModal);
    if (__appRuntimeContext.DOM.bulkAssetApply)
      __appRuntimeContext.DOM.bulkAssetApply.addEventListener("click", async () => {
        if (__appRuntimeContext.DOM.bulkAssetApply.disabled) return;
        setBulkAssetUploadBusy(true);
        try {
          await applyBulkAssetUpload();
        } catch (err) {
          console.error("Bulk asset upload failed", err);
          __appRuntimeContext.showToast("Bulk upload failed.");
        } finally {
          setBulkAssetUploadBusy(false);
        }
      });
    if (__appRuntimeContext.DOM.bulkAssetModal) {
      __appRuntimeContext.DOM.bulkAssetModal.addEventListener("click", (event) => {
        if (event.target === __appRuntimeContext.DOM.bulkAssetModal) closeBulkAssetModal();
      });
    }
    if (__appRuntimeContext.DOM.assetThemeDefaultsCancel)
      __appRuntimeContext.DOM.assetThemeDefaultsCancel.addEventListener("click", __appRuntimeContext.closeAssetThemeDefaultsModal);
    if (__appRuntimeContext.DOM.assetThemeDefaultsSave)
      __appRuntimeContext.DOM.assetThemeDefaultsSave.addEventListener("click", __appRuntimeContext.saveAssetThemeDefaults);
    if (__appRuntimeContext.DOM.assetThemeDefaultsSelectCurrent)
      __appRuntimeContext.DOM.assetThemeDefaultsSelectCurrent.addEventListener(
        "click",
        __appRuntimeContext.selectCurrentThemeForAssetDefaults
      );
    if (__appRuntimeContext.DOM.assetThemeDefaultsClearAll)
      __appRuntimeContext.DOM.assetThemeDefaultsClearAll.addEventListener(
        "click",
        __appRuntimeContext.clearAssetThemeDefaults
      );
    if (__appRuntimeContext.DOM.assetThemeDefaultsModal) {
      __appRuntimeContext.DOM.assetThemeDefaultsModal.addEventListener("click", (event) => {
        if (event.target === __appRuntimeContext.DOM.assetThemeDefaultsModal)
          __appRuntimeContext.closeAssetThemeDefaultsModal();
      });
    }
    const refreshAssetLibraryFromFilter = () => {
      __appRuntimeContext.resetAssetLibraryVisibleCount();
      __appRuntimeContext.renderAssetLibrary();
    };
    if (__appRuntimeContext.DOM.assetLibrarySearch)
      __appRuntimeContext.DOM.assetLibrarySearch.addEventListener("input", refreshAssetLibraryFromFilter);
    if (__appRuntimeContext.DOM.assetLibraryCategory)
      __appRuntimeContext.DOM.assetLibraryCategory.addEventListener("change", (event) => {
        refreshAssetLibraryFromFilter();
        const selectedCategory = event.target.value || __appRuntimeContext.getMainAssetLibraryCategory();
        __appRuntimeContext.loadAssetLibraryRemote(selectedCategory).catch((err) => {
          console.warn("Asset library category load failed", err);
        });
      });
    if (__appRuntimeContext.DOM.assetLibraryHolidayTheme)
      __appRuntimeContext.DOM.assetLibraryHolidayTheme.addEventListener("change", (event) => {
        __appRuntimeContext.assetLibraryState.selectedHolidayThemeKey = event.target.value;
        refreshAssetLibraryFromFilter();
      });
    if (__appRuntimeContext.DOM.assetLibrarySort)
      __appRuntimeContext.DOM.assetLibrarySort.addEventListener("change", refreshAssetLibraryFromFilter);
    if (__appRuntimeContext.DOM.assetLibraryClearFilters)
      __appRuntimeContext.DOM.assetLibraryClearFilters.addEventListener(
        "click",
        __appRuntimeContext.clearAssetLibraryFilters
      );
    if (__appRuntimeContext.DOM.idleScreenResetZone)
      __appRuntimeContext.DOM.idleScreenResetZone.addEventListener("click", () => {
        if (__appRuntimeContext.activeIdleScreenEditorAsset && __appRuntimeContext.activeIdleScreenEditorAsset.role === "photo-choice") {
          __appRuntimeContext.photoChoiceEditorZones = {
            singlePhoto: __appRuntimeContext.normalizeIdleButtonZone({ x: 34, y: 59, width: 27, height: 50 }),
            photoStrip: __appRuntimeContext.normalizeIdleButtonZone({ x: 66, y: 59, width: 27, height: 50 }),
          };
        } else {
          __appRuntimeContext.idleScreenEditorZone = __appRuntimeContext.normalizeIdleButtonZone();
        }
        __appRuntimeContext.renderIdleScreenEditorZone();
      });
    if (__appRuntimeContext.DOM.idleScreenEditorCancel)
      __appRuntimeContext.DOM.idleScreenEditorCancel.addEventListener("click", __appRuntimeContext.closeIdleScreenEditor);
    if (__appRuntimeContext.DOM.idleScreenEditorSave)
      __appRuntimeContext.DOM.idleScreenEditorSave.addEventListener("click", __appRuntimeContext.saveIdleScreenEditor);
    if (__appRuntimeContext.DOM.overlaySlotEditorFit)
      __appRuntimeContext.DOM.overlaySlotEditorFit.addEventListener("change", () => {
        if (!__appRuntimeContext.overlaySlotEditorSlot) return;
        __appRuntimeContext.overlaySlotEditorSlot.objectFit = __appRuntimeContext.DOM.overlaySlotEditorFit.value === "contain" ? "contain" : "cover";
      });
    if (__appRuntimeContext.DOM.overlaySlotEditorReset)
      __appRuntimeContext.DOM.overlaySlotEditorReset.addEventListener("click", () => {
        const index = __appRuntimeContext.overlaySlotEditorSelectedIndex || 0;
        __appRuntimeContext.overlaySlotEditorSlots[index] = __appRuntimeContext.createDefaultOverlayPhotoSlot();
        __appRuntimeContext.overlaySlotEditorSlot = __appRuntimeContext.overlaySlotEditorSlots[index];
        __appRuntimeContext.renderOverlaySlotEditorZone();
      });
    if (__appRuntimeContext.DOM.overlaySlotEditorCancel)
      __appRuntimeContext.DOM.overlaySlotEditorCancel.addEventListener("click", __appRuntimeContext.closeOverlaySlotEditor);
    if (__appRuntimeContext.DOM.overlaySlotEditorSave)
      __appRuntimeContext.DOM.overlaySlotEditorSave.addEventListener("click", __appRuntimeContext.saveOverlaySlotEditor);
    if (__appRuntimeContext.DOM.refreshAssetLibraryBtn)
      __appRuntimeContext.DOM.refreshAssetLibraryBtn.addEventListener("click", () => {
        __appRuntimeContext.loadAssetLibraryRemote().catch((err) => {
          console.warn("Asset library refresh failed", err);
          __appRuntimeContext.showToast("Asset library refresh failed.");
        });
      });
    if (__appRuntimeContext.DOM.eventToSubThemeBtn)
      __appRuntimeContext.DOM.eventToSubThemeBtn.addEventListener("click", __appRuntimeContext.createSubThemeFromEvent);
    if (__appRuntimeContext.DOM.themeBackground)
      __appRuntimeContext.DOM.themeBackground.addEventListener("change", () =>
        handleThemeAssetInputChange("background")
      );
    if (__appRuntimeContext.DOM.themeLogo)
      __appRuntimeContext.DOM.themeLogo.addEventListener("change", () =>
        handleThemeAssetInputChange("logo")
      );
    if (__appRuntimeContext.DOM.themeGreenBackgrounds)
      __appRuntimeContext.DOM.themeGreenBackgrounds.addEventListener("change", () =>
        handleThemeAssetInputChange("greenBackgrounds")
      );
    if (__appRuntimeContext.DOM.themeOverlays)
      __appRuntimeContext.DOM.themeOverlays.addEventListener("change", () =>
        handleThemeAssetInputChange("overlay")
      );
    if (__appRuntimeContext.DOM.themeTemplates)
      __appRuntimeContext.DOM.themeTemplates.addEventListener("change", () =>
        handleThemeAssetInputChange("template")
      );
    if (__appRuntimeContext.DOM.themeCharacter)
      __appRuntimeContext.DOM.themeCharacter.addEventListener("change", () =>
        handleThemeAssetInputChange("character")
      );
    __appRuntimeContext.THEME_EDITOR.welcomeTitle.addEventListener("input", __appRuntimeContext.updateStylePreview);
    __appRuntimeContext.THEME_EDITOR.welcomePrompt.addEventListener("input", __appRuntimeContext.updateStylePreview);
  }

  function handleThemeAssetInputChange(kind) {
    let input = null;
    if (kind === "background") input = __appRuntimeContext.DOM.themeBackground;
    else if (kind === "logo") input = __appRuntimeContext.DOM.themeLogo;
    else if (kind === "overlay") input = __appRuntimeContext.DOM.themeOverlays;
    else if (kind === "template") input = __appRuntimeContext.DOM.themeTemplates;
    else if (kind === "greenBackgrounds") input = __appRuntimeContext.DOM.themeGreenBackgrounds;
    if (!input || !input.files || input.files.length === 0) return;
    const active = __appRuntimeContext.getActiveEvent();
    if (active) {
      if (kind === "logo") {
        __appRuntimeContext.handleEventSingleAssetInput(kind, input.files)
          .catch((err) => {
            console.error("Failed to update event assets:", err);
          })
          .finally(() => {
            input.value = "";
          });
        return;
      }
      const kindMap = {
        background: "backgrounds",
        overlay: "overlays",
        template: "templates",
        greenBackgrounds: "greenBackgrounds",
      };
      const eventKind = kindMap[kind];
      if (eventKind) {
        __appRuntimeContext.handleEventOnlyAssetInput(eventKind, input.files)
          .catch((err) => {
            console.error("Failed to update event assets:", err);
          })
          .finally(() => {
            input.value = "";
          });
        return;
      }
    }
    if (!__appRuntimeContext.getActiveEvent()) {
      const kindMap = {
        background: "backgrounds",
        overlay: "overlays",
        template: "templates",
        greenBackgrounds: "greenBackgrounds",
        logo: "logo",
      };
      const sessionKind = kindMap[kind];
      if (sessionKind) {
        __appRuntimeContext.uploadCreatePathSessionAssets(sessionKind, input.files)
          .catch((err) => {
            console.error("Failed to update session assets:", err);
          })
          .finally(() => {
            input.value = "";
          });
        return;
      }
    }
    __appRuntimeContext.updateCurrentThemeAssets(kind).catch((err) =>
      console.error("Failed to update theme assets:", err)
    );
  }

  function openBulkAssetModal(fileList) {
    __appRuntimeContext.pendingBulkAssetFiles = Array.from(fileList || []).filter(Boolean);
    if (!__appRuntimeContext.pendingBulkAssetFiles.length) return;
    setBulkAssetUploadBusy(false);
    if (__appRuntimeContext.DOM.bulkAssetSummary) {
      const count = __appRuntimeContext.pendingBulkAssetFiles.length;
      __appRuntimeContext.DOM.bulkAssetSummary.textContent = `${count} file${
        count === 1 ? "" : "s"
      } selected`;
    }
    if (__appRuntimeContext.DOM.bulkAssetModal) __appRuntimeContext.DOM.bulkAssetModal.classList.remove("hidden");
  }

  function setBulkAssetUploadBusy(isBusy) {
    const busy = isBusy === true;
    if (__appRuntimeContext.DOM.bulkAssetApply) {
      __appRuntimeContext.DOM.bulkAssetApply.disabled = busy;
      __appRuntimeContext.DOM.bulkAssetApply.textContent = busy ? "Uploading…" : "Upload";
    }
    if (__appRuntimeContext.DOM.bulkAssetCancel) __appRuntimeContext.DOM.bulkAssetCancel.disabled = busy;
    if (__appRuntimeContext.DOM.bulkAssetModal) {
      __appRuntimeContext.DOM.bulkAssetModal.setAttribute("aria-busy", busy ? "true" : "false");
      __appRuntimeContext.DOM.bulkAssetModal
        .querySelectorAll('input[type="checkbox"]')
        .forEach((input) => {
          input.disabled = busy;
        });
    }
    if (__appRuntimeContext.DOM.bulkAssetSummary && busy) {
      const count = __appRuntimeContext.pendingBulkAssetFiles.length;
      __appRuntimeContext.DOM.bulkAssetSummary.textContent = `Uploading ${count} file${
        count === 1 ? "" : "s"
      }…`;
    } else if (__appRuntimeContext.DOM.bulkAssetSummary && __appRuntimeContext.pendingBulkAssetFiles.length) {
      const count = __appRuntimeContext.pendingBulkAssetFiles.length;
      __appRuntimeContext.DOM.bulkAssetSummary.textContent = `${count} file${
        count === 1 ? "" : "s"
      } selected`;
    }
  }

  function closeBulkAssetModal() {
    __appRuntimeContext.pendingBulkAssetFiles = [];
    if (__appRuntimeContext.DOM.bulkAssetsInput) __appRuntimeContext.DOM.bulkAssetsInput.value = "";
    if (__appRuntimeContext.DOM.bulkAssetModal) __appRuntimeContext.DOM.bulkAssetModal.classList.add("hidden");
  }

  function getBulkAssetKinds() {
    const kinds = [];
    if (__appRuntimeContext.DOM.bulkToBackgrounds && __appRuntimeContext.DOM.bulkToBackgrounds.checked) kinds.push("backgrounds");
    else if (__appRuntimeContext.DOM.bulkToGreenBackgrounds && __appRuntimeContext.DOM.bulkToGreenBackgrounds.checked)
      kinds.push("greenBackgrounds");
    if (__appRuntimeContext.DOM.bulkToOverlays && __appRuntimeContext.DOM.bulkToOverlays.checked) kinds.push("overlays");
    if (__appRuntimeContext.DOM.bulkToTemplates && __appRuntimeContext.DOM.bulkToTemplates.checked)
      kinds.push("templates");
    if (__appRuntimeContext.DOM.bulkToIdleScreens && __appRuntimeContext.DOM.bulkToIdleScreens.checked)
      kinds.push("idle-screens");
    if (__appRuntimeContext.DOM.bulkToPhotoChoiceScreens && __appRuntimeContext.DOM.bulkToPhotoChoiceScreens.checked)
      kinds.push("photo-choice-screens");
    if (__appRuntimeContext.DOM.bulkToThankYouScreens && __appRuntimeContext.DOM.bulkToThankYouScreens.checked)
      kinds.push("thank-you-screens");
    return kinds;
  }

  function addAssetUrlToTheme(target, kind, url) {
    if (!target || !url) return;
    if (kind === "templates") {
      if (!Array.isArray(target.templates)) target.templates = [];
      target.templates.push({ src: url, layout: "double_column" });
      return;
    }
    if (kind === "overlays") {
      if (!Array.isArray(target.overlays)) target.overlays = [];
      target.overlays.push(url);
      return;
    }
    if (kind === "greenBackgrounds") {
      if (!Array.isArray(target.greenBackgrounds)) target.greenBackgrounds = [];
      target.greenBackgrounds.push(url);
      return;
    }
    if (kind === "backgrounds") {
      if (Array.isArray(target.backgrounds)) {
        target.backgrounds.push(url);
      } else if (target.background) {
        target.backgrounds = [target.background, url];
        delete target.backgroundIndex;
      } else {
        target.background = url;
      }
    }
  }

  function isPhotoChoiceAssetKind(kind) {
    return kind === "photo-choice-screens";
  }

  function isThankYouAssetKind(kind) {
    return kind === "thank-you-screens";
  }

  function buildThankYouScreenEntryFromUrl(url, file = null) {
    return {
      src: url,
      orientation: __appRuntimeContext.inferAssetOrientationFromName(file),
      name: (file && file.name) || "Thank You Screen",
      contentType: (file && file.type) || "",
    };
  }

  function replaceThankYouScreenOrientation(entries, entry) {
    const orientation = __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation);
    return [
      ...(Array.isArray(entries) ? entries : []).filter(
        (item) => __appRuntimeContext.normalizeIdleScreenOrientation(item && item.orientation) !== orientation
      ),
      entry,
    ];
  }

  function replaceIdleScreenRoleEntry(entries, entry) {
    const role = entry && entry.role === "photo-choice" ? "photo-choice" : "idle";
    const orientation = __appRuntimeContext.normalizeIdleScreenOrientation(
      entry && entry.orientation
    );
    return [
      ...(Array.isArray(entries) ? entries : []).filter(
        (item) =>
          (item && item.role === "photo-choice" ? "photo-choice" : "idle") !==
            role ||
          __appRuntimeContext.normalizeIdleScreenOrientation(item && item.orientation) !==
            orientation
      ),
      entry,
    ];
  }

  async function applyBulkAssetUpload() {
    const files = __appRuntimeContext.pendingBulkAssetFiles.slice();
    if (!files.length) {
      __appRuntimeContext.showToast("Choose files first.");
      return;
    }
    const kinds = getBulkAssetKinds();
    if (!kinds.length) {
      __appRuntimeContext.showToast("Choose at least one destination.");
      return;
    }

    const active = __appRuntimeContext.getActiveEvent();
    if (active) {
      const overrides = __appRuntimeContext.ensureEventOverrides(active);
      let uploadedCount = 0;
      const tasks = [];
      files.forEach((file) => {
        kinds.forEach((kind) => {
          tasks.push(
            __appRuntimeContext.uploadAsset(
              file,
              kind,
              __appRuntimeContext.getEventAssetUploadOptions(active, kind)
            ).then((url) => {
              if (!url) return;
              if (kind === "backgrounds") overrides.backgrounds.push(url);
              if (kind === "greenBackgrounds")
                overrides.greenBackgrounds.push(url);
              if (kind === "overlays") overrides.overlays.push(url);
              if (kind === "templates")
                overrides.templates.push({ src: url, layout: "double_column" });
              if (isThankYouAssetKind(kind)) {
                overrides.thankYouScreens = replaceThankYouScreenOrientation(
                  overrides.thankYouScreens,
                  buildThankYouScreenEntryFromUrl(url, file)
                );
              }
              if (kind === "idle-screens" || isPhotoChoiceAssetKind(kind)) {
                const entry = __appRuntimeContext.buildIdleScreenEntryFromUrl(
                  url,
                  file,
                  isPhotoChoiceAssetKind(kind) ? "photo-choice" : "idle"
                );
                overrides.idleScreens = replaceIdleScreenRoleEntry(
                  overrides.idleScreens,
                  entry
                );
              }
              uploadedCount += 1;
            })
          );
        });
      });
      await Promise.all(tasks);
      if (!uploadedCount) {
        __appRuntimeContext.showToast("No assets were uploaded.");
        return;
      }
      __appRuntimeContext.updateActiveEventDetails({ overrides });
      closeBulkAssetModal();
      __appRuntimeContext.showToast(
        `Added ${uploadedCount} event asset item${
          uploadedCount === 1 ? "" : "s"
        }.`
      );
      return;
    }

    if (!__appRuntimeContext.getSelectedThemeTarget()) {
      alert("Select a theme first.");
      closeBulkAssetModal();
      return;
    }
    let uploaded = 0;
    const tasks = [];
    files.forEach((file) => {
      kinds.forEach((kind) => {
        tasks.push(
          __appRuntimeContext.uploadAsset(file, kind, __appRuntimeContext.getSessionAssetUploadOptions(kind)).then((url) => {
            if (!url) return;
            if (kind === "idle-screens" || isPhotoChoiceAssetKind(kind)) {
              const target = __appRuntimeContext.getSelectedThemeTarget();
              if (target) {
                const entry = __appRuntimeContext.buildIdleScreenEntryFromUrl(
                  url,
                  file,
                  isPhotoChoiceAssetKind(kind) ? "photo-choice" : "idle"
                );
                target.idleScreens = replaceIdleScreenRoleEntry(
                  target.idleScreens,
                  entry
                );
              }
              __appRuntimeContext.saveThemesToStorage();
            } else if (isThankYouAssetKind(kind)) {
              const target = __appRuntimeContext.getSelectedThemeTarget();
              if (target) {
                target.thankYouScreens = replaceThankYouScreenOrientation(
                  target.thankYouScreens,
                  buildThankYouScreenEntryFromUrl(url, file)
                );
              }
              __appRuntimeContext.saveThemesToStorage();
            } else {
              __appRuntimeContext.addSessionAssetUrl(kind, url);
            }
            uploaded += 1;
          })
        );
      });
    });
    await Promise.all(tasks);
    if (!uploaded) {
      __appRuntimeContext.showToast("No assets were uploaded.");
      return;
    }
    const key = __appRuntimeContext.getSelectedThemeKey();
    if (key) __appRuntimeContext.loadTheme(key);
    closeBulkAssetModal();
    __appRuntimeContext.showToast(`Added ${uploaded} session asset item${uploaded === 1 ? "" : "s"}.`);
  }

  return {
    setupThemeEditorControls,
    handleThemeAssetInputChange,
    openBulkAssetModal,
    setBulkAssetUploadBusy,
    closeBulkAssetModal,
    getBulkAssetKinds,
    addAssetUrlToTheme,
    isPhotoChoiceAssetKind,
    isThankYouAssetKind,
    buildThankYouScreenEntryFromUrl,
    replaceThankYouScreenOrientation,
    replaceIdleScreenRoleEntry,
    applyBulkAssetUpload,
  };
}
