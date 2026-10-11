const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadGetBuiltinAssetManifest() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/builtin-asset-manifests.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.getBuiltinAssetManifest;
}

test("getBuiltinAssetManifest returns built-in entries for known folders", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/themes/eucalyptus-wedding");
  const template = entries.find((entry) => entry.category === "template");

  assert.equal(template.src, "eucalyptus-wedding-three-photo-strip.png");
  assert.equal(template.layout, "photo_strip_3");
  assert.equal(template.photoSlots.length, 3);
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
  const entries = getBuiltinAssetManifest("assets/themes/eucalyptus-wedding/");
  const overlays = entries.filter((entry) => entry.type === "overlay");
  assert.deepEqual(overlays.map((entry) => entry.orientation), ["portrait", "landscape"]);
  assert.deepEqual(overlays.map((entry) => entry.textFields.map((field) => field.key)), [
    ["couple_names", "event_date"],
    ["couple_names", "event_date"],
  ]);
  const backgrounds = entries.filter((entry) => entry.category === "background");
  assert.equal(backgrounds.length, 2);
  assert.ok(backgrounds.some((entry) => entry.orientation === "portrait"));
  assert.ok(backgrounds.some((entry) => entry.orientation === "landscape"));
  assert.equal(entries.filter((entry) => entry.category === "idle-screen").length, 4);
  assert.equal(entries.filter((entry) => entry.category === "thank-you-screen").length, 2);
});

test("every Eucalyptus wedding manifest entry resolves to a checked-in asset", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const root = join(process.cwd(), "assets/themes/eucalyptus-wedding");
  const entries = getBuiltinAssetManifest("assets/themes/eucalyptus-wedding/");

  assert.equal(entries.length, 11);
  entries.forEach((entry) => {
    assert.ok(existsSync(join(root, entry.src)), `${entry.src} should exist`);
  });
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
