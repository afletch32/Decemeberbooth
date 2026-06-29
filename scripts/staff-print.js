(() => {
  "use strict";
  const REFRESH_MS = 5000;
  const TOKEN_KEY = "photoboothStaffPrintToken";
  const eventInput = document.getElementById("eventId");
  const list = document.getElementById("queueList");
  const status = document.getElementById("queueStatus");
  const query = new URLSearchParams(window.location.search);
  let eventId = query.get("eventId") || "default";
  let items = [];

  function cleanEventId(value) {
    return String(value || "default").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "default";
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
    if (!visible.length) {
      list.innerHTML = '<div class="empty">No queued photos for this event.</div>';
      return;
    }
    list.innerHTML = visible.map((item) => {
      const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
      const printed = item.printStatus === "printed" || item.printStatus === "reprint";
      return `<article class="queue-item">
        <img src="${escapeText(item.thumbnailUrl || item.imageUrl)}" alt="Queued photo created ${escapeText(createdAt(item.createdAt))}">
        <div>
          <h2>Queued photo · Qty ${escapeText(quantity)}</h2>
          <p class="metadata">Event ${escapeText(item.eventId || eventId)} · ${escapeText(createdAt(item.createdAt))}</p>
          <span class="badge ${escapeText(item.printStatus)}">${escapeText(label(item.printStatus))}</span>
          <span class="badge ${escapeText(item.paymentStatus)}">${escapeText(label(item.paymentStatus))}</span>
          <div class="queue-item-actions" style="margin-top:12px">
            <button type="button" data-action="print" data-id="${escapeText(item.id)}">Open/Print</button>
            <button type="button" data-action="printed" data-id="${escapeText(item.id)}">Mark Printed</button>
            <button type="button" data-action="reprint" data-id="${escapeText(item.id)}" ${printed ? "" : "disabled"}>Reprint</button>
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
    if (!response.ok) throw new Error(payload.error || "Could not update queue item.");
    await loadQueue();
  }

  async function removeItem(id) {
    const response = await fetch(`/api/print-queue/${encodeURIComponent(id)}?eventId=${encodeURIComponent(eventId)}`, { method: "DELETE", headers: staffHeaders() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not remove queue item.");
    await loadQueue();
  }

  function openPrintWindowForImage(imageUrl) {
    const popup = window.open("", "_blank");
    if (!popup) throw new Error("Allow pop-ups to print this photo.");
    popup.opener = null;
    const safeUrl = String(imageUrl).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    popup.document.write(`<!doctype html><html><head><title>Print Photo</title><style>@page { size: 4in 6in; margin: 0; } html,body { width:4in; height:6in; margin:0; background:#fff; } body { display:grid; place-items:center; } img { width:100%; height:100%; object-fit:contain; display:block; }</style></head><body><img src="${safeUrl}" alt="Photo to print"><script>const image=document.querySelector("img"); image.addEventListener("load",()=>{ window.focus(); window.print(); });<\/script></body></html>`);
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
  document.getElementById("setToken").addEventListener("click", () => {
    const value = window.prompt("Staff access token (stored only for this browser session):", sessionStorage.getItem(TOKEN_KEY) || "");
    if (value === null) return;
    if (value.trim()) sessionStorage.setItem(TOKEN_KEY, value.trim());
    else sessionStorage.removeItem(TOKEN_KEY);
  });
  eventInput.value = eventId;
  eventInput.addEventListener("change", loadQueue);
  window.openPrintWindowForImage = openPrintWindowForImage;
  window.printQueueItem = printQueueItem;
  loadQueue();
  window.setInterval(loadQueue, REFRESH_MS);
})();
