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

  assert.ok(
    appScript.includes('let lastPhotoOverlay = null;'),
    "photo overlay state should survive mode switches"
  );
  assert.ok(
    appScript.includes('if (selectedOverlay) lastPhotoOverlay = selectedOverlay;'),
    "switching away from photo mode should preserve the selected overlay"
  );
  assert.ok(
    appScript.includes('if (mode === "photo" && !selectedOverlay && lastPhotoOverlay) {'),
    "returning to photo mode should restore the selected overlay"
  );
  assert.ok(
    appScript.includes('if (value === "photo-strip-3" || value === "strip-3" || value === "strip") return "photo_strip_3";'),
    "strip aliases should normalize to the supported strip layout"
  );
  assert.ok(
    appScript.includes('renderSingleColumnStrip(c, enhancedPhotos, bg, template);'),
    "single-column strip templates should render in strip mode"
  );
  assert.ok(
    appScript.includes('drawImageContain(ctx, overlayToDraw, 0, 0, canvas.width, canvas.height);'),
    "single-photo overlays should be composited without cropping their edges"
  );
  assert.ok(
    html.includes("#liveOverlay {\n      width: 100%;\n      height: 100%;\n      display: block;\n      object-fit: contain;"),
    "live overlay preview should fit fully inside the frame"
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
