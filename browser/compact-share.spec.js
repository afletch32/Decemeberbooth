const { test, expect } = require("@playwright/test");

// Keep these GPU/media-heavy flows sequential even with fullyParallel enabled.
test.describe.configure({ mode: "default" });

test.use({ baseURL: process.env.BOOTH_QA_URL || "http://127.0.0.1:4321" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("photoboothRemoteSync", "false");
    localStorage.setItem("photoboothLastThemeKey", "general:averyBirthday");
  });
  await page.route("**/api/**", (route) => route.request().method() === "GET"
    ? route.continue() : route.fulfill({ json: { ok: true } }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  for (const showPrintAndHint of [false, true]) {
    test(`share controls fit ${viewport.width}x${viewport.height}, print/hint ${showPrintAndHint}`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.goto("/?testMode=booth&qaState=final", { waitUntil: "domcontentloaded" });
      await expect(page.locator("#qrCodeContainer")).toHaveAttribute("data-ready", "true");
      // Freeze decorative transitions so geometry reflects the settled screen.
      await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
      if (showPrintAndHint) {
        await page.evaluate(() => {
          const hint = document.querySelector("#qrHint");
          hint.textContent = "Save this QR code. Your photo will appear at this link after the booth reconnects.";
          hint.style.display = "block";
          document.querySelector("#finalPrintActions").classList.remove("hidden");
          const price = document.querySelector("#printPriceNotice");
          price.classList.remove("hidden");
          price.textContent = "Print price: $3.00";
        });
      }
      const bounds = await page.evaluate(() => ({
        width: innerWidth, height: innerHeight,
        elements: Object.fromEntries([
          "#finalPreview", "#finalPreviewContent", "#finalStrip", "#finalPreviewActions", "#qrCodeContainer", "#qrCode",
          "#openEventGalleryFromShare", "#reviewRetakeBtn", "#finishBoothBtn",
          ...(document.querySelector("#finalPrintActions").classList.contains("hidden") ? [] : ["#requestPrintBtn", "#printPriceNotice", "#qrHint"]),
        ].map((selector) => {
          const element = document.querySelector(selector);
          return [selector, { ...element.getBoundingClientRect().toJSON(), scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }];
        })),
      }));
      for (const [selector, box] of Object.entries(bounds.elements)) {
        expect(box.left, `${selector} left`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${selector} right`).toBeLessThanOrEqual(bounds.width + 1);
        expect(box.top, `${selector} top`).toBeGreaterThanOrEqual(-1);
        expect(box.bottom, `${selector} bottom`).toBeLessThanOrEqual(bounds.height + 1);
        expect(box.scrollHeight, `${selector} content fits`).toBeLessThanOrEqual(box.clientHeight + 1);
      }
      const qr = bounds.elements["#qrCode"];
      expect(Math.abs(qr.width - qr.height)).toBeLessThanOrEqual(1);
      expect(qr.width).toBeGreaterThanOrEqual(180);
      for (const selector of ["#finishBoothBtn", "#reviewRetakeBtn", "#openEventGalleryFromShare"]) {
        expect(bounds.elements[selector].height).toBeGreaterThanOrEqual(44);
      }
      if (viewport.width === 360 && showPrintAndHint) await page.screenshot({ path: `/tmp/booth-compact-${viewport.width}-${showPrintAndHint}.png`, animations: "disabled" });
      await page.locator("#finishBoothBtn").click();
      await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
      expect(errors).toEqual([]);
    });
  }
}
