const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("template rendering logic preserves photo overlays across strip mode and supports strip aliases", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");
  const finalPreviewCss = readProjectFile("final-preview-sizing-fix.css");

  assert.ok(
    appScript.includes('let lastPhotoOverlay = null;'),
    "photo overlay state should survive mode switches"
  );
  assert.ok(
    appScript.includes('if (selectedOverlay) lastPhotoOverlay = selectedOverlay;'),
    "switching away from photo mode should preserve the selected overlay"
  );
  assert.ok(
    appScript.includes('if (captureMode === "photo") {'),
    "returning to photo mode should restore the selected overlay"
  );
  assert.ok(
    appScript.includes('value === "photo-strip-3" || value === "strip-3" || value === "strip"'),
    "strip aliases should normalize to the supported strip layout"
  );
  assert.ok(
    appScript.includes('renderDoubleColumn(c, enhancedPhotos, bg, template, rows);'),
    "duplicated strip templates should render in print-sheet mode"
  );
  assert.ok(
    appScript.includes("drawTemplateTextFields("),
    "rendering should support manifest-driven autofill text fields"
  );
  assert.ok(
    appScript.includes("overlayDefinition && overlayDefinition.textFields"),
    "single photo rendering should resolve overlay autofill metadata"
  );
  assert.ok(
    appScript.includes('ctx.drawImage(overlayToDraw, 0, 0, canvas.width, canvas.height);'),
    "single-photo overlays should fill the print canvas exactly"
  );
  assert.ok(
    appScript.includes("const PRINT_SIZES = {") &&
      appScript.includes("landscape: { width: 1800, height: 1200, aspect: 3 / 2") &&
      appScript.includes("portrait: { width: 1200, height: 1800, aspect: 2 / 3"),
    "single-photo exports should use true 4x6 300 DPI print sizes"
  );
  assert.ok(
    appScript.includes("const { canvas: c, ctx, size } = createPrintCanvas(orientation);"),
    "single-photo finalization should use the shared print canvas helper"
  );
  assert.ok(
    finalPreviewCss.includes("object-fit: fill;"),
    "live overlay preview should fill the frame"
  );
  assert.ok(
    html.includes("#liveOverlay {\n      -webkit-transform: none;\n      transform: none;"),
    "live overlay preview should not inherit camera zoom scaling"
  );
});

test("wedding templates use transparent photo windows", () => {
  const gardenStrip = readProjectFile("assets", "wedding", "garden-vows", "templates", "garden-vows-strip-template.svg");
  const gardenSingle = readProjectFile("assets", "wedding", "garden-vows", "templates", "garden-vows-single-template.svg");
  const timelessStrip = readProjectFile("assets", "wedding", "timeless-romance", "templates", "timeless-romance-strip-template.svg");
  const timelessSingle = readProjectFile("assets", "wedding", "timeless-romance", "templates", "timeless-romance-single-template.svg");

  assert.ok(gardenStrip.includes('width="540" height="382" rx="6" fill="none"'));
  assert.ok(gardenSingle.includes('width="1492" height="570" rx="8" fill="none"'));
  assert.ok(timelessStrip.includes('width="548" height="380" rx="4" fill="none"'));
  assert.ok(timelessSingle.includes('width="1504" height="558" rx="6" fill="none"'));
});

test("final preview clears temporary capture overlays before display", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function resetTransientCaptureOverlays(options = {})") &&
      appScript.includes("keepFinalStrip") &&
      appScript.includes("keepFinalLive"),
    "final preview should be able to preserve the final media while clearing transient layers"
  );
  assert.ok(
    appScript.includes("const revealFinalPreview = () => {") &&
      appScript.includes("resetTransientCaptureOverlays({") &&
      appScript.includes("keepFinalStrip: true") &&
      appScript.includes("keepFinalLive: useLiveClip") &&
      appScript.includes("const offline = offlineModeActive();") &&
      appScript.includes("if (img) img.classList.add(\"hidden\");") &&
      appScript.includes("img.classList.toggle(\"hidden\", useLiveClip);") &&
      appScript.includes("img.onload = () => {") &&
      appScript.includes("revealFinalPreview();"),
    "final preview should wait for the image load before revealing the share shell"
  );
});

test("strip capture keeps the template preview cleared until the completed strip is shown", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const stripStart = appScript.indexOf("async function runStripSequence(template)");
  const stripEnd = appScript.indexOf("function delay(ms)", stripStart);
  const stripFlow = appScript.slice(stripStart, stripEnd);

  assert.ok(
    stripFlow.includes("enterFinalizingState(stripUrl);") &&
      stripFlow.indexOf("enterFinalizingState(stripUrl);") <
        stripFlow.indexOf("const uploadResult = await uploadCaptureOnce") &&
      stripFlow.indexOf("restorePreviewState(previewState);") >
        stripFlow.indexOf("const uploadResult = await uploadCaptureOnce"),
    "strip flow should not restore an empty template preview while its final image is uploading"
  );
});

test("photo capture freezes the completed print while upload is prepared", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");
  const photoStart = appScript.indexOf("async function capturePhotoFlow()");
  const photoEnd = appScript.indexOf("async function captureMessageFlow()", photoStart);
  const photoFlow = appScript.slice(photoStart, photoEnd);

  assert.ok(
    photoFlow.includes("const finalUrl = await finalizeToPrint(photo, selectedOverlay);") &&
      photoFlow.indexOf("enterFinalizingState(finalUrl);") >
        photoFlow.indexOf("const finalUrl = await finalizeToPrint(photo, selectedOverlay);") &&
      photoFlow.indexOf("enterFinalizingState(finalUrl);") <
        photoFlow.indexOf("const uploadResult = await uploadCaptureOnce"),
    "single-photo capture should show the composed print before upload begins"
  );
  assert.ok(
    appScript.includes("function enterFinalizingState(finalUrl)") &&
      appScript.includes("DOM.finalStrip.src = finalUrl;") &&
      appScript.includes("DOM.finalStrip.onload = reveal;"),
    "the finalizing state should use the fully composed final image"
  );
  assert.ok(
    html.includes("#boothScreen.finalizing-mode #finalPreview {") &&
      html.includes("#boothScreen.finalizing-mode #finalPreviewActions,") &&
      html.includes("#boothScreen.finalizing-mode #finalPreviewButtons"),
    "the finalizing state should show the finished image without share controls"
  );
});
