const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("admin filter editor saves shared preset overrides and stays out of the guest booth", () => {
  const html = readFileSync("index.html", "utf8");
  const app = readFileSync("scripts/app.js", "utf8");

  assert.ok(
    html.includes('id="beautyPresetEditor"') &&
      html.includes('id="beautyPresetSelect"') &&
      html.includes('id="beautyPresetControls"'),
    "Capture setup should contain the admin-only guest filter editor"
  );
  assert.ok(
      app.includes("function setupBeautyPresetEditor()") &&
      app.includes("function persistBeautyPresetEdits()") &&
      app.includes("themes._meta.beautyPresetOverrides") &&
      app.includes("themes._meta.guestFilterId = selectedFilter;") &&
      app.includes("await syncThemesRemote()"),
    "The admin-selected guest filter and preset edits should sync remotely"
  );
  assert.ok(
    !html.includes('id="boothBeautyPresetEditor"'),
    "Guest booth markup must not expose the admin filter editor"
  );
});
