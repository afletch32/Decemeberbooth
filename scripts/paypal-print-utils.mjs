export function resolvePayPalPrintConfig(env = {}) {
  const rawEnvironment = String(env.PAYPAL_ENV || "sandbox").trim().toLowerCase();
  const environment = rawEnvironment === "live" ? "live" : rawEnvironment === "sandbox" ? "sandbox" : "";
  const rawAmount = String(env.PAYPAL_PRINT_AMOUNT || "3.00").trim();
  const amountNumber = Number(rawAmount);
  const amount = Number.isFinite(amountNumber) && amountNumber >= 0.01
    ? amountNumber.toFixed(2)
    : "";
  const currency = String(env.PAYPAL_CURRENCY || "USD").trim().toUpperCase();
  const clientId = String(env.PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || "").trim();
  const configured = Boolean(
    environment && amount && /^[A-Z]{3}$/.test(currency) && clientId && clientSecret
  );

  return {
    environment: environment || "sandbox",
    apiBase: environment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
    clientId,
    clientSecret,
    amount,
    currency,
    configured,
  };
}

export function buildPayPalPrintOrder({ eventId, item, config }) {
  const quantity = Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1));
  const total = (Number(config.amount) * quantity).toFixed(2);
  return {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: String(eventId),
      custom_id: String(item.id),
      description: `Photo booth print${quantity > 1 ? ` × ${quantity}` : ""}`,
      amount: {
        currency_code: config.currency,
        value: total,
      },
    }],
  };
}

export function verifyPayPalCapture(order, { orderId, eventId, item, config }) {
  if (!order || order.id !== orderId || order.status !== "COMPLETED") return null;
  const units = Array.isArray(order.purchase_units) ? order.purchase_units : [];
  for (const unit of units) {
    if (unit.reference_id !== String(eventId) || unit.custom_id !== String(item.id)) continue;
    const captures = unit.payments && Array.isArray(unit.payments.captures)
      ? unit.payments.captures
      : [];
    for (const capture of captures) {
      const quantity = Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1));
      const expectedAmount = item.paypalAmount || (Number(config.amount) * quantity).toFixed(2);
      const expectedCurrency = item.paypalCurrency || config.currency;
      if (
        capture.status === "COMPLETED" &&
        capture.amount &&
        capture.amount.currency_code === expectedCurrency &&
        capture.amount.value === expectedAmount
      ) return capture;
    }
  }
  return null;
}
