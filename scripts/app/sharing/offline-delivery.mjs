export function createOfflineDeliveryModule(__appRuntimeContext) {
  function offlineQueueSupported() {
    return typeof indexedDB !== "undefined";
  }

  function getOfflineQueueDb() {
    if (!offlineQueueSupported()) {
      return Promise.reject(new Error("IndexedDB offline queue unavailable"));
    }
    if (!__appRuntimeContext.offlineQueueDbPromise) {
      __appRuntimeContext.offlineQueueDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(__appRuntimeContext.OFFLINE_DB_NAME, 1);
        request.onupgradeneeded = (event) => {
          const db = event && event.target ? event.target.result : null;
          if (!db) return;
          if (!db.objectStoreNames.contains(__appRuntimeContext.OFFLINE_DB_STORE)) {
            db.createObjectStore(__appRuntimeContext.OFFLINE_DB_STORE, {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        };
        request.onsuccess = (event) => {
          const db = event && event.target ? event.target.result : null;
          if (!db) {
            reject(new Error("IndexedDB open succeeded without database instance"));
            return;
          }
          db.onclose = () => {
            __appRuntimeContext.offlineQueueDbPromise = null;
          };
          resolve(db);
        };
        request.onerror = () => {
          reject(request.error || new Error("IndexedDB open failed"));
        };
      });
    }
    return __appRuntimeContext.offlineQueueDbPromise;
  }

  function saveToOfflineQueue(imageBlob, metadata = {}) {
    return getOfflineQueueDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(__appRuntimeContext.OFFLINE_DB_STORE, "readwrite");
          const store = tx.objectStore(__appRuntimeContext.OFFLINE_DB_STORE);
          const item = {
            imageBlob,
            metadata: { ...(metadata || {}) },
            timestamp: Date.now(),
          };
          const request = store.add(item);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error("Offline queue save failed"));
        })
    );
  }

  function getAllFromOfflineQueue() {
    return getOfflineQueueDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(__appRuntimeContext.OFFLINE_DB_STORE, "readonly");
          const store = tx.objectStore(__appRuntimeContext.OFFLINE_DB_STORE);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error || new Error("Offline queue read failed"));
        })
    );
  }

  function deleteFromOfflineQueue(id) {
    return getOfflineQueueDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(__appRuntimeContext.OFFLINE_DB_STORE, "readwrite");
          const store = tx.objectStore(__appRuntimeContext.OFFLINE_DB_STORE);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error || new Error("Offline queue delete failed"));
        })
    );
  }

  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error("Capture data could not be read.");
    return res.blob();
  }

  async function prepareLocalStorageFallbackImage(dataUrl) {
    if (!dataUrl || typeof Image === "undefined") return dataUrl;
    try {
      const image = await new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Fallback image decode failed"));
        nextImage.src = dataUrl;
      });
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight) return dataUrl;
      const scale = Math.min(1, 800 / sourceWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (error) {
      console.warn("LocalStorage fallback image compression failed", error);
      return dataUrl;
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
        reader.readAsDataURL(blob);
      } catch (err) {
        reject(err);
      }
    });
  }

  function createCaptureUploadId(prefix = "capture") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function getPendingShareUrl(captureId) {
    const id = String(captureId || "").trim();
    const origin = typeof location !== "undefined" ? String(location.origin || "") : "";
    if (!id || !/^https?:/i.test(origin)) return "";
    return `${origin}/share/${encodeURIComponent(id)}`;
  }

  function getCaptureUploadMeta(options = {}) {
    const slug = options.slug || __appRuntimeContext.getEventUploadSlug();
    return {
      captureId: options.captureId || createCaptureUploadId(options.modeName),
      slug,
      folder: options.folder || __appRuntimeContext.getEventUploadFolderPath(),
      title: options.title || __appRuntimeContext.getEventGalleryTitle(),
      galleryUrl: options.galleryUrl || __appRuntimeContext.getEventGalleryUrl(),
    };
  }

  async function uploadCloudinaryWithRetry(
    uploadFn,
    blob,
    options = {},
    label = "capture"
  ) {
    const attempts = Math.max(1, options.attempts || 2);
    let lastUrl = "";
    for (let attempt = 1; attempt <= attempts; attempt++) {
      lastUrl = await uploadFn(blob, options);
      if (lastUrl) return lastUrl;
      console.warn(
        `Cloudinary ${label} upload attempt ${attempt} failed${
          attempt < attempts ? "; retrying" : ""
        }.`
      );
      if (attempt < attempts) await __appRuntimeContext.delay(700 * attempt);
    }
    return "";
  }

  async function queueCaptureForRetry(options = {}) {
    const {
      previewUrl = "",
      mediaBlob = null,
      resourceType = "image",
      meta = {},
      modeName = "pending",
    } = options;
    const queueMetadata = {
      captureId: meta.captureId,
      slug: meta.slug,
      folder: meta.folder,
      resourceType,
      modeName,
      title: meta.title,
      email: meta.email || "",
      createdAt: meta.createdAt || new Date().toISOString(),
      galleryUrl: meta.galleryUrl || __appRuntimeContext.getEventGalleryUrl(),
    };
    if (mediaBlob && offlineQueueSupported()) {
      try {
        await saveToOfflineQueue(mediaBlob, queueMetadata);
        return true;
      } catch (error) {
        console.warn("IndexedDB capture queue failed; falling back to local retry queue", error);
      }
    }
    let retryDataUrl = previewUrl;
    let retryResourceType = "image";
    if (resourceType === "video" && mediaBlob) {
      try {
        retryDataUrl = await blobToDataUrl(mediaBlob);
        retryResourceType = "video";
      } catch (err) {
        console.warn("Video retry queue failed; falling back to poster", err);
        retryDataUrl = previewUrl;
        retryResourceType = "image";
        __appRuntimeContext.showToast("Video could not be stored offline; poster queued instead");
      }
    }
    if (!retryDataUrl) return false;
    if (retryResourceType === "image") {
      retryDataUrl = await prepareLocalStorageFallbackImage(retryDataUrl);
    }
    const queued = queuePendingUpload(retryDataUrl, {
      captureId: meta.captureId,
      slug: meta.slug,
      folder: meta.folder,
      resourceType: retryResourceType,
      modeName,
      title: meta.title,
    });
    if (!queued && retryResourceType === "video" && previewUrl) {
      console.warn("Video retry queue was too large; falling back to poster");
      __appRuntimeContext.showToast("Video could not be stored offline; poster queued instead");
      return queuePendingUpload(previewUrl, {
        captureId: meta.captureId,
        slug: meta.slug,
        folder: meta.folder,
        resourceType: "image",
        modeName,
        title: meta.title,
        galleryUrl: meta.galleryUrl,
      });
    }
    return queued;
  }

  async function uploadCaptureOnce(options = {}) {
    const previewUrl = options.previewUrl || "";
    const resourceType = options.resourceType === "video" ? "video" : "image";
    const mediaBlob = options.mediaBlob || null;
    const modeName = options.modeName || resourceType;
    const meta = getCaptureUploadMeta(options);
    const result = {
      publicUrl: "",
      pendingShareUrl: __appRuntimeContext.cloudinaryConfigured()
        ? getPendingShareUrl(meta.captureId)
        : "",
      queued: false,
      galleryQueued: false,
      captureId: meta.captureId,
      slug: meta.slug,
      folder: meta.folder,
      resourceType,
    };
    __appRuntimeContext.updateOutputSurfaceTrace({
      captureId: meta.captureId,
      localFinalUrl: previewUrl,
      surfaces: {
        uploadPreview: previewUrl,
      },
    });

    if (__appRuntimeContext.isBoothTestMode()) {
      result.publicUrl = __appRuntimeContext.BOOTH_TEST_SHARE_URL;
      __appRuntimeContext.updateOutputSurfaceTrace({
        remoteFinalUrl: result.publicUrl,
      });
      __appRuntimeContext.showToast("Booth test upload ready");
      return result;
    }

    if (!__appRuntimeContext.cloudinaryConfigured()) {
      __appRuntimeContext.showToast("Cloudinary not configured: capture not uploaded");
      return result;
    }

    if (offlineModeActive() || !navigator.onLine) {
      const ok = await queueCaptureForRetry({
        previewUrl,
        mediaBlob,
        resourceType,
        meta,
        modeName,
      });
      if (ok) {
        __appRuntimeContext.showToast("Offline: capture queued for upload");
        result.queued = true;
        return result;
      }
      alert("Offline upload queue is full or unavailable.");
      return result;
    }

    const safetyQueued = await queueCaptureForRetry({
      previewUrl,
      mediaBlob,
      resourceType,
      meta,
      modeName,
    });
    if (!safetyQueued) {
      console.warn("Capture retry backup could not be saved before upload.");
      __appRuntimeContext.showToast("Capture backup unavailable; keep this screen open until upload finishes");
    }

    const blob = mediaBlob || (previewUrl ? await dataUrlToBlob(previewUrl) : null);
    if (!blob) return result;

    let publicUrl =
      resourceType === "video"
        ? await uploadCloudinaryWithRetry(
            __appRuntimeContext.uploadVideoToCloudinary,
            blob,
            {
              baseName: meta.slug || modeName || "message",
              folder: meta.folder,
              tags: meta.slug,
              force: true,
            },
            "video"
          )
        : await uploadCloudinaryWithRetry(
            __appRuntimeContext.uploadImageToCloudinary,
            blob,
            {
              baseName: meta.slug || modeName || "photo",
              folder: meta.folder,
              tags: meta.slug,
              force: true,
              transformation: __appRuntimeContext.DOM.effectSelect && __appRuntimeContext.DOM.effectSelect.value !== "" ? __appRuntimeContext.DOM.effectSelect.value : undefined,
            },
            "image"
          );

    if (resourceType === "image") {
      publicUrl = __appRuntimeContext.buildCloudinaryImageTransformationUrl(
        publicUrl,
        __appRuntimeContext.getSelectedFilterCloudinaryTransformation()
      );
    }

    if (!publicUrl) {
      const ok = await queueCaptureForRetry({
        previewUrl,
        mediaBlob,
        resourceType,
        meta,
        modeName,
      });
      if (ok) {
        __appRuntimeContext.showToast("Upload failed, queued for retry");
        result.queued = true;
      }
      return result;
    }

    result.publicUrl = publicUrl;
    __appRuntimeContext.updateOutputSurfaceTrace({
      remoteFinalUrl: publicUrl,
    });
    removePendingUpload(meta.captureId);
    const galleryOk = await recordGalleryPhoto(meta.slug, publicUrl, {
      captureId: meta.captureId,
      title: meta.title,
      resourceType,
      modeName,
      galleryUrl: meta.galleryUrl,
    });
    if (!galleryOk) {
      const queued = queuePendingGalleryRecord({
        captureId: meta.captureId,
        slug: meta.slug,
        url: publicUrl,
        title: meta.title,
        galleryUrl: meta.galleryUrl,
        resourceType,
        modeName,
      });
      result.galleryQueued = queued;
      if (queued) __appRuntimeContext.showToast("Photo uploaded; gallery update queued for retry");
      else __appRuntimeContext.showToast("Photo uploaded; gallery update needs retry");
    }
    return result;
  }

  async function uploadEventPhoto(dataUrl, options = {}) {
    const result = await uploadCaptureOnce({
      previewUrl: dataUrl,
      resourceType: options.resourceType || "image",
      modeName: options.modeName || "pending",
      captureId: options.captureId,
      slug: options.slug,
      folder: options.folder,
      title: options.title,
    });
    if (!result.publicUrl) throw new Error("Cloudinary upload failed");
    return result.publicUrl;
  }

  async function recordGalleryPhoto(tag, url, options = {}) {
    const cleanTag = String(tag || "").trim();
    if (!cleanTag || !/^https?:\/\//i.test(String(url || ""))) return false;
    const resourceType = options.resourceType === "video" ? "video" : "image";
    __appRuntimeContext.updateOutputSurfaceTrace({
      surfaces: {
        galleryRemote: url,
      },
    });
    const payload = {
      capture_id: options.captureId || createCaptureUploadId(options.modeName),
      url,
      secure_url: url,
      title: options.title || __appRuntimeContext.getEventGalleryTitle(),
      created_at: options.createdAt || new Date().toISOString(),
      resource_type: resourceType,
      type: resourceType,
      mode: options.modeName || "",
      gallery_url: options.galleryUrl || __appRuntimeContext.getEventGalleryUrl(),
    };
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const resp = await fetch(`/api/gallery?tag=${encodeURIComponent(cleanTag)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (resp.ok) return true;
        console.warn(`Gallery index update failed with HTTP ${resp.status}.`);
      } catch (err) {
        console.warn("Gallery index update failed", err);
      }
      if (attempt < 2) await __appRuntimeContext.delay(500);
    }
    return false;
  }

  async function openShareLink() {
    const url = __appRuntimeContext.getShareOutputUrl();
    if (!url) return;
    __appRuntimeContext.updateOutputSurfaceTrace({
      surfaces: {
        download: url,
      },
    });
    try {
      // Ensure the asset is retrievable (esp. right after SW publish) and open a stable blob URL
      const resp = await fetch(url, { cache: "reload" });
      if (!resp.ok) throw new Error("Link not ready");
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      window.open(objUrl, "_blank", "noopener");
      // Revoke after some time to avoid leaks
      setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
    } catch (e) {
      // Fallback to opening the original URL
      try {
        window.open(url, "_blank", "noopener");
      } catch (_) {
        location.href = url;
      }
    }
  }

  async function copyShareLink() {
    const url = __appRuntimeContext.getShareOutputUrl();
    try {
      await navigator.clipboard.writeText(url);
      __appRuntimeContext.showToast("Link copied");
    } catch (e) {
      __appRuntimeContext.showToast("Copy failed");
    }
  }

  async function downloadShareImage() {
    const url = __appRuntimeContext.getShareOutputUrl();
    if (!url) return;
    __appRuntimeContext.updateOutputSurfaceTrace({
      surfaces: {
        download: url,
      },
    });
    try {
      const resp = await fetch(url, { cache: "reload" });
      if (!resp.ok) throw new Error("Link not ready");
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "photobooth.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
    } catch (e) {
      // Fallback: open in new tab; user can save manually
      try {
        window.open(url, "_blank", "noopener");
      } catch (_) {
        location.href = url;
      }
    }
  }

  function hideFinal(options = {}) {
    __appRuntimeContext.clearPreviewFreezeFrame();
    __appRuntimeContext.DOM.finalPreview.classList.remove("show");
    if (options.showGoodbye) __appRuntimeContext.showGoodbyeMoment();
    if (__appRuntimeContext.DOM.boothScreen)
      __appRuntimeContext.DOM.boothScreen.classList.remove("share-mode", "finalizing-mode");
    __appRuntimeContext.DOM.qrCodeContainer.classList.add("hidden");
    if (__appRuntimeContext.DOM.qrCodeContainer) {
      __appRuntimeContext.DOM.qrCodeContainer.dataset.ready = "false";
      __appRuntimeContext.DOM.qrCodeContainer.dataset.pending = "false";
      __appRuntimeContext.DOM.qrCodeContainer.dataset.error = "false";
    }
    if (__appRuntimeContext.DOM.finalPrintActions) __appRuntimeContext.DOM.finalPrintActions.classList.add("hidden");
    __appRuntimeContext.finalPrintPriceRequestId += 1;
    if (__appRuntimeContext.DOM.printPriceNotice) {
      __appRuntimeContext.DOM.printPriceNotice.textContent = "";
      __appRuntimeContext.DOM.printPriceNotice.classList.add("hidden");
    }
    if (__appRuntimeContext.DOM.paypalPrintCheckout) {
      __appRuntimeContext.DOM.paypalPrintCheckout.innerHTML = "";
      __appRuntimeContext.DOM.paypalPrintCheckout.classList.add("hidden");
    }
    __appRuntimeContext.pendingFinalPrintImageUrl = "";
    __appRuntimeContext.setFinalPreviewSharePanelVisible(false);
    if (__appRuntimeContext.DOM.shareStatus) __appRuntimeContext.DOM.shareStatus.style.display = "none";
    __appRuntimeContext.clearLiveClip();
    __appRuntimeContext.lastCaptureFlow = null; // Clear the stored flow
    clearTimeout(__appRuntimeContext.hidePreviewTimer);
    __appRuntimeContext.setBoothControlsVisible(true);
    __appRuntimeContext.resetIdleTimer();
  }

  function finishBoothFlow() {
    hideFinal({ showGoodbye: true });
    clearTimeout(__appRuntimeContext.idleTimer);
    __appRuntimeContext.selectedOverlay = null;
    __appRuntimeContext.lastPhotoOverlay = null;
    __appRuntimeContext.lastPhotoOverlayByOrientation = { portrait: null, landscape: null };
    __appRuntimeContext.renderOptionsForMode(__appRuntimeContext.mode, { preserveScroll: false });
    __appRuntimeContext.syncOverlayPickerUi();
    setTimeout(() => {
      if (__appRuntimeContext.DOM.goodbyeOverlay) __appRuntimeContext.DOM.goodbyeOverlay.classList.remove("show");
      __appRuntimeContext.cycleShowcaseDemoTheme();
      __appRuntimeContext.showWelcome("idle");
    }, 1400);
  }

  function retakePhoto() {
    hideFinal();
    if (typeof __appRuntimeContext.lastCaptureFlow === "function") {
      setTimeout(__appRuntimeContext.lastCaptureFlow, 500); // Give a small delay for the UI to hide
    }
  }

  function exitFinalPreview() {
    finishBoothFlow();
  }

  function addToGallery(url) {
    __appRuntimeContext.updateOutputSurfaceTrace({
      surfaces: {
        galleryLocal: url,
      },
    });
    const img = new Image();
    img.src = url;
    img.addEventListener("click", () =>
      __appRuntimeContext.showFinal(url, { skipShare: true, forceImage: true })
    );
    __appRuntimeContext.DOM.gallery.appendChild(img);
  }

  function cancelHideTimer() {
    clearTimeout(__appRuntimeContext.hidePreviewTimer);
    __appRuntimeContext.resetIdleTimer(); // Still reset the main idle timer
  }

  function getAnalytics() {
    const defaults = { total_sessions: 0, overlay_usage: {}, emails: [] };
    try {
      const data = localStorage.getItem("photoboothAnalytics");
      return data ? JSON.parse(data) : defaults;
    } catch (e) {
      return defaults;
    }
  }

  function offlineModeActive() {
    try {
      if (getOfflinePref()) return true;
    } catch (_) {}
    try {
      if (String(location.protocol).startsWith("file")) return true;
    } catch (_) {}
    return !navigator.onLine ? true : false;
  }

  function getOfflinePref() {
    return localStorage.getItem("offlineMode") === "true";
  }

  function setOfflinePref(v) {
    localStorage.setItem("offlineMode", v ? "true" : "false");
  }

  function getPending() {
    try {
      return JSON.parse(localStorage.getItem("photoboothPending") || "[]");
    } catch (_) {
      return [];
    }
  }

  function setPending(arr) {
    localStorage.setItem("photoboothPending", JSON.stringify(arr || []));
  }

  function queuePendingEmail(email, dataUrl) {
    try {
      const q = getPending();
      q.push({
        id: Date.now().toString(36),
        email,
        image: dataUrl,
        createdAt: new Date().toISOString(),
        event: __appRuntimeContext.getSelectedThemeKey(),
      });
      setPending(q);
      return true;
    } catch (e) {
      return false;
    }
  }

  function updatePendingUI() {
    const q = getPending();
    if (__appRuntimeContext.DOM.sendPendingBtn) {
      __appRuntimeContext.DOM.sendPendingBtn.textContent = `Send Pending (${q.length})`;
      __appRuntimeContext.DOM.sendPendingBtn.disabled = q.length === 0 || !navigator.onLine;
    }
    // Badge on admin button
    const adminBtn = document.getElementById("adminBtn");
    if (adminBtn) {
      adminBtn.textContent = q.length ? `⚙️ (${q.length})` : "⚙️";
    }
  }

  async function acquirePendingQueueWakeLock() {
    if (
      __appRuntimeContext.pendingQueueWakeLock ||
      typeof navigator === "undefined" ||
      !navigator.wakeLock ||
      document.visibilityState !== "visible"
    ) {
      return;
    }
    try {
      const lock = await navigator.wakeLock.request("screen");
      __appRuntimeContext.pendingQueueWakeLock = lock;
      lock.addEventListener("release", () => {
        if (__appRuntimeContext.pendingQueueWakeLock === lock) __appRuntimeContext.pendingQueueWakeLock = null;
      });
    } catch (error) {
      // Wake Lock is optional; uploads still retain their normal retry behavior.
      console.warn("Pending queue screen wake lock unavailable", error);
    }
  }

  async function releasePendingQueueWakeLock() {
    const lock = __appRuntimeContext.pendingQueueWakeLock;
    __appRuntimeContext.pendingQueueWakeLock = null;
    if (!lock) return;
    try {
      await lock.release();
    } catch (_) {}
  }

  function getPendingUploads() {
    try {
      return JSON.parse(localStorage.getItem("photoboothPendingUploads") || "[]");
    } catch (_) {
      return [];
    }
  }

  function setPendingUploads(arr) {
    localStorage.setItem("photoboothPendingUploads", JSON.stringify(arr || []));
  }

  function queuePendingUpload(dataUrl, meta = {}) {
    try {
      const q = getPendingUploads();
      const captureId = meta.captureId || createCaptureUploadId(meta.modeName);
      const next = {
        id: captureId,
        captureId,
        image: dataUrl,
        createdAt: new Date().toISOString(),
        slug: meta.slug || __appRuntimeContext.getEventUploadSlug(),
        folder: meta.folder || __appRuntimeContext.getEventUploadFolderPath(),
        title: meta.title || __appRuntimeContext.getEventGalleryTitle(),
        resourceType: meta.resourceType === "video" ? "video" : "image",
        modeName: meta.modeName || "pending",
        galleryUrl: meta.galleryUrl || __appRuntimeContext.getEventGalleryUrl(),
        attempts: Number(meta.attempts || 0),
      };
      const existingIndex = q.findIndex(
        (item) => item && (item.captureId === captureId || item.id === captureId)
      );
      if (existingIndex >= 0) q[existingIndex] = { ...q[existingIndex], ...next };
      else q.push(next);
      setPendingUploads(q);
      return true;
    } catch (e) {
      console.warn("Queue upload failed", e);
      return false;
    }
  }

  function removePendingUpload(captureId) {
    if (!captureId) return;
    const q = getPendingUploads();
    const next = q.filter(
      (item) => item && item.captureId !== captureId && item.id !== captureId
    );
    if (next.length !== q.length) setPendingUploads(next);
  }

  function getPendingGalleryRecords() {
    try {
      return JSON.parse(localStorage.getItem("photoboothPendingGallery") || "[]");
    } catch (_) {
      return [];
    }
  }

  function setPendingGalleryRecords(arr) {
    localStorage.setItem("photoboothPendingGallery", JSON.stringify(arr || []));
  }

  function queuePendingGalleryRecord(record = {}) {
    try {
      const url = String(record.url || record.secure_url || "").trim();
      const slug = String(record.slug || __appRuntimeContext.getEventUploadSlug()).trim();
      if (!slug || !/^https?:\/\//i.test(url)) return false;
      const captureId = record.captureId || createCaptureUploadId(record.modeName);
      const q = getPendingGalleryRecords();
      const next = {
        id: captureId,
        captureId,
        slug,
        url,
        title: record.title || __appRuntimeContext.getEventGalleryTitle(),
        createdAt: record.createdAt || new Date().toISOString(),
        resourceType: record.resourceType === "video" ? "video" : "image",
        modeName: record.modeName || "",
        galleryUrl: record.galleryUrl || __appRuntimeContext.getEventGalleryUrl(),
        attempts: Number(record.attempts || 0),
      };
      const existingIndex = q.findIndex(
        (item) =>
          item &&
          (item.captureId === captureId ||
            item.id === captureId ||
            item.url === url ||
            item.secure_url === url)
      );
      if (existingIndex >= 0) q[existingIndex] = { ...q[existingIndex], ...next };
      else q.push(next);
      setPendingGalleryRecords(q);
      return true;
    } catch (e) {
      console.warn("Queue gallery update failed", e);
      return false;
    }
  }

  async function flushPendingUploads() {
    if (__appRuntimeContext.isFlushingPendingUploads || !__appRuntimeContext.cloudinaryConfigured() || !navigator.onLine)
      return;
    __appRuntimeContext.isFlushingPendingUploads = true;
    await acquirePendingQueueWakeLock();
    try {
      // Acquire the lock before any asynchronous IndexedDB work. Multiple
      // online/visibility/manual triggers can otherwise read the same item
      // before the first flush has marked it complete.
      await flushPendingUploadsIndexedDB();
      const q = getPendingUploads();
      if (!q.length) return;
      let sent = 0;
      for (const item of q.slice()) {
        try {
          await uploadEventPhoto(item.image, {
            captureId: item.captureId || item.id,
            slug: item.slug,
            folder: item.folder,
            title: item.title,
            resourceType: item.resourceType || "image",
        modeName: item.modeName || "pending",
            galleryUrl: item.galleryUrl,
          });
          sent++;
          const cur = getPendingUploads();
          const idx = cur.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            cur.splice(idx, 1);
            setPendingUploads(cur);
          }
        } catch (err) {
          console.warn("Pending upload retry failed", err);
          const cur = getPendingUploads();
          const idx = cur.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            cur[idx].attempts = Number(cur[idx].attempts || 0) + 1;
            cur[idx].lastError =
              err && err.message ? err.message : "Pending upload failed";
            setPendingUploads(cur);
          }
        }
      }
      if (sent) __appRuntimeContext.showToast(`Uploaded ${sent} pending photo${sent === 1 ? "" : "s"}`);
      await flushPendingGalleryRecords();
    } finally {
      __appRuntimeContext.isFlushingPendingUploads = false;
      await releasePendingQueueWakeLock();
    }
  }

  async function flushPendingUploadsIndexedDB() {
    if (!offlineQueueSupported() || !__appRuntimeContext.cloudinaryConfigured() || !navigator.onLine) return;
    let pendingPhotos = [];
    try {
      pendingPhotos = await getAllFromOfflineQueue();
    } catch (error) {
      console.warn("IndexedDB offline queue read failed", error);
      return;
    }
    if (!pendingPhotos.length) return;
    let sent = 0;
    for (const photo of pendingPhotos) {
      if (!photo || !photo.imageBlob) continue;
      const metadata = photo.metadata || {};
      const resourceType = metadata.resourceType === "video" ? "video" : "image";
      const publicUrl =
        resourceType === "video"
          ? await uploadCloudinaryWithRetry(
              __appRuntimeContext.uploadVideoToCloudinary,
              photo.imageBlob,
              {
                baseName: metadata.slug || metadata.modeName || "message",
                folder: metadata.folder,
                tags: metadata.slug,
                force: true,
              },
              "video"
            )
          : await uploadCloudinaryWithRetry(
              __appRuntimeContext.uploadImageToCloudinary,
              photo.imageBlob,
              {
                baseName: metadata.slug || metadata.modeName || "photo",
                folder: metadata.folder,
                tags: metadata.slug,
                force: true,
              },
              "image"
            );
      if (!publicUrl) continue;
      if (metadata.slug) {
        const galleryOk = await recordGalleryPhoto(metadata.slug, publicUrl, {
          captureId: metadata.captureId,
          title: metadata.title,
          resourceType,
          modeName: metadata.modeName,
          createdAt: metadata.createdAt,
          galleryUrl: metadata.galleryUrl,
        });
        if (!galleryOk) {
          queuePendingGalleryRecord({
            captureId: metadata.captureId,
            slug: metadata.slug,
            url: publicUrl,
            title: metadata.title,
            resourceType,
            modeName: metadata.modeName,
            createdAt: metadata.createdAt,
            galleryUrl: metadata.galleryUrl,
          });
        }
      }
      try {
        await deleteFromOfflineQueue(photo.id);
        sent++;
      } catch (error) {
        console.warn("IndexedDB offline queue delete failed", error);
      }
    }
    if (sent) {
      __appRuntimeContext.showToast(`Uploaded ${sent} IndexedDB queued photo${sent === 1 ? "" : "s"}`);
    }
  }

  async function flushPendingGalleryRecords() {
    if (__appRuntimeContext.isFlushingPendingGalleryRecords || !navigator.onLine) return;
    const q = getPendingGalleryRecords();
    if (!q.length) return;
    __appRuntimeContext.isFlushingPendingGalleryRecords = true;
    let sent = 0;
    try {
      for (const item of q.slice()) {
        try {
          const ok = await recordGalleryPhoto(item.slug, item.url, {
            captureId: item.captureId || item.id,
            title: item.title,
            resourceType: item.resourceType,
            modeName: item.modeName,
            createdAt: item.createdAt,
            galleryUrl: item.galleryUrl,
          });
          if (!ok) throw new Error("Gallery API rejected retry");
          sent++;
          const cur = getPendingGalleryRecords();
          const idx = cur.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            cur.splice(idx, 1);
            setPendingGalleryRecords(cur);
          }
        } catch (err) {
          console.warn("Pending gallery retry failed", err);
          const cur = getPendingGalleryRecords();
          const idx = cur.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            cur[idx].attempts = Number(cur[idx].attempts || 0) + 1;
            cur[idx].lastError =
              err && err.message ? err.message : "Pending gallery retry failed";
            setPendingGalleryRecords(cur);
          }
        }
      }
    } finally {
      __appRuntimeContext.isFlushingPendingGalleryRecords = false;
    }
    if (sent) {
      __appRuntimeContext.showToast(`Updated ${sent} pending gallery entr${sent === 1 ? "y" : "ies"}`);
    }
  }

  async function sendPendingNow() {
    const q = getPending();
    if (!q.length) {
      __appRuntimeContext.showToast("No pending emails");
      return;
    }
    if (!navigator.onLine) {
      alert("Go online to send");
      return;
    }
    let sent = 0,
      failed = 0;
    for (const item of q.slice()) {
      try {
        // Try to publish to Cloudinary/SW for a link if available
        let share = null;
        try {
          const result = await uploadCaptureOnce({
            previewUrl: item.image,
            resourceType: "image",
            modeName: "pending-email",
          });
          share = result.publicUrl || null;
        } catch (_) {}
        const params = {
          to_email: item.email,
          photo_url: share || item.image,
          link_url: share || "",
          image_data_url: item.image,
        };
        const cfg = __appRuntimeContext.getEmailJsConfig();
        const client = await __appRuntimeContext.ensureEmailJsClient();
        await client.send(cfg.service, cfg.template, params);
        sent++;
        // remove from queue
        const cur = getPending();
        const idx = cur.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          cur.splice(idx, 1);
          setPending(cur);
        }
      } catch (e) {
        failed++;
      }
    }
    updatePendingUI();
    __appRuntimeContext.showToast(`Pending sent: ${sent}${failed ? `, failed: ${failed}` : ""}`);
  }

  async function makeAvailableOffline() {
    if (
      !("caches" in window) ||
      !("serviceWorker" in navigator) ||
      !location.protocol.startsWith("http")
    ) {
      alert(
        "Offline caching requires HTTPS and a service worker. Open your Cloudflare URL."
      );
      return;
    }
    try {
      const urls = new Set();
      const theme = __appRuntimeContext.activeTheme || __appRuntimeContext.getSelectedThemeTarget();
      if (theme) {
        // Backgrounds
        const bgList = Array.isArray(theme.backgrounds)
          ? theme.backgrounds
          : theme.background
          ? [theme.background]
          : [];
        bgList.filter(Boolean).forEach((u) => urls.add(u));
        // Logo
        if (theme.logo) urls.add(theme.logo);
        // Overlays
        __appRuntimeContext.getOverlayList(theme).forEach((o) => {
          const s = typeof o === "string" ? o : (o && o.src) || "";
          if (s) urls.add(s);
        });
        // Templates
        __appRuntimeContext.getTemplateList(theme).forEach((t) => {
          if (t && t.src) urls.add(t.src);
        });
        // Theme-specific sound effects and any rotating alternates.
        const soundEffects =
          theme.soundEffects && typeof theme.soundEffects === "object"
            ? theme.soundEffects
            : {};
        Object.values(soundEffects).forEach((value) => {
          if (typeof value === "string" && value.trim()) {
            urls.add(value.trim());
          } else if (Array.isArray(value)) {
            value
              .filter((src) => typeof src === "string" && src.trim())
              .forEach((src) => urls.add(src.trim()));
          }
        });
      }
      if (urls.size === 0) {
        __appRuntimeContext.showToast("No assets to cache");
        return;
      }
      const cache = await caches.open("pb-offline-assets-v1");
      let ok = 0,
        fail = 0;
      await Promise.all(
        Array.from(urls).map(async (u) => {
          try {
            const resp = await fetch(u, { cache: "reload" });
            if (resp.ok) {
              await cache.put(new Request(u), resp.clone());
              ok++;
            } else {
              fail++;
            }
          } catch (_) {
            fail++;
          }
        })
      );
      __appRuntimeContext.showToast(`Cached ${ok} assets${fail ? `, failed ${fail}` : ""}`);
    } catch (e) {
      alert("Cache failed: " + (e && e.message ? e.message : e));
    }
  }

  function recordAnalytics(type, value) {
    const data = getAnalytics();
    if (type === "photo" || type === "strip") {
      data.total_sessions = (data.total_sessions || 0) + 1;
      data.overlay_usage[value] = (data.overlay_usage[value] || 0) + 1;
    } else if (type === "email") {
      if (!data.emails.includes(value)) {
        data.emails.push(value);
      }
    }
    localStorage.setItem("photoboothAnalytics", JSON.stringify(data));
  }

  function displayAnalytics() {
    const data = getAnalytics();
    __appRuntimeContext.DOM.analyticsData.textContent = JSON.stringify(data, null, 2);
  }

  function toggleAnalytics() {
    __appRuntimeContext.DOM.analytics.classList.toggle("hidden");
    displayAnalytics();
  }

  function clearAnalytics() {
    if (
      confirm(
        "Are you sure you want to delete all analytics data? This cannot be undone."
      )
    ) {
      localStorage.removeItem("photoboothAnalytics");
      displayAnalytics();
    }
  }

  return {
    offlineQueueSupported,
    getOfflineQueueDb,
    saveToOfflineQueue,
    getAllFromOfflineQueue,
    deleteFromOfflineQueue,
    dataUrlToBlob,
    prepareLocalStorageFallbackImage,
    blobToDataUrl,
    createCaptureUploadId,
    getPendingShareUrl,
    getCaptureUploadMeta,
    uploadCloudinaryWithRetry,
    queueCaptureForRetry,
    uploadCaptureOnce,
    uploadEventPhoto,
    recordGalleryPhoto,
    openShareLink,
    copyShareLink,
    downloadShareImage,
    hideFinal,
    finishBoothFlow,
    retakePhoto,
    exitFinalPreview,
    addToGallery,
    cancelHideTimer,
    getAnalytics,
    offlineModeActive,
    getOfflinePref,
    setOfflinePref,
    getPending,
    setPending,
    queuePendingEmail,
    updatePendingUI,
    acquirePendingQueueWakeLock,
    releasePendingQueueWakeLock,
    getPendingUploads,
    setPendingUploads,
    queuePendingUpload,
    removePendingUpload,
    getPendingGalleryRecords,
    setPendingGalleryRecords,
    queuePendingGalleryRecord,
    flushPendingUploads,
    flushPendingUploadsIndexedDB,
    flushPendingGalleryRecords,
    sendPendingNow,
    makeAvailableOffline,
    recordAnalytics,
    displayAnalytics,
    toggleAnalytics,
    clearAnalytics,
  };
}
