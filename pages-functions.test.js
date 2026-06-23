const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function readProjectFile(...parts) {
  return fs.readFileSync(path.join(__dirname, ...parts), "utf8");
}

test("pages functions provide live sync endpoints for themes, events, and fonts", () => {
  const themesFn = readProjectFile("functions", "api", "themes.js");
  const eventsFn = readProjectFile("functions", "api", "events.js");
  const fontsFn = readProjectFile("functions", "api", "fonts.js");
  const galleryFn = readProjectFile("functions", "api", "gallery.js");
  const assetsFn = readProjectFile("functions", "api", "assets.js");
  const printQueueFn = readProjectFile("functions", "api", "print-queue.js");
  const printQueueItemFn = readProjectFile("functions", "api", "print-queue", "[id].js");

  assert.ok(
    themesFn.includes('await env.THEMES_KV.put("themes"'),
    "themes Pages function should persist shared theme data in KV"
  );
  assert.ok(
    eventsFn.includes('await env.THEMES_KV.put("events"'),
    "events Pages function should persist shared event data in KV"
  );
  assert.ok(
    fontsFn.includes('await env.FONTS_KV.put("fonts"'),
    "fonts Pages function should persist shared font data in KV"
  );
  assert.ok(
    themesFn.includes('"Access-Control-Allow-Methods": "GET, PUT, OPTIONS"'),
    "themes endpoint should allow the same cross-device sync verbs as local dev"
  );
  assert.ok(
    eventsFn.includes("function normalizeEventsPayload(payload)"),
    "events endpoint should normalize stored payloads for older array-only data"
  );
  assert.ok(
    galleryFn.includes("`gallery:${tag}`"),
    "gallery endpoint should persist app-owned gallery indexes by tag"
  );
  assert.ok(
    galleryFn.includes('"Access-Control-Allow-Methods": "GET, POST, OPTIONS"'),
    "gallery endpoint should allow reads, photo records, and preflight requests"
  );
  assert.ok(
    galleryFn.includes('await env.THEMES_KV.put(`gallery:${tag}`'),
    "gallery endpoint should store uploaded photo URLs in KV"
  );
  assert.ok(
    galleryFn.includes("resource_type"),
    "gallery endpoint should preserve image/video media type metadata"
  );
  assert.ok(
    galleryFn.includes("capture_id") &&
      galleryFn.includes("item.capture_id !== nextResource.capture_id"),
    "gallery endpoint should dedupe retried submissions by capture id"
  );
  assert.ok(
    assetsFn.includes('await env.THEMES_KV.put("assetLibrary"'),
    "asset library endpoint should persist uploaded asset metadata in KV"
  );
  assert.ok(
    assetsFn.includes('"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"'),
    "asset library endpoint should allow listing, upsert, archive, and delete"
  );
  assert.ok(
    assetsFn.includes('const VALID_CATEGORIES = new Set(["background", "overlay", "template"])'),
    "asset library endpoint should constrain uploaded asset categories"
  );
  assert.ok(
    printQueueFn.includes('return `print-queue:${eventId}`') && printQueueFn.includes('request.method !== "POST"'),
    "print queue endpoint should store shared event queues and accept booth submissions"
  );
  assert.ok(
    printQueueItemFn.includes("PRINT_QUEUE_STAFF_TOKEN") && printQueueItemFn.includes('request.method !== "PATCH" && request.method !== "DELETE"'),
    "print queue mutations should support server-side staff authorization"
  );
});
