export function createCaptureFlowModule(__appRuntimeContext) {
  async function capturePhotoFlow() {
    __appRuntimeContext.lastCaptureFlow = capturePhotoFlow; // Store this function for retake
    __appRuntimeContext.setMobileSettingsOpen(false);
    __appRuntimeContext.setBoothControlsVisible(false);
    const livePhotoEnabled = __appRuntimeContext.mode === "live-photo" && __appRuntimeContext.getLivePhotoEnabled();
    const photo = await countdownAndSnap({
      live: livePhotoEnabled,
      instant: __appRuntimeContext.getInstantCaptureEnabled(),
    });
    let finalPreviewStarted = false;
    try {
      const finalized = await __appRuntimeContext.finalizeToPrint(photo, __appRuntimeContext.selectedOverlay);
      if (!finalized?.previewUrl || !finalized.blob) {
        __appRuntimeContext.showToast("Could not finish that photo. Please try again.");
        return;
      }
      const finalUrl = finalized.previewUrl;
      __appRuntimeContext.lastOutputSurfaceTrace = __appRuntimeContext.createOutputSurfaceTrace(finalUrl);
      __appRuntimeContext.enterFinalizingState(finalUrl);
      const galleryUrl = __appRuntimeContext.getEventGalleryUrl();
      __appRuntimeContext.showFinal(finalUrl, {
        shareType: livePhotoEnabled && __appRuntimeContext.lastLiveClipBlob ? "video" : "image",
        shareBlob: livePhotoEnabled ? __appRuntimeContext.lastLiveClipBlob : null,
        shareUrl: galleryUrl,
        printImageUrl: finalUrl,
        uploadPending: true,
      });
      finalPreviewStarted = true;
      __appRuntimeContext.recordAnalytics("photo", __appRuntimeContext.selectedOverlay);
      __appRuntimeContext.addToGallery(finalUrl);

      const uploadToken = ++__appRuntimeContext.activeFinalUploadToken;
      void __appRuntimeContext.uploadCaptureOnce({
        previewUrl: finalUrl,
        mediaBlob: livePhotoEnabled && __appRuntimeContext.lastLiveClipBlob ? __appRuntimeContext.lastLiveClipBlob : finalized.blob,
        resourceType: livePhotoEnabled && __appRuntimeContext.lastLiveClipBlob ? "video" : "image",
        modeName: livePhotoEnabled ? "live-photo" : "photo",
      }).then((uploadResult) => {
        if (uploadToken !== __appRuntimeContext.activeFinalUploadToken || !__appRuntimeContext.DOM.qrHint) return;
        if (uploadResult.queued) {
          __appRuntimeContext.DOM.qrHint.textContent = "Photo queued; it will appear in the gallery after upload.";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        } else if (uploadResult.publicUrl) {
          __appRuntimeContext.DOM.qrHint.textContent = "";
          __appRuntimeContext.DOM.qrHint.style.display = "none";
        } else {
          __appRuntimeContext.DOM.qrHint.textContent = "Photo upload failed. Ask the attendant for help.";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
      }).catch((error) => {
        console.error("Photo upload failed after preview was shown", error);
        if (uploadToken === __appRuntimeContext.activeFinalUploadToken && __appRuntimeContext.DOM.qrHint) {
          __appRuntimeContext.DOM.qrHint.textContent = "Photo upload failed. Ask the attendant for help.";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
      });
    } finally {
      if (!finalPreviewStarted) __appRuntimeContext.leaveFinalizingState();
    }
  }

  async function captureMessageFlow() {
    if (__appRuntimeContext.isMessageRecording) return;
    __appRuntimeContext.lastCaptureFlow = captureMessageFlow;
    __appRuntimeContext.setBoothControlsVisible(false);
    if (__appRuntimeContext.DOM.captureBtn) __appRuntimeContext.DOM.captureBtn.disabled = true;
    try {
      for (let n = 3; n > 0; n--) {
        await showCountdown(n);
      }
      __appRuntimeContext.isMessageRecording = true;
      if (__appRuntimeContext.DOM.captureBtn) {
        __appRuntimeContext.DOM.captureBtn.disabled = false;
        __appRuntimeContext.DOM.captureBtn.textContent = "Stop Recording";
        __appRuntimeContext.DOM.captureBtn.classList.add("recording-stop");
      }
      const clip = await captureMessageClip(__appRuntimeContext.MESSAGE_DURATION_MS);
      if (!clip) {
        __appRuntimeContext.showToast("Message recording failed.");
        __appRuntimeContext.setBoothControlsVisible(true);
        return;
      }
      setLiveClip(clip);
      const posterCanvas = drawToCanvasFromVideo();
      const posterUrl = posterCanvas.toDataURL("image/jpeg", 0.9);
      const uploadResult = await __appRuntimeContext.uploadCaptureOnce({
        previewUrl: posterUrl,
        mediaBlob: clip,
        resourceType: "video",
        modeName: "message",
      });
      __appRuntimeContext.showFinal(posterUrl, {
        shareType: "video",
        shareBlob: clip,
        shareUrl: uploadResult.publicUrl || uploadResult.pendingShareUrl,
        uploadQueued: uploadResult.queued,
      });
      __appRuntimeContext.recordAnalytics("message", "video");
    } finally {
      if (__appRuntimeContext.DOM.captureBtn) {
        __appRuntimeContext.DOM.captureBtn.textContent = "Record Message";
        __appRuntimeContext.DOM.captureBtn.classList.remove("recording-stop");
        __appRuntimeContext.DOM.captureBtn.disabled = false;
      }
      __appRuntimeContext.isMessageRecording = false;
    }
  }

  function handlePrimaryAction() {
    unlockBoothAudio();
    playThemeCue("tap", "tap");
    if (__appRuntimeContext.DOM.boothScreen && __appRuntimeContext.DOM.boothScreen.classList.contains("welcome-active"))
      return;
    if (__appRuntimeContext.isBoothTestMode() && __appRuntimeContext.mode !== "message") {
      __appRuntimeContext.showFinal(__appRuntimeContext.buildBoothTestFinalImage(), {
        shareUrl: __appRuntimeContext.BOOTH_TEST_SHARE_URL,
        printEligible: false,
      });
      return;
    }
    if (__appRuntimeContext.mode === "message") {
      if (__appRuntimeContext.isMessageRecording && typeof __appRuntimeContext.messageStopper === "function") {
        __appRuntimeContext.messageStopper();
        return;
      }
      captureMessageFlow();
      return;
    }
    const captureMode = __appRuntimeContext.getSelectedCaptureMode(__appRuntimeContext.mode);
    if (captureMode === "strip" || captureMode === "layout") {
      const templateKind = captureMode === "layout" ? "layout" : "strip";
      const template =
        __appRuntimeContext.pendingTemplate ||
        __appRuntimeContext.filterAssetsForMode(__appRuntimeContext.getTemplateList(__appRuntimeContext.activeTheme), templateKind)[0];
      if (!template || !template.src) {
        __appRuntimeContext.showToast(
          captureMode === "layout"
            ? "Choose a layout first."
            : "Choose a strip first."
        );
        __appRuntimeContext.setMobileSettingsOpen(true);
        return;
      }
      __appRuntimeContext.pendingTemplate = null;
      runStripSequence(template);
      return;
    }
    capturePhotoFlow();
  }

  function getResolvedCaptureAspectRatio() {
    const captureMode = __appRuntimeContext.getSelectedCaptureMode();
    if (captureMode === "photo") {
      return __appRuntimeContext.getPhotoOverlayAspectForOrientation();
    }
    if (
      (captureMode === "strip" || captureMode === "layout") &&
      typeof __appRuntimeContext.captureAspectRatio === "number" &&
      __appRuntimeContext.captureAspectRatio > 0
    )
      return __appRuntimeContext.captureAspectRatio;
    const rect =
      __appRuntimeContext.DOM.videoContainer &&
      typeof __appRuntimeContext.DOM.videoContainer.getBoundingClientRect === "function"
        ? __appRuntimeContext.DOM.videoContainer.getBoundingClientRect()
        : null;
    if (rect && rect.width > 0 && rect.height > 0)
      return rect.width / rect.height;
    return __appRuntimeContext.DOM.videoWrap && __appRuntimeContext.DOM.videoWrap.classList.contains("view-portrait")
      ? __appRuntimeContext.PRINT_SIZES.portrait.aspect
      : __appRuntimeContext.PRINT_SIZES.landscape.aspect;
  }

  function drawToCanvasFromVideo() {
    const v = __appRuntimeContext.DOM.video;
    const isPortrait = __appRuntimeContext.DOM.videoWrap.classList.contains("view-portrait");
    const targetAspect = getResolvedCaptureAspectRatio();

    // Demo or no camera stream ready: draw a placeholder frame
    if (__appRuntimeContext.demoMode || !v || !v.videoWidth || !v.videoHeight) {
      const baseSize = 900; // arbitrary base size
      const width = Math.round(baseSize * targetAspect);
      const height = baseSize;
      const buffer = __appRuntimeContext.CanvasBuffer.get("snapshot", width, height);
      const ctx = buffer.getContext("2d");
      // Gradient background placeholder
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#222");
      grad.addColorStop(1, "#555");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fff";
      ctx.font = "28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Demo Mode", width / 2, height / 2 - 10);
      ctx.fillText(isPortrait ? "2:3" : "3:2", width / 2, height / 2 + 26);
      return buffer;
    }

    const videoW = v.videoWidth;
    const videoH = v.videoHeight;
    const zoom = __appRuntimeContext.getCameraZoom();

    if (isPortrait) {
      let sWidth, sHeight, sx, sy;
      sHeight = videoH;
      sWidth = sHeight * targetAspect;
      if (sWidth > videoW) {
        sWidth = videoW;
        sHeight = sWidth / targetAspect;
      }
      if (zoom > 1) {
        sWidth = sWidth / zoom;
        sHeight = sHeight / zoom;
      }
      sx = (videoW - sWidth) / 2;
      sy = (videoH - sHeight) / 2;

      const buffer = __appRuntimeContext.CanvasBuffer.get("snapshot", sWidth, sHeight);
      const ctx = buffer.getContext("2d");
      ctx.drawImage(v, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      return buffer;
    } else {
      let sWidth, sHeight, sx, sy;
      sWidth = videoW;
      sHeight = sWidth / targetAspect;
      if (sHeight > videoH) {
        sHeight = videoH;
        sWidth = sHeight * targetAspect;
      }
      if (zoom > 1) {
        sWidth = sWidth / zoom;
        sHeight = sHeight / zoom;
      }
      sx = (videoW - sWidth) / 2;
      sy = (videoH - sHeight) / 2;

      const buffer = __appRuntimeContext.CanvasBuffer.get("snapshot", sWidth, sHeight);
      const ctx = buffer.getContext("2d");
      ctx.drawImage(v, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      return buffer;
    }
  }

  function drawToLivePreviewCanvasFromVideo() {
    const video = __appRuntimeContext.DOM.video;
    const targetAspect = getResolvedCaptureAspectRatio();
    const width = Math.max(
      1,
      Math.round(
        targetAspect >= 1
          ? __appRuntimeContext.LIVE_PREVIEW_MAX_DIMENSION
          : __appRuntimeContext.LIVE_PREVIEW_MAX_DIMENSION * targetAspect
      )
    );
    const height = Math.max(
      1,
      Math.round(
        targetAspect >= 1
          ? __appRuntimeContext.LIVE_PREVIEW_MAX_DIMENSION / targetAspect
          : __appRuntimeContext.LIVE_PREVIEW_MAX_DIMENSION
      )
    );
    const preview = __appRuntimeContext.CanvasBuffer.get("live-preview-source", width, height);
    const ctx = preview.getContext("2d");
    if (!ctx) return preview;

    ctx.clearRect(0, 0, width, height);
    if (__appRuntimeContext.demoMode || !video || !video.videoWidth || !video.videoHeight) {
      const fallback = drawToCanvasFromVideo();
      ctx.drawImage(fallback, 0, 0, width, height);
      return preview;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    let sourceWidth = videoWidth;
    let sourceHeight = videoHeight;
    if (videoWidth / videoHeight > targetAspect) {
      sourceWidth = videoHeight * targetAspect;
    } else {
      sourceHeight = videoWidth / targetAspect;
    }
    const zoom = Math.max(1, __appRuntimeContext.getCameraZoom());
    sourceWidth /= zoom;
    sourceHeight /= zoom;
    const sourceX = (videoWidth - sourceWidth) / 2;
    const sourceY = (videoHeight - sourceHeight) / 2;
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height
    );
    return preview;
  }

  async function ensureGuestPhotoProcessed(canvas) {
    if (!canvas || canvas.__processedByLiveImagingPipeline) return canvas;
    const processed = await __appRuntimeContext.processCanvasThroughImagingPipeline(canvas);
    processed.__processedByLiveImagingPipeline = true;
    return processed;
  }

  function cloneCanvasForStrip(source) {
    if (!source) return source;
    const width = source.width || source.naturalWidth || 0;
    const height = source.height || source.naturalHeight || 0;
    if (!width || !height) return source;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(source, 0, 0, width, height);
    if (source.__aiMask) canvas.__aiMask = source.__aiMask;
    return canvas;
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clearLiveClip() {
    if (__appRuntimeContext.lastLiveClipUrl) {
      try {
        URL.revokeObjectURL(__appRuntimeContext.lastLiveClipUrl);
      } catch (_) {}
    }
    __appRuntimeContext.lastLiveClipUrl = null;
    __appRuntimeContext.lastLiveClipBlob = null;
    if (__appRuntimeContext.DOM.finalLive) {
      __appRuntimeContext.DOM.finalLive.pause();
      __appRuntimeContext.DOM.finalLive.removeAttribute("src");
      __appRuntimeContext.DOM.finalLive.load();
      __appRuntimeContext.DOM.finalLive.classList.add("hidden");
    }
    if (__appRuntimeContext.DOM.finalStrip) __appRuntimeContext.DOM.finalStrip.classList.remove("hidden");
  }

  function setLiveClip(blob) {
    clearLiveClip();
    if (!blob) return;
    __appRuntimeContext.lastLiveClipBlob = blob;
    __appRuntimeContext.lastLiveClipUrl = URL.createObjectURL(blob);
  }

  function pickLiveMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function setRecordingHighlight(isRecording) {
    if (!__appRuntimeContext.DOM.videoContainer) return;
    __appRuntimeContext.DOM.videoContainer.classList.toggle("recording", !!isRecording);
  }

  function setRecordingOverlayVisible(show, remainingMs = 0) {
    if (!__appRuntimeContext.DOM.recordingOverlay || !__appRuntimeContext.DOM.recordingTimer) return;
    __appRuntimeContext.DOM.recordingOverlay.classList.toggle("show", !!show);
    if (show) {
      __appRuntimeContext.DOM.recordingTimer.textContent = `REC ${__appRuntimeContext.formatRecordingTime(remainingMs)}`;
    }
  }

  function startRecordingTimer(durationMs) {
    if (!__appRuntimeContext.DOM.recordingTimer || !__appRuntimeContext.DOM.recordingOverlay) return () => {};
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, durationMs - elapsed);
      __appRuntimeContext.DOM.recordingTimer.textContent = `REC ${__appRuntimeContext.formatRecordingTime(remaining)}`;
      if (remaining <= 0) clearInterval(timer);
    };
    setRecordingOverlayVisible(true, durationMs);
    const timer = setInterval(tick, 250);
    return () => {
      clearInterval(timer);
      setRecordingOverlayVisible(false, 0);
    };
  }

  function stopStreamTracks(targetStream) {
    if (!targetStream) return;
    targetStream.getTracks().forEach((track) => track.stop());
  }

  async function ensureMessageStream() {
    if (__appRuntimeContext.demoMode) {
      __appRuntimeContext.showToast("Message recording is unavailable in demo mode.");
      return null;
    }
    if (__appRuntimeContext.stream && __appRuntimeContext.stream.getAudioTracks().length) return __appRuntimeContext.stream;
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (__appRuntimeContext.stream && __appRuntimeContext.stream !== nextStream) stopStreamTracks(__appRuntimeContext.stream);
      __appRuntimeContext.stream = nextStream;
      if (__appRuntimeContext.DOM.video) {
        __appRuntimeContext.DOM.video.srcObject = __appRuntimeContext.stream;
        __appRuntimeContext.DOM.video.style.transform = "";
      }
      __appRuntimeContext.syncOverlayPreviewSurface({ mode: "live" });
      return __appRuntimeContext.stream;
    } catch (err) {
      console.warn("Microphone access failed", err);
      __appRuntimeContext.showToast("Mic permission denied; recording will be silent.");
      return __appRuntimeContext.stream || null;
    }
  }

  function pickMessageMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  async function captureMessageClip(durationMs) {
    try {
      const activeStream = await ensureMessageStream();
      if (!activeStream || typeof MediaRecorder === "undefined") return null;
      const mimeType = pickMessageMimeType();
      const recorder = new MediaRecorder(
        activeStream,
        mimeType ? { mimeType } : undefined
      );
      __appRuntimeContext.messageRecorder = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });
      const stopTimer = startRecordingTimer(durationMs);
      setRecordingHighlight(true);
      recorder.start();
      __appRuntimeContext.messageStopper = () => {
        if (recorder.state === "recording") recorder.stop();
      };
      __appRuntimeContext.messageStopTimer = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, Math.max(500, durationMs));
      await stopped;
      stopTimer();
      setRecordingHighlight(false);
      clearTimeout(__appRuntimeContext.messageStopTimer);
      __appRuntimeContext.messageStopTimer = null;
      __appRuntimeContext.messageRecorder = null;
      __appRuntimeContext.messageStopper = null;
      if (!chunks.length) return null;
      return new Blob(chunks, { type: chunks[0].type || "video/webm" });
    } catch (e) {
      console.warn("Message recording failed", e);
      setRecordingHighlight(false);
      setRecordingOverlayVisible(false, 0);
      clearTimeout(__appRuntimeContext.messageStopTimer);
      __appRuntimeContext.messageStopTimer = null;
      __appRuntimeContext.messageRecorder = null;
      __appRuntimeContext.messageStopper = null;
      return null;
    }
  }

  async function captureLiveClip(durationMs) {
    try {
      const stream = __appRuntimeContext.DOM.video && __appRuntimeContext.DOM.video.srcObject;
      if (
        !stream ||
        typeof MediaRecorder === "undefined"
      )
        return null;
      const mimeType = pickLiveMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });
      setRecordingHighlight(true);
      recorder.start();
      await delay(Math.max(300, durationMs));
      recorder.stop();
      await stopped;
      setRecordingHighlight(false);
      if (!chunks.length) return null;
      return new Blob(chunks, { type: chunks[0].type || "video/webm" });
    } catch (e) {
      console.warn("Live clip capture failed", e);
      setRecordingHighlight(false);
      return null;
    }
  }

  function updateCaptureAspect() {
    if (!__appRuntimeContext.DOM.videoContainer) return;
    updateCountdownFontSize();
    requestAnimationFrame(syncFrameSizeVars);
  }

  function setCaptureAspect(aspect) {
    if (typeof aspect === "number" && aspect > 0) {
      __appRuntimeContext.captureAspectRatio = aspect;
    } else {
      __appRuntimeContext.captureAspectRatio = null;
    }
    updateCaptureAspect();
  }

  function syncFrameSizeVars() {
    if (!__appRuntimeContext.DOM.videoContainer) return;
    const rect = __appRuntimeContext.DOM.videoContainer.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    document.documentElement.style.setProperty(
      "--frame-preview-width",
      `${width}px`
    );
    document.documentElement.style.setProperty(
      "--frame-preview-height",
      `${height}px`
    );
    document.documentElement.style.setProperty(
      "--frame-preview-aspect",
      `${width} / ${height}`
    );
  }

  function setFinalPreviewSharePanelVisible(visible) {
    if (__appRuntimeContext.DOM.finalPreviewActions) {
      __appRuntimeContext.DOM.finalPreviewActions.classList.remove("hidden");
      __appRuntimeContext.DOM.finalPreviewActions.classList.toggle("share-panel-empty", !visible);
    }
    if (__appRuntimeContext.DOM.qrCodeContainer) {
      __appRuntimeContext.DOM.qrCodeContainer.classList.toggle("hidden", !visible);
    }
  }

  function getCountdownScale() {
    try {
      const stored = localStorage.getItem(__appRuntimeContext.COUNTDOWN_SCALE_KEY);
      if (stored !== null) return __appRuntimeContext.clampZoom(parseFloat(stored), 0.5, 1);
      localStorage.setItem(__appRuntimeContext.COUNTDOWN_SCALE_KEY, "0.9");
    } catch (_) {}
    return 0.9;
  }

  function setCountdownScale(scale) {
    const normalized = __appRuntimeContext.clampZoom(scale, 0.5, 1);
    try {
      localStorage.setItem(__appRuntimeContext.COUNTDOWN_SCALE_KEY, String(normalized));
    } catch (_) {}
    updateCountdownFontSize();
  }

  function updateCountdownFontSize() {
    if (!__appRuntimeContext.DOM.videoContainer) return;
    const rect = __appRuntimeContext.DOM.videoContainer.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const size = Math.max(
      80,
      Math.round(Math.min(rect.width, rect.height) * getCountdownScale())
    );
    document.documentElement.style.setProperty("--countdown-size", `${size}px`);
  }

  function loadImage(url) {
    if (!url) return Promise.reject(new Error("Image URL is empty"));
    const cached = __appRuntimeContext.decodedImageCache.get(url);
    if (cached) return cached;
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      try {
        if (location.protocol.startsWith("http")) img.crossOrigin = "anonymous";
      } catch (_) {}
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    __appRuntimeContext.decodedImageCache.set(url, promise);
    if (__appRuntimeContext.decodedImageCache.size > __appRuntimeContext.DECODED_IMAGE_CACHE_LIMIT) {
      __appRuntimeContext.decodedImageCache.delete(__appRuntimeContext.decodedImageCache.keys().next().value);
    }
    promise.catch(() => __appRuntimeContext.decodedImageCache.delete(url));
    return promise;
  }

  function preloadThemeOrientationAssets(theme) {
    if (!theme) return;
    const orientation = __appRuntimeContext.getGuestScreenOrientation();
    const sources = [];
    const add = (value) => {
      const src = __appRuntimeContext.getAssetEntrySrc(value);
      if (src && !sources.includes(src)) sources.push(src);
    };
    ["idleScreens", "thankYouScreens"].forEach((field) => {
      (Array.isArray(theme[field]) ? theme[field] : [])
        .filter((entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) === orientation)
        .forEach(add);
    });
    const backgrounds = Array.isArray(theme.backgrounds) ? theme.backgrounds : [];
    add(backgrounds.find((entry) => String(__appRuntimeContext.getAssetEntrySrc(entry)).toLowerCase().includes(orientation)) || backgrounds[0]);
    sources.forEach((src) => loadImage(src).catch(() => {}));
  }

  function cacheActiveThemeOrientation(theme) {
    if (!theme || !("caches" in window) || !location.protocol.startsWith("http")) return;
    const orientation = __appRuntimeContext.getGuestScreenOrientation();
    const urls = [];
    const add = (value) => {
      const src = __appRuntimeContext.getAssetEntrySrc(value);
      if (src && !urls.includes(src)) urls.push(src);
    };
    ["idleScreens", "thankYouScreens"].forEach((field) => {
      (Array.isArray(theme[field]) ? theme[field] : [])
        .filter((entry) => __appRuntimeContext.normalizeIdleScreenOrientation(entry && entry.orientation) === orientation)
        .forEach(add);
    });
    const backgrounds = Array.isArray(theme.backgrounds) ? theme.backgrounds : [];
    add(backgrounds.find((entry) => String(__appRuntimeContext.getAssetEntrySrc(entry)).toLowerCase().includes(orientation)) || backgrounds[0]);
    __appRuntimeContext.deferNonCriticalTask(async () => {
      try {
        const cache = await caches.open("pb-offline-assets-v1");
        await Promise.all(urls.map(async (url) => {
          const response = await fetch(url, { cache: "force-cache" });
          if (response.ok) await cache.put(new Request(url), response.clone());
        }));
      } catch (_) {}
    });
  }

  function loadDrawableMedia(url) {
    if (!__appRuntimeContext.isVideoAsset(url)) return loadImage(url);
    if (
      __appRuntimeContext.DOM.photoBackgroundVideo &&
      __appRuntimeContext.DOM.photoBackgroundVideo.dataset.src === url &&
      __appRuntimeContext.DOM.photoBackgroundVideo.readyState >= 2 &&
      __appRuntimeContext.DOM.photoBackgroundVideo.videoWidth
    ) {
      return Promise.resolve(__appRuntimeContext.DOM.photoBackgroundVideo);
    }
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.onloadeddata = () => resolve(video);
      video.onerror = reject;
      video.src = url;
      video.load();
    });
  }

  async function getOrientationFromImage(imgSrc) {
    const img = await loadImage(imgSrc);
    if (img.naturalHeight > img.naturalWidth) return "portrait";
    return "landscape";
  }

  async function applyOverlay(canvas, overlaySrc) {
    if (!overlaySrc) return canvas;
    try {
      const ov = await loadImage(__appRuntimeContext.resolveOverlayRenderSrc(__appRuntimeContext.activeTheme, overlaySrc));
      const ctx = canvas.getContext("2d");
      // Optionally mask spot color to transparency
      const overlayToDraw = __appRuntimeContext.SPOT_MASK.enabled
        ? createMaskedOverlayCanvas(ov, __appRuntimeContext.SPOT_MASK.color, __appRuntimeContext.SPOT_MASK.tolerance)
        : ov;
      ctx.drawImage(overlayToDraw, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("Failed to apply overlay:", overlaySrc, e);
    }
    return canvas;
  }

  function getObjectPositionAnchor(value) {
    const raw = String(value || "center").toLowerCase();
    const horizontal = raw.includes("left") ? 0 : raw.includes("right") ? 1 : 0.5;
    const vertical = raw.includes("top") ? 0 : raw.includes("bottom") ? 1 : 0.5;
    return { horizontal, vertical };
  }

  function drawCoverInRect(ctx, source, dx, dy, dw, dh, objectPosition = "center") {
    if (!source) return;
    const img = source;
    const iw = img.naturalWidth || img.videoWidth || img.width;
    const ih = img.naturalHeight || img.videoHeight || img.height;
    if (!iw || !ih || !dw || !dh) return;
    const scale = Math.max(dw / iw, dh / ih);
    const rw = iw * scale;
    const rh = ih * scale;
    const anchor = getObjectPositionAnchor(objectPosition);
    const rx = dx + (dw - rw) * anchor.horizontal;
    const ry = dy + (dh - rh) * anchor.vertical;
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
    ctx.drawImage(img, rx, ry, rw, rh);
    ctx.restore();
  }

  function drawImageCover(ctx, img, dx, dy, dw, dh) {
    drawCoverInRect(ctx, img, dx, dy, dw, dh);
  }

  function drawImageContain(ctx, img, dx, dy, dw, dh) {
    const iw = img.naturalWidth || img.videoWidth || img.width;
    const ih = img.naturalHeight || img.videoHeight || img.height;
    if (!iw || !ih || !dw || !dh) return;
    const scale = Math.min(dw / iw, dh / ih);
    const rw = iw * scale;
    const rh = ih * scale;
    const rx = dx + (dw - rw) / 2;
    const ry = dy + (dh - rh) / 2;
    ctx.drawImage(img, rx, ry, rw, rh);
  }

  function roundedRectPath(ctx, x, y, w, h, radius = 0) {
    const safeRadius = Math.max(0, Math.min(radius || 0, Math.min(w, h) / 2));
    ctx.beginPath();
    if (!safeRadius) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + w, y, x + w, y + h, safeRadius);
    ctx.arcTo(x + w, y + h, x, y + h, safeRadius);
    ctx.arcTo(x, y + h, x, y, safeRadius);
    ctx.arcTo(x, y, x + w, y, safeRadius);
    ctx.closePath();
  }

  function normalizeSlotRect(slot, outputW, outputH) {
    return {
      x: Math.round((slot.x || 0) * outputW),
      y: Math.round((slot.y || 0) * outputH),
      w: Math.round((slot.width || 0) * outputW),
      h: Math.round((slot.height || 0) * outputH),
    };
  }

  function drawPhotoSlot(ctx, source, slot, outputW, outputH) {
    if (!ctx || !source || !slot) return;
    const img = source;
    const rect = normalizeSlotRect(slot, outputW, outputH);
    if (rect.w <= 0 || rect.h <= 0) return;
    console.debug("[photo-slot-render]", {
      slot,
      outputW,
      outputH,
      drawImage: rect,
    });
    ctx.save();
    if (Number.isFinite(slot.rotation) && slot.rotation !== 0) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    roundedRectPath(
      ctx,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      Math.min(rect.w, rect.h) * __appRuntimeContext.clamp01(slot.borderRadius || 0)
    );
    ctx.clip();
    if (slot.objectFit === "contain") {
      drawImageContain(ctx, img, rect.x, rect.y, rect.w, rect.h);
    } else {
      drawCoverInRect(ctx, img, rect.x, rect.y, rect.w, rect.h, slot.objectPosition);
    }
    ctx.restore();
  }

  function isReservedPhotoMarkerPixel(data, offset) {
    return (
      data[offset] >= 255 - __appRuntimeContext.RESERVED_PHOTO_MARKER.tolerance &&
      data[offset + 1] <= __appRuntimeContext.RESERVED_PHOTO_MARKER.tolerance &&
      data[offset + 2] >= 255 - __appRuntimeContext.RESERVED_PHOTO_MARKER.tolerance &&
      data[offset + 3] >= 180
    );
  }

  function normalizeDetectedMarkerSlot(bounds, width, height, index) {
    if (!bounds || !width || !height) return null;
    return __appRuntimeContext.normalizePhotoSlotDescriptor(
      {
        x: bounds.minX / width,
        y: bounds.minY / height,
        width: (bounds.maxX - bounds.minX + 1) / width,
        height: (bounds.maxY - bounds.minY + 1) / height,
        borderRadius: 0,
        objectFit: "cover",
        objectPosition: "center",
      },
      index
    );
  }

  function detectReservedPhotoMarkerComponents(mask, width, height) {
    const visited = new Uint8Array(mask.length);
    const stack = [];
    const minArea = Math.max(
      64,
      Math.floor(width * height * __appRuntimeContext.RESERVED_PHOTO_MARKER.minAreaRatio)
    );
    const components = [];
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || visited[start]) continue;
      let area = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      visited[start] = 1;
      stack.push(start);
      while (stack.length) {
        const point = stack.pop();
        const x = point % width;
        const y = Math.floor(point / width);
        area++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        const pushNeighbor = (next) => {
          if (mask[next] && !visited[next]) {
            visited[next] = 1;
            stack.push(next);
          }
        };
        if (x > 0) pushNeighbor(point - 1);
        if (x < width - 1) pushNeighbor(point + 1);
        if (y > 0) pushNeighbor(point - width);
        if (y < height - 1) pushNeighbor(point + width);
      }
      if (area >= minArea) {
        components.push({ area, minX, minY, maxX, maxY });
      }
    }
    return components.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  }

  async function processReservedPhotoMarkerImage(src) {
    const key = String(src || "").trim();
    if (!key) return null;
    if (__appRuntimeContext.reservedPhotoMarkerCache.has(key)) return __appRuntimeContext.reservedPhotoMarkerCache.get(key);
    const promise = (async () => {
      const image = await loadImage(__appRuntimeContext.withBust(key));
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      if (!width || !height) return null;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(image, 0, 0, width, height);
      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, width, height);
      } catch (_) {
        return null;
      }
      const data = imageData.data;
      const mask = new Uint8Array(width * height);
      for (let pixel = 0; pixel < mask.length; pixel++) {
        const offset = pixel * 4;
        if (isReservedPhotoMarkerPixel(data, offset)) {
          mask[pixel] = 1;
          data[offset + 3] = 0;
        }
      }
      const components = detectReservedPhotoMarkerComponents(mask, width, height);
      if (!components.length) return null;
      ctx.putImageData(imageData, 0, 0);
      return {
        src: canvas.toDataURL("image/png"),
        photoSlots: components
          .map((bounds, index) =>
            normalizeDetectedMarkerSlot(bounds, width, height, index)
          )
          .filter(Boolean),
      };
    })().catch(() => null);
    __appRuntimeContext.reservedPhotoMarkerCache.set(key, promise);
    return promise;
  }

  async function resolveOverlayReservedPhotoMarker(overlay) {
    if (!overlay || __appRuntimeContext.hasExplicitPhotoSlots(overlay)) return overlay;
    const foreground = overlay.foreground;
    const src =
      foreground && foreground.type === "image" && foreground.src
        ? foreground.src
        : overlay.renderSrc || overlay.src || "";
    const processed = await processReservedPhotoMarkerImage(src);
    if (!processed || !processed.photoSlots.length) return overlay;
    return {
      ...overlay,
      foreground: { type: "image", src: processed.src },
      renderSrc: processed.src,
      photoSlots: processed.photoSlots,
    };
  }

  async function renderOverlayToCanvas(ctx, overlay, sources, outputW, outputH) {
    if (!ctx || !overlay) return;
    overlay = await resolveOverlayReservedPhotoMarker(overlay);
    const sourcePhoto =
      sources && sources.photo ? sources.photo : sources && sources.image;
    const sourcePhotos = Array.isArray(sources && sources.photos)
      ? sources.photos
      : [];
    const background = overlay.background;
    if (background) {
      if (background.type === "color") {
        ctx.save();
        ctx.fillStyle = background.value || "#ffffff";
        ctx.fillRect(0, 0, outputW, outputH);
        ctx.restore();
      } else if (background.type === "image" && background.src) {
        try {
          const bgImage = await loadImage(background.src);
          drawImageCover(ctx, bgImage, 0, 0, outputW, outputH);
        } catch (_) {}
      }
    }
    const slots = __appRuntimeContext.overlayUsesPhotoSlots(overlay)
      ? overlay.photoSlots
      : __appRuntimeContext.normalizeOverlayPhotoSlots({});
    const usePhotos = sourcePhotos.length ? sourcePhotos : [sourcePhoto];
    slots.forEach((slot, index) => {
      const sourceIndex =
        slot.sourceIndex != null
          ? slot.sourceIndex
          : sources && sources.repeatPhotos && usePhotos.length
          ? index % usePhotos.length
          : index;
      const photo =
        usePhotos[sourceIndex] ||
        (sources && sources.repeatPhotos && usePhotos.length
          ? usePhotos[index % usePhotos.length]
          : usePhotos[0]);
      if (!photo) return;
      drawPhotoSlot(ctx, photo, slot, outputW, outputH);
    });
    const foreground = overlay.foreground;
    if (foreground && foreground.type === "image" && foreground.src) {
      try {
        const fgImage = await loadImage(foreground.src);
        ctx.drawImage(fgImage, 0, 0, outputW, outputH);
      } catch (_) {}
    }
  }

  function toNumber(val, fallback) {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeTemplateLayout(layout) {
    const value = String(layout || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    if (!value) return "double_column";
    if (value === "double-column") return "double_column";
    if (value === "photo-strip-3" || value === "strip-3" || value === "strip")
      return "photo_strip_3";
    if (value === "single-photo") return "single_photo";
    return value.replace(/-/g, "_");
  }

  function isStripTemplateLayout(layout) {
    const normalized = normalizeTemplateLayout(layout);
    return (
      normalized === "double_column" ||
      normalized === "vertical" ||
      normalized === "horizontal" ||
      normalized === "photo_strip_3" ||
      normalized === "photo_strip_2" ||
      normalized === "photo_strip_4" ||
      normalized === "spot_mask" ||
      normalized === "custom"
    );
  }

  function getTemplateColumnCount(layout) {
    const normalized = normalizeTemplateLayout(layout);
    return normalized === "double_column" ? 2 : 1;
  }

  function getTemplateRowCount(layout, slots) {
    const normalized = normalizeTemplateLayout(layout);
    if (normalized === "photo_strip_2") return 2;
    if (normalized === "photo_strip_3") return 3;
    if (normalized === "photo_strip_4") return 4;
    if (Array.isArray(slots) && slots[0] && Array.isArray(slots[0])) {
      return Math.max(1, slots[0].length);
    }
    return 3;
  }

  function getStandardDoubleColumnStripSlots() {
    return __appRuntimeContext.STANDARD_DOUBLE_COLUMN_STRIP_SLOTS.map((slot) => ({ ...slot }));
  }

  function normalizeTemplateSlots(slots, columnCount = 1) {
    const normalized = __appRuntimeContext.normalizeAssetSlots(slots);
    if (!normalized.length) return null;
    if (columnCount <= 1) return [normalized];
    const maxRight = Math.max(
      ...normalized.map((slot) => (slot.x || 0) + (slot.w || 0))
    );
    const xScale = maxRight > 1 ? maxRight : 1;
    const groups = Array.from({ length: columnCount }, () => []);
    const sorted = normalized.slice().sort((a, b) => {
      if (Math.abs(a.x - b.x) > 4) return a.x - b.x;
      return a.y - b.y;
    });
    sorted.forEach((slot) => {
      const centerX = slot.x + slot.w / 2;
      let targetIndex = 0;
      let bestDistance = Infinity;
      for (let index = 0; index < columnCount; index++) {
        const expectedCenter = ((index + 0.5) / columnCount) * xScale;
        const distance = Math.abs(centerX - expectedCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          targetIndex = index;
        }
      }
      groups[targetIndex].push(slot);
    });
    groups.forEach((group) => group.sort((a, b) => a.y - b.y));
    return groups.every((group) => group.length) ? groups : [normalized];
  }

  function detectTransparentColumnSlots(img, rows, cols = 2) {
    try {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return null;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const colWidth = w / cols;
      const marginX = Math.max(2, Math.floor(colWidth * 0.08));
      const stepX = Math.max(1, Math.floor(colWidth / 80));
      const alphaThreshold = 32;
      const minSlotHeight = Math.max(10, Math.floor(h * 0.08));
      const expandY = Math.floor(h * 0.005);
      const results = Array.from({ length: cols }, () => []);

      for (let col = 0; col < cols; col++) {
        const xStart = Math.max(0, Math.floor(col * colWidth + marginX));
        const xEnd = Math.min(w - 1, Math.floor((col + 1) * colWidth - marginX));
        let inSlot = false;
        let slotStart = 0;
        for (let y = 0; y < h; y++) {
          let alphaSum = 0;
          let count = 0;
          for (let x = xStart; x <= xEnd; x += stepX) {
            alphaSum += data[(y * w + x) * 4 + 3];
            count++;
          }
          const avgAlpha = alphaSum / (count || 1);
          if (!inSlot && avgAlpha < alphaThreshold) {
            inSlot = true;
            slotStart = y;
          } else if (inSlot && avgAlpha >= alphaThreshold) {
            const slotHeight = y - slotStart;
            if (slotHeight >= minSlotHeight) {
              const y1 = Math.max(0, slotStart - expandY);
              const y2 = Math.min(h, y + expandY);
              results[col].push({
                x: col * colWidth + marginX,
                y: y1,
                w: colWidth - marginX * 2,
                h: Math.max(1, y2 - y1),
              });
            }
            inSlot = false;
          }
        }
        if (inSlot) {
          const slotHeight = h - slotStart;
          if (slotHeight >= minSlotHeight) {
            const y1 = Math.max(0, slotStart - expandY);
            const y2 = h;
            results[col].push({
              x: col * colWidth + marginX,
              y: y1,
              w: colWidth - marginX * 2,
              h: Math.max(1, y2 - y1),
            });
          }
        }
        results[col].sort((a, b) => a.y - b.y);
        if (results[col].length > rows) {
          results[col] = results[col].slice(0, rows);
        }
      }

      if (results.every((arr) => arr.length === rows)) {
        return results;
      }
      return null;
    } catch (e) {
      console.warn("Slot detection failed", e);
      return null;
    }
  }

  function hexToRgb(hex) {
    const m = (hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m) return { r: 0, g: 0, b: 0 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function colorClose(r, g, b, target, tol) {
    return (
      Math.abs(r - target.r) <= tol &&
      Math.abs(g - target.g) <= tol &&
      Math.abs(b - target.b) <= tol
    );
  }

  function createMaskedOverlayCanvas(img, hexColor, tolerance) {
    const rgb = hexToRgb(hexColor);
    const c = document.createElement("canvas");
    const w = (c.width = img.naturalWidth || img.width);
    const h = (c.height = img.naturalHeight || img.height);
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, w, h);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      if (colorClose(r, g, b, rgb, tolerance)) d[i + 3] = 0; // make transparent
    }
    x.putImageData(data, 0, 0);
    return c;
  }

  async function runStripSequence(template) {
    __appRuntimeContext.lastCaptureFlow = () => runStripSequence(template); // Store this function for retake
    // 3 photos automatically with pauses
    const shots = [];
    clearLiveClip();
    const lastShotImg = document.getElementById("lastShot");
    const { state: previewState, prevAspect } = await __appRuntimeContext.prepareStripCapture(
      template
    );
    let previewRestored = false;
    __appRuntimeContext.setBoothControlsVisible(false);
    if (lastShotImg) lastShotImg.style.display = "none";
    for (let i = 0; i < 3; i++) {
      if (lastShotImg) lastShotImg.style.display = "none";
      const snap = await countdownAndSnap();
      const frozenSnap = cloneCanvasForStrip(snap) || snap;
      shots.push(frozenSnap);
      if (i < 2) {
        try {
          if (lastShotImg) {
            lastShotImg.src = frozenSnap.toDataURL("image/png");
            lastShotImg.style.display = "block";
            await delay(1200);
            lastShotImg.style.display = "none";
          }
        } catch (_) {}
        const remaining = 3000 - (lastShotImg ? 1200 : 0);
        if (remaining > 0) await delay(remaining);
      }
    }
    try {
      const stripUrl = await __appRuntimeContext.composeStrip(template, shots);
      // Keep the capture surface cleared until the completed strip is ready for
      // showFinal(); restoring it here briefly exposed an empty template frame.
      __appRuntimeContext.enterFinalizingState(stripUrl);
      const uploadResult = await __appRuntimeContext.uploadCaptureOnce({
        previewUrl: stripUrl,
        resourceType: "image",
        modeName: "strip",
      });
      __appRuntimeContext.showFinal(__appRuntimeContext.getDeliveredFilterPreviewUrl(stripUrl, uploadResult), {
        shareUrl: uploadResult.publicUrl,
        uploadQueued: uploadResult.queued,
      });
      previewRestored = true;
      __appRuntimeContext.recordAnalytics("strip", template.src);
    } finally {
      if (!previewRestored) __appRuntimeContext.restorePreviewState(previewState);
      setCaptureAspect(prevAspect);
    }
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function unlockBoothAudio() {
    if (!__appRuntimeContext.getThemeSoundsEnabled()) return;
    __appRuntimeContext.boothAudioEnabled = true;
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!__appRuntimeContext.boothAudioContext) __appRuntimeContext.boothAudioContext = new AudioContextCtor();
      if (__appRuntimeContext.boothAudioContext.state === "suspended") {
        __appRuntimeContext.boothAudioContext.resume().catch(() => {});
      }
    } catch (_) {}
  }

  function getThemeSoundEffect(kind) {
    const soundEffects = __appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.soundEffects;
    const alternates = soundEffects && soundEffects[`${kind}Alternates`];
    if (Array.isArray(alternates)) {
      const options = alternates.filter(
        (src) => typeof src === "string" && src.trim()
      );
      if (options.length) {
        const indexes = __appRuntimeContext.themeSoundEffectIndexes.get(__appRuntimeContext.activeTheme) || {};
        const index = indexes[kind] || 0;
        indexes[kind] = index + 1;
        __appRuntimeContext.themeSoundEffectIndexes.set(__appRuntimeContext.activeTheme, indexes);
        return options[index % options.length].trim();
      }
    }
    const src = soundEffects && soundEffects[kind];
    return typeof src === "string" && src.trim() ? src.trim() : "";
  }

  function hasThemeSoundEffect(kind) {
    const soundEffects = __appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.soundEffects;
    if (!soundEffects || typeof soundEffects !== "object") return false;
    const alternates = soundEffects[`${kind}Alternates`];
    if (
      Array.isArray(alternates) &&
      alternates.some((src) => typeof src === "string" && src.trim())
    ) {
      return true;
    }
    return typeof soundEffects[kind] === "string" && Boolean(soundEffects[kind].trim());
  }

  function playThemeSoundEffect(kind, { afterCurrent = false } = {}) {
    if (!__appRuntimeContext.boothAudioEnabled || !__appRuntimeContext.getThemeSoundsEnabled()) return false;
    const src = getThemeSoundEffect(kind);
    if (!src) return false;

    const start = () => {
      if (__appRuntimeContext.boothThemeAudio) {
        __appRuntimeContext.boothThemeAudio.pause();
        __appRuntimeContext.boothThemeAudio.currentTime = 0;
      }
      const audio = new Audio(src);
      __appRuntimeContext.boothThemeAudio = audio;
      audio.preload = "auto";
      audio.volume = 0.72;
      audio.addEventListener(
        "ended",
        () => {
          if (__appRuntimeContext.boothThemeAudio === audio) __appRuntimeContext.boothThemeAudio = null;
        },
        { once: true }
      );
      audio.play().catch(() => {});
    };

    const current = __appRuntimeContext.boothThemeAudio;
    if (afterCurrent && current && !current.paused && !current.ended) {
      current.addEventListener(
        "ended",
        () => {
          if (__appRuntimeContext.boothThemeAudio === current) __appRuntimeContext.boothThemeAudio = null;
          start();
        },
        { once: true }
      );
    } else {
      start();
    }
    return true;
  }

  function playThemeCue(effectKind, fallbackKind = effectKind) {
    if (playThemeSoundEffect(effectKind)) return true;
    playBoothSound(fallbackKind);
    return false;
  }

  function playBoothSound(kind = "tap") {
    if (!__appRuntimeContext.boothAudioEnabled || !__appRuntimeContext.getThemeSoundsEnabled()) return;
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!__appRuntimeContext.boothAudioContext) __appRuntimeContext.boothAudioContext = new AudioContextCtor();
      const context = __appRuntimeContext.boothAudioContext;
      if (context.state === "suspended") context.resume().catch(() => {});
      const soundProfile = __appRuntimeContext.activeTheme && __appRuntimeContext.activeTheme.soundProfile;
      const themeSound = soundProfile && soundProfile[kind];
      let cue = __appRuntimeContext.getThemeSoundCue(__appRuntimeContext.activeSessionThemeKey, __appRuntimeContext.activeTheme, kind);
      if (themeSound === "digital-circus-button") {
        cue = {
          ...cue,
          tones: [
            {
              frequency: 740,
              delay: 0,
              duration: 0.06,
              gain: 0.032,
              type: "square",
            },
            {
              frequency: 1180,
              delay: 0.025,
              duration: 0.105,
              gain: 0.018,
              type: "sine",
            },
          ],
        };
      }
      if (themeSound === "vintage-camera") {
        cue = {
          ...cue,
          tones: [
            {
              frequency: 170,
              endFrequency: 62,
              delay: 0,
              duration: 0.18,
              gain: 0.06,
              type: "sawtooth",
            },
          ],
        };
      }
      const now = context.currentTime;
      cue.tones.forEach((tone) => {
        const startAt = now + Math.max(0, Number(tone.delay) || 0);
        const duration = Math.max(0.03, Number(tone.duration) || 0.08);
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = tone.type || "sine";
        osc.frequency.setValueAtTime(tone.frequency, startAt);
        if (tone.endFrequency) {
          osc.frequency.exponentialRampToValueAtTime(
            tone.endFrequency,
            startAt + duration
          );
        }
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, Number(tone.gain) || 0.02),
          startAt + Math.min(0.015, duration / 3)
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      });
    } catch (_) {}
  }

  function getVideoTrack() {
    try {
      if (!__appRuntimeContext.stream) return null;
      const tracks = __appRuntimeContext.stream.getVideoTracks();
      return tracks && tracks.length ? tracks[0] : null;
    } catch (_) {
      return null;
    }
  }

  async function setTorch(enabled) {
    const track = getVideoTrack();
    if (!track || typeof track.getCapabilities !== "function") return false;
    const caps = track.getCapabilities();
    if (!caps || !caps.torch) return false;
    try {
      await track.applyConstraints({ advanced: [{ torch: !!enabled }] });
      __appRuntimeContext.torchEnabled = !!enabled;
      return true;
    } catch (_) {
      return false;
    }
  }

  async function showCountdown(text) {
    __appRuntimeContext.setMobileSettingsOpen(false);
    const co = __appRuntimeContext.DOM.countdownOverlay;
    co.textContent = text;
    playThemeCue(
      "countdown",
      String(text).toLowerCase() === "flash" ? "flash" : "countdown"
    );
    updateCountdownFontSize();
    if (__appRuntimeContext.DOM.boothScreen && __appRuntimeContext.getSelectedCaptureMode() !== "message")
      __appRuntimeContext.DOM.boothScreen.classList.add("countdown-mode");
    co.classList.add("show");
    await delay(800);
    co.classList.remove("show");
    await delay(200);
  }

  async function showFlashBeat() {
    __appRuntimeContext.setMobileSettingsOpen(false);
    const co = __appRuntimeContext.DOM.countdownOverlay;
    if (!co) return;
    co.textContent = "";
    playBoothSound("flash");
    updateCountdownFontSize();
    if (__appRuntimeContext.DOM.boothScreen && __appRuntimeContext.getSelectedCaptureMode() !== "message")
      __appRuntimeContext.DOM.boothScreen.classList.add("countdown-mode");
    co.classList.remove("show");
    await delay(200);
  }

  function getCountdownDurationSeconds() {
    return __appRuntimeContext.getCountdownFiveSecondsEnabled() ? 5 : 3;
  }

  async function countdownAndSnap(options = {}) {
    const { live = false, instant = false } = options || {};
    const guide = __appRuntimeContext.DOM.silhouette;
    if (guide) guide.style.display = "none";
    const lowLightEnabled = __appRuntimeContext.getLowLightEnabled();
    const torchUsed = lowLightEnabled ? await setTorch(true) : false;
    if (!instant) {
      for (let n = getCountdownDurationSeconds(); n > 0; n--) {
        await showCountdown(n);
      }
      await showFlashBeat();
    } else if (__appRuntimeContext.DOM.countdownOverlay) {
      __appRuntimeContext.DOM.countdownOverlay.classList.remove("show");
      if (__appRuntimeContext.DOM.boothScreen) __appRuntimeContext.DOM.boothScreen.classList.remove("countdown-mode");
    }
    __appRuntimeContext.captureFlashArmed = true;
    if (!live || (lowLightEnabled && !torchUsed)) triggerFlash();
    await delay(50);
    if (!live) setRecordingHighlight(false);
    const livePromise = live ? captureLiveClip(__appRuntimeContext.LIVE_PHOTO_DURATION_MS) : null;
    const shot = await __appRuntimeContext.getCurrentProcessedFrameCanvas();
    if (torchUsed) await setTorch(false);
    freezeCapturePreview(shot);
    if (!playThemeSoundEffect("photoCaptured")) playBoothSound("success");
    if (livePromise) {
      const clip = await livePromise;
      setLiveClip(clip);
      setRecordingHighlight(false);
    } else {
      clearLiveClip();
      setRecordingHighlight(false);
    }
    if (guide) guide.style.display = "";
    __appRuntimeContext.captureFlashArmed = false;
    return shot;
  }

  function freezeCapturePreview(photoCanvas) {
    if (!photoCanvas) return;
    let stillUrl = "";
    try {
      stillUrl = photoCanvas.toDataURL("image/png");
    } catch (_) {
      stillUrl = "";
    }
    __appRuntimeContext.showPreviewFreezeFrame(stillUrl);
  }

  function triggerFlash() {
    if (!__appRuntimeContext.captureFlashArmed) return;
    const fo = __appRuntimeContext.DOM.flashOverlay;
    if (!fo) return;
    // Restart animation by toggling class
    fo.classList.remove("flash");
    // Force reflow to restart the animation reliably
    void fo.offsetWidth;
    fo.classList.add("flash");
    // Clean up after animation ends (fallback timeout as well)
    const cleanup = () => fo.classList.remove("flash");
    fo.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 600);
  }

  function getThemeHeadingFont(theme) {
    return theme?.fontHeading || theme?.font || "serif";
  }

  function getThemeBodyFont(theme) {
    return theme?.fontBody || theme?.font || "sans-serif";
  }

  function resolveCanvasTextFamily(field, theme) {
    const family = field.fontFamily || "";
    if (family) return family;
    return field.key === "event_date"
      ? getThemeBodyFont(theme)
      : getThemeHeadingFont(theme);
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let current = words.shift() || "";
    words.forEach((word) => {
      const next = `${current} ${word}`;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function fitCanvasText(ctx, text, rect, family, weight, startSize, minSize) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapCanvasText(ctx, text, Math.max(20, rect.w - 16));
      const lineHeight = size * 1.14;
      if (lines.length * lineHeight <= rect.h) {
        return { size, lines, lineHeight };
      }
      size -= 1;
    }
    ctx.font = `${weight} ${minSize}px ${family}`;
    return {
      size: minSize,
      lines: wrapCanvasText(ctx, text, Math.max(20, rect.w - 16)),
      lineHeight: minSize * 1.14,
    };
  }

  function drawTemplateTextFields(ctx, width, height, fields, event, theme) {
    const normalized = __appRuntimeContext.normalizeTemplateTextFields(fields);
    if (!normalized.length || !event) return false;
    let drewText = false;
    normalized.forEach((field) => {
      const rawValue = __appRuntimeContext.resolveTemplateTextValue(field.key, event);
      const text = field.uppercase ? rawValue.toUpperCase() : rawValue;
      if (!text) return;
      const rect = __appRuntimeContext.resolveTemplateTextRect(field, width, height);
      if (!rect || rect.w <= 0 || rect.h <= 0) return;
      const family = resolveCanvasTextFamily(field, theme);
      const weight = field.fontWeight || "600";
      const startSize =
        field.fontSize || Math.max(18, Math.round(Math.min(width, height) * 0.03));
      const minSize =
        field.minFontSize || Math.max(10, Math.round(startSize * 0.5));
      const metrics = fitCanvasText(
        ctx,
        text,
        rect,
        family,
        weight,
        startSize,
        minSize
      );
      if (!metrics.lines.length) return;
      ctx.save();
      ctx.fillStyle = field.color || theme?.accent2 || "#ffffff";
      ctx.textBaseline = "top";
      ctx.textAlign =
        field.align === "left"
          ? "left"
          : field.align === "right"
          ? "right"
          : "center";
      ctx.font = `${weight} ${metrics.size}px ${family}`;
      const totalHeight = metrics.lines.length * metrics.lineHeight;
      const x =
        field.align === "left"
          ? rect.x + 8
          : field.align === "right"
          ? rect.x + rect.w - 8
          : rect.x + rect.w / 2;
      let y = rect.y + (rect.h - totalHeight) / 2;
      metrics.lines.forEach((line) => {
        ctx.fillText(line, x, y);
        y += metrics.lineHeight;
      });
      ctx.restore();
      drewText = true;
    });
    return drewText;
  }

  function drawDynamicEventText(
    ctx,
    width,
    height,
    event,
    theme,
    isStrip = false
  ) {
    const p1 = event?.partner1 || "";
    const p2 = event?.partner2 || "";
    const bday = event?.birthdayName || "";
    const expo = event?.expoCompany || "";
    if (!p1 && !p2 && !bday && !expo) return;

    const names = expo || bday || (p1 && p2 ? `${p1} & ${p2}` : p1 || p2);
    const date = event?.date || "";

    ctx.save();
    const headingFont = getThemeHeadingFont(theme);
    const bodyFont = getThemeBodyFont(theme);
    const textColor = theme?.accent2 || "#ffffff";

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";

    if (!isStrip) {
      const fontSize = Math.round(height * 0.045);
      ctx.font = `bold ${fontSize}px ${headingFont}`;
      ctx.fillText(names.toUpperCase(), width / 2, height * 0.92);
      if (date) {
        ctx.font = `${Math.round(fontSize * 0.55)}px ${bodyFont}`;
        ctx.fillText(date, width / 2, height * 0.96);
      }
    }
    ctx.restore();
  }

  return {
    capturePhotoFlow,
    captureMessageFlow,
    handlePrimaryAction,
    getResolvedCaptureAspectRatio,
    drawToCanvasFromVideo,
    drawToLivePreviewCanvasFromVideo,
    ensureGuestPhotoProcessed,
    cloneCanvasForStrip,
    clampNumber,
    clearLiveClip,
    setLiveClip,
    pickLiveMimeType,
    setRecordingHighlight,
    setRecordingOverlayVisible,
    startRecordingTimer,
    stopStreamTracks,
    ensureMessageStream,
    pickMessageMimeType,
    captureMessageClip,
    captureLiveClip,
    updateCaptureAspect,
    setCaptureAspect,
    syncFrameSizeVars,
    setFinalPreviewSharePanelVisible,
    getCountdownScale,
    setCountdownScale,
    updateCountdownFontSize,
    loadImage,
    preloadThemeOrientationAssets,
    cacheActiveThemeOrientation,
    loadDrawableMedia,
    getOrientationFromImage,
    applyOverlay,
    getObjectPositionAnchor,
    drawCoverInRect,
    drawImageCover,
    drawImageContain,
    roundedRectPath,
    normalizeSlotRect,
    drawPhotoSlot,
    isReservedPhotoMarkerPixel,
    normalizeDetectedMarkerSlot,
    detectReservedPhotoMarkerComponents,
    processReservedPhotoMarkerImage,
    resolveOverlayReservedPhotoMarker,
    renderOverlayToCanvas,
    toNumber,
    normalizeTemplateLayout,
    isStripTemplateLayout,
    getTemplateColumnCount,
    getTemplateRowCount,
    getStandardDoubleColumnStripSlots,
    normalizeTemplateSlots,
    detectTransparentColumnSlots,
    hexToRgb,
    colorClose,
    createMaskedOverlayCanvas,
    runStripSequence,
    delay,
    unlockBoothAudio,
    getThemeSoundEffect,
    hasThemeSoundEffect,
    playThemeSoundEffect,
    playThemeCue,
    playBoothSound,
    getVideoTrack,
    setTorch,
    showCountdown,
    showFlashBeat,
    getCountdownDurationSeconds,
    countdownAndSnap,
    freezeCapturePreview,
    triggerFlash,
    getThemeHeadingFont,
    getThemeBodyFont,
    resolveCanvasTextFamily,
    wrapCanvasText,
    fitCanvasText,
    drawTemplateTextFields,
    drawDynamicEventText,
  };
}
