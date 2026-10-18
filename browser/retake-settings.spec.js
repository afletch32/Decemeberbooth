const { test } = require("@playwright/test");
const assert = require("node:assert/strict");

function boothTestUrl() {
  const url = new URL(process.env.BOOTH_QA_URL || "http://127.0.0.1:4321/");
  url.searchParams.set("testMode", "booth");
  return url.toString();
}

test("retake preference is remembered and hidden from the guest final screen", async ({ page }) => {
  await page.goto(boothTestUrl(), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__photoboothQA);
  await page.locator("#allowRetakes").evaluate((toggle) => {
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => localStorage.getItem("photoboothAllowRetakes")), "false");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__photoboothQA && !!document.querySelector("#allowRetakes"));
  assert.equal(await page.evaluate(() => document.querySelector("#allowRetakes").checked), false);
  const retakeButtonDisplay = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    canvas.getContext("2d").fillRect(0, 0, canvas.width, canvas.height);
    window.__photoboothQA.showFinal(canvas.toDataURL(), { skipShare: true });
    return getComputedStyle(document.querySelector("#reviewRetakeBtn")).display;
  });
  assert.equal(retakeButtonDisplay, "none");
});
