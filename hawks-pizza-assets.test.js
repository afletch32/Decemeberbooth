const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const app = readFileSync(join(process.cwd(), "scripts/app.js"), "utf8");
const assetDirectory = join(
  process.cwd(),
  "assets/themes/spring-hill-hawks/pizza"
);
const assets = [
  "hawks-pizza-3-photo-strip-navy.png",
  "hawks-pizza-3-photo-strip-white.png",
  "hawks-pizza-wide-landscape.png",
  "hawks-pizza-small-landscape.png",
  "hawks-pizza-portrait.png",
];

test("Hawks pizza artwork belongs to Spring Hill Hawks Cheer", () => {
  const hawksStart = app.indexOf("hawks: {");
  const cheerStart = app.indexOf("hawksCheer: {");
  const cheerEnd = app.indexOf("ane: {", cheerStart);
  const hawksTheme = app.slice(hawksStart, cheerStart);
  const cheerTheme = app.slice(cheerStart, cheerEnd);

  assets.forEach((filename) => {
    const path = `/assets/themes/spring-hill-hawks/pizza/${filename}`;
    const image = readFileSync(join(assetDirectory, filename));
    assert.equal(image[25], 6, `${filename} should preserve an alpha channel`);
    assert.ok(cheerTheme.includes(path), `${filename} should be in Hawks Cheer`);
    assert.ok(!hawksTheme.includes(path), `${filename} should not be in Hawks football`);
  });

  assert.ok(cheerTheme.includes('name: "Spring Hill Hawks Cheer"'));
  assert.ok(cheerTheme.includes('name: "Spring Hill Hawks Cheer Pizza Three-Photo Strip Navy"'));
  assert.ok(cheerTheme.includes('name: "Spring Hill Hawks Cheer Pizza Three-Photo Strip White"'));
  assert.ok(cheerTheme.includes('layout: "photo_strip_3"'));
  assert.ok(app.includes('"school hawkscheer": "Spring Hill Hawks Cheer"'));
  assert.ok(app.includes('const pizzaAssetPrefix = "/assets/themes/spring-hill-hawks/pizza/"'));
});
