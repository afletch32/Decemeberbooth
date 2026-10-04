import {
  buildPayPalPrintOrder,
  findPrintItem,
  getPayPalAccessToken,
  getPayPalConfig,
  jsonResponse,
  paypalRequest,
  savePrintItem,
} from "./_shared.js";

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  if (!env || !env.THEMES_KV) return jsonResponse({ ok: false, error: "Print queue storage is unavailable." }, 503);

  try {
    const body = await request.json();
    const { eventId, items, item, index } = await findPrintItem(env, body.eventId, body.printItemId);
    if (!item || item.paymentRequired === false || item.printStatus === "void") {
      return jsonResponse({ ok: false, error: "This print is unavailable for payment." }, 404);
    }
    if (item.paymentStatus === "paid" || item.paymentStatus === "comped") {
      return jsonResponse({ ok: false, error: "This print has already been cleared for printing." }, 409);
    }

    const config = getPayPalConfig(env);
    if (!config.configured) return jsonResponse({ ok: false, error: "PayPal checkout is not configured yet." }, 503);
    const accessToken = await getPayPalAccessToken(config);
    let order;
    if (item.paypalEnvironment && item.paypalEnvironment !== config.environment) {
      delete item.paypalOrderId;
      delete item.paypalAmount;
      delete item.paypalCurrency;
      delete item.paypalEnvironment;
    }
    if (item.paypalOrderId) {
      order = await paypalRequest(config, accessToken, `/v2/checkout/orders/${encodeURIComponent(item.paypalOrderId)}`);
      if (order.status === "COMPLETED") {
        return jsonResponse({ ok: false, error: "Payment was already captured. Refresh the staff print queue." }, 409);
      }
      if (order.status !== "CREATED" && order.status !== "APPROVED") {
        return jsonResponse({ ok: false, error: "The previous checkout expired. Ask the attendant to retry." }, 409);
      }
    } else {
      const idempotencyKey = String(item.id).slice(0, 38);
      order = await paypalRequest(config, accessToken, "/v2/checkout/orders", {
        method: "POST",
        headers: { "PayPal-Request-Id": idempotencyKey },
        body: JSON.stringify(buildPayPalPrintOrder({ eventId, item, config })),
      });
      if (!order.id) throw new Error("PayPal did not return an order ID.");
      item.paypalOrderId = order.id;
      item.paypalAmount = (Number(config.amount) * Math.max(1, Number.parseInt(item.quantity, 10) || 1)).toFixed(2);
      item.paypalCurrency = config.currency;
      item.paypalEnvironment = config.environment;
      await savePrintItem(env, eventId, items, index, item);
    }
    return jsonResponse({ ok: true, orderId: order.id });
  } catch (error) {
    console.error("PayPal order creation failed", error && error.message);
    return jsonResponse({ ok: false, error: error.message || "Could not start PayPal checkout." }, 502);
  }
}
