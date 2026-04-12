const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

function countMatches(source, needle) {
  return source.split(needle).length - 1;
}

test("overlay builder is exposed from admin and uses a full HTML document", () => {
  const indexHtml = readProjectFile("index.html");
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(
    indexHtml.includes("Layout Builder"),
    "admin setup should link to the expanded builder"
  );
  assert.ok(
    overlayMaker.startsWith("<!DOCTYPE html>"),
    "builder page should declare a proper HTML document"
  );
  assert.ok(
    overlayMaker.includes("Photobooth Layout Builder"),
    "builder page should identify itself clearly"
  );
});

test("overlay builder uses clear layout-first terminology for exports", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(
    overlayMaker.includes('id="layoutType"'),
    "builder should let the user choose a layout type first"
  );
  assert.ok(
    overlayMaker.includes('return layoutType === "photo_strip" ? "templates" : "overlays";'),
    "destination folder should switch based on layout type"
  );
  assert.ok(
    overlayMaker.includes('Layout Type'),
    "builder should label the main workflow around layout type"
  );
  assert.ok(
    overlayMaker.includes('Single Photo') && overlayMaker.includes('Photo Strip'),
    "builder should use single photo and photo strip as the primary choices"
  );
  assert.ok(
    overlayMaker.includes(`return '"' + filename + '",';`),
    "single photo exports should copy a filename-only manifest line"
  );
  assert.ok(
    overlayMaker.includes("manifest.layout = guide.layout;"),
    "photo strip exports should include the layout metadata"
  );
  assert.ok(
    overlayMaker.includes("manifest.textFields = autofillFields;"),
    "builder should emit autofill metadata for reusable text zones"
  );
  assert.ok(
    overlayMaker.includes('assets/<theme>/'),
    "destination hint should point to a theme-scoped asset folder"
  );
});

test("overlay builder supports a built-in graphic library and custom PNG uploads", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(
    overlayMaker.includes('id="graphicSource"'),
    "builder should let the user switch between library graphics and uploads"
  );
  assert.ok(
    overlayMaker.includes('id="graphicUpload" accept="image/png"'),
    "builder should allow uploading a custom PNG graphic"
  );
  assert.ok(
    overlayMaker.includes("const GRAPHIC_LIBRARY_BUILDERS = {"),
    "builder should ship with a built-in library of graphic assets"
  );
  assert.ok(
    overlayMaker.includes('return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);'),
    "built-in graphics should be image-backed assets rather than canvas primitives"
  );
  assert.ok(
    overlayMaker.includes("customGraphicObjectUrl = URL.createObjectURL(file);"),
    "uploaded PNGs should be previewed via an object URL"
  );
  assert.ok(
    overlayMaker.includes("function drawGraphicImage(ctx, image, x, y, size) {"),
    "graphics should render as images on the canvas"
  );
  assert.ok(
    overlayMaker.includes('id="uploadCloudinaryButton"'),
    "builder should offer direct Cloudinary upload"
  );
  assert.ok(
    overlayMaker.includes('localStorage.getItem("cloudinaryCloudName")'),
    "builder should reuse saved booth Cloudinary settings"
  );
  assert.ok(
    overlayMaker.includes('id="autofillField"'),
    "builder should expose an autofill field selector"
  );
  assert.ok(
    overlayMaker.includes('id="secondaryAutofillField"'),
    "builder should support a secondary autofill line like the event date"
  );
  assert.ok(
    overlayMaker.includes("getAutofillSampleText($("),
    "builder preview should show reusable autofill content"
  );
  assert.ok(
    overlayMaker.includes('option value="event_date"'),
    "builder should let any reusable overlay include the event date"
  );
  assert.ok(
    overlayMaker.includes("splitFooterZones(zone)"),
    "builder should split footer space when multiple autofill fields are configured"
  );
  assert.ok(
    overlayMaker.includes('https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload'),
    "builder should upload PNG exports directly to Cloudinary"
  );
});

test("overlay builder navigation and markup avoid known broken states", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.equal(
    countMatches(overlayMaker, "<!DOCTYPE html>"),
    1,
    "builder should not contain stray doctype markup inside controls"
  );
  assert.ok(
    overlayMaker.includes("window.history.back();"),
    "back button should use browser history when available"
  );
  assert.ok(
    overlayMaker.includes('window.location.href = "./index.html";'),
    "back button should fall back to the booth admin page"
  );
  assert.ok(
    overlayMaker.includes("window.addEventListener(\"beforeunload\", revokeCustomGraphicUrl);"),
    "uploaded graphics should be cleaned up when the page unloads"
  );
  assert.ok(
    overlayMaker.includes('layoutType === "photo_strip" ? !isPhotoStrip : isPhotoStrip'),
    "layout style options should stay in sync with the selected layout type"
  );
});
