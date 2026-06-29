const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("mobile photo flow freezes the captured frame after countdown", () => {
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    appScript.includes("function freezeCapturePreview(photoCanvas)") &&
      appScript.includes("freezeCapturePreview(shot)") &&
      appScript.includes("showPreviewFreezeFrame(stillUrl)") &&
      appScript.includes("let capturePreviewFrozen = false") &&
      appScript.includes("capturePreviewFrozen = true") &&
      appScript.includes("!options.allowLiveDuringFreeze"),
    "countdown capture should freeze the still frame for classic and slotted previews"
  );
});

test("frame chooser is hidden during countdown and finalizing on desktop and mobile", () => {
  const appScript = readProjectFile("scripts/app.js");
  const html = readProjectFile("index.html");

  assert.ok(
    appScript.includes('!DOM.boothScreen.classList.contains("finalizing-mode")') &&
      appScript.includes("setMobileSettingsOpen(false);") &&
      appScript.includes("function enterFinalizingState(finalUrl)"),
    "frame settings should close and stay unavailable while finalizing"
  );
  assert.ok(
    html.includes("#boothScreen.finalizing-mode #mobileSettingsToggle,") &&
      html.includes("#boothScreen.finalizing-mode #mobileSettingsBackdrop,") &&
      html.includes("#boothScreen.finalizing-mode #mobileSettingsSheet,"),
    "desktop and mobile frame settings UI should be hidden during finalizing"
  );
});

test("live photo controls honor the admin toggle", () => {
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    appScript.includes('buttonMode === "live-photo" && !getLivePhotoEnabled()') &&
      appScript.includes('setMode("still-photo")') &&
      appScript.includes('mode === "live-photo" && getLivePhotoEnabled()'),
    "live photo button, mode fallback, and capture should respect the live-photo toggle"
  );
});
