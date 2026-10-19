const { test, expect } = require("@playwright/test");

test("empty session default preview follows portrait and landscape paper settings", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("photoboothStaffPrintOrientation", "portrait");
  });
  await page.route("**/api/print-queue?eventId=qa-preview", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, items: [] }),
    })
  );

  await page.goto("/staff-print.html?eventId=qa-preview", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#queueStatus")).toContainText("0 active items");
  await expect(page.locator("#printPreviewSheet")).toHaveClass(
    /print-preview-sheet portrait single/
  );

  await page.locator("#printOrientation").selectOption("landscape");

  await expect(page.locator("#printPreviewSheet")).toHaveClass(
    /print-preview-sheet landscape single/
  );
  await expect(page.locator("#printPreviewSummary")).toContainText(
    "landscape 6×4"
  );
});
