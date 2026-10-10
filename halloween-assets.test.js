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

test("Halloween migration replaces deleted legacy backgrounds and keeps orientation pair", async () => {
  const { migrateHalloweenThemeAssets } = await import("./scripts/halloween-assets.mjs");
  const custom = "/uploads/added-background.webp";
  const theme = {
    background: "/themes/holidays/fall/halloween/backgrounds/halloween-background-pink.png",
    backgrounds: [
      "/themes/holidays/fall/halloween/backgrounds/halloween-background-grey-1.jpg",
      "https://res.cloudinary.com/example/image/upload/fall-halloween-background-halloween-background-pink_old.png",
      custom,
    ],
    backgroundIndex: 1,
    backgroundsRemoved: ["/assets/holidays/fall/halloween/backgrounds/halloween-background-pink.png"],
  };
  const target = { fall: { holidays: { halloween: theme } } };

  assert.equal(migrateHalloweenThemeAssets(target), true);
  assert.deepEqual(theme.backgrounds, [
    "/assets/themes/halloween/halloween-background-portrait.mp4",
    "/assets/themes/halloween/halloween-background-landscape.mp4",
    custom,
  ]);
  assert.equal(theme.background, theme.backgrounds[1]);
  assert.deepEqual(theme.backgroundsRemoved, []);
  assert.equal(migrateHalloweenThemeAssets(target), false);
});

test("event migration removes retired Halloween background overrides but keeps other event backgrounds", async () => {
  const { migrateHalloweenEventAssets } = await import("./scripts/halloween-assets.mjs");
  const event = {
    overrides: {
      backgrounds: [
        "/themes/holidays/fall/halloween/backgrounds/halloween-background-grey-1.jpg",
        "/uploads/custom-event-background.webp",
        "/assets/holidays/fall/halloween/backgrounds/halloween-background-pink.png",
      ],
      backgroundIndex: 1,
    },
  };
  assert.equal(migrateHalloweenEventAssets([event]), true);
  assert.deepEqual(event.overrides.backgrounds, ["/uploads/custom-event-background.webp"]);
  assert.equal(event.overrides.backgroundIndex, 0);
  assert.equal(migrateHalloweenEventAssets([event]), false);
});

test("Halloween manifests use shared geometry and production-size alpha PNGs", async () => {
  const { HALLOWEEN_ASSET_MANIFESTS, HALLOWEEN_PHOTO_SLOTS } = await import("./scripts/halloween-assets.mjs");
  for (const [folder, assets] of Object.entries(HALLOWEEN_ASSET_MANIFESTS)) {
    if (!folder.endsWith("/overlays/") && !folder.endsWith("/templates/")) continue;
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

test("Halloween built-in asset manifest lists only the current orientation backgrounds", async () => {
  const { getBuiltinAssetManifest } = await import("./scripts/builtin-asset-manifests.mjs");
  assert.deepEqual(getBuiltinAssetManifest("assets/themes/halloween/"), [
    "halloween-background-portrait.mp4",
    "halloween-background-landscape.mp4",
  ]);
  assert.deepEqual(getBuiltinAssetManifest("assets/themes/cute-halloween/"), [
    "cute-halloween-background-portrait.webp",
    "cute-halloween-background-landscape.webp",
  ]);
  assert.deepEqual(getBuiltinAssetManifest("assets/holidays/fall/halloween/backgrounds/"), []);
});


test("Halloween retires the four legacy local templates without removing uploads", async () => {
  const { migrateHalloweenThemeAssets } = await import("./scripts/halloween-assets.mjs");
  const { getBuiltinAssetManifest } = await import("./scripts/builtin-asset-manifests.mjs");
  const custom = { src: "/uploads/customer-template.png" };
  const theme = { templates: [
    ...["2", "3", "4", "maddies"].map((suffix) => ({
      src: `/assets/holidays/fall/halloween/templates/halloween-template-${suffix}.png`,
    })), custom,
  ] };
  migrateHalloweenThemeAssets({ fall: { holidays: { halloween: theme } } });
  assert.equal(theme.templates.length, 2);
  assert.ok(theme.templates[0].src.includes("graphic-double-column"));
  assert.equal(theme.templates[1], custom);
  assert.deepEqual(getBuiltinAssetManifest("assets/holidays/fall/halloween/templates/"), []);
  assert.deepEqual(getBuiltinAssetManifest("assets/holidays/fall/halloween/backgrounds/"), []);
  assert.deepEqual(getBuiltinAssetManifest("assets/holidays/fall/halloween/overlays/"), []);
  assert.deepEqual(JSON.parse(readFileSync("assets/holidays/fall/halloween/templates/templates.json", "utf8")), []);
});
