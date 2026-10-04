const { test, expect } = require("@playwright/test");

test("admin reports live PayPal checkout and server price", async ({ page }) => {
  await page.route("**/api/paypal/config**", (route) => route.fulfill({
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

test("operator saves one PayPal print price on a saved event", async ({ page }) => {
  const events = [{ id: "wedding", name: "Wedding", date: "2026-10-10", themeKey: "wedding", printPrice: 3 }];
  let savedPrice = 3;
  await page.addInitScript(() => {
    localStorage.setItem("photoboothEvents", JSON.stringify([
      { id: "wedding", name: "Wedding", date: "2026-10-10", themeKey: "wedding", printPrice: 3 },
    ]));
    localStorage.setItem("photoboothActiveEventId", "wedding");
  });
  await page.route("**/api/events**", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events, activeEventId: "wedding" }) });
    }
    const payload = route.request().postDataJSON();
    savedPrice = payload.events.find((event) => event.id === "wedding").printPrice;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/paypal/config**", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      configured: true,
      environment: "live",
      amount: Number(savedPrice).toFixed(2),
      currency: "USD",
      clientId: "public-client-id",
    }),
  }));

  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#eventPrintPriceInput")).toBeEnabled();
  await page.locator("#eventPrintPriceInput").fill("5.50");
  await page.locator("#saveEventPrintPriceBtn").click();

  await expect.poll(() => savedPrice).toBe(5.5);
  await expect(page.locator("#paypalPrintConfigStatus"))
    .toHaveText("PayPal live checkout ready · 5.50 USD per print.");
});
