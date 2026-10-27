const { test, expect } = require("@playwright/test");
const { existsSync } = require("node:fs");
const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Exercise the actual still-photo path; testMode=booth bypasses capture.
test.use({ launchOptions: {
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(systemChrome) ? systemChrome : undefined),
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
}, permissions: ["camera"] });

for (const viewport of [{ width: 1024, height: 1366 }, { width: 1366, height: 1024 }, { width: 390, height: 844 }]) {
  test(`still photo launch, camera, preview and QR at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    const errors = [];
    let manifests = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (new URL(request.url()).pathname === "/fonts.json") manifests++; });
    await page.route("**/api/**", (route) => route.request().method() === "GET"
      ? route.continue() : route.fulfill({ json: { ok: true } }));
    await page.route(/^https:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({
      contentType: route.request().resourceType() === "stylesheet" ? "text/css" : "application/javascript", body: "",
    }));
    await page.route("**/scripts/app.js?*", async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace("app.installLifecycle();", `
        window.__launchThemeLoads = 0;
        const measuredLoadTheme = app.loadTheme;
        app.loadTheme = (...args) => { window.__launchThemeLoads++; return measuredLoadTheme(...args); };
        app.installLifecycle();
      `);
      await route.fulfill({ response, body });
    });
    await page.addInitScript(() => {
      localStorage.setItem("photoboothLastThemeKey", "general:backToSchool");
      localStorage.setItem("photoboothInstantCapture", "true");
      localStorage.setItem("photoboothRemoteSync", "false");
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__photoboothTest);
    expect(await page.title()).toBeTruthy();
    const launch = await page.evaluate(async () => {
      window.__launchThemeLoads = 0;
      const start = performance.now();
      await window.startBooth();
      return { ms: performance.now() - start, loads: window.__launchThemeLoads };
    });
    expect(launch.loads).toBe(1);
    await expect(page.locator("#boothScreen")).toBeVisible();
    await page.waitForFunction(() => document.querySelector("#video").videoWidth > 0);
    await page.waitForFunction(() => document.querySelector("#livePreviewCanvas").dataset.ready === "true");
    await page.locator("#startButton").evaluate((button) => button.click());
    await expect(page.locator("#welcomeOverlay")).toHaveAttribute("data-step", "mode");
    await expect(page.locator("#welcomeScreen")).not.toHaveClass(/welcome-transitioning/);
    await page.locator('[data-welcome-mode="still-photo"]').evaluate((button) => button.click());
    await expect(page.locator("#captureBtn")).toBeVisible();
    const started = Date.now();
    await page.locator("#captureBtn").click({ force: true });
    await expect(page.locator("#finalPreview")).toHaveClass(/show/, { timeout: 20000 });
    await expect(page.locator("#finalStrip")).toBeVisible();
    await expect(page.locator("#qrCodeContainer")).toHaveAttribute("data-ready", "true");
    expect(manifests).toBe(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/tmp/booth-speed-${viewport.width}.png` });
    console.log(JSON.stringify({ viewport, launchMs: launch.ms, captureToQrMs: Date.now() - started, manifests, themeLoads: launch.loads }));
    await page.locator("#finishBoothBtn").click({ force: true });
    await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
  });
}
