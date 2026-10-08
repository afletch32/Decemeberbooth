const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("camera surfaces do not fade when overlay mode changes", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /#video\.hidden,\s+#livePreviewCanvas\.hidden\s*\{\s*transition: none;/);
});
