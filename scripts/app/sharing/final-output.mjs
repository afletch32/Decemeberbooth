export function createFinalOutputModule(__appRuntimeContext) {
  async function composeStrip(template, photos) {
    const bg = await __appRuntimeContext.loadImage(template.src);
    const enhancedPhotos = [];
    for (const photo of Array.isArray(photos) ? photos : []) {
      enhancedPhotos.push(__appRuntimeContext.cloneCanvasForStrip(await __appRuntimeContext.ensureGuestPhotoProcessed(photo)));
    }
    const layout = __appRuntimeContext.normalizeTemplateLayout(template && template.layout);
    const explicitPhotoSlots = __appRuntimeContext.hasExplicitPhotoSlots(template);
    const normalizedPhotoSlots = explicitPhotoSlots
      ? __appRuntimeContext.normalizeOverlayPhotoSlots(template)
      : [];
    const rows =
      (template && template.__slotMetrics && template.__slotMetrics.rows) ||
      __appRuntimeContext.getTemplateRowCount(layout, template && template.slots) ||
      Math.max(1, enhancedPhotos.length);
    const bgAspect =
      (bg.naturalWidth || bg.width || 1) / (bg.naturalHeight || bg.height || 1);
    let targetW = bg.naturalWidth || bg.width || 1800;
    let targetH = bg.naturalHeight || bg.height || 1200;
    if (!explicitPhotoSlots && layout === "double_column") {
      targetW = 1200;
      targetH = 1800;
    } else if (!explicitPhotoSlots && layout === "vertical") {
      targetW = 1200;
      targetH = 1800;
    } else if (layout === "custom" && Array.isArray(template && template.slots)) {
      targetW = bg.naturalWidth || bg.width || targetW;
      targetH = bg.naturalHeight || bg.height || targetH;
    }
    const c = __appRuntimeContext.CanvasBuffer.get("strip-composer", targetW, targetH);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    if (explicitPhotoSlots) {
      __appRuntimeContext.logTemplateSlotResolution(template, normalizedPhotoSlots, targetW, targetH);
      const overlayDefinition = __appRuntimeContext.normalizeOverlayDefinition(template);
      await __appRuntimeContext.renderOverlayToCanvas(
        ctx,
        {
          ...(overlayDefinition || {}),
          photoSlots: normalizedPhotoSlots,
        },
        { photos: enhancedPhotos, repeatPhotos: true },
        targetW,
        targetH
      );
    } else if (layout === "double_column") {
      // Two identical strips on one print sheet
      renderDoubleColumn(c, enhancedPhotos, bg, template, rows);
    } else if (layout === "photo_strip_2" || layout === "photo_strip_3" || layout === "photo_strip_4") {
      renderSingleColumnStrip(c, enhancedPhotos, bg, template, rows);
    } else if (layout === "vertical") {
      // Draw template first
      __appRuntimeContext.drawImageContain(ctx, bg, 0, 0, targetW, targetH);
      const padding = Math.round(targetH * 0.03);
      const slotH = Math.floor((targetH - padding * 4) / 3);
      const slotW = targetW - padding * 2;
      for (let i = 0; i < 3; i++) {
        const x = padding,
          y = padding + i * (slotH + padding);
        __appRuntimeContext.drawImageContain(ctx, enhancedPhotos[i], x, y, slotW, slotH);
      }
    } else if (layout === "horizontal") {
      __appRuntimeContext.drawImageContain(ctx, bg, 0, 0, targetW, targetH);
      const padding = Math.round(targetW * 0.03);
      const slotW = Math.floor((targetW - padding * 5) / 4); // 3 slots + one decorative column
      const slotH = targetH - padding * 2;
      for (let i = 0; i < 3; i++) {
        const x = padding + i * (slotW + padding);
        const y = padding;
        __appRuntimeContext.drawImageContain(ctx, enhancedPhotos[i], x, y, slotW, slotH);
      }
    } else if (layout === "spot_mask" || layout === "spotmask") {
      __appRuntimeContext.drawImageContain(ctx, bg, 0, 0, targetW, targetH);
      const regions = await detectMaskRegions(
        bg,
        __appRuntimeContext.SPOT_MASK.color,
        __appRuntimeContext.SPOT_MASK.tolerance
      );
      const max = Math.min(photos.length, regions.length);
      for (let i = 0; i < max; i++) {
        const r = regions[i];
        if (!r) break;
        __appRuntimeContext.drawImageContain(ctx, enhancedPhotos[i], r.x, r.y, r.w, r.h);
      }
      const masked = __appRuntimeContext.createMaskedOverlayCanvas(
        bg,
        __appRuntimeContext.SPOT_MASK.color,
        __appRuntimeContext.SPOT_MASK.tolerance
      );
      __appRuntimeContext.drawImageContain(ctx, masked, 0, 0, targetW, targetH);
    } else if (layout === "custom" && template.slots) {
      __appRuntimeContext.drawImageContain(ctx, bg, 0, 0, targetW, targetH);
      for (
        let i = 0;
        i < Math.min(enhancedPhotos.length, template.slots.length);
        i++
      ) {
        const s = template.slots[i];
        __appRuntimeContext.drawImageContain(ctx, enhancedPhotos[i], s.x, s.y, s.w, s.h);
      }
    } else {
      __appRuntimeContext.drawImageContain(ctx, bg, 0, 0, targetW, targetH);
    }

    // Auto-fill names for strips
    const active = __appRuntimeContext.getActiveEvent();
    const renderedTemplateText = __appRuntimeContext.drawTemplateTextFields(
      ctx,
      targetW,
      targetH,
      template && template.textFields,
      active,
      __appRuntimeContext.activeTheme
    );
    if (
      !renderedTemplateText &&
      active &&
      (active.partner1 ||
        active.partner2 ||
        active.birthdayName ||
        active.expoCompany)
    ) {
      __appRuntimeContext.drawDynamicEventText(ctx, targetW, targetH, active, __appRuntimeContext.activeTheme, true);
    }

    // Since OffscreenCanvas doesn't have toDataURL, we convert or use convertToBlob
    return c instanceof HTMLCanvasElement
      ? c.toDataURL("image/png")
      : await __appRuntimeContext.offscreenToDataURL(c);
  }

  async function finalizeToPrint(photoCanvas, overlaySrc) {
    const enhancedPhotoCanvas = await __appRuntimeContext.ensureGuestPhotoProcessed(photoCanvas);
    const resolvedAspect = __appRuntimeContext.getResolvedCaptureAspectRatio();
    const orientation = resolvedAspect < 1 ? "portrait" : "landscape";
    const { canvas: c, ctx, size } = __appRuntimeContext.createPrintCanvas(orientation);
    if (!ctx) return null;
    const targetW = size.width;
    const targetH = size.height;
    const resolvedOverlaySrc = overlaySrc
      ? __appRuntimeContext.resolveOverlayRenderSrc(__appRuntimeContext.activeTheme, overlaySrc)
      : "";
    const overlayDefinition = overlaySrc
      ? __appRuntimeContext.getOverlayEntryBySrc(__appRuntimeContext.activeTheme, overlaySrc)
      : null;
    // Background fill
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    const aiEnabled = __appRuntimeContext.getAiBackgroundEnabled();
    // Background scene
    const bg =
      aiEnabled || __appRuntimeContext.getGreenScreenEnabled()
        ? __appRuntimeContext.getActiveGreenBackground(__appRuntimeContext.activeTheme) || ""
        : "";
    if (bg) {
      try {
        const bgImg = await __appRuntimeContext.loadDrawableMedia(bg);
        __appRuntimeContext.drawImageCover(ctx, bgImg, 0, 0, targetW, targetH);
      } catch (_) {}
    }
    const photoForPrint = aiEnabled
      ? __appRuntimeContext.applyAiMaskToCanvas(
          enhancedPhotoCanvas,
          enhancedPhotoCanvas && enhancedPhotoCanvas.__aiMask
        )
      : enhancedPhotoCanvas;
    const overlayBundle =
      overlayDefinition ||
      (resolvedOverlaySrc ? __appRuntimeContext.normalizeOverlayDefinition({ src: resolvedOverlaySrc }) : null);
    if (overlayBundle) {
      await __appRuntimeContext.renderOverlayToCanvas(
        ctx,
        overlayBundle,
        { photo: photoForPrint },
        targetW,
        targetH
      );
    } else {
      __appRuntimeContext.drawCoverInRect(ctx, photoForPrint, 0, 0, targetW, targetH);
    }

    // Auto-fill names for single photos
    const active = __appRuntimeContext.getActiveEvent();
    const overlayTextDefinition = __appRuntimeContext.getOverlayList(__appRuntimeContext.activeTheme).find(
      (item) => item && item.src === overlaySrc
    );
    const renderedTemplateText = __appRuntimeContext.drawTemplateTextFields(
      ctx,
      targetW,
      targetH,
      overlayTextDefinition && overlayTextDefinition.textFields,
      active,
      __appRuntimeContext.activeTheme
    );
    if (
      !renderedTemplateText &&
      active &&
      (active.partner1 ||
        active.partner2 ||
        active.birthdayName ||
        active.expoCompany)
    ) {
      __appRuntimeContext.drawDynamicEventText(ctx, targetW, targetH, active, __appRuntimeContext.activeTheme);
    }

    const blob = await new Promise((resolve) => {
      c.toBlob(resolve, "image/jpeg", 0.94);
    });
    if (!blob) throw new Error("Could not encode the finished photo.");
    return { previewUrl: URL.createObjectURL(blob), blob };
  }

  function renderDoubleColumn(canvas, photos, overlayImage, template, rows = 3) {
    const ctx = canvas.getContext("2d");
    const cols = 2; // duplicate columns
    __appRuntimeContext.drawImageContain(ctx, overlayImage, 0, 0, canvas.width, canvas.height);

    const templateSlots =
      __appRuntimeContext.normalizeTemplateSlots(template && template.slots, cols) ||
      __appRuntimeContext.detectTransparentColumnSlots(overlayImage, rows, cols);
    if (templateSlots && templateSlots.every((group) => group.length >= rows)) {
      const scaleX =
        canvas.width / (overlayImage.naturalWidth || overlayImage.width || 1);
      const scaleY =
        canvas.height / (overlayImage.naturalHeight || overlayImage.height || 1);
      for (let row = 0; row < rows; row++) {
        const photo = photos[row];
        if (!photo) continue;
        for (let col = 0; col < cols; col++) {
          const slot = templateSlots[col] && templateSlots[col][row];
          if (!slot) continue;
          __appRuntimeContext.drawImageCover(
            ctx,
            photo,
            slot.x * scaleX,
            slot.y * scaleY,
            slot.w * scaleX,
            slot.h * scaleY
          );
        }
      }
      return;
    }

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

    const columnW = canvas.width / cols;
    const columnPad = columnPadPct * columnW;
    const slotW = Math.max(1, columnW - columnPad * 2);
    const headerH = headerPct * canvas.height;
    const footerH = footerPct * canvas.height;
    const slotSpacing = slotSpacingPct * canvas.height;
    const usableH = canvas.height - headerH - footerH - slotSpacing * (rows + 1);
    const slotH = Math.max(1, usableH / rows);
    const startY = headerH + slotSpacing;

    const standardSlots = __appRuntimeContext.normalizeTemplateSlots(
      __appRuntimeContext.getStandardDoubleColumnStripSlots(),
      cols
    );
    if (standardSlots) {
      for (let row = 0; row < rows; row++) {
        const photo = photos[row];
        if (!photo) continue;
        for (let col = 0; col < cols; col++) {
          const slot = standardSlots[col] && standardSlots[col][row];
          if (!slot) continue;
          __appRuntimeContext.drawImageCover(ctx, photo, slot.x, slot.y, slot.w, slot.h);
        }
      }
    } else {
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const photo = photos[row]; // place same row photo into both columns
          if (!photo) continue;
          const x = Math.round(col * columnW + columnPad);
          const y = Math.round(startY + row * (slotH + slotSpacing));
          __appRuntimeContext.drawImageCover(ctx, photo, x, y, slotW, slotH);
        }
      }
    }
  }

  function renderSingleColumnStrip(canvas, photos, overlayImage, template, rows = 3) {
    const ctx = canvas.getContext("2d");
    const headerPct = Math.max(
      0,
      Math.min(
        0.5,
        __appRuntimeContext.toNumber(template && (template.headerPct || template.header_percent), 0.2)
      )
    );
    const columnPadPct = Math.max(
      0,
      Math.min(0.2, __appRuntimeContext.toNumber(template && template.columnPadPct, 0.11))
    );
    const slotSpacingPct = Math.max(
      0,
      Math.min(0.2, __appRuntimeContext.toNumber(template && template.slotSpacingPct, 0.024))
    );
    const footerPct = Math.max(
      0,
      Math.min(0.3, __appRuntimeContext.toNumber(template && template.footerPct, 0.05))
    );
    const cachedSlots =
      (template && template.__slotMetrics && template.__slotMetrics.slots) ||
      __appRuntimeContext.normalizeTemplateSlots(template && template.slots, 1);
    const detectedSlots =
      cachedSlots || __appRuntimeContext.detectTransparentColumnSlots(overlayImage, rows, 1);

    if (cachedSlots && cachedSlots[0] && cachedSlots[0].length === rows) {
      __appRuntimeContext.drawImageContain(ctx, overlayImage, 0, 0, canvas.width, canvas.height);
      const scaleX =
        canvas.width / (overlayImage.naturalWidth || overlayImage.width || 1);
      const scaleY =
        canvas.height / (overlayImage.naturalHeight || overlayImage.height || 1);
      for (let row = 0; row < rows; row++) {
        const photo = photos[row];
        const slot = cachedSlots[0][row];
        if (!photo || !slot) continue;
        __appRuntimeContext.drawImageCover(
          ctx,
          photo,
          slot.x * scaleX,
          slot.y * scaleY,
          slot.w * scaleX,
          slot.h * scaleY
        );
      }
      return;
    }

    if (detectedSlots && detectedSlots[0] && detectedSlots[0].length === rows) {
      const scaleX =
        canvas.width / (overlayImage.naturalWidth || overlayImage.width || 1);
      const scaleY =
        canvas.height / (overlayImage.naturalHeight || overlayImage.height || 1);
      for (let row = 0; row < rows; row++) {
        const photo = photos[row];
        const slot = detectedSlots[0][row];
        if (!photo || !slot) continue;
        __appRuntimeContext.drawImageCover(
          ctx,
          photo,
          slot.x * scaleX,
          slot.y * scaleY,
          slot.w * scaleX,
          slot.h * scaleY
        );
      }
    } else {
      const padX = canvas.width * columnPadPct;
      const slotW = Math.max(1, canvas.width - padX * 2);
      const headerH = canvas.height * headerPct;
      const footerH = canvas.height * footerPct;
      const slotSpacing = canvas.height * slotSpacingPct;
      const usableH =
        canvas.height - headerH - footerH - slotSpacing * (rows + 1);
      const slotH = Math.max(1, usableH / rows);
      const x = Math.round(padX);
      const startY = headerH + slotSpacing;
      for (let row = 0; row < rows; row++) {
        const photo = photos[row];
        if (!photo) continue;
        const y = Math.round(startY + row * (slotH + slotSpacing));
        __appRuntimeContext.drawImageCover(ctx, photo, x, y, slotW, slotH);
      }
    }

    ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
  }

  async function detectMaskRegions(img, hexColor, tolerance) {
    const rgb = __appRuntimeContext.hexToRgb(hexColor);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const d = data.data;
    const visited = new Uint8Array(w * h);
    const regions = [];
    const stack = [];
    const idx = (x, y) => y * w + x;
    const match = (x, y) => {
      const i = idx(x, y) * 4;
      return __appRuntimeContext.colorClose(d[i], d[i + 1], d[i + 2], rgb, tolerance);
    };
    const minArea = Math.max(50, Math.floor(w * h * 0.001)); // ignore tiny noise
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = idx(x, y);
        if (visited[p]) continue;
        visited[p] = 1;
        if (!match(x, y)) continue;
        // flood fill
        let minX = x,
          maxX = x,
          minY = y,
          maxY = y,
          area = 0;
        stack.length = 0;
        stack.push([x, y]);
        while (stack.length) {
          const [sx, sy] = stack.pop();
          const sp = idx(sx, sy);
          if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
          if (visited[sp] && !(sx === x && sy === y)) continue; // allow seed already marked
          if (!visited[sp]) visited[sp] = 1;
          if (!match(sx, sy)) continue;
          area++;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
          // neighbors
          const neigh = [
            [sx + 1, sy],
            [sx - 1, sy],
            [sx, sy + 1],
            [sx, sy - 1],
          ];
          for (const [nx, ny] of neigh) {
            const np = idx(nx, ny);
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[np]) {
              visited[np] = 1;
              stack.push([nx, ny]);
            }
          }
        }
        if (area >= minArea) {
          regions.push({
            x: minX,
            y: minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1,
          });
        }
      }
    }
    // Sort regions top-to-bottom, then left-to-right
    regions.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
    return regions;
  }

  function setFinalMediaOrientation(element, width, height) {
    if (!element || !width || !height) return;
    element.dataset.orientation = height > width ? "portrait" : "landscape";
  }

  function resetTransientCaptureOverlays(options = {}) {
    __appRuntimeContext.capturePreviewFrozen = false;
    const keepFinalStrip = !!options.keepFinalStrip;
    const keepFinalLive = !!options.keepFinalLive;
    if (__appRuntimeContext.DOM.countdownOverlay) {
      __appRuntimeContext.DOM.countdownOverlay.classList.remove("show");
      __appRuntimeContext.DOM.countdownOverlay.textContent = "";
    }
    if (__appRuntimeContext.DOM.flashOverlay) __appRuntimeContext.DOM.flashOverlay.classList.remove("flash");
    if (__appRuntimeContext.DOM.lastShot) {
      __appRuntimeContext.DOM.lastShot.style.display = "none";
      __appRuntimeContext.DOM.lastShot.removeAttribute("src");
    }
    __appRuntimeContext.clearOverlayPreviewSurface();
    if (__appRuntimeContext.DOM.finalLive && !keepFinalLive) {
      __appRuntimeContext.DOM.finalLive.pause();
      __appRuntimeContext.DOM.finalLive.removeAttribute("src");
      __appRuntimeContext.DOM.finalLive.removeAttribute("poster");
      __appRuntimeContext.DOM.finalLive.load();
      __appRuntimeContext.DOM.finalLive.classList.add("hidden");
    }
    if (__appRuntimeContext.DOM.finalStrip && !keepFinalStrip) {
      __appRuntimeContext.DOM.finalStrip.classList.remove("hidden");
      __appRuntimeContext.DOM.finalStrip.removeAttribute("src");
      __appRuntimeContext.DOM.finalStrip.dataset.orientation = "";
    }
  }

  function revealFinalSaveStage() {
    if (
      __appRuntimeContext.DOM.qrCodeContainer &&
      (__appRuntimeContext.DOM.qrCodeContainer.dataset.ready === "true" ||
        __appRuntimeContext.DOM.qrCodeContainer.dataset.pending === "true" ||
        __appRuntimeContext.DOM.qrCodeContainer.dataset.error === "true")
    ) {
      __appRuntimeContext.DOM.qrCodeContainer.classList.remove("hidden");
      __appRuntimeContext.DOM.qrCodeContainer.classList.add("experience-reveal");
      if (
        __appRuntimeContext.DOM.qrCodeContainer.dataset.ready === "true" &&
        !__appRuntimeContext.hasThemeSoundEffect("shareReady")
      ) {
        __appRuntimeContext.playBoothSound("qr");
      }
    }
  }

  function showGoodbyeMoment() {
    if (!__appRuntimeContext.DOM.goodbyeOverlay) return;
    const personality = __appRuntimeContext.getBoothPersonality();
    const title = __appRuntimeContext.DOM.goodbyeOverlay.querySelector("h2");
    const body = __appRuntimeContext.DOM.goodbyeOverlay.querySelector("p");
    if (title) title.textContent = "Thank You!";
    if (body) body.textContent = personality.thanks.replace(/^thank you!?\s*/i, "") || "Enjoy your photos!";
    __appRuntimeContext.DOM.goodbyeOverlay.classList.add("show");
    __appRuntimeContext.playThemeCue("goodbye", "goodbye");
    setTimeout(() => {
      if (__appRuntimeContext.DOM.goodbyeOverlay) __appRuntimeContext.DOM.goodbyeOverlay.classList.remove("show");
    }, 1400);
  }

  function setupFinalExperienceActions() {
    if (__appRuntimeContext.DOM.reviewRetakeBtn && !__appRuntimeContext.DOM.reviewRetakeBtn.dataset.bound) {
      __appRuntimeContext.DOM.reviewRetakeBtn.dataset.bound = "true";
      __appRuntimeContext.DOM.reviewRetakeBtn.addEventListener("click", () => {
        __appRuntimeContext.unlockBoothAudio();
        __appRuntimeContext.playThemeCue("tap", "tap");
        __appRuntimeContext.retakePhoto();
      });
    }
    if (__appRuntimeContext.DOM.finishBoothBtn && !__appRuntimeContext.DOM.finishBoothBtn.dataset.bound) {
      __appRuntimeContext.DOM.finishBoothBtn.dataset.bound = "true";
      __appRuntimeContext.DOM.finishBoothBtn.addEventListener("click", () => {
        __appRuntimeContext.unlockBoothAudio();
        __appRuntimeContext.playThemeCue("tap", "tap");
        __appRuntimeContext.finishBoothFlow();
      });
    }
    if (__appRuntimeContext.DOM.requestPrintBtn && !__appRuntimeContext.DOM.requestPrintBtn.dataset.bound) {
      __appRuntimeContext.DOM.requestPrintBtn.dataset.bound = "true";
      __appRuntimeContext.DOM.requestPrintBtn.addEventListener("click", async () => {
        if (!__appRuntimeContext.pendingFinalPrintImageUrl) return;
        __appRuntimeContext.DOM.requestPrintBtn.disabled = true;
        __appRuntimeContext.DOM.requestPrintBtn.textContent = "Preparing…";
        try {
          const settings = __appRuntimeContext.getPrintSettings();
          const item = await __appRuntimeContext.enqueueFinalPrintIfNeeded(__appRuntimeContext.pendingFinalPrintImageUrl, true);
          if (!item) throw new Error("Your print request could not be queued. Please ask the attendant.");
          if (settings.mode === "paid") {
            await __appRuntimeContext.showPayPalPrintCheckout(item);
            __appRuntimeContext.DOM.requestPrintBtn.textContent = "Checkout Below";
            return;
          }
          __appRuntimeContext.DOM.requestPrintBtn.textContent = "Print Requested";
        } catch (error) {
          console.warn("Print checkout setup failed", error);
          if (__appRuntimeContext.DOM.shareStatus) {
            __appRuntimeContext.DOM.shareStatus.textContent = error.message || "Print checkout could not start.";
            __appRuntimeContext.DOM.shareStatus.style.display = "inline-flex";
          }
          __appRuntimeContext.DOM.requestPrintBtn.disabled = false;
          __appRuntimeContext.DOM.requestPrintBtn.textContent = "Try Again";
        }
      });
    }
  }

  async function fetchPayPalPrintConfig(eventId) {
    const response = await fetch(`/api/paypal/config?eventId=${encodeURIComponent(eventId || "default")}`, { cache: "no-store" });
    const config = await response.json();
    if (!response.ok || !config.configured || !config.clientId) {
      throw new Error("PayPal checkout is not connected. Ask the attendant to check the payment setup.");
    }
    return config;
  }

  function formatPayPalPrintPrice(amount, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
    } catch (_) {
      return `${currency} ${amount}`;
    }
  }

  async function showFinalPrintPrice(eventId) {
    const requestId = ++__appRuntimeContext.finalPrintPriceRequestId;
    if (__appRuntimeContext.DOM.printPriceNotice) {
      __appRuntimeContext.DOM.printPriceNotice.classList.remove("hidden");
      __appRuntimeContext.DOM.printPriceNotice.textContent = "Checking event print price…";
    }
    if (__appRuntimeContext.DOM.requestPrintBtn) __appRuntimeContext.DOM.requestPrintBtn.disabled = true;
    try {
      const config = await fetchPayPalPrintConfig(eventId);
      if (requestId !== __appRuntimeContext.finalPrintPriceRequestId || __appRuntimeContext.getPrintSettings().mode !== "paid") return;
      if (__appRuntimeContext.DOM.printPriceNotice) {
        __appRuntimeContext.DOM.printPriceNotice.textContent = `Print price: ${formatPayPalPrintPrice(config.amount, config.currency)}`;
      }
      if (__appRuntimeContext.DOM.requestPrintBtn) __appRuntimeContext.DOM.requestPrintBtn.disabled = false;
    } catch (_) {
      if (requestId !== __appRuntimeContext.finalPrintPriceRequestId || __appRuntimeContext.getPrintSettings().mode !== "paid") return;
      if (__appRuntimeContext.DOM.printPriceNotice) __appRuntimeContext.DOM.printPriceNotice.textContent = "Print price unavailable. Please ask the attendant.";
    }
  }

  function showFinal(url, options = {}) {
    clearTimeout(__appRuntimeContext.hidePreviewTimer); // Clear any existing timer
    __appRuntimeContext.updateOutputSurfaceTrace({
      localFinalUrl: url,
      remoteFinalUrl: options.shareUrl || "",
      surfaces: {
        preview: url,
      },
    });
    setupFinalExperienceActions();
    if (__appRuntimeContext.DOM.reviewRetakeBtn) {
      __appRuntimeContext.DOM.reviewRetakeBtn.style.display = __appRuntimeContext.allowRetake ? "" : "none";
    }
    __appRuntimeContext.syncBoothPersonality();
    if (__appRuntimeContext.DOM.goodbyeOverlay) __appRuntimeContext.DOM.goodbyeOverlay.classList.remove("show");
    if (__appRuntimeContext.DOM.qrCodeContainer) {
      __appRuntimeContext.DOM.qrCodeContainer.dataset.ready = "false";
      __appRuntimeContext.DOM.qrCodeContainer.dataset.pending = "false";
      __appRuntimeContext.DOM.qrCodeContainer.dataset.error = "false";
    }
    const img = __appRuntimeContext.DOM.finalStrip;
    const previewFit = __appRuntimeContext.getSelectedCaptureMode() === "strip" ? "contain" : "cover";
    if (img) img.style.objectFit = previewFit;
    if (__appRuntimeContext.DOM.finalLive) __appRuntimeContext.DOM.finalLive.style.objectFit = previewFit;
    __appRuntimeContext.syncFrameSizeVars();
    const shareType = options.shareType || "image";
    __appRuntimeContext.lastShareType = shareType;
    const shareBlob = options.shareBlob || null;
    const skipShare = !!options.skipShare;
    const providedShareUrl =
      options.shareUrl && /^https?:/i.test(String(options.shareUrl))
        ? String(options.shareUrl)
        : "";
    const printImageUrl =
      options.printImageUrl && /^(https?:|blob:)/i.test(String(options.printImageUrl))
        ? String(options.printImageUrl)
        : shareType === "image"
          ? providedShareUrl
          : "";
    const printEligible = options.printEligible !== false && shareType === "image";
    const offline = __appRuntimeContext.offlineModeActive();
    const qrContainer = __appRuntimeContext.DOM.qrCodeContainer;
    const qrCanvas = __appRuntimeContext.DOM.qrCode;
    const panel = __appRuntimeContext.DOM.finalPreview;
    const useLiveClip = !!(
      __appRuntimeContext.DOM.finalLive &&
      (__appRuntimeContext.lastLiveClipUrl || shareBlob) &&
      !options.forceImage
    );
    if (useLiveClip) {
      if (!__appRuntimeContext.lastLiveClipUrl && shareBlob) __appRuntimeContext.setLiveClip(shareBlob);
      __appRuntimeContext.DOM.finalLive.src = __appRuntimeContext.lastLiveClipUrl;
      __appRuntimeContext.DOM.finalLive.poster = url;
      if (img) img.classList.add("hidden");
      if (img) __appRuntimeContext.DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
    } else if (__appRuntimeContext.DOM.finalLive) {
      __appRuntimeContext.DOM.finalLive.pause();
      __appRuntimeContext.DOM.finalLive.removeAttribute("src");
      __appRuntimeContext.DOM.finalLive.removeAttribute("poster");
      __appRuntimeContext.DOM.finalLive.load();
      __appRuntimeContext.DOM.finalLive.classList.add("hidden");
    }
    let finalPreviewShown = false;
    const revealFinalPreview = () => {
      if (finalPreviewShown) return;
      finalPreviewShown = true;
      resetTransientCaptureOverlays({
        keepFinalStrip: true,
        keepFinalLive: useLiveClip,
      });
      if (__appRuntimeContext.DOM.boothScreen) {
        __appRuntimeContext.DOM.boothScreen.classList.remove("countdown-mode", "finalizing-mode");
        __appRuntimeContext.DOM.boothScreen.classList.add("share-mode");
      }
      if (img) img.classList.toggle("hidden", useLiveClip);
      if (__appRuntimeContext.DOM.finalLive && __appRuntimeContext.DOM.finalLive.src) {
        __appRuntimeContext.DOM.finalLive.classList.remove("hidden");
      }
      panel.classList.add("show");
      revealFinalSaveStage();
      if (!skipShare && providedShareUrl) {
        __appRuntimeContext.lastShareUrl = providedShareUrl;
        __appRuntimeContext.updateOutputSurfaceTrace({
          remoteFinalUrl: providedShareUrl,
          surfaces: {
            qr: providedShareUrl,
            print: printImageUrl,
          },
        });
        if (qrContainer) {
          qrContainer.dataset.pending = "true";
          qrContainer.dataset.error = "false";
          qrContainer.classList.remove("hidden");
          qrContainer.classList.add("experience-reveal");
        }
        if (__appRuntimeContext.DOM.shareStatus) {
          __appRuntimeContext.DOM.shareStatus.textContent = "Preparing QR";
          __appRuntimeContext.DOM.shareStatus.style.display = "inline-flex";
        }
        renderQrCode(qrCanvas, __appRuntimeContext.lastShareUrl).then((qrRendered) => {
          if (qrContainer) {
            qrContainer.dataset.ready = qrRendered ? "true" : "false";
            qrContainer.dataset.pending = "false";
            qrContainer.dataset.error = qrRendered ? "false" : "true";
          }
          if (__appRuntimeContext.DOM.shareStatus) {
            __appRuntimeContext.DOM.shareStatus.textContent = qrRendered ? "Link ready" : "QR failed";
            __appRuntimeContext.DOM.shareStatus.style.display = qrRendered ? "none" : "inline-flex";
          }
          if (__appRuntimeContext.DOM.qrHint) {
            __appRuntimeContext.DOM.qrHint.textContent = qrRendered
              ? options.uploadPending
                ? "Your photo is uploading and will appear here shortly."
                : options.uploadQueued
                  ? "Save this QR code. Your photo will appear at this link after the booth reconnects."
                  : ""
              : "Open the link button if the QR does not appear.";
            __appRuntimeContext.DOM.qrHint.style.display = qrRendered && (options.uploadPending || options.uploadQueued)
              ? "block"
              : qrRendered
                ? "none"
                : "block";
          }
          if (qrRendered) {
            revealFinalSaveStage();
            __appRuntimeContext.playThemeSoundEffect("shareReady", { afterCurrent: true });
          }
        });
      } else if (!skipShare) {
        __appRuntimeContext.lastShareUrl = null;
        if (qrContainer) {
          qrContainer.dataset.ready = "false";
          qrContainer.dataset.pending = "false";
          qrContainer.dataset.error = "true";
        }
        if (options.uploadQueued && __appRuntimeContext.DOM.qrHint) {
          __appRuntimeContext.DOM.qrHint.textContent =
            "Upload queued: QR will be available after retry.";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
        if (offline && __appRuntimeContext.DOM.qrHint) {
          __appRuntimeContext.DOM.qrHint.textContent = "Offline: QR disabled";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
        if (!__appRuntimeContext.cloudinaryEnabled() && __appRuntimeContext.DOM.qrHint) {
          __appRuntimeContext.DOM.qrHint.textContent = "Enable Cloudinary in Admin to show QR";
          __appRuntimeContext.DOM.qrHint.style.display = "block";
        }
      }
      const printSettings = __appRuntimeContext.getPrintSettings();
      const printEnabled = printSettings.mode !== "off" && printEligible;
      const paidPrintEnabled = printEnabled && printSettings.mode === "paid";
      __appRuntimeContext.pendingFinalPrintImageUrl = printEnabled ? printImageUrl : "";
      if (__appRuntimeContext.DOM.finalPrintActions)
        __appRuntimeContext.DOM.finalPrintActions.classList.toggle("hidden", !printEnabled);
      if (__appRuntimeContext.DOM.requestPrintBtn) {
        __appRuntimeContext.DOM.requestPrintBtn.disabled = paidPrintEnabled;
        __appRuntimeContext.DOM.requestPrintBtn.textContent = "Print";
      }
      if (__appRuntimeContext.DOM.printPriceNotice) {
        __appRuntimeContext.DOM.printPriceNotice.textContent = "";
        __appRuntimeContext.DOM.printPriceNotice.classList.toggle("hidden", !paidPrintEnabled);
      }
      if (paidPrintEnabled) showFinalPrintPrice(__appRuntimeContext.getPrintQueueEventId());
      else __appRuntimeContext.finalPrintPriceRequestId += 1;
      if (__appRuntimeContext.DOM.paypalPrintCheckout) {
        __appRuntimeContext.DOM.paypalPrintCheckout.innerHTML = "";
        __appRuntimeContext.DOM.paypalPrintCheckout.classList.add("hidden");
      }
      __appRuntimeContext.updateOutputSurfaceTrace({
        surfaces: {
          print: printImageUrl,
        },
      });
      __appRuntimeContext.resetIdleTimer();
      if (skipShare && !__appRuntimeContext.isBoothTestMode()) {
        __appRuntimeContext.hidePreviewTimer = setTimeout(__appRuntimeContext.finishBoothFlow, 15000);
      }
    };

    if (img) {
      img.onload = () => {
        setFinalMediaOrientation(
          img,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height
        );
        if (__appRuntimeContext.DOM.finalLive) {
          __appRuntimeContext.DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
        }
        revealFinalPreview();
      };
      img.onerror = () => {
        // Do not strand the guest on the finalizing screen when the delivered
        // preview URL is unavailable. Share/QR status still reports the remote
        // delivery failure separately.
        revealFinalPreview();
      };
      img.src = url;
      if (img.complete) {
        setFinalMediaOrientation(
          img,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height
        );
        if (__appRuntimeContext.DOM.finalLive) {
          __appRuntimeContext.DOM.finalLive.dataset.orientation = img.dataset.orientation || "";
        }
        revealFinalPreview();
      }
    } else {
      revealFinalPreview();
    }
    if (useLiveClip && __appRuntimeContext.DOM.finalLive) __appRuntimeContext.DOM.finalLive.play().catch(() => {});
    // No local-QR fallback: only show QR when a public link is ready (handled above)
  }

  async function renderQrCodeAtWidth(canvas, text, width = 360) {
    if (!canvas || !text) return false;
    let stage;
    try {
      const QRCode = await __appRuntimeContext.loadQrCodeLibrary();
      stage = document.createElement("div");
      stage.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
      document.body.appendChild(stage);
      new QRCode(stage, {
        text: String(text),
        width,
        height: width,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
      const generated = stage.querySelector("canvas");
      if (!generated) return false;
      canvas.width = width;
      canvas.height = width;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, width);
      // Keep a quiet zone around the code so phone cameras can scan it reliably.
      const inset = Math.round(width * 0.08);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(generated, inset, inset, width - inset * 2, width - inset * 2);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      if (stage) stage.remove();
    }
  }

  async function renderQrCode(canvas, text) {
    return renderQrCodeAtWidth(canvas, text, 360);
  }

  function copyEventGalleryLink() {
    const link = __appRuntimeContext.getEventGalleryUrl();
    if (!link) {
      alert("Set Cloudinary Cloud Name first.");
      return;
    }
    __appRuntimeContext.copyText(link);
  }

  function openEventGalleryLink() {
    const link = __appRuntimeContext.getEventGalleryUrl();
    if (!link) {
      alert("Set Cloudinary Cloud Name first.");
      return;
    }
    try {
      window.open(link, "_blank", "noopener");
    } catch (_) {
      location.href = link;
    }
  }

  function getCurrentEventSlug() {
    try {
      const val =
        __appRuntimeContext.getSelectedThemeKey();
      if (!val) return "";
      // value is like "fall:halloween" or "school:hawks"; use it directly
      return String(val)
        .toLowerCase()
        .replace(/[^a-z0-9:_\-]+/g, "-")
        .replace(/:+/g, "-");
    } catch (_) {
      return "";
    }
  }

  function slugifyEventText(value) {
    return (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  return {
    composeStrip,
    finalizeToPrint,
    renderDoubleColumn,
    renderSingleColumnStrip,
    detectMaskRegions,
    setFinalMediaOrientation,
    resetTransientCaptureOverlays,
    revealFinalSaveStage,
    showGoodbyeMoment,
    setupFinalExperienceActions,
    fetchPayPalPrintConfig,
    formatPayPalPrintPrice,
    showFinalPrintPrice,
    showFinal,
    renderQrCodeAtWidth,
    renderQrCode,
    copyEventGalleryLink,
    openEventGalleryLink,
    getCurrentEventSlug,
    slugifyEventText,
  };
}
