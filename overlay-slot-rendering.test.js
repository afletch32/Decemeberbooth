const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("overlay preview renders into explicit photo slots", () => {
  const indexHtml = readProjectFile("index.html");
  const appJs = readProjectFile("scripts/app.js");
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(indexHtml.includes('id="overlayBackground"'));
  assert.ok(indexHtml.includes('id="photoSlotLayer"'));
  assert.ok(indexHtml.includes(".photo-slot"));
  assert.ok(indexHtml.includes("overflow: hidden"));

  assert.ok(appJs.includes("function normalizeOverlayDefinition("));
  assert.ok(appJs.includes("function renderOverlayPhotoSlots("));
  assert.ok(appJs.includes("function syncOverlayPreviewSurface("));
  assert.ok(appJs.includes("function drawPhotoSlot("));
  assert.ok(appJs.includes("function renderOverlayToCanvas("));
  assert.ok(overlayMaker.includes("manifest.photoSlots = slots.map((slot) => ({"));
  assert.ok(appJs.includes("photoSlots: normalizeOverlayPhotoSlots"));
});

test("wedding overlay manifests define explicit photo windows", () => {
  const timeless = readProjectFile(
    "assets/wedding/timeless-romance/overlays/overlays.json"
  );
  const garden = readProjectFile("assets/wedding/garden-vows/overlays/overlays.json");

  assert.ok(timeless.includes('"photoSlots"'));
  assert.ok(timeless.includes('"foreground"'));
  assert.ok(timeless.includes('"background"'));
  assert.ok(garden.includes('"photoSlots"'));
  assert.ok(garden.includes('"foreground"'));
  assert.ok(garden.includes('"background"'));
});
