const ALLOWED_PRINT_STATUSES = new Set(["new", "printed", "reprint", "void"]);
const ALLOWED_PAYMENT_STATUSES = new Set(["unpaid", "paid", "comped"]);

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Staff-Token",
    },
  });
}

function normalizeEventId(value) {
  return String(value || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "default";
}

function validImageUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function queueKey(eventId) {
  return `print-queue:${eventId}`;
}

async function readQueue(env, eventId) {
  const raw = await env.THEMES_KV.get(queueKey(eventId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeQueueItem) : [];
  } catch (_) {
    return [];
  }
}

function normalizeQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(99, quantity));
}

function normalizeQueueItem(item) {
  if (!item || typeof item !== "object") return item;
  let paymentStatus = item.paymentStatus;
  if (paymentStatus === "manual_paid") paymentStatus = "paid";
  if (paymentStatus === "not_required") paymentStatus = "comped";
  if (!ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) {
    paymentStatus = item.paymentRequired === false ? "comped" : "unpaid";
  }
  let printStatus = item.printStatus;
  if (!ALLOWED_PRINT_STATUSES.has(printStatus)) {
    if (item.status === "printed") printStatus = "printed";
    else if (item.status === "removed") printStatus = "void";
    else printStatus = "new";
  }
  return {
    ...item,
    quantity: normalizeQuantity(item.quantity),
    paymentStatus,
    printStatus,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return response({ ok: true });
  if (!env || !env.THEMES_KV) {
    return response({ ok: false, error: "THEMES_KV binding is not configured." }, 500);
  }

  const url = new URL(request.url);
  const eventId = normalizeEventId(url.searchParams.get("eventId"));
  if (request.method === "GET") {
    const items = (await readQueue(env, eventId))
      .filter((item) => item && item.printStatus !== "void")
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return response({
      ok: true,
      eventId,
      items,
      staffAuthRequired: Boolean(String(env.PRINT_QUEUE_STAFF_TOKEN || "").trim()),
    });
  }

  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    const itemEventId = normalizeEventId(body.eventId || eventId);
    const imageUrl = String(body.imageUrl || "").trim();
    if (!validImageUrl(imageUrl)) {
      return response({ ok: false, error: "A public image URL is required for the shared print queue." }, 400);
    }
    const items = await readQueue(env, itemEventId);
    const existing = items.find((item) => item && item.imageUrl === imageUrl && item.printStatus !== "void");
    if (existing) return response({ ok: true, created: false, item: existing });
    const createdAt = new Date().toISOString();
    const paymentRequired = body.paymentRequired !== false;
    const item = {
      id: crypto.randomUUID(),
      eventId: itemEventId,
      imageUrl,
      thumbnailUrl: validImageUrl(body.thumbnailUrl) ? String(body.thumbnailUrl).trim() : imageUrl,
      createdAt,
      quantity: normalizeQuantity(body.quantity),
      paymentStatus: paymentRequired ? "unpaid" : "comped",
      printStatus: "new",
      paymentRequired,
      paidAt: null,
      printedAt: null,
      removedAt: null,
      notes: String(body.notes || "").slice(0, 1000),
    };
    items.unshift(item);
    await env.THEMES_KV.put(queueKey(itemEventId), JSON.stringify(items.slice(0, 500)));
    return response({ ok: true, created: true, item }, 201);
  } catch (err) {
    return response({ ok: false, error: err && err.message ? err.message : "Invalid print queue payload." }, 400);
  }
}

export { ALLOWED_PAYMENT_STATUSES, ALLOWED_PRINT_STATUSES, normalizeEventId, queueKey, readQueue };
