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
  const entries = getBuiltinAssetManifest("assets/wedding/eucalyptus/templates");

  assert.equal(entries[0].src, "eucalyptus-wedding-three-photo-strip.png");
  assert.equal(entries[0].layout, "photo_strip_3");
  assert.equal(entries[0].photoSlots.length, 3);
});

test("getBuiltinAssetManifest returns cloned objects", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const first = getBuiltinAssetManifest("assets/general/birthday/templates/");
  const second = getBuiltinAssetManifest("assets/general/birthday/templates/");

  first[0].src = "changed.png";

  assert.equal(second[0].src, "birthday-banner.png");
});

test("retired Basic assets are absent from the built-in manifest", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  assert.deepEqual(getBuiltinAssetManifest("assets/general/basic/backgrounds/"), []);
  assert.deepEqual(getBuiltinAssetManifest("assets/general/basic/overlays/"), []);
  assert.deepEqual(getBuiltinAssetManifest("assets/general/basic/templates/"), []);
});

test("retired wedding packs are absent and Eucalyptus assets remain available", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  assert.deepEqual(getBuiltinAssetManifest("assets/wedding/timeless-romance/overlays/"), []);
  assert.deepEqual(getBuiltinAssetManifest("assets/wedding/garden-vows/overlays/"), []);
  const overlays = getBuiltinAssetManifest("assets/wedding/eucalyptus/overlays/");
  assert.deepEqual(overlays.map((entry) => entry.orientation), ["portrait", "landscape"]);
  assert.deepEqual(overlays.map((entry) => entry.textFields.map((field) => field.key)), [
    ["couple_names", "event_date"],
    ["couple_names", "event_date"],
  ]);
  const backgrounds = getBuiltinAssetManifest("assets/wedding/eucalyptus/backgrounds/");
  assert.equal(backgrounds.length, 2);
  assert.ok(backgrounds.some((src) => src.includes("portrait")));
  assert.ok(backgrounds.some((src) => src.includes("landscape")));
});

test("summer overlays remain available in built-in asset manifests", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/general/summer/overlays/");

  assert.equal(entries.length, 13);
  assert.ok(entries.includes("hello-summer.png"));
  assert.ok(entries.includes("tropical-border-with-frame.png"));
});

test("fourth of july overlays remain available in built-in asset manifests", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/holidays/summer/4th-of-july/overlays/");

  assert.equal(entries.length, 2);
  assert.ok(entries.includes("4thoverlay.png"));
  assert.ok(entries.includes("4thoverlay1.png"));
});
