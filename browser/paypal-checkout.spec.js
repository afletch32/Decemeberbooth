const { test, expect } = require("@playwright/test");

test("admin reports live PayPal checkout and server price", async ({ page }) => {
  await page.route("**/api/paypal/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      configured: true,
      environment: "live",
      amount: "3.00",
      currency: "USD",
      clientId: "public-client-id",
    }),
  }));

  await page.goto("/index.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#paypalPrintConfigStatus"))
    .toHaveText("PayPal live checkout ready · 3.00 USD per print.");
  await expect(page.locator("#paypalPrintCheckout")).toBeAttached();
});
