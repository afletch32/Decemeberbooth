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

test("overlay builder exports persistent transparent photo windows", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");
  const getManifestSlotsBody =
    overlayMaker.match(/function getManifestSlots\(guide\) \{[\s\S]*?\n      \}/)?.[0] ||
    "";

  assert.ok(
    overlayMaker.includes("function getStoredSlots(guide)") &&
      overlayMaker.includes("customSlots = slots;") &&
      overlayMaker.includes("setEditableSlot(getSelectedSlotIndex(), nextSlot, guide);"),
    "custom photo boxes should persist instead of being lost after preview redraw"
  );
  assert.ok(
    getManifestSlotsBody.includes("return getEditableSlots(guide)") &&
      !getManifestSlotsBody.includes('guide.type === "strip"'),
    "single overlays and strip templates should both export photo slot metadata"
  );
  assert.ok(
    overlayMaker.includes('ctx.globalCompositeOperation = "destination-out"') &&
      overlayMaker.includes("cutPhotoWindows(ctx, guide);") &&
      overlayMaker.includes("manifest.foreground = {"),
    "exported overlay/template PNGs should have transparent windows aligned with manifest slots"
  );
});

test("reserved magenta marker creates photo slots and transparent foregrounds", () => {
  const appJs = readProjectFile("scripts", "app.js");

  assert.ok(
    appJs.includes("const RESERVED_PHOTO_MARKER =") &&
      appJs.includes('color: "#ff00ff"') &&
      appJs.includes("function processReservedPhotoMarkerImage(src)") &&
      appJs.includes("function resolveOverlayReservedPhotoMarker(overlay)"),
    "reserved magenta marker support should be centralized in the overlay renderer"
  );
  assert.ok(
    appJs.includes("data[offset + 3] = 0") &&
      appJs.includes("normalizeDetectedMarkerSlot") &&
      appJs.includes("overlay = await resolveOverlayReservedPhotoMarker(overlay)") &&
      appJs.includes("syncOverlayPreviewSurface({ ...options, overlay: resolvedOverlay })"),
    "marker pixels should become transparent and their bounds should drive runtime photo slots"
  );
  assert.ok(
    appJs.includes("color: RESERVED_PHOTO_MARKER.color") &&
      appJs.includes("tolerance: RESERVED_PHOTO_MARKER.tolerance"),
    "legacy spot-mask code should use the same reserved marker color"
  );
});

test("final strip rendering uses manifest photo slots before legacy strip geometry", () => {
  const appJs = readProjectFile("scripts/app.js");

  assert.ok(
    appJs.includes("const explicitPhotoSlots = hasExplicitPhotoSlots(template);"),
    "strip composition should detect exported photoSlots"
  );
  assert.ok(
    appJs.includes("if (explicitPhotoSlots)") &&
      appJs.includes("await renderOverlayToCanvas(") &&
      appJs.includes("{ photos: enhancedPhotos, repeatPhotos: true }"),
    "explicit photoSlots should render through the overlay slot renderer"
  );
  assert.ok(
    appJs.includes("rawManifestPhotoSlots: template && template.photoSlots") &&
      appJs.includes("drawImage: rect"),
    "slot debugging should log raw slots, normalized slots, and draw coordinates"
  );
  assert.ok(
    appJs.includes("normalizeTemplateSlots(template && template.slots, cols)") &&
      appJs.includes("detectTransparentColumnSlots(overlayImage, rows, cols)") &&
      appJs.includes("slot.x * scaleX") &&
      appJs.includes("slot.y * scaleY"),
    "double-column strip rendering should honor template slot coordinates before falling back to standard geometry"
  );
  assert.ok(
    appJs.includes("photoSlots: t.photoSlots") &&
      appJs.includes("background: t.background") &&
      appJs.includes("foreground: t.foreground"),
    "explicit theme templates should preserve Overlay Builder render metadata"
  );
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

test("imported overlays can save a draggable photo window without using the legacy builder", () => {
  const indexHtml = readProjectFile("index.html");
  const appJs = readProjectFile("scripts/app.js");

  assert.ok(indexHtml.includes('id="overlaySlotEditorModal"'));
  assert.ok(indexHtml.includes('id="overlaySlotEditorZone"'));
  assert.ok(appJs.includes("function openOverlaySlotEditor(asset)"));
  assert.ok(appJs.includes("function bindOverlaySlotEditorPointer()"));
  assert.ok(appJs.includes("function saveOverlaySlotEditor()"));
  assert.ok(appJs.includes('photoWindowBtn.textContent = "Adjust Photo Window"'));
  assert.ok(appJs.includes("await updateAssetLibraryItem(asset.id, { photoSlots }, asset)"));
  assert.ok(appJs.includes("replaceSavedPhotoSlotInThemes(asset, photoSlots)"));
  assert.ok(appJs.includes("drawCoverInRect(ctx, img, rect.x, rect.y, rect.w, rect.h, slot.objectPosition)"));
});
