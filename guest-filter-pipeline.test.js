const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { readAppSource } = require("./test-utils/app-source.cjs");

let createCaptureFlowModule;
let createImagingModule;

test.before(async () => {
  ({ createImagingModule } = await import("./scripts/app/booth/imaging.mjs"));
  ({ createCaptureFlowModule } = await import("./scripts/app/booth/capture-flow.mjs"));
});

test("preview and capture apply the same selected preset, including beauty", async () => {
  const calls = [];
  const { processCanvasThroughImagingPipeline: process } = createImagingModule({
    applySelectedFilterToCanvas: (canvas) => {
      calls.push("filter");
      canvas.value += 10;
      return canvas;
    },
    applySelectedBeautyToCanvas: async (canvas) => {
      calls.push("beauty");
      canvas.value *= 2;
      return canvas;
    },
    getAiBackgroundEnabled: () => false,
    getGreenScreenEnabled: () => false,
  });
  const preview = await process({ value: 0 }, { preview: true });
  const capture = await process({ value: 0 });
  assert.equal(preview.value, 20);
  assert.equal(capture.value, preview.value);
  assert.deepEqual(calls, ["filter", "beauty", "filter", "beauty"]);
});

test("finalizers process raw photos once and preserve processed capture pixels", async () => {
  let passes = 0;
  const { ensureGuestPhotoProcessed: ensure } = createCaptureFlowModule({
    processCanvasThroughImagingPipeline: async (canvas) => {
      passes++;
      canvas.value += 10;
      return canvas;
    },
  });
  const photo = { value: 20 };
  assert.equal(await ensure(photo), photo);
  assert.equal(await ensure(photo), photo);
  assert.equal(photo.value, 30);
  assert.equal(passes, 1);
  const capture = { value: 42, __processedByLiveImagingPipeline: true };
  assert.equal(await ensure(capture), capture);
  assert.equal(capture.value, 42);
  assert.equal(passes, 1);
  assert.equal(await ensure(null), null);
});

test("the retired enhancement control and saved setting cannot add a second pass", () => {
  const app = readAppSource();
  const html = readFileSync("index.html", "utf8");
  assert.ok(!html.includes("enhancementModeSelect"));
  assert.ok(!app.includes("photoboothEnhancementMode"));
  assert.ok(!app.includes("applyAutoEnhanceCanvas"));
  assert.ok(!app.includes("ENHANCEMENT_MODE_CONFIG"));
});
