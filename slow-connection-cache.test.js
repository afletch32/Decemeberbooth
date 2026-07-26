const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const serviceWorker = readFileSync(join(process.cwd(), "sw.js"), "utf8");

test("service worker preloads the booth shell for repeat slow-connection launches", () => {
  assert.ok(serviceWorker.includes('const APP_SHELL_CACHE = "pb-app-shell-v1"'));
  assert.ok(serviceWorker.includes('"scripts/app.js"'));
  assert.ok(serviceWorker.includes("event.request.mode === \"navigate\""));
  assert.ok(serviceWorker.includes("if (cached) {"));
  assert.ok(serviceWorker.includes("return cached;"));
});

test("service worker serves manually cached Cloudinary artwork", () => {
  assert.ok(serviceWorker.includes('const OFFLINE_ASSETS_CACHE = "pb-offline-assets-v1"'));
  assert.ok(serviceWorker.includes("await offlineCache.match(event.request)"));
  assert.ok(serviceWorker.includes('response.type === "opaque"'));
  assert.ok(serviceWorker.includes('event.request.destination === "video"'));
});
