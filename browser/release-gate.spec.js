const { test, expect } = require("@playwright/test");

const APPROVED_THEMES = [
  "general:averyBirthday",
  "general:backToSchool",
  "general:summer",
  "fall:halloween",
  "fall:cuteHalloween",
  "school:ane",
  "school:streamNight",
];

for (const orientation of ["portrait", "landscape"]) {
  test(`approved theme guest flow works in ${orientation}`, async ({ page }) => {
    test.setTimeout(180000);
    for (const themeKey of APPROVED_THEMES) {
      await page.goto(`/index.html?testMode=booth&releaseGate=${themeKey}`, {
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

      await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
      await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
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
      await page.locator("#finishBoothBtn").click({ force: true });
      await expect(page.locator("#finalPreview")).not.toHaveClass(/show/);
      await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
    }
  });
}
