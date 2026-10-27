const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("all active bundled Hawks overlay originals and thumbnails exist", async () => {
  const { createBuiltinThemeData } = await import("./scripts/app/themes/builtin-catalog.mjs");
  const { BUILTIN_THEMES } = createBuiltinThemeData({ pruneUnapprovedThemes() {}, approvedThemeKeys: new Set() });
  const overlays = BUILTIN_THEMES.school.themes.hawks.overlays;
  assert.equal(overlays.length, 9);
  for (const entry of overlays) {
    const file = entry.src.replace(/^\//, "");
    const png = fs.readFileSync(file);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const thumbnail = fs.readFileSync(file.replace(/\.png$/, ".thumb.webp"));
    assert.equal(thumbnail.toString("ascii", 8, 12), "WEBP");
  }
});
