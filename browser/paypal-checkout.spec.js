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
  const events = [{ id: "party", name: "Party", date: "2026-10-10", themeKey: "general:summer", eventType: "party", printPrice: 3 }];
  let savedPrice = 3;
  await page.addInitScript(() => {
    localStorage.setItem("photoboothEvents", JSON.stringify([
      { id: "party", name: "Party", date: "2026-10-10", themeKey: "general:summer", eventType: "party", printPrice: 3 },
    ]));
    localStorage.setItem("photoboothActiveEventId", "party");
    localStorage.setItem("photoboothPrintSettings", JSON.stringify({ mode: "paid", eventId: "party" }));
  });
  await page.route("**/api/events**", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events, activeEventId: "party" }) });
    }
    const payload = route.request().postDataJSON();
    savedPrice = payload.events.find((event) => event.id === "party").printPrice;
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
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.waitForFunction(() =>
    document.documentElement.dataset.priceVisibilityBound === "true"
  );
  await page.locator("#printModeInput").selectOption("paid");
  await page.locator("#printModeInput").dispatchEvent("change");
  await expect(page.locator("#eventPrintPriceSettings")).not.toHaveAttribute("hidden");
  await expect(page.locator("#eventPrintPriceInput")).toBeEnabled();
  await page.locator("#eventPrintPriceInput").fill("5.50");
  await page.locator("#saveEventPrintPriceBtn").click();

  await expect.poll(() => savedPrice).toBe(5.5);
  await expect(page.locator("#paypalPrintConfigStatus"))
    .toHaveText("PayPal live checkout ready · 5.50 USD per print.");
});

test("operator can enable paid printing and set the price during wedding setup", async ({ page }) => {
  await page.route("**/api/events**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ events: [], activeEventId: "" }),
  }));
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.waitForFunction(() =>
    document.documentElement.dataset.priceVisibilityBound === "true"
  );

  await page.locator("#startWeddingSetupBtn").click();
  await expect(page.locator("#printModeSetupField")).toBeVisible();
  await page.locator("#printModeInput").selectOption("paid");
  await expect(page.locator("#eventPrintPriceSettings")).toBeVisible();
  await page.locator("#eventPartner1Input").fill("Alex");
  await page.locator("#eventPartner2Input").fill("Jordan");
  await page.locator("#eventDateInput").fill("2026-12-12");
  await page.locator("#createWeddingEventBtn").click();

  await expect(page.locator("#eventPrintPriceInput")).toBeEnabled();
  await page.locator("#eventPrintPriceInput").fill("7.25");
  await page.locator("#saveEventPrintPriceBtn").click();
  await expect.poll(() => page.evaluate(() =>
    window.__photoboothTest.getActiveEvent()?.printPrice
  )).toBe(7.25);
});

test("guest sees the event print price before checkout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const event = { id: "wedding", name: "Wedding", themeKey: "wedding", printPrice: 5.5 };
  await page.addInitScript(() => {
    localStorage.setItem("photoboothEvents", JSON.stringify([
      { id: "wedding", name: "Wedding", themeKey: "wedding", printPrice: 5.5 },
    ]));
    localStorage.setItem("photoboothActiveEventId", "wedding");
    localStorage.setItem("photoboothPrintSettings", JSON.stringify({ mode: "paid", eventId: "wedding" }));
  });
  await page.route("**/api/events**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ events: [event], activeEventId: event.id }),
  }));
  await page.route("**/api/paypal/config**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      configured: true,
      environment: "live",
      amount: "5.50",
      currency: "USD",
      clientId: "public-client-id",
    }),
  }));

  await page.goto("/index.html?testMode=booth&testPaidPrint=true", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.__photoboothQA.enterState("final");
      requestAnimationFrame(resolve);
    });
  }));

  await expect(page.locator("#finalPreview")).toHaveClass(/show/, { timeout: 15000 });
  await expect(page.locator("#printPriceNotice"))
    .toHaveText("Print price: $5.50");
  await expect(page.locator("#requestPrintBtn")).toBeEnabled();
  await expect(page.locator("#paypalPrintCheckout")).toHaveClass(/hidden/);
  const noticeBounds = await page.locator("#printPriceNotice").boundingBox();
  expect(noticeBounds.x).toBeGreaterThanOrEqual(0);
  expect(noticeBounds.x + noticeBounds.width).toBeLessThanOrEqual(390);
});
