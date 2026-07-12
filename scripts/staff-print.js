(() => {
  "use strict";
  const REFRESH_MS = 5000;
  const TOKEN_KEY = "photoboothStaffPrintToken";
  const eventInput = document.getElementById("eventId");
  const layoutInput = document.getElementById("printLayout");
  const orientationInput = document.getElementById("printOrientation");
  const rotationInput = document.getElementById("printRotation");
  const list = document.getElementById("queueList");
  const status = document.getElementById("queueStatus");
  const tokenButton = document.getElementById("setToken");
  const query = new URLSearchParams(window.location.search);
  let eventId = query.get("eventId") || "default";
  let items = [];
  let staffAuthRequired = false;
  const LAYOUT_KEY = "photoboothStaffPrintLayout";
  const ORIENTATION_KEY = "photoboothStaffPrintOrientation";
  const ROTATION_KEY = "photoboothStaffPrintRotation";

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

  function getPrintRotation() {
    const stored = localStorage.getItem(ROTATION_KEY) || "0";
    return ["0", "90", "180", "270"].includes(stored) ? stored : "0";
  }

  function setPrintRotation(value) {
    const next = ["90", "180", "270"].includes(value) ? value : "0";
    localStorage.setItem(ROTATION_KEY, next);
    if (rotationInput) rotationInput.value = next;
    return next;
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

  function render() {
    const visible = items.filter((item) => item.printStatus !== "void");
    status.textContent = `${visible.length} active ${visible.length === 1 ? "item" : "items"} · refreshes every 5 seconds`;
    if (tokenButton) tokenButton.hidden = !staffAuthRequired;
    if (layoutInput && !layoutInput.value) layoutInput.value = getPrintLayout();
    if (orientationInput && !orientationInput.value)
      orientationInput.value = getPrintOrientation();
    if (rotationInput && !rotationInput.value)
      rotationInput.value = getPrintRotation();
    if (!visible.length) {
      list.innerHTML = '<div class="empty">No queued photos for this event.</div>';
      return;
    }
    list.innerHTML = visible.map((item) => {
      const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
      const printed = item.printStatus === "printed" || item.printStatus === "reprint";
      const paymentCleared = item.paymentStatus === "paid" || item.paymentStatus === "comped";
      return `<article class="queue-item">
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
        </div>
      </article>`;
    }).join("");
  }

  async function loadQueue() {
    eventId = cleanEventId(eventInput.value || eventId);
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
    await loadQueue();
  }

  function openPrintWindowForImage(
    imageUrl,
    layout = getPrintLayout(),
    orientation = getPrintOrientation(),
    rotation = getPrintRotation()
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
      ? `<img src="${safeUrl}" alt="Photo to print"><img src="${safeUrl}" alt="Photo to print">`
      : `<img src="${safeUrl}" alt="Photo to print">`;
    popup.document.write(`<!doctype html><html><head><title>Print Photo</title><style id="pageStyle"></style><style>html,body { margin:0; background:#fff; } body { display:grid; place-items:center; } .sheet { display:grid; background:#fff; overflow:hidden; } .sheet img { width:100%; height:100%; object-fit:contain; display:block; background:#fff; } .sheet.rotate-90 img,.sheet.rotate-270 img { width:var(--photo-height); height:var(--photo-width); } .sheet.rotate-90 img { transform:rotate(90deg); } .sheet.rotate-180 img { transform:rotate(180deg); } .sheet.rotate-270 img { transform:rotate(270deg); } .error { padding:16px; font:14px system-ui, sans-serif; color:#7c2222; }</style></head><body><div class="${sheetClass}">${sheetContent}</div><script>const requestedOrientation=${JSON.stringify(orientation)}; const rotation=${JSON.stringify(rotation)}; const images=Array.from(document.querySelectorAll("img")); const sheet=document.querySelector(".sheet"); const printPhoto=()=>{ const first=images[0]; const swaps=rotation==="90"||rotation==="270"; const effectiveLandscape=swaps ? first.naturalHeight>=first.naturalWidth : first.naturalWidth>=first.naturalHeight; const pageOrientation=requestedOrientation==="auto" ? (effectiveLandscape?"landscape":"portrait") : requestedOrientation; const landscape=pageOrientation==="landscape"; const width=landscape?"6in":"4in"; const height=landscape?"4in":"6in"; document.getElementById("pageStyle").textContent="@page { size: "+width+" "+height+"; margin:0; } html,body,.sheet { width:"+width+"; height:"+height+"; } .sheet.double { grid-template-"+(landscape?"columns":"rows")+":1fr 1fr; } .sheet { --photo-width:"+width+"; --photo-height:"+height+"; }"; sheet.classList.add("rotate-"+rotation); window.focus(); setTimeout(()=>window.print(), 80); }; const showError=()=>{ document.body.innerHTML='<p class="error">Photo could not load. Close this tab and try Open/Print again.</p>'; }; let loaded=0; let failed=false; const onLoad=()=>{ loaded += 1; if (!failed && loaded === images.length) printPhoto(); }; const onError=()=>{ failed = true; showError(); }; images.forEach((image)=>{ image.addEventListener("load", onLoad, { once:true }); image.addEventListener("error", onError, { once:true }); if (image.complete) { if (image.naturalWidth > 0) onLoad(); else onError(); } });<\/script></body></html>`);
    popup.document.close();
  }

  function printQueueItem(item) {
    if (!item || !item.imageUrl) throw new Error("This queue item has no printable image.");
    openPrintWindowForImage(item.imageUrl);
  }

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = items.find((candidate) => candidate.id === button.dataset.id);
    if (!item) return;
    try {
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
    });
  }
  if (orientationInput) {
    orientationInput.value = getPrintOrientation();
    orientationInput.addEventListener("change", () => {
      setPrintOrientation(orientationInput.value);
    });
  }
  if (rotationInput) {
    rotationInput.value = getPrintRotation();
    rotationInput.addEventListener("change", () => {
      setPrintRotation(rotationInput.value);
    });
  }
  eventInput.value = eventId;
  eventInput.addEventListener("change", loadQueue);
  window.openPrintWindowForImage = openPrintWindowForImage;
  window.printQueueItem = printQueueItem;
  loadQueue();
  window.setInterval(loadQueue, REFRESH_MS);
})();
