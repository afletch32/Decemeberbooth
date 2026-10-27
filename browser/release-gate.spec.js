const { test, expect } = require("@playwright/test");

// Keep these GPU/media-heavy flows sequential even with fullyParallel enabled.
test.describe.configure({ mode: "default" });

// Back to School has no photo overlays/templates and is intentionally hidden by
// the existing completed-theme filter. Exercise every currently selectable pack.
const APPROVED_THEMES = [
  "general:averyBirthday",
  "general:summer",
  "fall:halloween",
  "fall:cuteHalloween",
  "school:hawks",
  "school:hawksTitansStadium",
  "school:hawksCheer",
  "school:ane",
  "school:streamNight",
];

test.beforeEach(async ({ page }) => {
  // A release gate must not mutate shared settings or race a remote catalog merge.
  await page.addInitScript(() => localStorage.setItem("photoboothRemoteSync", "false"));
  await page.route("**/api/**", (route) => route.request().method() === "GET"
    ? route.continue() : route.fulfill({ json: { ok: true } }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

for (const orientation of ["portrait", "landscape"]) {
  for (const themeKey of APPROVED_THEMES) {
    test(`${themeKey} guest flow works in ${orientation}`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      // Restore the pack under test directly instead of loading Summer first.
      await page.addInitScript((key) => localStorage.setItem("photoboothLastThemeKey", key), themeKey);
      await page.setViewportSize(orientation === "portrait"
        ? { width: 1024, height: 1366 } : { width: 1366, height: 1024 });
      await page.goto(`/?testMode=booth&releaseGate=${themeKey}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(() => !!window.__photoboothTest);
      await page.evaluate(({ themeKey: selectedTheme, orientation: selectedOrientation }) => {
        for (const [selector, value] of [
          ["#createPathThemeSelect", selectedTheme],
          ["#guestScreenOrientation", selectedOrientation],
        ]) {
          const select = document.querySelector(selector);
          if (!select) throw new Error(`Missing ${selector}`);
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, { themeKey, orientation });
      await page.evaluate(() => window.__photoboothQA.enterState("welcome"));
      await expect.poll(() => page.evaluate(() => window.__photoboothTest.getSelectedThemeKey())).toBe(themeKey);

      await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
      await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
      if (themeKey === "school:hawksCheer") {
        const hotspot = await page.locator("#startButton").evaluate((button) => {
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return {
            width: rect.width,
            height: rect.height,
            backgroundImage: style.backgroundImage,
            color: style.color,
            hotspotMode: button.closest("#welcomeScreen").classList.contains("artwork-start-hotspot-screen"),
          };
        });
        expect(hotspot.hotspotMode).toBe(true);
        expect(hotspot.width).toBeGreaterThanOrEqual(48);
        expect(hotspot.height).toBeGreaterThanOrEqual(48);
        expect(hotspot.backgroundImage).toBe("none");
        expect(hotspot.color).toBe("rgba(0, 0, 0, 0)");
      }
      await page.locator("#startButton").evaluate((button) => button.click());
      await expect(page.locator("#welcomeOverlay")).toHaveAttribute(
        "data-step",
        "mode"
      );
      await expect(page.locator("#welcomeScreen")).not.toHaveClass(
        /welcome-transitioning/
      );
      await expect(
        page.locator('.welcome-mode-btn[data-welcome-mode="still-photo"]')
      ).toBeVisible();
      await page
        .locator('.welcome-mode-btn[data-welcome-mode="still-photo"]')
        .evaluate((button) => button.click());
      await expect(page.locator("#boothScreen")).not.toHaveClass(
        /welcome-active/
      );
      await expect(page.locator("#captureBtn")).toBeVisible();
      await page.locator("#captureBtn").click({ force: true });
      await expect(page.locator("#finalPreview")).toHaveClass(/show/);
      await expect(page.locator("#qrCodeContainer")).toHaveAttribute("data-ready", "true");
      await expect(page.locator("#finishBoothBtn")).toBeVisible();
      await page.locator("#finishBoothBtn").click();
      await expect(page.locator("#finalPreview")).not.toHaveClass(/show/);
      await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
      expect(errors).toEqual([]);
    });
  }
}
