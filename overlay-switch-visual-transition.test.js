const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { readAppHtml } = require("./test-utils/app-source.cjs");

test("camera surfaces do not fade when overlay mode changes", () => {
  const html = readAppHtml();
  assert.match(html, /#video\.hidden,\s+#livePreviewCanvas\.hidden\s*\{\s*transition: none;/);
});
