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
      appScript.includes('mode: "still"'),
    "countdown capture should freeze the still frame for classic and slotted previews"
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

test("final print uses event-resolved characters", () => {
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    appScript.includes("const characterSrc = resolveEventCharacter(activeTheme);") &&
      appScript.includes("const charImg = await loadImage(characterSrc);") &&
      !appScript.includes("const charImg = await loadImage(activeTheme.character);"),
    "exports should use the same event/session character resolution as the live preview"
  );
});
