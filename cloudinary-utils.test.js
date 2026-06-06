const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const BASE = "photobooth/events";

async function loadBuildEventFolderPath() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/cloudinary-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return {
    buildAssetIndexKey: mod.buildAssetIndexKey,
    buildDateSessionFolderPath: mod.buildDateSessionFolderPath,
    buildEventAssetFolderPath: mod.buildEventAssetFolderPath,
    buildEventFolderPath: mod.buildEventFolderPath
  };
}

test("buildEventFolderPath uses name and date when present", async () => {
  const { buildEventFolderPath } = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "holiday-party",
    date: "2024-12-14",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/holiday-party/2024-12-14");
});

test("buildEventFolderPath uses name when date is missing", async () => {
  const { buildEventFolderPath } = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "holiday-party",
    date: "",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/holiday-party");
});

test("buildEventFolderPath falls back when name and date are missing", async () => {
  const { buildEventFolderPath } = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "",
    date: "",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/event");
});

test("buildEventAssetFolderPath appends the asset kind below the event folder", async () => {
  const { buildEventAssetFolderPath } = await loadBuildEventFolderPath();
  const result = buildEventAssetFolderPath({
    base: BASE,
    name: "holiday-party",
    date: "2024-12-14",
    fallback: "event",
    kind: "overlays"
  });

  assert.equal(result, "photobooth/events/holiday-party/2024-12-14/overlays");
});

test("buildDateSessionFolderPath groups no-event booth photos by date", async () => {
  const { buildDateSessionFolderPath } = await loadBuildEventFolderPath();
  const result = buildDateSessionFolderPath({
    base: BASE,
    date: "2026-06-06"
  });

  assert.equal(result, "photobooth/events/2026-06-06");
});

test("buildAssetIndexKey scopes duplicate detection by destination folder", async () => {
  const { buildAssetIndexKey } = await loadBuildEventFolderPath();

  assert.equal(
    buildAssetIndexKey({
      hash: "abc123",
      folder: "photobooth/events/party-a/backgrounds"
    }),
    "photobooth/events/party-a/backgrounds::abc123"
  );

  assert.notEqual(
    buildAssetIndexKey({
      hash: "abc123",
      folder: "photobooth/events/party-a/backgrounds"
    }),
    buildAssetIndexKey({
      hash: "abc123",
      folder: "photobooth/events/party-b/backgrounds"
    })
  );
});
