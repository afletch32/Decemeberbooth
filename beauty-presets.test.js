const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadPresets() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/beauty/presets.mjs")).href
  );
}

test("guest beauty presets provide polished corrections while keeping Natural first", async () => {
  const { getGuestVisibleBeautyPresets } = await loadPresets();
  const presets = getGuestVisibleBeautyPresets();

  assert.deepEqual(
    presets.map((preset) => preset.id),
    ["natural", "soft", "golden", "vivid", "bw"]
  );
  assert.equal(presets[0].default, true);
  assert.ok(presets.every((preset) => preset.css));
  assert.equal(presets[0].beauty.skinSmooth, 0);
  assert.ok(presets.slice(1).every((preset) => preset.beauty.skinSmooth > 0));
  assert.ok(presets.every((preset) => preset.lighting.sharpness > 0));
});
