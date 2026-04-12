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

test("setup flow is theme-first and quick start is a demo action", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="quickStartBtn">Demo Booth Now</button>'),
    "quick start should read as a one-tap booth demo action"
  );
  assert.ok(
    html.includes('<label for="createPathEventType">Theme Filter (optional)</label>'),
    "create flow should present event type as an optional theme filter"
  );
  assert.ok(
    html.includes('<option value="all">All Themes</option>'),
    "create flow should allow browsing all themes without picking a type first"
  );
  assert.ok(
    html.includes('id="createPathEventDate"'),
    "fast event creation should collect a reusable event date when needed"
  );
  assert.ok(
    html.includes('id="createPathBirthdayName"'),
    "birthday creation should collect the birthday name up front"
  );
  assert.ok(
    html.includes('id="createPathPartner1"') && html.includes('id="createPathPartner2"'),
    "wedding creation should collect couple names up front"
  );
  assert.ok(
    appScript.includes('DOM.createPathEventType.value = "all";'),
    "create flow should default to showing all themes"
  );
  assert.ok(
    appScript.includes('const selectedType = inferThemeEventStyle(themeKey, theme);'),
    "font suggestions should follow the selected theme"
  );
  assert.ok(
    appScript.includes("const eventType = inferThemeEventStyle(details.themeKey, theme);"),
    "new events should infer their type from the chosen theme"
  );
  assert.ok(
    appScript.includes("updateCreatePathDetailFields("),
    "create flow should toggle style-specific detail prompts from the chosen theme"
  );
  assert.ok(
    appScript.includes("function readCreatePathEventDetails()"),
    "create flow should read fast-create inputs through a dedicated helper"
  );
  assert.ok(
    appScript.includes("function buildCreatePathEvent(theme, details, eventType)"),
    "new events should be assembled through a focused create-path event helper"
  );
  assert.ok(
    appScript.includes("function resetCreatePathForm()"),
    "create flow should reset the form through a dedicated helper"
  );
  assert.ok(
    appScript.includes("validateCreatePathEventDetails(eventType, details)"),
    "create flow should validate required reusable event details before saving"
  );
  assert.ok(
    appScript.includes("alert(detailValidation.message);"),
    "validation failures should be shown immediately in the fast create flow"
  );
});

test("demo booth mode showcases wedding, birthday, and general looks", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="demoThemeBar" class="demo-theme-bar"'),
    "welcome screen should expose a dedicated demo theme switcher"
  );
  assert.ok(
    html.includes('data-demo-theme="wedding"'),
    "demo theme switcher should include a wedding showcase"
  );
  assert.ok(
    html.includes('data-demo-theme="birthday"'),
    "demo theme switcher should include a birthday showcase"
  );
  assert.ok(
    html.includes('data-demo-theme="general"'),
    "demo theme switcher should include a general showcase"
  );
  assert.ok(
    appScript.includes('const SHOWCASE_DEMO_THEME_CANDIDATES = {'),
    "app should define curated showcase demo themes"
  );
  assert.ok(
    appScript.includes('function startShowcaseDemo()'),
    "demo button should launch a curated showcase flow"
  );
  assert.ok(
    appScript.includes('cycleShowcaseDemoTheme();'),
    "showcase demo should rotate to the next look on idle return"
  );
});

test("event setup owns the day-to-day event editing controls", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="eventBannerTextInput"'),
    "event setup should expose a dedicated event banner text field"
  );
  assert.ok(
    html.includes('id="eventWelcomeTitleInput"'),
    "event setup should expose a dedicated welcome title field"
  );
  assert.ok(
    html.includes('id="eventStartButtonTextInput"'),
    "event setup should expose a dedicated start button text field"
  );
  assert.ok(
    html.includes('id="eventCaptureLabelInput"'),
    "event setup should expose a dedicated capture label field"
  );
  assert.ok(
    html.includes('id="eventBaseThemeName"'),
    "event setup should show the chosen base theme as reference"
  );
  assert.ok(
    !html.includes('id="stylePreviewHeading" class="style-preview-heading" contenteditable="true"'),
    "style preview should no longer act as an editable text surface"
  );
  assert.ok(
    appScript.includes('buildEventFromThemeDefaults(theme, {'),
    "new events should be initialized from theme defaults"
  );
  assert.ok(
    appScript.includes('alert("Create or select an event first.");'),
    "event-only asset uploads should require an active event"
  );
  assert.ok(
    appScript.includes('if (hasOwnEventTextValue(active, key)) return active[key];'),
    "blank event text should remain event-owned instead of snapping back to the theme default"
  );
  assert.ok(
    appScript.includes('title: DOM.themeWelcomeTitle ? DOM.themeWelcomeTitle.value : "Welcome!",'),
    "new themes should allow an intentionally blank welcome title"
  );
  assert.ok(
    appScript.includes('if (DOM.themeWelcomeTitle) target.welcome.title = DOM.themeWelcomeTitle.value;'),
    "theme updates should preserve intentionally blank welcome titles"
  );
});

test("booth button labels do not split words when wrapping", () => {
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes("      overflow-wrap: normal;\n      word-break: normal;\n      hyphens: none;\n      text-wrap: balance;"),
    "capture button text should wrap only at normal word boundaries"
  );
  assert.ok(
    html.includes(".mode-btn-label {\n      font-size: 0.62rem;"),
    "mode button label styles should exist"
  );
  assert.ok(
    html.includes("      width: 100%;\n      white-space: normal;\n      overflow-wrap: normal;\n      word-break: normal;\n      hyphens: none;\n      text-wrap: balance;"),
    "mode button labels should avoid mid-word wrapping"
  );
});
