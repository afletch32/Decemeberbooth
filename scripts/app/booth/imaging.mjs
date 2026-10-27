export function createImagingModule(__appRuntimeContext) {
  async function processCanvasThroughImagingPipeline(sourceCanvas) {
    if (!sourceCanvas) return sourceCanvas;
    let processed = __appRuntimeContext.applySelectedFilterToCanvas(sourceCanvas);
    processed = await __appRuntimeContext.applySelectedBeautyToCanvas(processed);
    if (__appRuntimeContext.getAiBackgroundEnabled()) {
      const mask = await __appRuntimeContext.getAiSegmentationMask(processed);
      if (mask) {
        processed.__aiMask = mask;
        processed = __appRuntimeContext.applyAiMaskToCanvas(processed, mask);
        processed.__aiMask = mask;
      }
    } else if (__appRuntimeContext.getGreenScreenEnabled()) {
      try {
        const ctx = processed.getContext("2d");
        if (ctx) __appRuntimeContext.removeGreen(ctx, processed.width, processed.height);
      } catch (_) {}
    }
    return processed;
  }

  function drawProcessedFrameToLivePreview(processedCanvas) {
    if (__appRuntimeContext.capturePreviewFrozen || !processedCanvas || !__appRuntimeContext.DOM.livePreviewCanvas) return null;
    const target = __appRuntimeContext.DOM.livePreviewCanvas;
    if (
      target.width !== processedCanvas.width ||
      target.height !== processedCanvas.height
    ) {
      target.width = processedCanvas.width;
      target.height = processedCanvas.height;
    }
    const ctx = target.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(processedCanvas, 0, 0, target.width, target.height);
    target.dataset.ready = "true";
    target.__aiMask = processedCanvas.__aiMask;
    target.__processedByLiveImagingPipeline = true;
    __appRuntimeContext.latestProcessedFrameCanvas = target;
    return target;
  }

  function cloneCanvas(source, bufferName = "processed-capture") {
    if (!source || !source.width || !source.height) return null;
    const canvas = __appRuntimeContext.CanvasBuffer.get(bufferName, source.width, source.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source.__aiMask) canvas.__aiMask = source.__aiMask;
    if (source.__processedByLiveImagingPipeline) {
      canvas.__processedByLiveImagingPipeline = true;
    }
    return canvas;
  }

  async function getCurrentProcessedFrameCanvas() {
    const raw = __appRuntimeContext.drawToCanvasFromVideo();
    const processed = await processCanvasThroughImagingPipeline(raw);
    processed.__processedByLiveImagingPipeline = true;
    return cloneCanvas(processed, "processed-capture");
  }

  function getLivePreviewStream() {
    if (!__appRuntimeContext.DOM.livePreviewCanvas || typeof __appRuntimeContext.DOM.livePreviewCanvas.captureStream !== "function") {
      return null;
    }
    if (!__appRuntimeContext.livePreviewStream) {
      try {
        __appRuntimeContext.livePreviewStream = __appRuntimeContext.DOM.livePreviewCanvas.captureStream(30);
      } catch (_) {
        __appRuntimeContext.livePreviewStream = null;
      }
    }
    return __appRuntimeContext.livePreviewStream;
  }

  function startLiveImagingPipeline() {
    if (__appRuntimeContext.liveImagingLoopStarted) return;
    __appRuntimeContext.liveImagingLoopStarted = true;
    const renderFrame = async () => {
      const now = performance.now();
      const canvasPreviewVisible = __appRuntimeContext.DOM.livePreviewCanvas && __appRuntimeContext.DOM.livePreviewCanvas.style.display !== "none" && !__appRuntimeContext.DOM.livePreviewCanvas.classList.contains("hidden");
      const slottedLivePreviewVisible = !!__appRuntimeContext.DOM.photoSlotLayer?.querySelector(".photo-slot-media.is-live");
      const previewVisible = __appRuntimeContext.DOM.boothScreen && !__appRuntimeContext.DOM.boothScreen.classList.contains("hidden") && (canvasPreviewVisible || slottedLivePreviewVisible);
      if (previewVisible && !__appRuntimeContext.capturePreviewFrozen && !__appRuntimeContext.liveImagingFramePending && now - __appRuntimeContext.liveImagingLastFrameAt >= __appRuntimeContext.LIVE_PREVIEW_FRAME_INTERVAL_MS) {
        __appRuntimeContext.liveImagingFramePending = true;
        __appRuntimeContext.liveImagingLastFrameAt = now;
        try {
          const raw = __appRuntimeContext.drawToLivePreviewCanvasFromVideo();
          const processed = await processCanvasThroughImagingPipeline(raw);
          drawProcessedFrameToLivePreview(processed);
        } catch (error) {
          console.warn("Live imaging frame failed", error);
          if (__appRuntimeContext.isBoothTestMode()) {
            try { drawProcessedFrameToLivePreview(__appRuntimeContext.drawToCanvasFromVideo()); } catch (_) {}
          }
        } finally {
          __appRuntimeContext.liveImagingFramePending = false;
        }
      }
      if (previewVisible) requestAnimationFrame(renderFrame);
      else window.setTimeout(renderFrame, 250);
    };
    requestAnimationFrame(renderFrame);
  }

  function createOutputSurfaceTrace(localFinalUrl = "", options = {}) {
    return {
      captureId: options.captureId || "",
      localFinalUrl,
      localFinalKind: localFinalUrl && localFinalUrl.startsWith("data:image/")
        ? "processed-data-url"
        : localFinalUrl
          ? "url"
          : "",
      remoteFinalUrl: options.remoteFinalUrl || "",
      surfaces: {
        preview: localFinalUrl || "",
        uploadPreview: options.uploadPreviewUrl || "",
        qr: "",
        print: "",
        emailPhoto: "",
        emailImageData: "",
        galleryRemote: options.galleryRemoteUrl || "",
        galleryLocal: "",
        download: "",
      },
    };
  }

  function ensureOutputSurfaceTrace(localFinalUrl = "") {
    if (!__appRuntimeContext.lastOutputSurfaceTrace) {
      __appRuntimeContext.lastOutputSurfaceTrace = createOutputSurfaceTrace(localFinalUrl);
    }
    if (localFinalUrl && !__appRuntimeContext.lastOutputSurfaceTrace.localFinalUrl) {
      __appRuntimeContext.lastOutputSurfaceTrace.localFinalUrl = localFinalUrl;
    }
    return __appRuntimeContext.lastOutputSurfaceTrace;
  }

  function updateOutputSurfaceTrace(updates = {}) {
    const trace = ensureOutputSurfaceTrace(updates.localFinalUrl || "");
    if (typeof updates.captureId === "string") trace.captureId = updates.captureId;
    if (typeof updates.remoteFinalUrl === "string") {
      trace.remoteFinalUrl = updates.remoteFinalUrl;
    }
    if (updates.surfaces && typeof updates.surfaces === "object") {
      Object.assign(trace.surfaces, updates.surfaces);
    }
    return trace;
  }

  function getShareOutputUrl() {
    return __appRuntimeContext.lastShareUrl || (__appRuntimeContext.DOM.finalStrip && __appRuntimeContext.DOM.finalStrip.src) || "";
  }

  function getOutputSurfaceTraceSnapshot() {
    return __appRuntimeContext.lastOutputSurfaceTrace
      ? JSON.parse(JSON.stringify(__appRuntimeContext.lastOutputSurfaceTrace))
      : null;
  }

  function appendAssetPickerShowMore(grid, modeKey, total, visibleCount) {
    if (visibleCount >= total) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-picker-show-more";
    button.textContent = `Show More (${total - visibleCount} more)`;
    button.addEventListener("click", () => {
      __appRuntimeContext.assetPickerVisibleLimits[modeKey] =
        (__appRuntimeContext.assetPickerVisibleLimits[modeKey] || __appRuntimeContext.ASSET_PICKER_INITIAL_LIMIT) +
        __appRuntimeContext.ASSET_PICKER_PAGE_SIZE;
      renderOptionsForMode(__appRuntimeContext.mode);
    });
    grid.appendChild(button);
  }

  function renderOptionsForMode(targetMode = __appRuntimeContext.mode, options = {}) {
    const captureMode = __appRuntimeContext.getSelectedCaptureMode(targetMode);
    const container = __appRuntimeContext.DOM.options;
    if (!container) return;
    const previousScrollTop =
      options.preserveScroll === false ? 0 : container.scrollTop || 0;
    container.innerHTML = "";
    if (captureMode === "message") {
      __appRuntimeContext.syncMobileSettingsUi();
      return;
    }
    const addSection = (title) => {
      const section = document.createElement("div");
      section.className = "options-section";
      if (title) {
        const heading = document.createElement("div");
        heading.className = "options-section-title";
        heading.textContent = title;
        section.appendChild(heading);
      }
      const grid = document.createElement("div");
      grid.className = "options-section-grid";
      section.appendChild(grid);
      container.appendChild(section);
      return grid;
    };
    const addPhotoOrientationSection = () => {
      const section = document.createElement("div");
      section.className = "options-section photo-orientation-section";
      const heading = document.createElement("div");
      heading.className = "options-section-title";
    };
    const greenGrid = addSection("Photo Backgrounds");
    const greenList = __appRuntimeContext.getGreenBackgroundList(__appRuntimeContext.activeTheme);
    if (!greenList.length) {
      const note = document.createElement("div");
      note.style.fontSize = "0.8em";
      note.style.color = "#888";
      note.textContent = "No backgrounds added";
      greenGrid.appendChild(note);
    } else {
      const activeGreen = __appRuntimeContext.getActiveGreenBackground(__appRuntimeContext.activeTheme);
      greenList.forEach((src, idx) => {
        const wrap = document.createElement("div");
        wrap.className = "thumb";
        const media = __appRuntimeContext.createAssetPreviewMedia(src);
        wrap.appendChild(media);
        if (activeGreen === src) wrap.classList.add("selected");
        wrap.onclick = () => {
          greenGrid
            .querySelectorAll(".thumb")
            .forEach((t) => t.classList.remove("selected"));
          wrap.classList.add("selected");
          __appRuntimeContext.setGreenBackgroundIndex(idx);
        };
        greenGrid.appendChild(wrap);
      });
    }

    if (captureMode === "photo") {
      __appRuntimeContext.syncPhotoOverlayOrientationWithAssets();
      const overlayGrid = addSection("Overlays");
      const noOverlay = document.createElement("div");
      noOverlay.className = "thumb";
      noOverlay.dataset.overlayNone = "true";
      const blank = document.createElement("canvas");
      blank.width = 120;
      blank.height = 80;
      const blankImg = document.createElement("img");
      blankImg.src = blank.toDataURL("image/png");
      noOverlay.appendChild(blankImg);
      noOverlay.title = "No Overlay";
      noOverlay.onclick = () => {
        container
          .querySelectorAll(".thumb")
          .forEach((t) => t.classList.remove("selected"));
        noOverlay.classList.add("selected");
        __appRuntimeContext.selectedOverlay = null;
        __appRuntimeContext.lastPhotoOverlay = null;
        __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation] = null;
        __appRuntimeContext.clearOverlayPreviewSurface();
        applyPreviewOrientation();
        __appRuntimeContext.setMobileSettingsOpen(false);
      };
      if (!__appRuntimeContext.selectedOverlay) noOverlay.classList.add("selected");
      overlayGrid.appendChild(noOverlay);

      const photoOverlays = __appRuntimeContext.filterPhotoOverlaysByOrientation(
        __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme),
        __appRuntimeContext.photoOverlayOrientation
      );
      if (!photoOverlays.length) {
        const note = document.createElement("div");
        note.style.fontSize = "0.8em";
        note.style.color = "#888";
        note.textContent = "No overlays added";
        overlayGrid.appendChild(note);
      } else {
        const visibleLimit = __appRuntimeContext.getAssetPickerVisibleLimit(
          captureMode,
          __appRuntimeContext.selectedOverlay,
          photoOverlays
        );
        const visibleOverlays = photoOverlays.slice(0, visibleLimit);
        visibleOverlays.forEach((overlay) => {
          const src = overlay && overlay.src ? overlay.src : "";
          const wrap = document.createElement("div");
          wrap.className = "thumb";
          if (src) wrap.dataset.overlaySrc = src;
          wrap.title = __appRuntimeContext.getAssetPickerFilename(src);
          const img = document.createElement("img");
          wrap.appendChild(img);
          img.src = __appRuntimeContext.withBust(
            overlay && overlay.renderSrc ? overlay.renderSrc : src
          );
          if (__appRuntimeContext.selectedOverlay === src) wrap.classList.add("selected");
          img.onerror = () => {
            console.error("Failed to load thumbnail:", src);
            wrap.style.display = "none";
          };
          wrap.onclick = () => {
            overlayGrid
              .querySelectorAll(".thumb")
              .forEach((t) => t.classList.remove("selected"));
            wrap.classList.add("selected");
            __appRuntimeContext.selectedOverlay = src;
            __appRuntimeContext.lastPhotoOverlay = src;
            __appRuntimeContext.lastPhotoOverlayByOrientation[__appRuntimeContext.photoOverlayOrientation] = src;
            __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
            applyPreviewOrientation();
            __appRuntimeContext.logBoothFrameState("overlay-selected", __appRuntimeContext.mode);
            __appRuntimeContext.setMobileSettingsOpen(false);
          };
          overlayGrid.appendChild(wrap);
        });
        appendAssetPickerShowMore(
          overlayGrid,
          captureMode,
          photoOverlays.length,
          visibleOverlays.length
        );
      }
      __appRuntimeContext.syncMobileSettingsUi();
      requestAnimationFrame(() => {
        container.scrollTop = previousScrollTop;
      });
      return;
    }

    const templateKind = captureMode === "layout" ? "layout" : "strip";
    const templates = __appRuntimeContext.filterAssetsForMode(
      __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme),
      templateKind
    );
    const templateGrid = addSection(
      captureMode === "layout" ? "Choose Your Layout" : "Choose Your Strip"
    );
    if (!templates.length) {
      const note = document.createElement("div");
      note.style.fontSize = "0.8em";
      note.style.color = "#888";
      note.textContent = "No templates added";
      templateGrid.appendChild(note);
      __appRuntimeContext.syncMobileSettingsUi();
      return;
    }
    const pendingTemplateSrc = __appRuntimeContext.pendingTemplate && __appRuntimeContext.pendingTemplate.src;
    const visibleLimit = __appRuntimeContext.getAssetPickerVisibleLimit(
      captureMode,
      pendingTemplateSrc,
      templates
    );
    const visibleTemplates = templates.slice(0, visibleLimit);
    visibleTemplates.forEach((template) => {
      const src = template && template.src ? template.src : "";
      const wrap = document.createElement("div");
      wrap.className = "thumb";
      if (src) wrap.dataset.templateSrc = src;
      wrap.title = __appRuntimeContext.getAssetPickerFilename(src);
      const img = document.createElement("img");
      wrap.appendChild(img);
      img.src = __appRuntimeContext.withBust(
        template && template.renderSrc ? template.renderSrc : src
      );
      if (pendingTemplateSrc === src) wrap.classList.add("selected");
      img.onerror = () => {
        console.error("Failed to load thumbnail:", src);
        wrap.style.display = "none";
      };
      wrap.onclick = () => {
        templateGrid
          .querySelectorAll(".thumb")
          .forEach((t) => t.classList.remove("selected"));
        wrap.classList.add("selected");
        __appRuntimeContext.selectedOverlay = null;
        __appRuntimeContext.clearOverlayPreviewSurface();
        __appRuntimeContext.pendingTemplate = template || { src, layout: "double_column" };
        if (__appRuntimeContext.pendingTemplate && __appRuntimeContext.pendingTemplate.src) {
          openConfirm(__appRuntimeContext.pendingTemplate.src);
        }
        __appRuntimeContext.logBoothFrameState("template-selected", __appRuntimeContext.mode);
        __appRuntimeContext.setMobileSettingsOpen(false);
      };
      templateGrid.appendChild(wrap);
    });
    appendAssetPickerShowMore(
      templateGrid,
      captureMode,
      templates.length,
      visibleTemplates.length
    );
    __appRuntimeContext.syncMobileSettingsUi();
    requestAnimationFrame(() => {
      container.scrollTop = previousScrollTop;
    });
  }

  function renderOptions() {
    renderOptionsForMode(__appRuntimeContext.mode);
  }

  async function setViewOrientation(target) {
    const overlay =
      target && typeof target === "object" && !Array.isArray(target)
        ? target
        : null;
    const aspectRatio = __appRuntimeContext.getOverlayAspectRatio(overlay);
    if (aspectRatio) {
      __appRuntimeContext.DOM.videoWrap.className =
        aspectRatio >= 1 ? "view-landscape" : "view-portrait";
      __appRuntimeContext.setCaptureAspect(aspectRatio);
      return;
    }
    const imgSrc =
      typeof target === "string"
        ? target
        : overlay && overlay.foreground && overlay.foreground.type === "image"
        ? overlay.foreground.src
        : overlay && overlay.renderSrc
        ? overlay.renderSrc
        : "";
    if (!imgSrc) {
      __appRuntimeContext.DOM.videoWrap.className = "view-landscape";
      __appRuntimeContext.setCaptureAspect(null);
      __appRuntimeContext.updateCaptureAspect();
      return;
    }
    const orientation = await __appRuntimeContext.getOrientationFromImage(imgSrc);
    __appRuntimeContext.DOM.videoWrap.className = `view-${orientation}`;
    __appRuntimeContext.setCaptureAspect(null);
    __appRuntimeContext.updateCaptureAspect();
  }

  function orientationFromTemplate(template) {
    const layout = __appRuntimeContext.normalizeTemplateLayout(template && template.layout);
    if (
      layout === "double_column" ||
      layout === "vertical" ||
      layout === "photo_strip_3"
    )
      return "view-portrait";
    return "view-landscape";
  }

  function applyPreviewOrientation() {
    if (!__appRuntimeContext.DOM.videoWrap) return;
    const captureMode = __appRuntimeContext.getSelectedCaptureMode();
    if (captureMode === "strip" || captureMode === "layout") {
      const templates = __appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme);
      const template =
        __appRuntimeContext.pendingTemplate ||
        templates.find((item) => __appRuntimeContext.getAssetCaptureType(item) === captureMode) ||
        (Array.isArray(templates) ? templates[0] : null);
      // The booth screen shape is the operator's source of truth for the live
      // preview. A strip template can have portrait-oriented artwork, but it
      // must not force a portrait camera window after landscape is selected.
      const screenOrientation = getGuestScreenOrientation();
      __appRuntimeContext.DOM.videoWrap.className =
        screenOrientation === "portrait" ? "view-portrait" : "view-landscape";
      __appRuntimeContext.applyLiveCameraSizing();
      if (!template || !template.src) {
        __appRuntimeContext.setCaptureAspect(null);
        __appRuntimeContext.updateCaptureAspect();
      }
      return;
    }
    __appRuntimeContext.DOM.videoWrap.className =
      __appRuntimeContext.photoOverlayOrientation === "portrait" ? "view-portrait" : "view-landscape";
    __appRuntimeContext.applyLiveCameraSizing();
    __appRuntimeContext.setCaptureAspect(__appRuntimeContext.getPhotoOverlayAspectForOrientation());
  }

  function capturePreviewState() {
    return {
      selectedOverlay: __appRuntimeContext.selectedOverlay,
      lastPhotoOverlay: __appRuntimeContext.lastPhotoOverlay,
      videoClass: __appRuntimeContext.DOM.videoWrap ? __appRuntimeContext.DOM.videoWrap.className : "view-landscape",
    };
  }

  function restorePreviewState(state) {
    if (!state) return;
    __appRuntimeContext.selectedOverlay = state.selectedOverlay || null;
    __appRuntimeContext.lastPhotoOverlay = state.lastPhotoOverlay || null;
    if (__appRuntimeContext.DOM.videoWrap) {
      __appRuntimeContext.DOM.videoWrap.className = state.videoClass || "view-landscape";
    }
    const captureMode = __appRuntimeContext.getSelectedCaptureMode();
    if (captureMode === "photo" || captureMode === "message") {
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    } else {
      __appRuntimeContext.clearOverlayPreviewSurface();
    }
  }

  async function getStripTemplateMetrics(template) {
    if (!template || !template.src) return null;
    if (template.__slotMetrics) return template.__slotMetrics;
    const metrics = {};
    const img = await __appRuntimeContext.loadImage(template.src);
    const columnCount = __appRuntimeContext.getTemplateColumnCount(template && template.layout);
    const rows = __appRuntimeContext.getTemplateRowCount(
      template && template.layout,
      template && template.slots
    );
    const slots =
      __appRuntimeContext.normalizeTemplateSlots(template && template.slots, columnCount) ||
      __appRuntimeContext.detectTransparentColumnSlots(img, rows, columnCount);
    if (slots) metrics.slots = slots;
    const headerPct = Math.max(
      0,
      Math.min(
        0.5,
        __appRuntimeContext.toNumber(template && (template.headerPct || template.header_percent), 0.2)
      )
    );
    const columnPadPct = Math.max(
      0,
      Math.min(0.2, __appRuntimeContext.toNumber(template && template.columnPadPct, 0.055))
    );
    const slotSpacingPct = Math.max(
      0,
      Math.min(0.2, __appRuntimeContext.toNumber(template && template.slotSpacingPct, 0.022))
    );
    const footerPct = Math.max(
      0,
      Math.min(0.3, __appRuntimeContext.toNumber(template && template.footerPct, 0.03))
    );
    metrics.headerPct = headerPct;
    metrics.columnPadPct = columnPadPct;
    metrics.slotSpacingPct = slotSpacingPct;
    metrics.footerPct = footerPct;
    if (slots && slots[0] && slots[0][0]) {
      metrics.aspect = Math.max(0.1, slots[0][0].w / slots[0][0].h);
    } else {
      const cols = columnCount;
      const columnW = 1 / cols;
      const slotWRel = columnW - columnPadPct * columnW * 2;
      const slotHRel = (1 - headerPct - footerPct - slotSpacingPct * (rows + 1)) / rows;
      metrics.aspect = Math.max(0.1, slotWRel / slotHRel);
    }
    metrics.rows = rows;
    template.__slotMetrics = metrics;
    return metrics;
  }

  async function prepareStripCapture(template) {
    const state = capturePreviewState();
    __appRuntimeContext.clearOverlayPreviewSurface();
    if (__appRuntimeContext.DOM.videoWrap) {
      const screenOrientation = getGuestScreenOrientation();
      __appRuntimeContext.DOM.videoWrap.className =
        screenOrientation === "portrait" ? "view-portrait" : "view-landscape";
    }
    __appRuntimeContext.applyLiveCameraSizing();
    const prevAspect = __appRuntimeContext.captureAspectRatio;
    try {
      const metrics = await getStripTemplateMetrics(template);
      if (metrics && metrics.aspect) {
        __appRuntimeContext.setCaptureAspect(metrics.aspect);
      } else {
        __appRuntimeContext.setCaptureAspect(null);
      }
    } catch (_) {
      __appRuntimeContext.setCaptureAspect(null);
    }
    return { state, prevAspect };
  }

  function openConfirm(previewSrc) {
    __appRuntimeContext.DOM.confirmPreview.src = previewSrc;
    __appRuntimeContext.DOM.confirmModal.style.display = "flex";
  }

  function closeConfirm() {
    __appRuntimeContext.pendingTemplate = null;
    __appRuntimeContext.DOM.confirmModal.style.display = "none";
  }

  function confirmTemplate() {
    const t = __appRuntimeContext.pendingTemplate;
    __appRuntimeContext.pendingTemplate = null;
    __appRuntimeContext.DOM.confirmModal.style.display = "none";
    __appRuntimeContext.runStripSequence(t);
  }

  function getIdleScreenViewportOrientation() {
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  }

  function getGuestScreenOrientation() {
    const active = __appRuntimeContext.getActiveEvent();
    const stored =
      (active && active.guestScreenOrientation) ||
      __appRuntimeContext.activeSessionTextDetails.guestScreenOrientation ||
      "";
    return stored
      ? __appRuntimeContext.normalizeIdleScreenOrientation(stored)
      : getIdleScreenViewportOrientation();
  }

  function syncGuestScreenOrientationControl() {
    if (!__appRuntimeContext.DOM.guestScreenOrientation) return;
    const orientation = getGuestScreenOrientation();
    const disabled = !(
      __appRuntimeContext.getActiveEvent() ||
      __appRuntimeContext.activeTheme ||
      __appRuntimeContext.getSelectedThemeTarget()
    );
    __appRuntimeContext.DOM.guestScreenOrientation.value = orientation;
    __appRuntimeContext.DOM.guestScreenOrientation.disabled = disabled;
    __appRuntimeContext.DOM.screenOrientationButtons.forEach((button) => {
      const selected = button.dataset.screenOrientation === orientation;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.disabled = disabled;
    });
  }

  function setGuestScreenOrientation(value) {
    const orientation = __appRuntimeContext.normalizeIdleScreenOrientation(value);
    const active = __appRuntimeContext.getActiveEvent();
    if (active) {
      __appRuntimeContext.updateActiveEventDetails({ guestScreenOrientation: orientation });
    } else {
      __appRuntimeContext.updateActiveSessionTextDetails({ guestScreenOrientation: orientation });
      if (__appRuntimeContext.activeTheme) __appRuntimeContext.applyThemeBasics(__appRuntimeContext.activeTheme);
    }
    __appRuntimeContext.photoOverlayOrientation = orientation;
    applyPreviewOrientation();
    renderOptions();
    __appRuntimeContext.renderAssetLibrary();
    __appRuntimeContext.renderCurrentAssets(__appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget());
    syncGuestScreenOrientationControl();
    __appRuntimeContext.updateLaunchSummary();
  }

  function getIdleScreenAssignmentEntries() {
    const themeEntries = Array.isArray(__appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.idleScreens)
      ? __appRuntimeContext.activeTheme.idleScreens
      : [];
    const active = __appRuntimeContext.getActiveEvent();
    const overrides = active ? __appRuntimeContext.ensureEventOverrides(active) : {};
    const eventEntries = Array.isArray(overrides.idleScreens) ? overrides.idleScreens : [];
    const sessionEntries = Array.isArray(__appRuntimeContext.activeSessionAssets.idleScreens)
      ? __appRuntimeContext.activeSessionAssets.idleScreens
      : [];
    return { eventEntries: sessionEntries.length ? sessionEntries : eventEntries, themeEntries };
  }

  function hydrateIdleScreenEntry(entry) {
    const src = __appRuntimeContext.getAssetEntrySrc(entry);
    const stored = (__appRuntimeContext.assetLibrary.assets || []).find(
      (asset) => asset.category === "idle-screen" && __appRuntimeContext.getAssetEntrySrc(asset) === src
    );
    if (!stored) return entry;
    const hydrated = { ...__appRuntimeContext.cloneThemeValue(entry), ...__appRuntimeContext.cloneThemeValue(stored), src };
    const defaultStartZone = entry?.buttonZones?.start;
    const storedStartZone = stored.buttonZones?.start;
    if (defaultStartZone?.variant === "marquee") {
      const hasLegacyDefault =
        storedStartZone?.x === 50 &&
        storedStartZone?.y === 82 &&
        storedStartZone?.width === 38 &&
        storedStartZone?.height === 20;
      hydrated.buttonZones = {
        ...(entry.buttonZones || {}),
        ...(stored.buttonZones || {}),
        start: {
          ...defaultStartZone,
          ...(hasLegacyDefault ? {} : storedStartZone || {}),
          variant: defaultStartZone.variant,
        },
      };
    }
    return hydrated;
  }

  function selectIdleScreenEntry() {
    const { eventEntries, themeEntries } = getIdleScreenAssignmentEntries();
    const orientation = getGuestScreenOrientation();
    const find = (entries) =>
      entries
        .filter((entry) => entry && entry.role !== "photo-choice")
        .find(
          (entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry.orientation) === orientation
        ) || null;
    return hydrateIdleScreenEntry(
      find(eventEntries) || find(themeEntries) || null
    );
  }

  function selectPhotoChoiceScreenEntry() {
    const { eventEntries, themeEntries } = getIdleScreenAssignmentEntries();
    const orientation = getGuestScreenOrientation();
    const find = (entries) =>
      entries
        .filter((entry) => entry && entry.role === "photo-choice")
        .find(
          (entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry.orientation) === orientation
        ) || null;
    return hydrateIdleScreenEntry(
      find(eventEntries) || find(themeEntries) || null
    );
  }

  function getWelcomeArtworkRect(img, container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const naturalWidth = img.naturalWidth || img.videoWidth || width;
    const naturalHeight = img.naturalHeight || img.videoHeight || height;
    const objectFit = getComputedStyle(img).objectFit;
    const scale = objectFit === "contain"
      ? Math.min(width / naturalWidth, height / naturalHeight)
      : Math.max(width / naturalWidth, height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    return {
      left: (width - renderedWidth) / 2,
      top: (height - renderedHeight) / 2,
      width: renderedWidth,
      height: renderedHeight,
    };
  }

  function getWelcomeActionBox(zone, artworkRect, container) {
    const width = Math.min((zone.width / 100) * artworkRect.width, container.clientWidth - 24);
    const height = Math.min((zone.height / 100) * artworkRect.height, container.clientHeight - 24);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    return {
      left: clamp(
        artworkRect.left + (zone.x / 100) * artworkRect.width,
        width / 2 + 12,
        container.clientWidth - width / 2 - 12
      ),
      top: clamp(
        artworkRect.top + (zone.y / 100) * artworkRect.height,
        height / 2 + 12,
        container.clientHeight - height / 2 - 12
      ),
      width,
      height,
    };
  }

  function getWelcomeArtworkMedia(entry) {
    return __appRuntimeContext.isVideoAsset(entry) ? __appRuntimeContext.DOM.welcomeVideo : __appRuntimeContext.DOM.welcomeImg;
  }

  function positionIdleStartHotspot(entry) {
    const media = getWelcomeArtworkMedia(entry);
    if (!media || !__appRuntimeContext.DOM.welcomeScreen || !__appRuntimeContext.DOM.startButton) return;
    const zone = __appRuntimeContext.normalizeIdleButtonZone(entry && entry.buttonZones && entry.buttonZones.start);
    const rect = getWelcomeArtworkRect(media, __appRuntimeContext.DOM.welcomeScreen);
    const box = getWelcomeActionBox(zone, rect, __appRuntimeContext.DOM.welcomeScreen);
    Object.assign(__appRuntimeContext.DOM.startButton.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      transform: "translate(-50%, -50%)",
    });
    __appRuntimeContext.DOM.startButton.setAttribute("aria-label", "Start photo booth");
    const computed = getComputedStyle(__appRuntimeContext.DOM.startButton);
    const rawSource = entry && entry.src ? entry.src : "";
    let sourceClassification = "missing";
    if (rawSource) {
      if (rawSource.startsWith("data:image/")) {
        sourceClassification = "data-url";
      } else if (rawSource.startsWith("https://") || rawSource.startsWith("http://")) {
        sourceClassification = "hosted-url";
      } else {
        sourceClassification = "local-path";
      }
    }
    console.log("[idle-start-diagnostic]", {
      welcomeFlowStep: __appRuntimeContext.welcomeFlowStep,
      customIdleScreen: __appRuntimeContext.DOM.welcomeScreen.classList.contains("custom-idle-screen"),
      startButtonExists: !!__appRuntimeContext.DOM.startButton,
      rawButtonZoneExists: !!(entry && entry.buttonZones && entry.buttonZones.start),
      normalizedZone: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
      positionIdleStartHotspotExecuted: true,
      rect: __appRuntimeContext.DOM.startButton.getBoundingClientRect(),
      pointerEvents: computed.pointerEvents,
      zIndex: computed.zIndex,
      sourceClassification,
    });
  }

  function clearCustomArtworkLoadTimer() {
    clearTimeout(__appRuntimeContext.customArtworkLoadTimer);
    __appRuntimeContext.customArtworkLoadTimer = null;
  }

  function startCustomArtworkLoadFallback(onTimeout) {
    clearCustomArtworkLoadTimer();
    __appRuntimeContext.customArtworkLoadTimer = setTimeout(() => {
      // Give slow connections a grace period, but keep stalled requests bounded.
      __appRuntimeContext.showToast("Theme artwork is still loading. Check your connection.");
      __appRuntimeContext.customArtworkLoadTimer = setTimeout(onTimeout, 22000);
    }, 8000);
  }

  function clearCustomIdleScreen() {
    __appRuntimeContext.welcomeArtworkLoadId += 1;
    clearCustomArtworkLoadTimer();
    if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.classList.remove("custom-idle-screen", "custom-photo-choice-screen", "marquee-start-screen");
    if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.classList.remove("custom-artwork-loading");
    if (__appRuntimeContext.DOM.welcomeImg) {
      __appRuntimeContext.DOM.welcomeImg.onload = null;
      __appRuntimeContext.DOM.welcomeImg.onerror = null;
      __appRuntimeContext.DOM.welcomeImg.src = "";
      __appRuntimeContext.DOM.welcomeImg.classList.add("hidden");
    }
    if (__appRuntimeContext.DOM.welcomeVideo) {
      __appRuntimeContext.DOM.welcomeVideo.onloadedmetadata = null;
      __appRuntimeContext.DOM.welcomeVideo.onerror = null;
      __appRuntimeContext.DOM.welcomeVideo.pause();
      __appRuntimeContext.DOM.welcomeVideo.removeAttribute("src");
      __appRuntimeContext.DOM.welcomeVideo.load();
      __appRuntimeContext.DOM.welcomeVideo.classList.add("hidden");
    }
    if (__appRuntimeContext.DOM.startButton) __appRuntimeContext.DOM.startButton.removeAttribute("style");
  }

  function positionPhotoChoiceHotspots(entry) {
    const media = getWelcomeArtworkMedia(entry);
    if (!media || !__appRuntimeContext.DOM.welcomeScreen) return;
    const rect = getWelcomeArtworkRect(media, __appRuntimeContext.DOM.welcomeScreen);
    const zones = entry && entry.buttonZones ? entry.buttonZones : {};
    const place = (modeName, zoneValue) => {
      const button = document.querySelector(`.welcome-mode-btn[data-welcome-mode="${modeName}"]`);
      if (!button) return;
      const zone = __appRuntimeContext.normalizeIdleButtonZone(zoneValue);
      const box = getWelcomeActionBox(zone, rect, __appRuntimeContext.DOM.welcomeScreen);
      Object.assign(button.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
    };
    place("still-photo", zones.singlePhoto || __appRuntimeContext.photoChoiceEditorZones.singlePhoto);
    place("strip", zones.photoStrip || __appRuntimeContext.photoChoiceEditorZones.photoStrip);
  }

  function loadWelcomeArtwork(entry, onReady) {
    const src = __appRuntimeContext.getAssetEntrySrc(entry);
    const media = getWelcomeArtworkMedia(entry);
    if (!src || !media) return false;
    const loadId = ++__appRuntimeContext.welcomeArtworkLoadId;
    let ready = false;
    const finish = () => {
      if (loadId !== __appRuntimeContext.welcomeArtworkLoadId || ready) return;
      ready = true;
      clearCustomArtworkLoadTimer();
      __appRuntimeContext.DOM.welcomeScreen.classList.remove("custom-artwork-loading");
      media.classList.remove("hidden");
      if (__appRuntimeContext.isVideoAsset(entry)) media.play().catch(() => {});
      onReady();
    };
    const fail = () => {
      if (loadId !== __appRuntimeContext.welcomeArtworkLoadId) return;
      clearCustomIdleScreen();
      __appRuntimeContext.showToast("Theme artwork could not load. Showing the standard screen.");
    };
    if (__appRuntimeContext.DOM.welcomeImg) __appRuntimeContext.DOM.welcomeImg.classList.add("hidden");
    if (__appRuntimeContext.DOM.welcomeVideo) __appRuntimeContext.DOM.welcomeVideo.classList.add("hidden");
    startCustomArtworkLoadFallback(fail);
    if (__appRuntimeContext.isVideoAsset(entry)) {
      media.onloadedmetadata = finish;
      media.onerror = fail;
      media.crossOrigin = "anonymous";
      if (media.getAttribute("src") !== src) {
        media.src = src;
        media.load();
      } else if (media.readyState >= 1) {
        finish();
      }
    } else {
      media.onload = finish;
      media.onerror = fail;
      if (media.getAttribute("src") !== src) {
        media.src = src;
      } else if (media.currentSrc === media.src && media.complete && media.naturalWidth > 0) {
        // Safari may not emit another load event for an already displayed image.
        finish();
      }
    }
    return true;
  }

  function applyCustomPhotoChoiceScreen(entry) {
    const src = __appRuntimeContext.getAssetEntrySrc(entry);
    if (!src || !__appRuntimeContext.DOM.welcomeImg || !__appRuntimeContext.DOM.welcomeVideo || !__appRuntimeContext.DOM.welcomeScreen) return false;
    __appRuntimeContext.DOM.welcomeScreen.classList.remove("custom-idle-screen");
    __appRuntimeContext.DOM.welcomeScreen.classList.add("custom-photo-choice-screen", "custom-artwork-loading");
    return loadWelcomeArtwork(entry, () => positionPhotoChoiceHotspots(entry));
  }

  function applyCustomIdleScreen(entry) {
    const src = __appRuntimeContext.getAssetEntrySrc(entry);
    if (!src || !__appRuntimeContext.DOM.welcomeImg || !__appRuntimeContext.DOM.welcomeVideo || !__appRuntimeContext.DOM.welcomeScreen) {
      clearCustomIdleScreen();
      return false;
    }
    __appRuntimeContext.DOM.welcomeScreen.classList.remove("custom-photo-choice-screen");
    __appRuntimeContext.DOM.welcomeScreen.classList.toggle("marquee-start-screen", entry?.buttonZones?.start?.variant === "marquee");
    __appRuntimeContext.DOM.welcomeScreen.classList.add("custom-idle-screen", "custom-artwork-loading");
    return loadWelcomeArtwork(entry, () => positionIdleStartHotspot(entry));
  }

  function showWelcome(step = null) {
    if (!__appRuntimeContext.activeTheme) return;
    __appRuntimeContext.updateShowcaseDemoUi();
    __appRuntimeContext.syncBoothPersonality();
    __appRuntimeContext.syncWelcomeLogo();
    __appRuntimeContext.setBoothControlsVisible(false);
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.add("welcome-active");
    if (__appRuntimeContext.DOM.confirmModal) __appRuntimeContext.DOM.confirmModal.style.display = "none";
    // Title + prompt
    __appRuntimeContext.DOM.welcomeTitle.textContent = __appRuntimeContext.resolveWelcomeTitle();
    __appRuntimeContext.DOM.welcomeTitle.style.fontFamily =
      __appRuntimeContext.activeTheme.fontHeading || __appRuntimeContext.activeTheme.fontBody || __appRuntimeContext.activeTheme.font || "";
    __appRuntimeContext.fitWelcomeTitleToViewport();
    if (__appRuntimeContext.DOM.startButton)
      __appRuntimeContext.DOM.startButton.textContent = __appRuntimeContext.resolveStartButtonText();

    //  the booth background on the welcome screen and hide standalone images
    const boothBg = __appRuntimeContext.DOM.boothScreen ? __appRuntimeContext.DOM.boothScreen.style.backgroundImage : "";
    if (__appRuntimeContext.DOM.welcomeScreen) __appRuntimeContext.DOM.welcomeScreen.style.backgroundImage = boothBg;
    const requestedStep = step || __appRuntimeContext.resolveInitialWelcomeStep();
    const idleEntry = requestedStep === "idle" ? selectIdleScreenEntry() : null;
    const photoChoiceEntry = requestedStep === "mode" ? selectPhotoChoiceScreenEntry() : null;
    if (idleEntry) applyCustomIdleScreen(idleEntry);
    else if (photoChoiceEntry) applyCustomPhotoChoiceScreen(photoChoiceEntry);
    else clearCustomIdleScreen();

    const ws = __appRuntimeContext.DOM.welcomeScreen;
    if (!ws) return;
    ws.classList.remove("faded");
    __appRuntimeContext.syncWelcomeModeButtons();
    __appRuntimeContext.setWelcomeFlowStep(requestedStep);
    __appRuntimeContext.setupWelcomeInteractions();
  }

  function runWelcomeInteraction(event, action) {
    const screen = __appRuntimeContext.DOM.welcomeScreen;
    if (!screen || screen.classList.contains("welcome-transitioning")) return false;
    const target =
      event && event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : event && event.target instanceof Element
        ? event.target.closest("button")
        : null;
    const screenRect = screen.getBoundingClientRect();
    const targetRect = target && target.getBoundingClientRect();
    if (targetRect && screenRect.width && screenRect.height) {
      screen.style.setProperty(
        "--welcome-press-x",
        `${targetRect.left - screenRect.left + targetRect.width / 2}px`
      );
      screen.style.setProperty(
        "--welcome-press-y",
        `${targetRect.top - screenRect.top + targetRect.height / 2}px`
      );
      screen.style.setProperty(
        "--welcome-press-size",
        `${Math.max(targetRect.width, targetRect.height) * 0.9}px`
      );
    }
    if (target) target.classList.add("welcome-hotspot-pressed");
    screen.classList.add("welcome-transitioning");
    window.setTimeout(() => {
      if (target) target.classList.remove("welcome-hotspot-pressed");
      action();
      window.setTimeout(() => screen.classList.remove("welcome-transitioning"), 220);
    }, 140);
    return true;
  }

  function beginWelcome(event) {
    if (__appRuntimeContext.welcomeFlowStep !== "idle") return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!runWelcomeInteraction(event, () => {
      clearCustomIdleScreen();
      __appRuntimeContext.setWelcomeFlowStep("mode");
      const photoChoiceEntry = selectPhotoChoiceScreenEntry();
      if (photoChoiceEntry) applyCustomPhotoChoiceScreen(photoChoiceEntry);
    })) return;
    __appRuntimeContext.unlockBoothAudio();
    __appRuntimeContext.playThemeCue("start", "tap");
  }

  function beginModeSelection(nextMode, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!runWelcomeInteraction(event, () => {
      __appRuntimeContext.setMode(nextMode);
      clearCustomIdleScreen();
      hideWelcome();
    })) return;
    __appRuntimeContext.unlockBoothAudio();
    __appRuntimeContext.playThemeCue("tap", "tap");
  }

  function goBackFromWelcome(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (__appRuntimeContext.welcomeFlowStep === "mode") {
      clearCustomIdleScreen();
      __appRuntimeContext.setWelcomeFlowStep("idle");
      const idleEntry = selectIdleScreenEntry();
      if (idleEntry) applyCustomIdleScreen(idleEntry);
      else clearCustomIdleScreen();
      return;
    }
    if (
      __appRuntimeContext.welcomeFlowStep === "idle" &&
      __appRuntimeContext.showcaseDemoActive &&
      __appRuntimeContext.hasShowcaseDemoChoices()
    ) {
      __appRuntimeContext.setWelcomeFlowStep("demo");
      return;
    }
    __appRuntimeContext.goAdmin();
  }

  function goBackFromBooth(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    showWelcome("mode");
  }

  function hideWelcome() {
    const ws = __appRuntimeContext.DOM.welcomeScreen;
    if (!ws) return;
    if (ws.classList.contains("faded")) return;
    __appRuntimeContext.playBoothSound("success");
    ws.classList.add("faded");
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("welcome-active");
    if (__appRuntimeContext.currentMode !== "360") {
      __appRuntimeContext.setMode(resolveBoothLaunchMode());
    }
    __appRuntimeContext.syncOverlayPickerUi();
    __appRuntimeContext.updateCaptureModeUi();
    __appRuntimeContext.setBoothControlsVisible(true);
    requestAnimationFrame(() => {
      __appRuntimeContext.syncOverlayPickerUi();
      __appRuntimeContext.syncMobileSettingsUi();
    });
    // show the video smoothly
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.classList.remove("hidden");
      __appRuntimeContext.DOM.video.classList.add("active");
      __appRuntimeContext.DOM.video.style.display = "none";
      if (__appRuntimeContext.DOM.video.srcObject && typeof __appRuntimeContext.DOM.video.play === "function") {
        __appRuntimeContext.DOM.video.play().catch(() => {});
      }
    }
    startLiveImagingPipeline();
    if (!__appRuntimeContext.stream && !__appRuntimeContext.demoMode && __appRuntimeContext.currentMode !== "360") {
      startCamera(false);
    }
    __appRuntimeContext.resetIdleTimer(); // Start the idle timer now that the booth is active.
  }

  function resolveBoothLaunchMode() {
    if (__appRuntimeContext.mode === "message" || __appRuntimeContext.mode === "strip" || __appRuntimeContext.mode === "layout") {
      return __appRuntimeContext.mode;
    }
    if (__appRuntimeContext.mode === "still-photo") return "still-photo";
    if (__appRuntimeContext.mode === "live-photo" && __appRuntimeContext.getLivePhotoEnabled()) return "live-photo";
    if (__appRuntimeContext.mode === "still-photo") return "still-photo";
    return __appRuntimeContext.getLivePhotoEnabled() ? "live-photo" : "still-photo";
  }

  function createBoothTestStream() {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.captureStream !== "function") return null;
    let frame = 0;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const shift = Math.sin(frame / 24) * 18;
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#f7efe4");
      grad.addColorStop(0.5, "#d7eadf");
      grad.addColorStop(1, "#e7d5b7");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.fillRect(96 + shift, 74, 1088, 572);
      ctx.fillStyle = "#243b38";
      ctx.font = "700 56px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Booth Test Camera", width / 2, height / 2 - 22);
      ctx.font = "32px system-ui, sans-serif";
      ctx.fillText("Live preview mock", width / 2, height / 2 + 34);
      ctx.fillStyle = "#c79f5d";
      ctx.beginPath();
      ctx.arc(width / 2 + shift * 3, height / 2 + 110, 28, 0, Math.PI * 2);
      ctx.fill();
      frame += 1;
    };
    draw();
    const timer = setInterval(draw, 100);
    const testStream = canvas.captureStream(30);
    testStream.__boothTestTimer = timer;
    return testStream;
  }

  function setBoothTestCameraStream() {
    const testStream = createBoothTestStream();
    if (!testStream) {
      __appRuntimeContext.demoMode = true;
      return false;
    }
    __appRuntimeContext.stream = testStream;
    if (__appRuntimeContext.DOM.videoContainer) {
      __appRuntimeContext.DOM.videoContainer.dataset.boothTestCamera = "true";
    }
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.srcObject = testStream;
      __appRuntimeContext.DOM.video.style.transform = "";
      __appRuntimeContext.DOM.video.classList.remove("hidden");
      __appRuntimeContext.DOM.video.style.display = "none";
      if (typeof __appRuntimeContext.DOM.video.play === "function") {
        __appRuntimeContext.DOM.video.play().catch(() => {});
      }
    }
    startLiveImagingPipeline();
    // Seed the preview immediately so browser fixtures do not depend on video
    // metadata timing before the first animation-frame pass.
    if (__appRuntimeContext.DOM.livePreviewCanvas) {
      try {
        drawProcessedFrameToLivePreview(__appRuntimeContext.drawToCanvasFromVideo());
      } catch (_) {}
    }
    __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    return true;
  }

  async function startCamera(autoStartBooth = false) {
    if (__appRuntimeContext.isStartingCamera) return;
    __appRuntimeContext.isStartingCamera = true;

    try {
      // Load the theme first to ensure all assets and settings are ready.
      __appRuntimeContext.loadTheme(__appRuntimeContext.getSelectedThemeKey());

      if (__appRuntimeContext.isBoothTestMode()) {
        setBoothTestCameraStream();
        __appRuntimeContext.showToast("Booth test camera enabled");
        if (autoStartBooth) startBoothFlow();
        __appRuntimeContext.isStartingCamera = false;
        return;
      }

      if (__appRuntimeContext.DOM.videoContainer) {
        delete __appRuntimeContext.DOM.videoContainer.dataset.boothTestCamera;
      }

      // If running from file://, most browsers block camera. Offer Demo Mode unless forced.
      if (
        String(location.protocol).startsWith("file") &&
        localStorage.getItem("forceCameraOnFile") !== "true"
      ) {
        __appRuntimeContext.isStartingCamera = false;
        const useDemo = confirm(
          "Camera access is not available when opened from a file.\n\nUse Demo Mode instead? (You can still test overlays, templates, and email.)"
        );
        if (useDemo) {
          __appRuntimeContext.demoMode = true;
          if (autoStartBooth) startBoothFlow();
          else __appRuntimeContext.showToast("Demo mode enabled");
        } else {
          alert(
            "To use the camera, open the app over HTTPS (e.g., Cloudflare Pages URL) or a local HTTPS server."
          );
        }
        return;
      }

      if (__appRuntimeContext.stream) {
        // Camera already available; only proceed to booth if requested
        startLiveImagingPipeline();
        if (autoStartBooth) startBoothFlow();
        __appRuntimeContext.showToast("Camera is ready");
        __appRuntimeContext.isStartingCamera = false;
        return;
      }

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        __appRuntimeContext.isStartingCamera = false;
        const httpsHint =
          location && !String(location.protocol).startsWith("https")
            ? "\n\nTip: Open the app over HTTPS (GitHub Pages or Cloudflare Pages) to enable the camera."
            : "";
        const useDemo = confirm(
          `Camera access is not supported in this browser or environment.${httpsHint}\n\nUse Demo Mode instead?`
        );
        if (useDemo) {
          __appRuntimeContext.demoMode = true;
          if (autoStartBooth) startBoothFlow();
          else __appRuntimeContext.showToast("Demo mode enabled");
        } else {
          alert(
            "To use the camera, switch to a supported browser over HTTPS or connect a camera device."
          );
        }
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((s) => {
          __appRuntimeContext.stream = s;
          if (__appRuntimeContext.DOM.video) {
            __appRuntimeContext.DOM.video.srcObject = s;
            __appRuntimeContext.DOM.video.style.transform = "";
            __appRuntimeContext.DOM.video.style.display = "none";
            if (typeof __appRuntimeContext.DOM.video.play === "function") {
              __appRuntimeContext.DOM.video.play().catch(() => {});
            }
          }
          startLiveImagingPipeline();
          __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
          __appRuntimeContext.showToast("Camera permission granted");
          if (autoStartBooth) startBoothFlow();
        })
        .catch((err) => {
          console.error("Camera Error:", err);
          alert(
            "Could not access the camera. Please ensure it is not in use by another application and that you have granted permission.\n\nError: " +
              err.message
          );
        })
        .finally(() => {
          __appRuntimeContext.isStartingCamera = false;
        });
    } catch (e) {
      __appRuntimeContext.isStartingCamera = false;
    }
  }

  async function startBooth(options = {}) {
    if (!options.preserveSession) {
      __appRuntimeContext.prepareThemeSessionFromSetup();
    }
    if (__appRuntimeContext.getSelectedThemeKey()) {
      __appRuntimeContext.loadTheme(__appRuntimeContext.getSelectedThemeKey());
    }
    if (!__appRuntimeContext.activeTheme) {
      const fallbackKey = __appRuntimeContext.resolvePreferredThemeKey(__appRuntimeContext.DEFAULT_THEME_KEY);
      if (fallbackKey) __appRuntimeContext.loadTheme(fallbackKey);
    }
    if (!__appRuntimeContext.activeTheme) {
      __appRuntimeContext.showToast("Choose a theme before starting the booth.");
      return;
    }
    startBoothFlow();
    // Start camera after the booth view is already visible so setup cannot stall.
    startCamera(false);
  }

  function startBoothFlow() {
    // Theme is now pre-loaded by startCamera()
    __appRuntimeContext.allowRetake = __appRuntimeContext.DOM.allowRetakes.checked;
    if (__appRuntimeContext.DOM.boothScreen)
      __appRuntimeContext.DOM.boothScreen.classList.remove("share-mode", "countdown-mode");
    __appRuntimeContext.DOM.adminScreen.classList.add("hidden");
    __appRuntimeContext.DOM.boothScreen.classList.remove("hidden");
    document.body.classList.remove("admin-open");
    document.documentElement.classList.remove("admin-open");
    __appRuntimeContext.setBoothControlsVisible(true);
    __appRuntimeContext.setCaptureAspect(null);
    __appRuntimeContext.setMode(resolveBoothLaunchMode());
    showWelcome();
    __appRuntimeContext.syncCaptureStatusIndicators();
    __appRuntimeContext.updateCaptureModeUi();
    __appRuntimeContext.syncMobileSettingsUi();
    if (__appRuntimeContext.getInstantCaptureEnabled()) {
      __appRuntimeContext.showToast("Instant Capture is ON");
    }
  }

  function buildBoothTestFinalImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#f8efe3");
    grad.addColorStop(0.5, "#d9efe7");
    grad.addColorStop(1, "#f3d7b6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(120, 110, 1560, 980);
    ctx.fillStyle = "#263a37";
    ctx.font = "800 96px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Booth Test Photo", canvas.width / 2, 520);
    ctx.font = "44px system-ui, sans-serif";
    ctx.fillText("Final preview and QR QA", canvas.width / 2, 600);
    ctx.fillStyle = "#c79f5d";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 730, 70, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL("image/png");
  }

  function enterBoothQaState(state = "capture") {
    if (!__appRuntimeContext.isBoothTestMode()) return;
    const target = state || "capture";
    startBooth({ preserveSession: true });
    applyBoothVideoFixturesFromUrl();
    if (target === "welcome") showWelcome("idle");
    requestAnimationFrame(() => {
      if (target === "welcome") return;
      beginModeSelection("still-photo");
      if (target === "final") {
        const finalImage = buildBoothTestFinalImage();
        __appRuntimeContext.showFinal(finalImage, {
          shareUrl: __appRuntimeContext.BOOTH_TEST_SHARE_URL,
          printEligible: __appRuntimeContext.getUrlParam("testPaidPrint") === "true",
        });
        updateOutputSurfaceTrace({
          localFinalUrl: finalImage,
          remoteFinalUrl: __appRuntimeContext.BOOTH_TEST_SHARE_URL,
          surfaces: {
            uploadPreview: finalImage,
            galleryLocal: finalImage,
            print: __appRuntimeContext.BOOTH_TEST_SHARE_URL,
            download: __appRuntimeContext.BOOTH_TEST_SHARE_URL,
          },
        });
      }
    });
  }

  function applyBoothVideoFixturesFromUrl() {
    if (!__appRuntimeContext.isBoothTestMode() || !__appRuntimeContext.activeTheme) return;
    const idleLandscape = __appRuntimeContext.getUrlParam("idleVideoLandscape");
    const idlePortrait = __appRuntimeContext.getUrlParam("idleVideoPortrait");
    const choiceLandscape = __appRuntimeContext.getUrlParam("choiceVideoLandscape");
    const choicePortrait = __appRuntimeContext.getUrlParam("choiceVideoPortrait");
    const screenEntries = [
      idleLandscape
        ? {
            src: idleLandscape,
            contentType: "video/mp4",
            orientation: "landscape",
            role: "idle",
            buttonZones: { start: __appRuntimeContext.normalizeIdleButtonZone() },
          }
        : null,
      idlePortrait
        ? {
            src: idlePortrait,
            contentType: "video/mp4",
            orientation: "portrait",
            role: "idle",
            buttonZones: { start: __appRuntimeContext.normalizeIdleButtonZone() },
          }
        : null,
      choiceLandscape
        ? {
            src: choiceLandscape,
            contentType: "video/mp4",
            orientation: "landscape",
            role: "photo-choice",
            buttonZones: {
              singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.singlePhoto),
              photoStrip: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.photoStrip),
            },
          }
        : null,
      choicePortrait
        ? {
            src: choicePortrait,
            contentType: "video/mp4",
            orientation: "portrait",
            role: "photo-choice",
            buttonZones: {
              singlePhoto: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.singlePhoto),
              photoStrip: __appRuntimeContext.normalizeIdleButtonZone(__appRuntimeContext.photoChoiceEditorZones.photoStrip),
            },
          }
        : null,
    ].filter(Boolean);
    if (!screenEntries.length) return;
    __appRuntimeContext.activeTheme.idleScreens = screenEntries;
    const background = __appRuntimeContext.getUrlParam("backgroundVideo") || idleLandscape || idlePortrait;
    if (background) {
      __appRuntimeContext.activeTheme.backgrounds = [background];
      __appRuntimeContext.activeTheme.backgroundIndex = 0;
      __appRuntimeContext.applyThemeBackground(__appRuntimeContext.activeTheme);
    }
  }

  function applyBoothTestModeFromUrl() {
    if (!__appRuntimeContext.isBoothTestMode()) return;
    document.documentElement.dataset.boothTestMode = "true";
    applyBoothVideoFixturesFromUrl();
    const state = __appRuntimeContext.getBoothQaState();
    if (state) {
      requestAnimationFrame(() => enterBoothQaState(state));
    }
  }

  function getVisibleElementBox(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const visible =
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0;
    return {
      selector,
      visible,
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
    };
  }

  function getOverlapArea(a, b) {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return Math.round(width * height);
  }

  function auditBoothLayout() {
    const selectors = [
      "#boothHeader",
      "#boothBackBtn",
      "#adminBtn",
      "#mobileSettingsSheet",
      "#videoContainer",
      "#overlayPickerButton",
      "#boothHostPrompt",
      "#captureBtn",
      "#qrCodeContainer",
    ];
    const boxes = selectors
      .map(getVisibleElementBox)
      .filter(Boolean);
    const visibleBoxes = boxes.filter((box) => box.visible);
    const overlaps = [];
    for (let index = 0; index < visibleBoxes.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < visibleBoxes.length; nextIndex += 1) {
        const area = getOverlapArea(visibleBoxes[index], visibleBoxes[nextIndex]);
        if (area > 20) {
          overlaps.push({
            a: visibleBoxes[index].selector,
            b: visibleBoxes[nextIndex].selector,
            area,
          });
        }
      }
    }
    const tapTargets = Array.from(document.querySelectorAll("button, [role='button'], a"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          selector:
            element.id ? `#${element.id}` :
            element.className ? `.${String(element.className).trim().split(/\s+/)[0]}` :
            element.tagName.toLowerCase(),
          visible:
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: (element.textContent || element.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80),
        };
      })
      .filter((target) => target.visible);
    return {
      testMode: __appRuntimeContext.isBoothTestMode(),
      qaState: __appRuntimeContext.getBoothQaState(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
      },
      boxes,
      overlaps,
      smallTapTargets: tapTargets.filter(
        (target) => target.width < 44 || target.height < 44
      ),
      stepText: Array.from(document.querySelectorAll("#mobileSettingsSheet, #welcomeOverlay"))
        .map((element) => (element.textContent || "").replace(/\s+/g, " ").trim())
        .filter((text) => /step\s+\d/i.test(text)),
    };
  }

  function clearPreviewFreezeFrame() {
    __appRuntimeContext.capturePreviewFrozen = false;
    if (!__appRuntimeContext.DOM.lastShot) return;
    __appRuntimeContext.DOM.lastShot.style.display = "none";
    __appRuntimeContext.DOM.lastShot.removeAttribute("src");
    if (__appRuntimeContext.DOM.livePreviewCanvas) {
      __appRuntimeContext.DOM.livePreviewCanvas.style.display = __appRuntimeContext.overlayUsesPhotoSlots(__appRuntimeContext.getActivePhotoOverlay())
        ? "none"
        : "block";
    }
    if (__appRuntimeContext.overlayUsesPhotoSlots(__appRuntimeContext.getActivePhotoOverlay())) {
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
    }
  }

  function showPreviewFreezeFrame(canvasOrUrl) {
    const stillUrl = __appRuntimeContext.resolveStillPhotoUrl(canvasOrUrl);
    if (!stillUrl) return;
    __appRuntimeContext.capturePreviewFrozen = true;
    const overlay = __appRuntimeContext.getActivePhotoOverlay();
    if (__appRuntimeContext.overlayUsesPhotoSlots(overlay)) {
      __appRuntimeContext.syncOverlayPreviewSurface({
        overlay,
        mode: "still",
        source: stillUrl,
        keepLastShot: true,
      });
      return;
    }
    if (__appRuntimeContext.DOM.video) {
      __appRuntimeContext.DOM.video.classList.add("hidden");
      __appRuntimeContext.DOM.video.style.display = "none";
    }
    if (__appRuntimeContext.DOM.livePreviewCanvas) {
      __appRuntimeContext.DOM.livePreviewCanvas.classList.add("hidden");
      __appRuntimeContext.DOM.livePreviewCanvas.style.display = "none";
    }
    if (!__appRuntimeContext.DOM.lastShot || !stillUrl) return;
    try {
      __appRuntimeContext.DOM.lastShot.src = stillUrl;
      __appRuntimeContext.DOM.lastShot.style.display = "block";
    } catch (_) {}
  }

  function enterFinalizingState(finalUrl) {
    if (!finalUrl || !__appRuntimeContext.DOM.finalStrip) return;
    __appRuntimeContext.setMobileSettingsOpen(false);
    const reveal = () => {
      if (!__appRuntimeContext.DOM.boothScreen) return;
      __appRuntimeContext.DOM.boothScreen.classList.remove("countdown-mode");
      __appRuntimeContext.DOM.boothScreen.classList.add("finalizing-mode");
    };
    __appRuntimeContext.DOM.finalStrip.onload = reveal;
    __appRuntimeContext.DOM.finalStrip.src = finalUrl;
    if (__appRuntimeContext.DOM.finalStrip.complete && __appRuntimeContext.DOM.finalStrip.naturalWidth) reveal();
  }

  function leaveFinalizingState() {
    if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("finalizing-mode");
  }

  return {
    processCanvasThroughImagingPipeline,
    drawProcessedFrameToLivePreview,
    cloneCanvas,
    getCurrentProcessedFrameCanvas,
    getLivePreviewStream,
    startLiveImagingPipeline,
    createOutputSurfaceTrace,
    ensureOutputSurfaceTrace,
    updateOutputSurfaceTrace,
    getShareOutputUrl,
    getOutputSurfaceTraceSnapshot,
    appendAssetPickerShowMore,
    renderOptionsForMode,
    renderOptions,
    setViewOrientation,
    orientationFromTemplate,
    applyPreviewOrientation,
    capturePreviewState,
    restorePreviewState,
    getStripTemplateMetrics,
    prepareStripCapture,
    openConfirm,
    closeConfirm,
    confirmTemplate,
    getIdleScreenViewportOrientation,
    getGuestScreenOrientation,
    syncGuestScreenOrientationControl,
    setGuestScreenOrientation,
    getIdleScreenAssignmentEntries,
    hydrateIdleScreenEntry,
    selectIdleScreenEntry,
    selectPhotoChoiceScreenEntry,
    getWelcomeArtworkRect,
    getWelcomeActionBox,
    getWelcomeArtworkMedia,
    positionIdleStartHotspot,
    clearCustomArtworkLoadTimer,
    startCustomArtworkLoadFallback,
    clearCustomIdleScreen,
    positionPhotoChoiceHotspots,
    loadWelcomeArtwork,
    applyCustomPhotoChoiceScreen,
    applyCustomIdleScreen,
    showWelcome,
    runWelcomeInteraction,
    beginWelcome,
    beginModeSelection,
    goBackFromWelcome,
    goBackFromBooth,
    hideWelcome,
    resolveBoothLaunchMode,
    createBoothTestStream,
    setBoothTestCameraStream,
    startCamera,
    startBooth,
    startBoothFlow,
    buildBoothTestFinalImage,
    enterBoothQaState,
    applyBoothVideoFixturesFromUrl,
    applyBoothTestModeFromUrl,
    getVisibleElementBox,
    getOverlapArea,
    auditBoothLayout,
    clearPreviewFreezeFrame,
    showPreviewFreezeFrame,
    enterFinalizingState,
    leaveFinalizingState,
  };
}
