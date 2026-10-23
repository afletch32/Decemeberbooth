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

test("Hawks pizza artwork is bundled as transparent PNGs and registered", () => {
  assets.forEach((filename) => {
    const path = `/assets/themes/spring-hill-hawks/pizza/${filename}`;
    const image = readFileSync(join(assetDirectory, filename));
    assert.equal(image[25], 6, `${filename} should preserve an alpha channel`);
    assert.ok(app.includes(path), `${filename} should be registered in the theme`);
  });

  assert.ok(app.includes('name: "Hawks Pizza Three-Photo Strip Navy"'));
  assert.ok(app.includes('name: "Hawks Pizza Three-Photo Strip White"'));
  assert.ok(app.includes('layout: "photo_strip_3"'));
  assert.ok(app.includes('const pizzaAssetPrefix = "/assets/themes/spring-hill-hawks/pizza/"'));
});
