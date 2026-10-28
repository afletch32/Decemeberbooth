const { test, expect } = require("@playwright/test");

test.use({ baseURL: process.env.BOOTH_QA_URL || "http://127.0.0.1:4321" });

test("Halloween theme frames load their portrait previews", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("photoboothRemoteSync", "false");
    localStorage.setItem("photoboothLastThemeKey", "fall:halloween");
  });
  await page.route("**/api/**", (route) => route.request().method() === "GET"
    ? route.continue() : route.fulfill({ json: { ok: true } }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const select = page.locator("#createPathThemeSelect");
  await page.locator("#uploadedAssetLibraryPanel > summary").click();
  for (const { key, query, source } of [
    {
      key: "fall:halloween",
      query: "ravens and pumpkins",
      source: "halloween-ravens-pumpkin-single-photo-portrait.png",
    },
    {
      key: "fall:cuteHalloween",
      query: "ghost and pumpkin",
      source: "happy-halloween-ghost-pumpkin-single-photo-portrait.png",
    },
  ]) {
    await select.evaluate((element, value) => {
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, key);
    await expect.poll(() => page.evaluate(() => window.__photoboothTest.getSelectedThemeKey())).toBe(key);
    await page.locator("#assetLibrarySearch").fill(query);
    const card = page.locator("#assetLibraryGrid .asset-library-card").first();
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toHaveAttribute("src", new RegExp(source.replace(".png", ".thumb.webp")));
    await expect.poll(() => card.locator("img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.locator("#assetLibrarySearch").fill("");
  }
});
