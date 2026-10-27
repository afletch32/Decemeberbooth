const { test, expect } = require("@playwright/test");

test("Hawks Cheer tea party assets compose with the correct repeated photos", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("photoboothRemoteSync", "false");
    localStorage.setItem("photoboothLastThemeKey", "school:hawksCheer");
  });
  await page.route("**/api/**", (route) => route.request().method() === "GET"
    ? route.continue() : route.fulfill({ json: { ok: true } }));
  await page.goto("/?testMode=booth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__photoboothTest);
  const results = await page.evaluate(async () => {
    const api = window.__photoboothTest;
    const theme = api.getThemeByKey("school:hawksCheer");
    const assets = [...api.getBaseOverlayList(theme), ...api.getBaseTemplateList(theme)]
      .filter((entry) => entry.src?.includes("tea-party"));
    const results = [];
    for (const asset of assets) {
      const photos = ["#e67593", "#8aa75f", "#ab8ed0"].map((color) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 900;
        const context = canvas.getContext("2d");
        context.fillStyle = color;
        context.fillRect(0, 0, 900, 900);
        return canvas;
      });
      const image = new Image();
      image.src = await api.composeStrip(asset, photos);
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const colors = asset.photoSlots.map((slot) => Array.from(context.getImageData(
        Math.round((slot.x + slot.width / 2) * canvas.width),
        Math.round((slot.y + slot.height * 0.3) * canvas.height), 1, 1
      ).data));
      results.push({ name: asset.name, slots: asset.photoSlots.length, colors });
    }
    return results;
  });
  expect(results).toHaveLength(5);
  expect(results.filter((entry) => entry.slots === 1)).toHaveLength(3);
  for (const result of results) {
    for (const color of result.colors) expect(color[3], result.name).toBe(255);
    if (result.slots === 6) {
      // Antialiased foreground pixels can shift the paired samples slightly.
      for (let row = 0; row < 3; row += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          expect(Math.abs(result.colors[row][channel] - result.colors[row + 3][channel]), result.name).toBeLessThanOrEqual(3);
        }
      }
      expect(new Set(result.colors.slice(0, 3).map(String)).size, result.name).toBe(3);
    }
  }
});
