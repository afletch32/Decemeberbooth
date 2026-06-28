const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} function body should close`);
}

function loadResolveAssetPath(appScript) {
  const ensureFolderPath = extractFunction(appScript, "ensureFolderPath");
  const resolveAssetPath = extractFunction(appScript, "resolveAssetPath");
  return Function(
    "location",
    `${ensureFolderPath}\n${resolveAssetPath}\nreturn resolveAssetPath;`
  )({ origin: "https://example.com" });
}

test("setup screen uses a compact toolbar for section controls", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");
  const adminContainerIndex = html.indexOf('<div class="admin-container">');

  assert.notEqual(adminContainerIndex, -1, "admin container should exist");
  assert.ok(
    html.includes('class="setup-section-switcher"') &&
      html.includes('aria-label="Setup Sections"'),
    "setup should expose a lightweight section switcher"
  );
  assert.ok(
    html.includes('id="setupTabEvent"') &&
      html.includes('id="setupTabCapture"') &&
      html.includes('id="setupTabShare"'),
    "setup section buttons should be present"
  );
  assert.ok(
    !html.includes('<div class="setup-command-bar">'),
    "old command bar layout should stay removed"
  );
  assert.ok(
    !html.includes('id="backgroundThumbnailsPanel"') &&
      !html.includes('id="overlayThumbnailsPanel"') &&
      !html.includes('id="templateThumbnailsPanel"'),
    "duplicate setup asset tray panels should be removed"
  );
  assert.ok(
    html.includes('id="launchBackgroundCount"') &&
      html.includes('id="launchOverlayCount"') &&
      html.includes('id="launchStripStatus"'),
    "selected asset counts should remain visible"
  );
  assert.ok(
    html.includes('id="assetLibraryGrid"'),
    "Asset Library should remain the setup asset surface"
  );
  assert.ok(
    appScript.includes("function renderAssetLibrary()"),
    "Asset Library should be wired as the setup asset renderer"
  );
  assert.ok(
    appScript.includes("scheduleThemesRemoteSync();"),
    "theme saves should continue syncing overlay and layout data across devices"
  );
  assert.ok(
    html.includes('data-setup-section="event"') &&
      html.includes('data-setup-section="capture"') &&
      html.includes('data-setup-section="share"'),
    "setup sections should remain addressable by section state"
  );
});

test("theme folder asset manifests resolve shared library paths", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const resolveAssetPath = loadResolveAssetPath(appScript);

  assert.equal(
    resolveAssetPath("assets/events/test/overlays/", "frame1.png"),
    "/assets/events/test/overlays/frame1.png"
  );
  assert.equal(
    resolveAssetPath(
      "assets/events/test/overlays/",
      "../../library/overlays/gold-stars.png"
    ),
    "/assets/events/library/overlays/gold-stars.png"
  );
  assert.equal(
    resolveAssetPath(
      "assets/events/test/overlays/",
      "/assets/library/overlays/gold-stars.png"
    ),
    "/assets/library/overlays/gold-stars.png"
  );
  assert.equal(
    resolveAssetPath(
      "assets/events/test/overlays/",
      "https://cdn.example.com/gold-stars.png"
    ),
    "https://cdn.example.com/gold-stars.png"
  );
  assert.equal(
    resolveAssetPath("assets/events/test/overlays/", "data:image/png;base64,abc"),
    "data:image/png;base64,abc"
  );
  assert.equal(
    resolveAssetPath("assets/events/test/overlays/", "blob:https://example.com/id"),
    "blob:https://example.com/id"
  );
});

test("welcome launch uses overlay helpers and skips the No Overlay tile", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const hideWelcome = extractFunction(appScript, "hideWelcome");
  const selectFirstPhotoOverlayAfterWelcome = extractFunction(
    appScript,
    "selectFirstPhotoOverlayAfterWelcome"
  );

  assert.ok(
    !hideWelcome.includes("activeTheme.overlays.length"),
    "hideWelcome should not read activeTheme.overlays.length directly"
  );
  assert.ok(
    selectFirstPhotoOverlayAfterWelcome.includes("getOverlayList(activeTheme || {})"),
    "welcome auto-selection should use the overlay list helper"
  );
  assert.ok(
    selectFirstPhotoOverlayAfterWelcome.includes("const firstOverlayThumb = thumbs[1];"),
    "welcome auto-selection should skip the first No Overlay thumb"
  );
});

test("setup section state updates button and panel accessibility attributes", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes(".setup-combobox-button") &&
      html.includes(".setup-combobox-options"),
    "session setup controls should style dropdown comboboxes"
  );
  assert.ok(
    html.includes('id="modeToggle"'),
    "Booth Mode control should remain in the simplified setup flow"
  );
  assert.ok(
    appScript.includes("option.value = entry.key;") &&
      appScript.includes("activateThemeFromSetupKey(entry.key)"),
    "theme option clicks should activate immediately"
  );
  assert.ok(
    appScript.includes("activateFontFromSetupFamily(font.name)"),
    "font option clicks should activate immediately"
  );
  assert.ok(
    appScript.includes("setSetupSection(activeSetupSection);"),
    "existing section state should continue to drive visibility"
  );
});

test("setup flow uses direct theme and font activation", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="sessionThemeToggle"') &&
      html.includes('id="sessionThemeMenu"') &&
      html.includes('id="sessionThemeOptions" class="setup-combobox-options"') &&
      html.includes('id="sessionFontToggle"') &&
      html.includes('id="sessionFontMenu"') &&
      html.includes('id="sessionFontOptions" class="setup-combobox-options"'),
    "theme and font should be dropdown comboboxes with optional search"
  );
  assert.ok(
    appScript.includes("function activateThemeFromSetupSearch()") &&
      appScript.includes("loadTheme(key);") &&
      appScript.includes("function activateFontFromSetupSearch()") &&
      appScript.includes("applyFontSelection(family, family") &&
      appScript.includes("function openSetupCombobox(kind)") &&
      appScript.includes("renderSessionThemeOptions(DOM.sessionThemeSearch.value)") &&
      appScript.includes("renderSessionFontOptions(DOM.sessionFontSearch.value)"),
    "theme and font selection should activate immediately"
  );
  assert.ok(
    html.includes('id="captureSection"') &&
      html.includes('id="sharingSection"') &&
      html.includes('id="currentAssetsSection"'),
    "capture, share, and event content should remain in the section panels"
  );
});

test("setup theme dropdown groups themes by user-facing category", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes(".setup-combobox-group") &&
      html.includes(".setup-combobox-group-title") &&
      html.includes("pointer-events: none;") &&
      html.includes("user-select: none;") &&
      html.includes(".setup-combobox-group-options"),
    "theme dropdown should style grouped section headers"
  );
  assert.ok(
    appScript.includes("const THEME_SETUP_GROUP_ORDER = [") &&
      appScript.includes('"General",') &&
      appScript.includes('"Youth",') &&
      appScript.includes('const THEME_SETUP_LABEL_OVERRIDES = {') &&
      appScript.includes('hawks: "Hawks"') &&
      appScript.includes('ane: "Amanda North"') &&
      appScript.includes('"st patricks day": "St. Patrick\'s Day"'),
    "theme setup should define friendly group and label mappings"
  );
  assert.ok(
    appScript.includes("const seenKeys = new Set();") &&
      appScript.includes("seenKeys.has(entry.key)") &&
      appScript.includes('title.setAttribute("role", "presentation");') &&
      appScript.includes('title.setAttribute("aria-hidden", "true");'),
    "grouped theme options should dedupe by key and render non-selectable section headers"
  );
  assert.ok(
    appScript.includes("option.value = entry.key;") &&
      appScript.includes("activateThemeFromSetupKey(entry.key)") &&
      appScript.includes('option.textContent = entry.label;'),
    "setup options should keep the original keys while showing friendly labels"
  );
  assert.ok(
    !appScript.includes('${theme.name} > ${subTheme.name}') &&
      !appScript.includes('theme.name = `${theme.name} >'),
    "theme dropdown should not use arrow labels"
  );
  assert.ok(
    appScript.includes("function removeLegacyFlatBuiltinThemes()") &&
      appScript.includes('function normalizeThemeName(value = "")'),
    "legacy flat built-in copies and emoji-prefixed theme names should be normalized"
  );
});

test("asset library background selection only reflects explicit theme defaults", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function getSelectedBackgroundSourceList(theme)") &&
      appScript.includes("if (!fallback || fallback.endsWith(\"/\") || removed.has(fallback)) return [];"),
    "themes without explicit background defaults should not treat folder discovery as selected state"
  );
  assert.ok(
    appScript.includes("function isCompleteBackgroundCatalogSelection(sources, catalog)") &&
      appScript.includes("getAllThemeBackgroundCatalogList()") &&
      appScript.includes("getSelectedBackgroundSourceList(theme)"),
    "theme and global catalog-sized background defaults should be ignored by the selected-state source set"
  );
  assert.ok(
    appScript.includes("function getEffectiveSelectedBackgroundList(theme)") &&
      appScript.includes("getSessionEffectiveAssetSourceSet(category") &&
      appScript.includes("new Set(getEffectiveSelectedBackgroundList(theme))"),
    "manual background selections should stay clickable without selecting the catalog"
  );
  assert.ok(
    appScript.includes("Array.isArray(theme.backgrounds)") &&
      appScript.includes("mergeUniqueUrls(explicit)"),
    "background defaults should still come from explicit theme state"
  );
  assert.ok(
    appScript.includes("const folderArr = Array.isArray(theme.overlaysTmp)") &&
      appScript.includes("const folderArr = Array.isArray(theme.templatesTmp)"),
    "overlay and template folder manifests should remain theme defaults"
  );
});

test("asset library keeps backgrounds single-select while overlays and templates remain multi-select", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("activeSessionAssets.backgrounds = [url];") &&
      appScript.includes("activeSessionAssets.backgroundIndex = 0;") &&
      appScript.includes("return mergeUniqueUrls(sessionList).slice(0, 1);"),
    "selecting a background should replace the session selection and limit its effective count to one"
  );
  assert.ok(
    appScript.includes('addSessionAssetUrl("overlays", src);') &&
      appScript.includes('addSessionAssetUrl("templates", src);'),
    "overlay and template card selections should retain their multi-select behavior"
  );
});

test("asset library state uses the concise variable name", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("let assetLibrary = { assets: [] };") &&
      !appScript.includes("uploadedAssetLibrary"),
    "asset library state should not use the old uploaded-only variable name"
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

test("setup removes duplicate launch confirmation statuses", () => {
  const html = readProjectFile("index.html");

  assert.ok(
    !html.includes('id="launchConfirmCameraStatus"') &&
      !html.includes('id="launchConfirmOutputStatus"') &&
      !html.includes('id="launchConfirmLayoutMode"'),
    "launch confirmation should not duplicate top-bar camera, upload, or booth-mode status"
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
    !appScript.includes("DOM.sessionBackgrounds,\n    getSessionAssignedAssetEntries(\"background\")") &&
      !appScript.includes("DOM.currentOverlays,\n    getSessionAssignedAssetEntries(\"overlay\")") &&
      !appScript.includes("DOM.currentTemplates,\n    getSessionAssignedAssetEntries(\"template\")"),
    "session setup should not render assigned-only asset trays"
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

test("asset library selections have a strong visible and accessible state", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('content: "Selected";') &&
      html.includes("border-color: #16a34a;") &&
      html.includes("opacity: 0.48;") &&
      html.includes("filter: grayscale(0.55);"),
    "selected asset library cards should have a green border and badge while unselected cards are muted"
  );
  assert.ok(
    appScript.includes("const effectiveAssetSet = getSessionEffectiveAssetSourceSet(asset.category);") &&
      appScript.includes('card.classList.toggle("selected", isSelected);') &&
      appScript.includes('card.setAttribute("aria-selected", isSelected ? "true" : "false");'),
    "asset library cards should expose effective selected state to assistive tech"
  );
});

test("guest idle screen hides operator booth mode controls", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes("#boothScreen.welcome-active #boothModeBar") &&
      html.includes("#boothScreen.booth-ready #boothModeBar"),
    "guest welcome and capture screens should hide the operator mode bar"
  );
  assert.ok(
    appScript.includes("function showWelcome(step = null)") &&
      appScript.includes("setBoothControlsVisible(false);") &&
      appScript.includes("function hideWelcome()") &&
      appScript.includes("setMode(resolveBoothLaunchMode());"),
    "welcome flow should hide controls while preserving the selected booth mode before capture"
  );
});

test("booth capture layout is constrained to the visible viewport", () => {
  const html = readProjectFile("index.html");
  const sizingCss = readProjectFile("final-preview-sizing-fix.css");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    sizingCss.includes("#boothScreen {\n  height: 100dvh;") &&
      sizingCss.includes("max-height: 100dvh;") &&
      sizingCss.includes("overflow: hidden;"),
    "booth screen should be fixed to the visible viewport"
  );
  assert.ok(
    sizingCss.includes("#boothScreen.booth-ready #boothMain") &&
      sizingCss.includes("min-height: 0;") &&
      sizingCss.includes("var(--booth-preview-max-height)") &&
      sizingCss.includes("position: static !important"),
    "ready-state layout should flex and keep preview/capture controls in flow"
  );
  assert.ok(
    appScript.includes("function logBoothViewportOverflow()") &&
      appScript.includes("viewportHeight: window.innerHeight") &&
      appScript.includes("documentHeight: document.documentElement.scrollHeight"),
    "temporary viewport overflow logging should report the requested dimensions"
  );
  assert.ok(
    html.includes('<link rel="stylesheet" href="final-preview-sizing-fix.css">'),
    "viewport-fit overrides should load after the main booth CSS"
  );
});

test("booth live and countdown preview use the expanded desktop camera width", () => {
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes("--live-camera-width: min(96vw, 1400px);") &&
      html.includes("#boothScreen.countdown-mode #videoContainer"),
    "live and countdown states should share the larger viewport-bounded camera surface"
  );
});

test("asset library is the only setup asset state surface", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function getLaunchBackgroundCountLabel()") &&
      appScript.includes("getSessionEffectiveAssetSourceSet(\"background\")") &&
      appScript.includes("getSessionEffectiveAssetSourceSet(\"overlay\")") &&
      appScript.includes("getSessionEffectiveAssetSourceSet(\"template\")"),
    "visible setup counts should use effective asset collections"
  );
  assert.ok(
    appScript.includes("renderAssetLibrary();") &&
      appScript.includes('logEffectiveAssetState(theme, "loadTheme");'),
    "theme loading should refresh Asset Library selected state"
  );
  assert.ok(
    appScript.includes("getSessionEffectiveAssetSourceSet(asset.category)") &&
      appScript.includes('card.addEventListener("click", () => toggleLibraryAsset(asset));') &&
      appScript.includes("removeSessionAssetBySrc(category, src);") &&
      appScript.includes("renderAssetLibrary();"),
    "asset library should toggle effective selection from the full card and refresh after changes"
  );
});

test("asset library supports explicit multi-theme defaults without manifest auto-selection", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="assetThemeDefaultsModal"') &&
      html.includes('id="assetThemeDefaultsSave"') &&
      html.includes('id="assetThemeDefaultsSelectCurrent"') &&
      html.includes('id="assetThemeDefaultsClearAll"') &&
      html.includes(">Save theme choices</button>"),
    "Asset Library should expose a confirmed multi-theme defaults editor"
  );
  assert.ok(
    appScript.includes("function openAssetThemeDefaultsModal(asset)") &&
      appScript.includes("function saveAssetThemeDefaults()") &&
      appScript.includes('defaultsBtn.textContent = "Theme defaults"') &&
      appScript.includes("Choose which themes use this asset by default.") &&
      appScript.includes("Selected for ${count} theme"),
    "asset cards should open a defaults editor and save checked themes"
  );
  assert.ok(
    appScript.includes("function buildThemeDefaultAssetEntry(asset)") &&
      appScript.includes("photoSlots: raw.photoSlots") &&
      appScript.includes("foreground: raw.foreground"),
    "shared template defaults should preserve rendering metadata"
  );
  assert.ok(
    !appScript.includes("theme.backgrounds = combined.slice();"),
    "manifest background discovery must not become a selected default list"
  );
  assert.ok(
    appScript.includes("function repairCorruptedBackgroundDefaults()") &&
      appScript.includes("ASSET_DEFAULT_REPAIR_VERSION") &&
      appScript.includes("isCompleteBackgroundCatalogSelection(backgrounds, globalCatalog)"),
    "theme and global all-backgrounds selection signatures should be repaired once"
  );
});

test("asset library explains saved, filtered, and removal actions", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="assetLibraryClearFilters"') &&
      appScript.includes("function getActiveAssetLibraryFilterLabels()") &&
      appScript.includes("function clearAssetLibraryFilters()") &&
      appScript.includes("Filters active: ${filterLabels.join(\", \")}"),
    "the library should show filter-aware counts and provide a clear filters action"
  );
  assert.ok(
    appScript.includes("Asset saved and visible in Asset Library.") &&
      appScript.includes(
        "Asset saved, but hidden by current filters. Clear filters to view it."
      ) &&
      appScript.includes("Remove this asset from the Asset Library?") &&
      appScript.includes("This asset is used by theme defaults.") &&
      appScript.includes("Asset removed from Asset Library."),
    "asset save and removal feedback should explain the visible result and default impact"
  );
});

test("selected themes can configure all default assets in one modal", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="setupThemeDefaultsBtn"') &&
      html.includes('id="themeDefaultsSetupModal"') &&
      html.includes('id="themeDefaultsSetupList"'),
    "setup should expose a selected-theme defaults button and modal"
  );
  assert.ok(
    appScript.includes("function openThemeDefaultsSetupModal()") &&
      appScript.includes("Set Up Defaults: ${label}") &&
      appScript.includes("getCanonicalAssetCollection()"),
    "theme defaults setup should use the canonical background, overlay, and template catalog"
  );
  assert.ok(
    appScript.includes("function saveThemeDefaultsSetup()") &&
      appScript.includes("theme[arrayName] = selectedAssets") &&
      appScript.includes("buildThemeDefaultAssetEntry(asset)"),
    "save should update the selected theme with the existing asset entry shapes"
  );
  assert.ok(
    appScript.includes("saveThemesToStorage();") &&
      appScript.includes("renderAssetLibrary();") &&
      appScript.includes("updateLaunchSummary();"),
    "save should persist and refresh setup state"
  );
});

test("theme default setup normalizes corrupted built-in category selections", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function normalizeThemeSelectionKey(themeKey)") &&
      appScript.includes("const builtinGroup = BUILTIN_THEMES[key];") &&
      appScript.includes("key = normalizeThemeSelectionKey(activeThemeDefaultsSetupKey);"),
    "theme defaults should target a canonical child key rather than a built-in category root"
  );
  assert.ok(
    appScript.includes("function migrateLegacyBuiltinRootThemeDefaults()") &&
      appScript.includes("migrateLegacyBuiltinRootThemeDefaults();") &&
      appScript.includes("const isBuiltinCategory = !!("),
    "legacy root defaults should be migrated and category roots excluded from selectable themes"
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
