import { ALLOWED_PAYMENT_STATUSES, ALLOWED_PRINT_STATUSES, normalizeEventId, queueKey, readQueue } from "../print-queue.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Staff-Token",
    },
  });
}

function staffAuthorized(request, env) {
  const expected = String((env && env.PRINT_QUEUE_STAFF_TOKEN) || "").trim();
  if (!expected) return true;
  const auth = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return auth === expected || request.headers.get("X-Staff-Token") === expected;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") return response({ ok: true });
  if (!env || !env.THEMES_KV) return response({ ok: false, error: "THEMES_KV binding is not configured." }, 500);
  if (!staffAuthorized(request, env)) return response({ ok: false, error: "Staff authorization required." }, 401);
  if (request.method !== "PATCH" && request.method !== "DELETE") return response({ ok: false, error: "Method not allowed." }, 405);

  try {
    const body = request.method === "PATCH" ? await request.json() : {};
    const eventId = normalizeEventId(body.eventId || new URL(request.url).searchParams.get("eventId"));
    const items = await readQueue(env, eventId);
    const id = String(params.id || "");
    const index = items.findIndex((item) => item && item.id === id);
    if (index < 0) return response({ ok: false, error: "Queue item not found." }, 404);
    const now = new Date().toISOString();
    const item = { ...items[index] };
    if (request.method === "DELETE") {
      item.printStatus = "void";
      item.removedAt = now;
    } else {
      if (body.printStatus && !ALLOWED_PRINT_STATUSES.has(body.printStatus)) return response({ ok: false, error: "Invalid print status." }, 400);
      if (body.paymentStatus && !ALLOWED_PAYMENT_STATUSES.has(body.paymentStatus)) return response({ ok: false, error: "Invalid payment status." }, 400);
      if (body.printStatus) item.printStatus = body.printStatus;
      if (body.paymentStatus) item.paymentStatus = body.paymentStatus;
      if (item.paymentStatus === "paid" && !item.paidAt) item.paidAt = now;
      if (item.printStatus === "printed" && !item.printedAt) item.printedAt = now;
      if (typeof body.notes === "string") item.notes = body.notes.slice(0, 1000);
    }
    items[index] = item;
    await env.THEMES_KV.put(queueKey(eventId), JSON.stringify(items.slice(0, 500)));
    return response({ ok: true, item });
  } catch (err) {
    return response({ ok: false, error: err && err.message ? err.message : "Invalid print queue update." }, 400);
  }
}
