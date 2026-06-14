const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadGetBuiltinAssetManifest() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/builtin-asset-manifests.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.getBuiltinAssetManifest;
}

test("getBuiltinAssetManifest returns built-in entries for known folders", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/wedding/timeless-romance/templates");

  assert.equal(entries[0].src, "timeless-romance-strip-template.svg");
  assert.equal(entries[0].layout, "photo_strip_3");
  assert.equal(entries[0].slots.length, 3);
  assert.deepEqual(entries[1], {
    src: "timeless-romance-single-template.svg",
    layout: "single_photo",
  });
});

test("getBuiltinAssetManifest returns cloned objects", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const first = getBuiltinAssetManifest("assets/general/birthday/templates/");
  const second = getBuiltinAssetManifest("assets/general/birthday/templates/");

  first[0].src = "changed.png";

  assert.equal(second[0].src, "birthday banner.png");
});

test("wedding overlays remain available in built-in asset manifests", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const timelessEntries = getBuiltinAssetManifest(
    "assets/wedding/timeless-romance/overlays/"
  );
  const gardenEntries = getBuiltinAssetManifest(
    "assets/wedding/garden-vows/overlays/"
  );

  assert.equal(timelessEntries[0].src, "timeless-romance-strip-overlay.svg");
  assert.equal(timelessEntries[0].photoSlots.length, 3);
  assert.equal(timelessEntries[1].src, "timeless-romance-single-overlay.svg");
  assert.equal(timelessEntries[1].photoSlots.length, 1);
  assert.equal(gardenEntries[0].src, "garden-vows-strip-overlay.svg");
  assert.equal(gardenEntries[0].photoSlots.length, 3);
  assert.equal(gardenEntries[1].src, "garden-vows-single-overlay.svg");
  assert.equal(gardenEntries[1].photoSlots.length, 1);
});

test("summer overlays remain available in built-in asset manifests", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/general/Summer/overlays/");

  assert.equal(entries.length, 13);
  assert.ok(entries.includes("hello summer.png"));
  assert.ok(entries.includes("tropical border with frame.png"));
});
