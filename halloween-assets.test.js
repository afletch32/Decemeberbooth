const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("Halloween migration replaces legacy defaults and preserves custom uploads", async () => {
  const { migrateHalloweenThemeAssets } = await import("./scripts/halloween-assets.mjs");
  const custom = { src: "/uploads/my-frame.png", name: "Operator frame" };
  const theme = {
    overlays: [{ src: "/assets/themes/halloween/overlays/halloween-single-photo-portrait.svg" }, custom],
    templates: [{ src: "https://res.cloudinary.com/example/fall-halloween-template-old.png" }],
  };
  const target = { fall: { holidays: { halloween: theme, cuteHalloween: { overlays: [], templates: [] } } } };
  assert.equal(migrateHalloweenThemeAssets(target), true);
  assert.deepEqual(theme.overlays.map((asset) => asset.orientation), ["portrait", "landscape", undefined]);
  assert.equal(theme.overlays[2], custom);
  assert.equal(theme.templates.length, 1);
  assert.equal(theme.templates[0].layout, "double_column");
  assert.deepEqual(theme.templates[0].photoSlots.map((slot) => slot.sourceIndex), [0, 1, 2, 0, 1, 2]);
  const [left, right] = [theme.templates[0].photoSlots.slice(0, 3), theme.templates[0].photoSlots.slice(3)];
  assert.deepEqual(right.map(({ x, ...slot }) => slot), left.map(({ x, ...slot }) => slot));
  assert.deepEqual(theme.templates[0].photoSlots.map((slot) => [Math.round(slot.x * 1200), Math.round(slot.y * 1800), Math.round(slot.width * 1200), Math.round(slot.height * 1800)]), [
    [50, 357, 500, 414], [50, 823, 500, 414], [50, 1288, 500, 413],
    [650, 357, 500, 414], [650, 823, 500, 414], [650, 1288, 500, 413],
  ]);
  assert.equal(migrateHalloweenThemeAssets(target), false);
});

test("Halloween manifests use shared geometry and production-size alpha PNGs", async () => {
  const { HALLOWEEN_ASSET_MANIFESTS, HALLOWEEN_PHOTO_SLOTS } = await import("./scripts/halloween-assets.mjs");
  for (const [folder, assets] of Object.entries(HALLOWEEN_ASSET_MANIFESTS)) {
    const file = folder.includes("overlays") ? "overlays.json" : "templates.json";
    assert.deepEqual(JSON.parse(readFileSync(folder + file, "utf8")), assets);
    for (const asset of assets) {
      const png = readFileSync(folder + asset.src);
      assert.equal(png.readUInt32BE(16), asset.orientation === "landscape" ? 1800 : 1200);
      assert.equal(png.readUInt32BE(20), asset.orientation === "landscape" ? 1200 : 1800);
      assert.equal(png[25], 6, "PNG must retain RGBA transparency");
      assert.deepEqual(asset.photoSlots, HALLOWEEN_PHOTO_SLOTS[asset.layout ? "strip" : asset.orientation]);
    }
  }
});
