import {
  findPrintItem,
  getPayPalAccessToken,
  getPayPalEventConfig,
  jsonResponse,
  paypalRequest,
  savePrintItem,
  verifyPayPalCapture,
} from "./_shared.js";

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  if (!env || !env.THEMES_KV) return jsonResponse({ ok: false, error: "Print queue storage is unavailable." }, 503);

  try {
    const body = await request.json();
    const { eventId, items, item, index } = await findPrintItem(env, body.eventId, body.printItemId);
    const orderId = String(body.orderId || "").trim();
    if (!item || !orderId || item.paypalOrderId !== orderId) {
      return jsonResponse({ ok: false, error: "This PayPal order does not match the queued print." }, 404);
    }
    if (item.paymentStatus === "paid") return jsonResponse({ ok: true, paid: true });
    if (item.paymentRequired === false || item.printStatus === "void") {
      return jsonResponse({ ok: false, error: "This print is no longer payable." }, 409);
    }

    const config = await getPayPalEventConfig(env, eventId);
    if (!config.configured) return jsonResponse({ ok: false, error: "PayPal checkout is not configured yet." }, 503);
    const accessToken = await getPayPalAccessToken(config);
    const capture = await paypalRequest(
      config,
      accessToken,
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: "POST",
        headers: { "PayPal-Request-Id": `capture-${String(item.id).slice(0, 31)}` },
        body: "{}",
      }
    );
    const completedCapture = verifyPayPalCapture(capture, { orderId, eventId, item, config });
    if (!completedCapture) {
      return jsonResponse({ ok: false, error: "PayPal has not confirmed the full payment for this print." }, 409);
    }

    item.paymentStatus = "paid";
    item.paidAt = new Date().toISOString();
    item.paypalCaptureId = completedCapture.id || "";
    await savePrintItem(env, eventId, items, index, item);
    return jsonResponse({ ok: true, paid: true, captureId: item.paypalCaptureId });
  } catch (error) {
    console.error("PayPal capture failed", error && error.message);
    return jsonResponse({ ok: false, error: error.message || "Could not confirm PayPal payment." }, 502);
  }
}
