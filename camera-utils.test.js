const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadClampZoom() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/camera-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.clampZoom;
}

test("clampZoom clamps values within range", async () => {
  const clampZoom = await loadClampZoom();
  assert.equal(clampZoom(0.5, 1, 2.5), 1);
  assert.equal(clampZoom(3, 1, 2.5), 2.5);
  assert.equal(clampZoom(1.6, 1, 2.5), 1.6);
});
