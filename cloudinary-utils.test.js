const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const BASE = "photobooth/events";

async function loadBuildEventFolderPath() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/cloudinary-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.buildEventFolderPath;
}

test("buildEventFolderPath uses name and date when present", async () => {
  const buildEventFolderPath = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "holiday-party",
    date: "2024-12-14",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/holiday-party/2024-12-14");
});

test("buildEventFolderPath uses name when date is missing", async () => {
  const buildEventFolderPath = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "holiday-party",
    date: "",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/holiday-party");
});

test("buildEventFolderPath falls back when name and date are missing", async () => {
  const buildEventFolderPath = await loadBuildEventFolderPath();
  const result = buildEventFolderPath({
    base: BASE,
    name: "",
    date: "",
    fallback: "event"
  });

  assert.equal(result, "photobooth/events/event");
});
