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
    indexHtml.includes("Open Layout Builder"),
    "admin visual assets section should link to the overlay maker"
  );
  assert.ok(
    indexHtml.includes('id="openLayoutBuilderBtn"') &&
      indexHtml.includes("Overlay Builder"),
    "admin setup actions should expose the overlay builder without opening Visual Assets first"
  );
  assert.ok(
    indexHtml.includes("openLayoutBuilder()"),
    "admin should open the builder with app context instead of a hardcoded bare URL"
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
    overlayMaker.includes('Single Vertical') &&
      overlayMaker.includes('Single Horizontal') &&
      overlayMaker.includes('Photo Strip'),
    "builder should expose the three canonical layout classes"
  );
  assert.ok(
    overlayMaker.includes("return assetSrc || filename;"),
    "single-layout exports should keep the filename-only manifest fallback"
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
    overlayMaker.includes("manifest.layoutClass = layoutType;"),
    "manifest metadata should record the canonical layout class"
  );
  assert.ok(
    overlayMaker.includes("manifest.templateFamily = getSelectedFamilyKey();"),
    "manifest metadata should record the chosen template family"
  );
  assert.ok(
    overlayMaker.includes("manifest.templateVariant = getSelectedVariantKey();"),
    "manifest metadata should record the chosen template variant"
  );
  assert.ok(
    overlayMaker.includes("manifest.photoSlots = slots.map((slot) => ({"),
    "builder should emit normalized photo slot metadata for the new overlay schema"
  );
  assert.ok(
    overlayMaker.includes('assets/<theme>/'),
    "destination hint should point to a theme-scoped asset folder"
  );
});

test("overlay builder uses a template catalog with a single uploaded logo slot", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(
    overlayMaker.includes('id="templateFamily"'),
    "builder should let the user choose a template family"
  );
  assert.ok(
    overlayMaker.includes('id="templateVariant"'),
    "builder should let the user choose a family variant"
  );
  assert.ok(
    overlayMaker.includes("const TEMPLATE_FAMILIES = {"),
    "builder should define a built-in template catalog"
  );
  assert.ok(
    overlayMaker.includes("birthday_balloons") &&
      overlayMaker.includes("easter") &&
      overlayMaker.includes("retro_party"),
    "seasonal event variants should be built into the catalog"
  );
  assert.ok(
    overlayMaker.includes('id="logoUpload"'),
    "builder should allow a single uploaded logo"
  );
  assert.ok(
    overlayMaker.includes("const LOGO_SLOTS = {"),
    "logo placement should be standardized by layout class"
  );
  assert.ok(
    overlayMaker.includes("customLogoObjectUrl = URL.createObjectURL(file);"),
    "uploaded logos should be previewed via an object URL"
  );
  assert.ok(
    overlayMaker.includes("function drawLogoImage(ctx, guide, layoutType, image) {"),
    "logos should render once through a dedicated logo renderer"
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
    overlayMaker.includes('id="targetThemeKey"'),
    "builder should let the user choose which theme receives the finished asset"
  );
  assert.ok(
    overlayMaker.includes('id="addToBoothAssetsButton"'),
    "builder should offer a direct add-to-assets action"
  );
  assert.ok(
    overlayMaker.includes("function addManifestEntryToTheme("),
    "builder should be able to register a finished asset into stored themes"
  );
  assert.ok(
    overlayMaker.includes('https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload'),
    "builder should upload PNG exports directly to Cloudinary"
  );
});

test("overlay builder exposes friendly style presets for existing style inputs", () => {
  const overlayMaker = readProjectFile("overlay-maker.html");

  assert.ok(
    overlayMaker.includes('id="stylePresetGrid"') &&
      overlayMaker.includes('data-style-preset="classic"') &&
      overlayMaker.includes('data-style-preset="midnight"') &&
      overlayMaker.includes('data-style-preset="sunset"') &&
      overlayMaker.includes('data-style-preset="garden"'),
    "style presets should be visible as simple preset buttons"
  );
  assert.ok(
    overlayMaker.includes("const STYLE_PRESETS = {") &&
      overlayMaker.includes('background: "#241f24"') &&
      overlayMaker.includes('accent: "#4f9a43"') &&
      overlayMaker.includes("function applyStylePreset(presetKey)"),
    "preset buttons should map to the existing color controls"
  );
  assert.ok(
    overlayMaker.includes('document.querySelectorAll("[data-style-preset]")') &&
      overlayMaker.includes("applyStylePreset(button.dataset.stylePreset || \"\")"),
    "preset buttons should wire into the existing preview update flow"
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
    overlayMaker.includes("window.addEventListener(\"beforeunload\", revokeCustomLogoUrl);"),
    "uploaded logos should be cleaned up when the page unloads"
  );
  assert.ok(
    overlayMaker.includes('const LAYOUT_GUIDE_BY_TYPE = {'),
    "layout geometry should be locked to canonical guide mappings"
  );
  assert.ok(
    overlayMaker.includes('$("layoutGuide").value = nextGuideKey;'),
    "the hidden guide selection should stay in sync with the chosen layout class"
  );
});
