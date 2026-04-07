const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("setup screen uses a compact toolbar for section controls", () => {
  const html = readProjectFile("index.html");
  const commandBarIndex = html.indexOf('<div class="setup-command-bar">');
  const installButtonIndex = html.indexOf('<button id="installBtn" class="primary hidden" type="button">Install App</button>');
  const adminContainerIndex = html.indexOf('<div class="admin-container">');

  assert.notEqual(commandBarIndex, -1, "setup command bar should exist");
  assert.notEqual(installButtonIndex, -1, "install button should exist");
  assert.notEqual(adminContainerIndex, -1, "admin container should exist");
  assert.ok(commandBarIndex < adminContainerIndex, "toolbar should appear before the admin panels");
  assert.ok(installButtonIndex < adminContainerIndex, "install button should sit in the toolbar, not inside the admin panel");
  assert.ok(html.includes('id="setupTabEvent" class="setup-tab active" data-setup-tab="event" aria-pressed="true"'));
  assert.ok(html.includes('id="setupTabCapture" class="setup-tab" data-setup-tab="capture" aria-pressed="false"'));
  assert.ok(html.includes('id="setupTabShare" class="setup-tab" data-setup-tab="share" aria-pressed="false"'));
  assert.ok(html.includes('<div class="btn-row event-path-switcher">'));
});

test("setup section state updates button and panel accessibility attributes", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes(".event-path-switcher > * {\n      flex: 0 1 280px;\n    }"),
    "event path buttons should use content-sized flex values"
  );
  assert.ok(
    html.includes("      flex: 0 0 auto;"),
    "setup tabs should avoid stretching across the full row on desktop"
  );
  assert.ok(
    appScript.includes('btn.setAttribute("aria-pressed", isActive ? "true" : "false");'),
    "setup buttons should expose pressed state"
  );
  assert.ok(
    appScript.includes('panel.classList.toggle("hidden", !show);'),
    "setup panels should still be filtered by section"
  );
});
