const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadAssetLibraryUtils() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/asset-library-utils.mjs"))
  );
}

test("asset categories share one canonical classification", async () => {
  const { normalizeUploadedAssetCategory } = await loadAssetLibraryUtils();

  assert.equal(normalizeUploadedAssetCategory("backgrounds"), "background");
  assert.equal(normalizeUploadedAssetCategory("overlays"), "overlay");
  assert.equal(normalizeUploadedAssetCategory("templates"), "template");
  assert.equal(
    normalizeUploadedAssetCategory("photo-choice-screens"),
    "idle-screen"
  );
  assert.equal(
    normalizeUploadedAssetCategory("thank-you-screens"),
    "thank-you-screen"
  );
  assert.equal(normalizeUploadedAssetCategory("unsupported"), "");
});

test("asset URL keys repair legacy paths and ignore cache variants", async () => {
  const {
    getAssetLibraryId,
    getAssetLibraryUrlKey,
    normalizeLegacyAssetUrl,
  } = await loadAssetLibraryUtils();

  assert.equal(
    normalizeLegacyAssetUrl("/assets/Hawks/frame.png"),
    "assets/school/hawks/frame.png"
  );
  assert.equal(
    getAssetLibraryUrlKey("/assets/frame.png?v=2#preview"),
    "assets/frame.png"
  );
  assert.equal(
    getAssetLibraryId("overlays", "/assets/frame.png?v=2"),
    "overlay:assets/frame.png"
  );
});

test("asset payload normalization deduplicates records and preserves screen metadata", async () => {
  const { normalizeAssetLibraryPayload } = await loadAssetLibraryUtils();
  const normalized = normalizeAssetLibraryPayload({
    assets: [
      {
        category: "photo-choice-screens",
        url: "/assets/choice.mp4?v=1",
        name: "Summer photo choice",
        tags: ["Summer"],
        orientation: "portrait",
        contentType: "video/mp4",
        buttonZones: {
          singlePhoto: { x: 20, y: 30, width: 24, height: 40 },
        },
        createdAt: "2026-07-20T12:00:00.000Z",
      },
      {
        category: "idle-screen",
        url: "assets/choice.mp4#duplicate",
        role: "photo-choice",
        tags: ["portrait", "summer"],
        editableFields: ["event name"],
        createdAt: "2026-07-20T13:00:00.000Z",
      },
    ],
  });

  assert.equal(normalized.assets.length, 1);
  assert.equal(normalized.assets[0].role, "photo-choice");
  assert.deepEqual(normalized.assets[0].tags, ["summer", "portrait"]);
  assert.ok(normalized.assets[0].editableFields.includes("eventName"));
  assert.ok(normalized.assets[0].buttonZones.singlePhoto);
  assert.ok(normalized.assets[0].buttonZones.photoStrip);
});

test("asset payload normalization accepts the active photo-choice zone fallback", async () => {
  const { normalizeAssetLibraryPayload } = await loadAssetLibraryUtils();
  const normalized = normalizeAssetLibraryPayload(
    [
      {
        category: "idle-screen",
        url: "assets/choice.mp4",
        role: "photo-choice",
        createdAt: "2026-07-20T12:00:00.000Z",
      },
    ],
    {
      photoChoiceZones: {
        singlePhoto: { x: 25, y: 35, width: 20, height: 30 },
        photoStrip: { x: 75, y: 35, width: 20, height: 30 },
      },
    }
  );

  assert.equal(normalized.assets[0].buttonZones.singlePhoto.x, 25);
  assert.equal(normalized.assets[0].buttonZones.photoStrip.x, 75);
});

test("asset payload normalization rejects unsafe and unsupported records", async () => {
  const { normalizeAssetLibraryPayload } = await loadAssetLibraryUtils();
  const normalized = normalizeAssetLibraryPayload([
    { category: "background", url: "javascript:alert(1)" },
    { category: "unknown", url: "assets/unknown.png" },
    { category: "overlay", url: "assets/frame.png" },
  ]);

  assert.equal(normalized.assets.length, 1);
  assert.equal(normalized.assets[0].category, "overlay");
});
