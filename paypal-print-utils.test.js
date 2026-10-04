const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPayPalPrintOrder,
  resolvePayPalEventPrintPrice,
  resolvePayPalPrintConfig,
  verifyPayPalCapture,
} = require("./scripts/paypal-print-utils.mjs");

test("PayPal checkout defaults to sandbox and the configured booth print price", () => {
  const config = resolvePayPalPrintConfig({
    PAYPAL_CLIENT_ID: "public-client-id",
    PAYPAL_CLIENT_SECRET: "secret",
  });

  assert.equal(config.environment, "sandbox");
  assert.equal(config.apiBase, "https://api-m.sandbox.paypal.com");
  assert.equal(config.amount, "3.00");
  assert.equal(config.configured, true);
});

test("event print prices resolve per saved event and safely use the default otherwise", () => {
  const events = [
    { id: "wedding-1", printPrice: 5.5 },
    { id: "school-event", printPrice: 0 },
  ];

  assert.equal(resolvePayPalEventPrintPrice(events, "wedding-1", "3.00"), "5.50");
  assert.equal(resolvePayPalEventPrintPrice(events, "other-event", "3.00"), "3.00");
  assert.equal(resolvePayPalEventPrintPrice(events, "school-event", "3.00"), "3.00");
});

test("PayPal live mode uses the live API and requires both credentials", () => {
  const missingSecret = resolvePayPalPrintConfig({
    PAYPAL_ENV: "live",
    PAYPAL_CLIENT_ID: "live-client-id",
  });
  assert.equal(missingSecret.environment, "live");
  assert.equal(missingSecret.apiBase, "https://api-m.paypal.com");
  assert.equal(missingSecret.configured, false);

  const config = resolvePayPalPrintConfig({
    PAYPAL_ENV: "live",
    PAYPAL_CLIENT_ID: "live-client-id",
    PAYPAL_CLIENT_SECRET: "secret",
    PAYPAL_PRINT_AMOUNT: "4.50",
    PAYPAL_CURRENCY: "USD",
  });
  assert.equal(config.configured, true);
  assert.equal(config.amount, "4.50");
});

test("PayPal orders use server price and bind the print item and event", () => {
  const order = buildPayPalPrintOrder({
    eventId: "summer-fair",
    item: { id: "print-123", quantity: 2, paypalUnitAmount: "4.50" },
    config: { amount: "3.00", currency: "USD" },
  });

  assert.equal(order.intent, "CAPTURE");
  assert.equal(order.purchase_units[0].reference_id, "summer-fair");
  assert.equal(order.purchase_units[0].custom_id, "print-123");
  assert.deepEqual(order.purchase_units[0].amount, { currency_code: "USD", value: "9.00" });
});

test("PayPal captures must match the queued item, event, amount, and currency", () => {
  const item = { id: "print-123", quantity: 2, paypalAmount: "6.00", paypalCurrency: "USD" };
  const config = { amount: "3.00", currency: "USD" };
  const order = {
    id: "order-123",
    status: "COMPLETED",
    purchase_units: [{
      reference_id: "summer-fair",
      custom_id: "print-123",
      payments: { captures: [{
        id: "capture-123",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "6.00" },
      }] },
    }],
  };

  assert.equal(verifyPayPalCapture(order, { orderId: "order-123", eventId: "summer-fair", item, config }).id, "capture-123");
  assert.equal(verifyPayPalCapture(order, { orderId: "other-order", eventId: "summer-fair", item, config }), null);
  assert.equal(verifyPayPalCapture(order, { orderId: "order-123", eventId: "other-event", item, config }), null);
  assert.equal(verifyPayPalCapture({ ...order, status: "PENDING" }, { orderId: "order-123", eventId: "summer-fair", item, config }), null);
});
