const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("capture flash is gated to the capture flow", () => {
  const app = fs.readFileSync("scripts/app.js", "utf8");
  assert.match(app, /let captureFlashArmed = false;/);
  assert.match(app, /captureFlashArmed = true;\s+if \(!live/);
  assert.match(app, /function triggerFlash\(\) \{\s+if \(!captureFlashArmed\) return;/);
});
