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

  assert.deepEqual(entries, [
    { src: "timeless-romance-strip-template.svg", layout: "photo_strip_3" },
    { src: "timeless-romance-single-template.svg", layout: "single_photo" }
  ]);
});

test("getBuiltinAssetManifest returns cloned objects", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const first = getBuiltinAssetManifest("assets/general/birthday/templates/");
  const second = getBuiltinAssetManifest("assets/general/birthday/templates/");

  first[0].src = "changed.png";

  assert.equal(second[0].src, "birthday banner.png");
});

test("wedding overlays stay plain unless reusable text is added explicitly", async () => {
  const getBuiltinAssetManifest = await loadGetBuiltinAssetManifest();
  const entries = getBuiltinAssetManifest("assets/wedding/timeless-romance/overlays/");

  assert.deepEqual(entries, [
    "timeless-romance-strip-overlay.svg",
    "timeless-romance-single-overlay.svg"
  ]);
});
