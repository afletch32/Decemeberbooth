(() => {
  "use strict";
  const REFRESH_MS = 5000;
  const TOKEN_KEY = "photoboothStaffPrintToken";
  const eventInput = document.getElementById("eventId");
  const layoutInput = document.getElementById("printLayout");
  const orientationInput = document.getElementById("printOrientation");
  const previewSheet = document.getElementById("printPreviewSheet");
  const previewSummary = document.getElementById("printPreviewSummary");
  const previewDetails = document.getElementById("printPreviewDetails");
  const list = document.getElementById("queueList");
  const status = document.getElementById("queueStatus");
  const tokenButton = document.getElementById("setToken");
  const query = new URLSearchParams(window.location.search);
  let eventId = query.get("eventId") || "default";
  let items = [];
  let staffAuthRequired = false;
  const LAYOUT_KEY = "photoboothStaffPrintLayout";
  const ORIENTATION_KEY = "photoboothStaffPrintOrientation";
  const OVERRIDES_KEY = "photoboothStaffPrintOverrides";
  let printOverrides = {};
  const expandedPrintSettings = new Set();

  function cleanEventId(value) {
    return String(value || "default").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "default";
  }

  function getPrintLayout() {
    const stored = localStorage.getItem(LAYOUT_KEY) || "single";
    return stored === "double" ? "double" : "single";
  }

  function setPrintLayout(value) {
    const next = value === "double" ? "double" : "single";
    localStorage.setItem(LAYOUT_KEY, next);
    if (layoutInput) layoutInput.value = next;
    return next;
  }

  function getPrintOrientation() {
    const stored = localStorage.getItem(ORIENTATION_KEY) || "auto";
    return ["auto", "landscape", "portrait"].includes(stored) ? stored : "auto";
  }

  function setPrintOrientation(value) {
    const next = ["landscape", "portrait"].includes(value) ? value : "auto";
    localStorage.setItem(ORIENTATION_KEY, next);
    if (orientationInput) orientationInput.value = next;
    return next;
  }

  function normalizePrintSettings(value) {
    if (!value || typeof value !== "object") return null;
    return {
      layout: value.layout === "double" ? "double" : "single",
      orientation: ["landscape", "portrait"].includes(value.orientation)
        ? value.orientation
        : "auto",
    };
  }

  function getPrintOverridesKey() {
    return `${OVERRIDES_KEY}:${eventId}`;
  }

  function loadPrintOverrides() {
    try {
      const stored = JSON.parse(localStorage.getItem(getPrintOverridesKey()) || "{}");
      printOverrides = Object.fromEntries(
        Object.entries(stored || {})
          .map(([id, settings]) => [id, normalizePrintSettings(settings)])
          .filter((entry) => entry[1])
      );
    } catch (_) {
      printOverrides = {};
    }
  }

  function savePrintOverrides() {
    localStorage.setItem(getPrintOverridesKey(), JSON.stringify(printOverrides));
  }

  function getResolvedPrintSettings(item) {
    const override =
      item && item.id ? normalizePrintSettings(printOverrides[item.id]) : null;
    return {
      layout: override ? override.layout : getPrintLayout(),
      orientation: override ? override.orientation : getPrintOrientation(),
      isOverride: Boolean(override),
    };
  }

  function setPrintOverride(item, patch) {
    if (!item || !item.id) return;
    const current = getResolvedPrintSettings(item);
    const next = normalizePrintSettings({ ...current, ...patch });
    if (!next) return;
    if (
      next.layout === getPrintLayout() &&
      next.orientation === getPrintOrientation()
    ) {
      delete printOverrides[item.id];
    } else {
      printOverrides[item.id] = next;
    }
    savePrintOverrides();
  }

  function clearPrintOverride(item) {
    if (!item || !item.id || !printOverrides[item.id]) return;
    delete printOverrides[item.id];
    savePrintOverrides();
  }

  function staffHeaders() {
    const token = sessionStorage.getItem(TOKEN_KEY) || "";
    return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
  }

  function label(value) {
    if (value === "ready") return "Ready to print";
    if (value === "paid") return "Paid";
    if (value === "comped") return "Comped";
    if (value === "new") return "New";
    if (value === "reprint") return "Reprint";
    if (value === "void") return "Void";
    return String(value || "").replace(/_/g, " ");
  }

  function createdAt(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "Unknown time" : date.toLocaleString();
  }

  function escapeText(value) {
    const node = document.createElement("span");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  function renderPrintPreview() {
    if (!previewSheet || !previewSummary || !previewDetails) return;
    const item = items.find(
      (candidate) =>
        candidate.printStatus !== "void" &&
        (candidate.thumbnailUrl || candidate.imageUrl)
    );
    if (!item) {
      previewSheet.className = "print-preview-sheet landscape single";
      previewSheet.innerHTML = '<div class="print-preview-slot"></div>';
      previewSummary.textContent = "Waiting for the next queued photo";
      previewDetails.textContent =
        "Choose the sheet settings now; the diagram will use the next photo when it arrives.";
      return;
    }

    const layout = getPrintLayout();
    const count = layout === "double" ? 2 : 1;
    const source = escapeText(item.thumbnailUrl || item.imageUrl);
    const slots = Array.from(
      { length: count },
      () =>
        `<div class="print-preview-slot"><img src="${source}" alt=""></div>`
    ).join("");
    previewSheet.className = `print-preview-sheet landscape ${layout}`;
    previewSheet.innerHTML = slots;
    const images = Array.from(previewSheet.querySelectorAll("img"));
    const first = images[0];

    const updateDescription = () => {
      if (!first || !first.naturalWidth || !first.naturalHeight) return;
      const photoOrientation =
        first.naturalWidth >= first.naturalHeight ? "landscape" : "portrait";
      const requestedOrientation = getPrintOrientation();
      const sheetOrientation =
        requestedOrientation === "auto"
          ? photoOrientation
          : requestedOrientation;
      const sheetLandscape = sheetOrientation === "landscape";
      const sheetSize = sheetLandscape ? "6×4" : "4×6";
      const arrangement =
        count === 2 ? (sheetLandscape ? " side by side" : " stacked") : "";
      previewSheet.className = `print-preview-sheet ${sheetOrientation} ${layout}`;
      previewSummary.textContent = `${count} ${photoOrientation} ${
        count === 1 ? "photo" : "photos"
      }${arrangement} on a ${sheetOrientation} ${sheetSize} sheet.`;
      previewDetails.textContent =
        requestedOrientation === "auto"
          ? "Automatic paper direction follows the next queued photo."
          : "This is the exact sheet arrangement that Open/Print will send to the print dialog.";
    };

    if (first) {
      first.addEventListener("load", updateDescription, { once: true });
      first.addEventListener(
        "error",
        () => {
          previewSummary.textContent = "Preview unavailable";
          previewDetails.textContent =
            "The photo could not load in the diagram, but it remains in the queue.";
        },
        { once: true }
      );
      if (first.complete && first.naturalWidth > 0) updateDescription();
    }
  }

  function printSettingsLabel(settings, sheetOrientation = "") {
    const source = settings.isOverride ? "Custom" : "Session default";
    const layout =
      settings.layout === "double" ? "2 copies" : "1 full-size photo";
    const orientation =
      settings.orientation === "auto"
        ? sheetOrientation
          ? `Automatic (${sheetOrientation})`
          : "Automatic"
        : settings.orientation === "portrait"
        ? "Portrait"
        : "Landscape";
    return `${source} · ${layout} · ${orientation}`;
  }

  function updateQueuePrintSettingPreview(item) {
    const card = Array.from(list.querySelectorAll(".queue-item")).find(
      (candidate) => candidate.dataset.itemId === String(item.id)
    );
    if (!card) return;
    const settings = getResolvedPrintSettings(item);
    const image = card.querySelector(":scope > img");
    const photoOrientation =
      image && image.naturalWidth && image.naturalHeight
        ? image.naturalWidth >= image.naturalHeight
          ? "landscape"
          : "portrait"
        : "";
    const sheetOrientation =
      settings.orientation === "auto"
        ? photoOrientation || "landscape"
        : settings.orientation;
    const summary = card.querySelector("[data-print-settings-summary]");
    const icon = card.querySelector("[data-print-layout-icon]");
    if (summary) {
      summary.textContent = printSettingsLabel(settings, sheetOrientation);
    }
    if (icon) {
      icon.className = `queue-layout-icon ${sheetOrientation} ${settings.layout}`;
      icon.innerHTML =
        settings.layout === "double" ? "<span></span><span></span>" : "<span></span>";
    }
  }

  function render() {
    const visible = items.filter((item) => item.printStatus !== "void");
    status.textContent = `${visible.length} active ${visible.length === 1 ? "item" : "items"} · refreshes every 5 seconds`;
    if (tokenButton) tokenButton.hidden = !staffAuthRequired;
    if (layoutInput && !layoutInput.value) layoutInput.value = getPrintLayout();
    if (orientationInput && !orientationInput.value)
      orientationInput.value = getPrintOrientation();
    renderPrintPreview();
    if (!visible.length) {
      list.innerHTML = '<div class="empty">No queued photos for this event.</div>';
      return;
    }
    list.innerHTML = visible.map((item) => {
      const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
      const printed = item.printStatus === "printed" || item.printStatus === "reprint";
      const paymentCleared = item.paymentStatus === "paid" || item.paymentStatus === "comped";
      const settings = getResolvedPrintSettings(item);
      const expanded = expandedPrintSettings.has(String(item.id));
      return `<article class="queue-item" data-item-id="${escapeText(item.id)}">
        <img src="${escapeText(item.thumbnailUrl || item.imageUrl)}" alt="Queued photo created ${escapeText(createdAt(item.createdAt))}">
        <div>
          <h2>Queued photo · Qty ${escapeText(quantity)}</h2>
          <p class="metadata">Event ${escapeText(item.eventId || eventId)} · ${escapeText(createdAt(item.createdAt))}</p>
          <span class="badge ${escapeText(item.printStatus)}">${escapeText(label(item.printStatus))}</span>
          <span class="badge ${escapeText(item.paymentStatus)}">${escapeText(label(item.paymentStatus))}</span>
          <div class="queue-item-actions" style="margin-top:16px">
            ${item.paymentStatus === "unpaid" ? `<button type="button" data-action="paid" data-id="${escapeText(item.id)}">Mark Paid</button>` : ""}
            <button type="button" data-action="print" data-id="${escapeText(item.id)}" ${paymentCleared ? "" : "disabled"}>Open/Print</button>
            <button type="button" data-action="printed" data-id="${escapeText(item.id)}" ${paymentCleared ? "" : "disabled"}>Mark Printed</button>
            <button type="button" data-action="reprint" data-id="${escapeText(item.id)}" ${printed && paymentCleared ? "" : "disabled"}>Reprint</button>
            <button type="button" data-action="void" data-id="${escapeText(item.id)}" class="danger">Void</button>
          </div>
          <div class="queue-print-settings">
            <div class="queue-print-settings-summary">
              <span class="queue-layout-icon landscape single" data-print-layout-icon aria-hidden="true"><span></span></span>
              <div class="queue-print-settings-copy">
                <span class="queue-print-settings-label">Print layout</span>
                <strong data-print-settings-summary>${escapeText(printSettingsLabel(settings))}</strong>
              </div>
              <button type="button" class="secondary" data-action="toggle-print-settings" data-id="${escapeText(item.id)}" aria-expanded="${expanded}">
                ${expanded ? "Done" : "Change for this photo"}
              </button>
            </div>
            <div class="item-print-controls" ${expanded ? "" : "hidden"}>
              <label class="control-group">
                Photos on this sheet
                <select data-print-setting="layout" data-id="${escapeText(item.id)}">
                  <option value="single" ${settings.layout === "single" ? "selected" : ""}>1 full-size photo</option>
                  <option value="double" ${settings.layout === "double" ? "selected" : ""}>2 copies of the photo</option>
                </select>
              </label>
              <label class="control-group">
                Paper direction for this photo
                <select data-print-setting="orientation" data-id="${escapeText(item.id)}">
                  <option value="auto" ${settings.orientation === "auto" ? "selected" : ""}>Automatic — match turned photo</option>
                  <option value="landscape" ${settings.orientation === "landscape" ? "selected" : ""}>Landscape — 6 wide × 4 tall</option>
                  <option value="portrait" ${settings.orientation === "portrait" ? "selected" : ""}>Portrait — 4 wide × 6 tall</option>
                </select>
              </label>
              <button type="button" class="secondary" data-action="reset-print-settings" data-id="${escapeText(item.id)}" ${settings.isOverride ? "" : "disabled"}>Use session default</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join("");
    visible.forEach((item) => {
      updateQueuePrintSettingPreview(item);
      const cardImage = Array.from(list.querySelectorAll(".queue-item")).find(
        (candidate) => candidate.dataset.itemId === String(item.id)
      )?.querySelector(":scope > img");
      if (cardImage && !cardImage.complete) {
        cardImage.addEventListener(
          "load",
          () => updateQueuePrintSettingPreview(item),
          { once: true }
        );
      }
    });
  }

  async function loadQueue() {
    const nextEventId = cleanEventId(eventInput.value || eventId);
    if (nextEventId !== eventId) {
      eventId = nextEventId;
      expandedPrintSettings.clear();
      loadPrintOverrides();
    }
    eventInput.value = eventId;
    try {
      const response = await fetch(`/api/print-queue?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load queue.");
      items = Array.isArray(payload.items) ? payload.items : [];
      staffAuthRequired = payload.staffAuthRequired === true;
      render();
    } catch (error) {
      status.textContent = error.message || "Could not load queue.";
    }
  }

  async function updateItem(id, patch) {
    const response = await fetch(`/api/print-queue/${encodeURIComponent(id)}?eventId=${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: staffHeaders(),
      body: JSON.stringify({ eventId, ...patch }),
    });
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        staffAuthRequired = true;
        if (tokenButton) tokenButton.hidden = false;
      }
      throw new Error(payload.error || "Could not update queue item.");
    }
    await loadQueue();
  }

  async function removeItem(id) {
    const response = await fetch(`/api/print-queue/${encodeURIComponent(id)}?eventId=${encodeURIComponent(eventId)}`, { method: "DELETE", headers: staffHeaders() });
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        staffAuthRequired = true;
        if (tokenButton) tokenButton.hidden = false;
      }
      throw new Error(payload.error || "Could not remove queue item.");
    }
    if (printOverrides[id]) {
      delete printOverrides[id];
      savePrintOverrides();
    }
    expandedPrintSettings.delete(String(id));
    await loadQueue();
  }

  function openPrintWindowForImage(
    imageUrl,
    layout = getPrintLayout(),
    orientation = getPrintOrientation()
  ) {
    const popup = window.open("", "_blank");
    if (!popup) throw new Error("Allow pop-ups to print this photo.");
    popup.opener = null;
    const safeUrl = String(imageUrl)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const doubleLayout = layout === "double";
    const sheetClass = doubleLayout ? "sheet double" : "sheet single";
    const sheetContent = doubleLayout
      ? `<div class="photo-slot"><img src="${safeUrl}" alt="Photo to print"></div><div class="photo-slot"><img src="${safeUrl}" alt="Photo to print"></div>`
      : `<div class="photo-slot"><img src="${safeUrl}" alt="Photo to print"></div>`;
    popup.document.write(`<!doctype html><html><head><title>Print Photo</title><style id="pageStyle"></style><style>html,body { margin:0; background:#fff; } body { display:grid; place-items:center; } .sheet { display:grid; background:#fff; overflow:hidden; } .photo-slot { position:relative; min-width:0; min-height:0; overflow:hidden; background:#fff; } .photo-slot img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:block; } .error { padding:16px; font:14px system-ui, sans-serif; color:#7c2222; }</style></head><body><div class="${sheetClass}">${sheetContent}</div><script>const requestedOrientation=${JSON.stringify(orientation)}; const images=Array.from(document.querySelectorAll("img")); const printPhoto=()=>{ const first=images[0]; const photoLandscape=first.naturalWidth>=first.naturalHeight; const pageOrientation=requestedOrientation==="auto" ? (photoLandscape?"landscape":"portrait") : requestedOrientation; const landscape=pageOrientation==="landscape"; const width=landscape?"6in":"4in"; const height=landscape?"4in":"6in"; document.getElementById("pageStyle").textContent="@page { size: "+width+" "+height+"; margin:0; } html,body,.sheet { width:"+width+"; height:"+height+"; } .sheet.double { grid-template-"+(landscape?"columns":"rows")+":1fr 1fr; }"; requestAnimationFrame(()=>{ window.focus(); setTimeout(()=>window.print(), 80); }); }; const showError=()=>{ document.body.innerHTML='<p class="error">Photo could not load. Close this tab and try Open/Print again.</p>'; }; let loaded=0; let failed=false; const onLoad=()=>{ loaded += 1; if (!failed && loaded === images.length) printPhoto(); }; const onError=()=>{ failed = true; showError(); }; images.forEach((image)=>{ image.addEventListener("load", onLoad, { once:true }); image.addEventListener("error", onError, { once:true }); if (image.complete) { if (image.naturalWidth > 0) onLoad(); else onError(); } });<\/script></body></html>`);
    popup.document.close();
  }

  function printQueueItem(item) {
    if (!item || !item.imageUrl) throw new Error("This queue item has no printable image.");
    const settings = getResolvedPrintSettings(item);
    openPrintWindowForImage(item.imageUrl, settings.layout, settings.orientation);
  }

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = items.find((candidate) => candidate.id === button.dataset.id);
    if (!item) return;
    try {
      if (button.dataset.action === "toggle-print-settings") {
        const key = String(item.id);
        if (expandedPrintSettings.has(key)) expandedPrintSettings.delete(key);
        else expandedPrintSettings.add(key);
        render();
        return;
      }
      if (button.dataset.action === "reset-print-settings") {
        clearPrintOverride(item);
        render();
        return;
      }
      if (button.dataset.action === "print") printQueueItem(item);
      if (button.dataset.action === "paid") await updateItem(item.id, { paymentStatus: "paid" });
      if (button.dataset.action === "printed") await updateItem(item.id, { printStatus: "printed" });
      if (button.dataset.action === "reprint") {
        await updateItem(item.id, { printStatus: "reprint" });
        printQueueItem(item);
      }
      if (button.dataset.action === "void" && window.confirm("Void this queue item?")) await removeItem(item.id);
    } catch (error) {
      window.alert(error.message || "Queue action failed.");
    }
  });

  list.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-print-setting]");
    if (!select) return;
    const item = items.find((candidate) => candidate.id === select.dataset.id);
    if (!item) return;
    setPrintOverride(item, { [select.dataset.printSetting]: select.value });
    render();
  });

  document.getElementById("refreshQueue").addEventListener("click", loadQueue);
  if (tokenButton) tokenButton.addEventListener("click", () => {
    const value = window.prompt("Staff access token (stored only for this browser session):", sessionStorage.getItem(TOKEN_KEY) || "");
    if (value === null) return;
    if (value.trim()) sessionStorage.setItem(TOKEN_KEY, value.trim());
    else sessionStorage.removeItem(TOKEN_KEY);
  });
  if (layoutInput) {
    layoutInput.value = getPrintLayout();
    layoutInput.addEventListener("change", () => {
      setPrintLayout(layoutInput.value);
      render();
    });
  }
  if (orientationInput) {
    orientationInput.value = getPrintOrientation();
    orientationInput.addEventListener("change", () => {
      setPrintOrientation(orientationInput.value);
      render();
    });
  }
  eventInput.value = eventId;
  eventInput.addEventListener("change", loadQueue);
  window.openPrintWindowForImage = openPrintWindowForImage;
  window.printQueueItem = printQueueItem;
  loadPrintOverrides();
  loadQueue();
  window.setInterval(loadQueue, REFRESH_MS);
})();
