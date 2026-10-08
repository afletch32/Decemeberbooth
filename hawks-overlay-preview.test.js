const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Hawks built-in overlays use committed assets for live preview", () => {
  const app = fs.readFileSync("scripts/app.js", "utf8");
  assert.match(app, /src: "\/assets\/school\/hawks\/overlays\/1\.png"/);
  assert.match(app, /src: "\/assets\/school\/hawks\/overlays\/hawks-frame-go-hawks\.png"/);
  assert.doesNotMatch(app, /name: "hawks-overlay-1" \},\n\s+\{ src: "https:\/\/res\.cloudinary\.com/);
});
