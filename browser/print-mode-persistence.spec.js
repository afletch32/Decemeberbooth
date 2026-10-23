const { test } = require("@playwright/test");
const assert = require("node:assert/strict");

function boothTestUrl() {
  const url = new URL(process.env.BOOTH_QA_URL || "http://127.0.0.1:4321/");
  url.searchParams.set("testMode", "booth");
  return url.toString();
}

test("Digital Only saves immediately and does not show a print price to guests", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("photoboothPrintSettings")) {
      localStorage.setItem("photoboothPrintSettings", JSON.stringify({ mode: "paid", eventId: "qa-print-mode" }));
    }
  });
  await page.goto(boothTestUrl(), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.priceVisibilityBound === "true");
  await page.locator("#printModeInput").evaluate((select) => {
    select.value = "off";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem("photoboothPrintSettings")).mode),
    "off"
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.priceVisibilityBound === "true");
  assert.equal(await page.evaluate(() => document.querySelector("#printModeInput").value), "off");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    canvas.getContext("2d").fillRect(0, 0, canvas.width, canvas.height);
    window.__photoboothQA.showFinal(canvas.toDataURL(), { skipShare: true });
  });
  const finalPrintState = await page.evaluate(() => ({
    controlsHidden: document.querySelector("#finalPrintActions").classList.contains("hidden"),
    priceHidden: document.querySelector("#printPriceNotice").classList.contains("hidden"),
    priceText: document.querySelector("#printPriceNotice").textContent,
  }));
  assert.deepEqual(finalPrintState, { controlsHidden: true, priceHidden: true, priceText: "" });
});
