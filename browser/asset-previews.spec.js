const { test, expect } = require("@playwright/test");

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

async function openLibrary(page, search, themeKey = "school:hawksCheer") {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#createPathThemeSelect").evaluate((select, key) => {
    select.value = key;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, themeKey);
  await expect.poll(() => page.evaluate(() => window.__photoboothTest.getSelectedThemeKey())).toBe(themeKey);
  await page.locator("#uploadedAssetLibraryPanel > summary").click();
  await page.locator("#assetLibrarySearch").fill(search);
}

async function expectPreview(card) {
  await expect(async () => {
    await card.scrollIntoViewIfNeeded();
    expect(await card.evaluate((element) => {
      const image = element.querySelector("img");
      return Boolean(image && image.complete && image.naturalWidth > 0);
    })).toBe(true);
  }).toPass({ timeout: 5000 });
  await expect(card.locator(".asset-library-preview-fallback")).toHaveCount(0);
}

test("Hawks library restores the original nine overlay previews", async ({ page }) => {
  await openLibrary(page, "hawks-overlay", "school:hawks");
  const cards = page.locator("#assetLibraryGrid .asset-library-card");
  await expect(cards).toHaveCount(9);
  for (const card of await cards.all()) {
    await expectPreview(card);
    await expect(card.locator("img")).toHaveAttribute("src", /\/assets\/school\/hawks\/overlays\/.*\.thumb\.webp/);
  }
  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/booth-hawks-previews.png", animations: "disabled" });
});

test("missing thumbnails use original artwork and are not retried on re-render", async ({ page }) => {
  let attempts = 0;
  await page.route("**/spring-hill-hawks-cheer-single-photo-portrait-2026.thumb.webp*", (route) => {
    attempts++;
    return route.fulfill({ status: 404, body: "Missing optional thumbnail" });
  });
  await openLibrary(page, "Spring Hill Hawks 2026 Single Photo Portrait");
  const card = page.locator("#assetLibraryGrid .asset-library-card").first();
  await expectPreview(card);
  await expect(card.locator("img")).toHaveAttribute("src", /spring-hill-hawks-cheer-single-photo-portrait-2026\.png/);
  const initialAttempts = attempts;
  expect(initialAttempts).toBeGreaterThan(0);
  await page.locator("#assetLibrarySearch").fill("no matching artwork");
  await expect(page.locator("#assetLibraryGrid .asset-library-card")).toHaveCount(0);
  await page.locator("#assetLibrarySearch").fill("Spring Hill Hawks 2026 Single Photo Portrait");
  await expectPreview(card);
  expect(attempts).toBe(initialAttempts);
});

test("unavailable originals still show a terminal preview error", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("photoboothAssetLibrary", JSON.stringify({ assets: [
    { category: "overlay", url: "/assets/test/missing-preview.png", name: "Missing preview fixture" },
  ] })));
  await page.route("**/assets/test/missing-preview*", (route) => {
    return route.fulfill({ status: 404, body: "Missing artwork" });
  });
  await openLibrary(page, "Missing preview fixture", "general:averyBirthday");
  const card = page.locator("#assetLibraryGrid .asset-library-card").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".asset-library-preview-fallback")).toHaveText("Preview unavailable");
  await expect(card.locator("img")).toHaveCount(0);
});
