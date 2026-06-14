const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("setup screen uses a compact toolbar for section controls", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");
  const commandBarIndex = html.indexOf('<div class="setup-command-bar">');
  const adminContainerIndex = html.indexOf('<div class="admin-container">');

  assert.notEqual(commandBarIndex, -1, "setup command bar should exist");
  assert.notEqual(adminContainerIndex, -1, "admin container should exist");
  assert.ok(commandBarIndex < adminContainerIndex, "toolbar should appear before the admin panels");
  assert.ok(
    !html.includes('id="installBtn" class="primary hidden" type="button">Install App</button>'),
    "install button should not be part of the setup toolbar anymore"
  );
  assert.ok(
    html.includes('id="backgroundThumbnailsPanel"'),
    "background thumbnails panel should exist"
  );
  assert.ok(
    html.includes('id="overlayThumbnailsPanel"'),
    "overlay thumbnails panel should exist"
  );
  assert.ok(
    html.includes('id="templateThumbnailsPanel"'),
    "template thumbnails panel should exist"
  );
  assert.ok(
    html.includes('data-empty-text="No backgrounds available yet."'),
    "background panel should expose an empty state"
  );
  assert.ok(
    html.includes('data-empty-text="No overlays uploaded yet."'),
    "overlay panel should expose an empty state"
  );
  assert.ok(
    html.includes('data-empty-text="No templates uploaded yet."'),
    "template panel should expose an empty state"
  );
  assert.ok(
    appScript.includes('const ASSET_PANEL_STATE_KEY = "photoboothAssetPanels";'),
    "asset panel state should persist locally per device"
  );
  assert.ok(
    appScript.includes("function setupAssetPanelControls()"),
    "asset panels should be wired through a reusable collapsible helper"
  );
  assert.ok(
    appScript.includes("scheduleThemesRemoteSync();"),
    "theme saves should continue syncing overlay and layout data across devices"
  );
  assert.ok(
    !html.includes('data-session-action="event"'),
    "session setup summary should not include a duplicate event card"
  );
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
    html.includes('id="createPathEventTypeCards"'),
    "setup flow should present theme filters as cards"
  );
  assert.ok(
    html.includes('data-theme-filter-card="all"') &&
      html.includes('data-theme-filter-card="wedding"') &&
      html.includes('data-theme-filter-card="expo"') &&
      html.includes('data-theme-filter-card="party"') &&
      html.includes('data-theme-filter-card="community"'),
    "theme filter cards should expose all supported filter values"
  );
  assert.ok(
    html.includes('id="createPathEventType" class="hidden"'),
    "filter cards should keep the existing filter value as hidden state"
  );
  assert.ok(
    html.includes('id="createPathDateFields" class="hidden'),
    "theme sessions should not ask for an event date by default"
  );
  assert.ok(
    html.includes('id="createEventBtn" class="primary">Use This Theme</button>'),
    "default setup action should prepare a theme session instead of creating an event"
  );
  assert.ok(
    appScript.includes('DOM.createPathEventType.value = "all";'),
    "theme session flow should default to showing all themes"
  );
  assert.ok(
    appScript.includes('function setCreatePathThemeFilter(value = "all")'),
    "theme filter cards should update through a dedicated helper"
  );
  assert.ok(
    appScript.includes('button.dataset.themeFilterCard || "all"'),
    "filter card clicks should drive theme filtering"
  );
  assert.ok(
    appScript.includes('const selectedType = inferThemeEventStyle(themeKey, theme);'),
    "font suggestions should follow the selected theme"
  );
  assert.ok(
    appScript.includes("updateCreatePathDetailFields("),
    "setup flow should still refresh style-aware font suggestions from the chosen theme"
  );
  assert.ok(
    appScript.includes("function shouldIncludeThemeForSelectedType(themeKey, theme, selectedType)"),
    "theme selection should be filtered through a shared event-type helper"
  );
  assert.ok(
    appScript.includes('normalizedSelected === "wedding" && isHolidayThemeKey(themeKey)'),
    "wedding selections should exclude holiday themes"
  );
  assert.ok(
    html.includes('id="createPathValidationMessage"'),
    "setup flow should retain the inline validation/status area"
  );
  assert.ok(
    appScript.includes("function prepareThemeSessionFromSetup()"),
    "start flow should prepare a no-event theme session"
  );
  assert.ok(
    appScript.includes('setActiveEventId("");'),
    "theme session start should clear saved event selection"
  );
  assert.ok(
    appScript.includes("getDateSessionSlug()"),
    "theme sessions should save photos under a date slug"
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

test("theme filter cards keep accessible selected state", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('class="theme-filter-card active" data-theme-filter-card="all" aria-pressed="true"'),
    "all themes card should start selected"
  );
  assert.ok(
    html.includes('data-theme-filter-card="wedding" aria-pressed="false"'),
    "inactive filter cards should expose unpressed state"
  );
  assert.ok(
    appScript.includes('button.classList.toggle("active", active);'),
    "filter card sync should update visual selected state"
  );
  assert.ok(
    appScript.includes('button.setAttribute("aria-pressed", active ? "true" : "false");'),
    "filter card sync should update aria-pressed state"
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
    appScript.includes("setGrid(\n    DOM.sessionBackgrounds,\n    getSessionBackgroundPickerList(theme),"),
    "session setup should render backgrounds from the cross-theme picker"
  );
  assert.ok(
    appScript.includes("setGrid(\n    DOM.currentOverlays,\n    getAllThemeOverlayCatalogList(theme),"),
    "session setup should render overlays from the cross-theme picker"
  );
  assert.ok(
    appScript.includes("setGrid(\n    DOM.currentTemplates,\n    getTemplateList(theme),"),
    "current asset panel should render merged session/theme templates"
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

test("advanced theme controls keep defaults as editable placeholders", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");
  const advancedTextInputs = [
    "eventNameInput",
    "eventDateInput",
    "eventPartner1Input",
    "eventPartner2Input",
    "eventBirthdayNameInput",
    "eventExpoCompanyInput",
    "eventBannerTextInput",
    "eventWelcomeTitleInput",
    "eventStartButtonTextInput",
    "eventCaptureLabelInput",
  ];

  advancedTextInputs.forEach((id) => {
    assert.match(
      html,
      new RegExp(`<input type="text" id="${id}"[^>]*autocomplete="off"`),
      `${id} should disable browser autofill so manual typing wins`
    );
  });
  assert.ok(
    appScript.includes("function setTextFieldValueAndPlaceholder("),
    "advanced text controls should sync values and placeholders through one helper"
  );
  assert.ok(
    appScript.includes("node.placeholder = safePlaceholder;"),
    "theme defaults should be shown as placeholders"
  );
  assert.ok(
    appScript.includes("document.activeElement !== node"),
    "sync should not rewrite the field currently being typed into"
  );
  assert.ok(
    appScript.includes('getSavedEventTextValue(textSource, "bannerText")'),
    "saved custom banner text should load as the editable value"
  );
  assert.ok(
    appScript.includes('hasEditableTarget ? resolveThemeStartButtonText() : "Touch to start"'),
    "default start button text should load as a placeholder"
  );
  assert.ok(
    appScript.includes("if (eventLabel) return eventLabel;"),
    "empty custom button text should fall back to the default label"
  );
  assert.ok(
    appScript.includes("let activeSessionTextDetails = {};"),
    "theme-session text edits should be kept in runtime session state"
  );
  assert.ok(
    appScript.includes("updateActiveSessionTextDetails({ [key]: nextValue });"),
    "no-event advanced text edits should not mutate saved theme defaults while typing"
  );
  assert.ok(
    appScript.includes('getSavedEventTextValue(textSource, "partner1")'),
    "all advanced text fields should load from the active event or session text source"
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
