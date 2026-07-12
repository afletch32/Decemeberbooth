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

test("welcome launch preserves the explicit No Frame default", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const hideWelcome = extractFunction(appScript, "hideWelcome");

  assert.ok(
    !hideWelcome.includes("activeTheme.overlays.length"),
    "hideWelcome should not read activeTheme.overlays.length directly"
  );
  assert.ok(
    !hideWelcome.includes("selectFirstPhotoOverlayAfterWelcome"),
    "welcome should not silently select the first frame"
  );
  assert.ok(!appScript.includes("selectFirstPhotoOverlayAfterWelcome"));
});

test("booth launch cannot hide setup without a resolved theme", () => {
  const app = readProjectFile("scripts/app.js");
  const start = app.indexOf("async function startBooth(");
  const end = app.indexOf("\nfunction startBoothFlow", start);
  const startBooth = app.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.ok(startBooth.includes("if (!activeTheme)"));
  assert.ok(startBooth.includes("resolvePreferredThemeKey(DEFAULT_THEME_KEY)"));
  assert.ok(startBooth.includes('showToast("Choose a theme before starting the booth.")'));
  assert.ok(
    startBooth.indexOf('showToast("Choose a theme before starting the booth.")') <
      startBooth.indexOf("startBoothFlow();")
  );
});

test("the booth shell is anchored to the viewport after leaving setup", () => {
  const html = readProjectFile("index.html");
  const boothRuleStart = html.indexOf("#boothScreen {");
  const boothRuleEnd = html.indexOf("#boothScreen::before", boothRuleStart);
  const boothRule = html.slice(boothRuleStart, boothRuleEnd);

  assert.ok(boothRule.includes("position: fixed;"));
  assert.ok(boothRule.includes("inset: 0;"));
  assert.ok(boothRule.includes("width: 100%;"));
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
    !appScript.includes("baseFolderList") &&
      !appScript.includes("baseFolderSet") &&
      !appScript.includes("syncThemeEditorSummary"),
    "removed folder fallback state should not interrupt setup dropdown initialization"
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

test("fourth of july theme includes Cloudinary overlay entries", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("themes.summer =") &&
      appScript.includes("fourthofjuly") &&
      appScript.includes('name: "Fourth of July"') &&
      appScript.includes("res.cloudinary.com/afletch32") &&
      appScript.includes("summer-4th-of-july-overlay-4thoverlay_zcvowb"),
    "Fourth of July should be a summer holiday theme with Cloudinary overlay entries"
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
    appScript.includes("const localArr = Array.isArray(theme.overlays)") &&
      appScript.includes("const localArr = Array.isArray(theme.templates)"),
    "overlay and template defaults should come from explicit theme arrays"
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
    appScript.includes("addSessionAssetUrl("),
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
    sizingCss.includes("#boothScreen.booth-ready:not(.mode-360) #boothMain") &&
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
      appScript.includes("removeSessionAssetBySrc(") &&
      appScript.includes("renderAssetLibrary();"),
    "asset library should toggle effective selection from the full card and refresh after changes"
  );
});

test("booth asset picker preserves order and keeps search and favorites admin-only", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("ASSET_PICKER_INITIAL_LIMIT = 24"),
    "asset picker should still start with a bounded public list"
  );
  assert.ok(
    appScript.includes("return out;") &&
      !appScript.includes("function sortAssetPickerEntries(") &&
      !appScript.includes("photoboothAssetPickerFavorites") &&
      !appScript.includes("photoboothAssetPickerRecents") &&
      !appScript.includes("renderAssetPickerControls") &&
      !appScript.includes("appendAssetPickerFavoriteButton"),
    "guest overlay and template lists should keep their natural order without public favorites or recents"
  );
  assert.ok(
    appScript.includes("const previousScrollTop =") &&
      appScript.includes("container.scrollTop = previousScrollTop") &&
      appScript.includes("function appendAssetPickerShowMore("),
    "guest picker should preserve scroll and keep show-more pagination without adding search or favorites"
  );
  assert.ok(
    html.includes('id="assetLibrarySearch"') &&
      html.includes('id="assetLibrarySort"') &&
      html.includes('value="favorites"') &&
      html.includes('value="recent"') &&
      !html.includes(".asset-picker-search") &&
      !html.includes(".asset-picker-favorite") &&
      html.includes(".asset-picker-show-more"),
    "search and sorting should remain admin Asset Library controls, not public booth picker controls"
  );
  assert.ok(
    appScript.includes("photoboothAssetLibraryFavorites") &&
      appScript.includes("photoboothAssetLibraryRecents") &&
      appScript.includes("function toggleAssetLibraryFavorite(") &&
      appScript.includes("function recordAssetLibraryRecent(") &&
      appScript.includes('favoriteBtn.className = "asset-library-favorite"'),
    "favorites and recents should live in the admin Asset Library"
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
      appScript.includes("function populateAssetThemeDefaultsModal(asset)") &&
      appScript.includes("function getSelectableThemeGroups()") &&
      appScript.includes("function syncAssetThemeGroupCheckboxes()") &&
      appScript.includes("function replaceThemeDefaultEntries(theme, category, entries)") &&
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
    html.includes(".theme-defaults-parent-option") &&
      html.includes(".theme-defaults-child-option") &&
      appScript.includes("All ${themeGroup.label}") &&
      appScript.includes("input[data-theme-key]:checked"),
    "theme defaults should expose parent group selectors while saving leaf theme keys"
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
      appScript.includes("replaceThemeDefaultEntries(") &&
      appScript.includes("buildThemeDefaultAssetEntry(asset)"),
    "save should update the selected theme with the existing asset entry shapes"
  );
  assert.ok(
    appScript.includes("saveThemesToStorage();") &&
      appScript.includes("clearSessionRemovedAsset(category, getAssetEntrySrc(asset));") &&
      appScript.includes("renderAssetLibrary();") &&
      appScript.includes("updateLaunchSummary();"),
    "save should persist, restore selected defaults in-session, and refresh setup state"
  );
});

test("setup exposes selected assets in a collapsible summary", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    html.includes('id="setupSessionAssetsToggle"') &&
      html.includes('id="launchBackgroundThumb"') &&
      html.includes('id="launchBackgroundSummary"') &&
      html.includes('id="launchOverlayThumb"') &&
      html.includes('id="launchOverlaySummary"') &&
      html.includes('id="launchTemplateThumb"') &&
      html.includes('id="launchTemplateSummary"'),
    "setup should show selected backgrounds, overlays, and templates in a collapsible toggle"
  );
  assert.ok(
    appScript.includes(
      'launchBackgroundSummary: document.getElementById("launchBackgroundSummary")'
    ) &&
      appScript.includes(
        'launchBackgroundThumb: document.getElementById("launchBackgroundThumb")'
      ) &&
      appScript.includes(
        'launchOverlaySummary: document.getElementById("launchOverlaySummary")'
      ) &&
      appScript.includes(
        'launchOverlayThumb: document.getElementById("launchOverlayThumb")'
      ) &&
      appScript.includes(
        'launchTemplateSummary: document.getElementById("launchTemplateSummary")'
      ) &&
      appScript.includes(
        'launchTemplateThumb: document.getElementById("launchTemplateThumb")'
      ) &&
      appScript.includes("setLaunchSummaryThumbnail("),
    "setup summary should stay synced with the existing launch count labels and thumbnails"
  );
  assert.ok(
    appScript.includes("const list = getBackgroundList(activeTheme);") &&
      appScript.includes('getOverlayList(activeTheme)[0] || ""') &&
      appScript.includes('getTemplateList(activeTheme)[0] || ""'),
    "selected asset thumbnails should use the same effective theme and session lists as the counts"
  );
});

test("landscape booths default photo previews to landscape", () => {
  const appScript = readProjectFile("scripts/app.js");
  const layoutCss = readProjectFile("final-preview-sizing-fix.css");
  assert.ok(
    appScript.includes(
      'window.innerWidth >= window.innerHeight ? "landscape" : "portrait"'
    ),
    "photo preview orientation should start from the booth viewport"
  );
  assert.ok(
    layoutCss.includes("--booth-ready-top-space: clamp(96px, 11dvh, 120px);"),
    "the wider landscape camera should remain below the booth header"
  );
});

test("countdown sizing stays inside both camera dimensions", () => {
  const appScript = readProjectFile("scripts/app.js");
  assert.ok(
    appScript.includes(
      "Math.round(Math.min(rect.width, rect.height) * getCountdownScale())"
    ),
    "countdown numerals should be bounded by the smaller camera dimension"
  );
});

test("event name and date drive the session upload folder", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    html.includes('<label for="eventNameInput">Session Name</label>') &&
      html.includes('<label for="eventDateInput">Session Date</label>'),
    "setup should present one session name and one session date field"
  );
  assert.ok(
    !html.includes('id="sessionNameInput"') &&
      !html.includes('id="sessionDateInput"'),
    "setup should not add separate session fields"
  );
  assert.ok(
    appScript.includes("function getSessionUploadName()") &&
      appScript.includes("function getSessionUploadDate()") &&
      appScript.includes("valueFromInput(DOM.eventNameInput)") &&
      appScript.includes("valueFromInput(DOM.eventDateInput)") &&
      appScript.includes("getDateSessionSlug()") &&
      appScript.includes("slugifyEventText(getSessionUploadName())") &&
      appScript.includes("slugifyEventText(getSessionUploadDate())"),
    "session upload paths should derive from the existing name/date fields and current-date default"
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

test("birthday and wedding event fields stay theme-gated", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    html.includes('class="theme-field wedding-only-event-field"') &&
      html.includes('class="theme-field birthday-only-event-field hidden"') &&
      html.includes('id="eventPartner1Input"') &&
      html.includes('id="eventPartner2Input"') &&
      html.includes('id="eventBirthdayNameInput"'),
    "wedding fields should stay visible only through the wedding wrapper and birthday name should start hidden"
  );
  assert.ok(
    appScript.includes("function isWeddingEventTheme(themeObj = null)") &&
      appScript.includes("function isBirthdayEventTheme(themeObj = null)") &&
      appScript.includes("function syncWeddingOnlyEventFields(themeObj = null)") &&
      appScript.includes("function syncBirthdayOnlyEventFields(themeObj = null)") &&
      appScript.includes('document.querySelectorAll(".wedding-only-event-field")') &&
      appScript.includes('document.querySelectorAll(".birthday-only-event-field")') &&
      appScript.includes('normalizeEventStyle(inferThemeEventStyle(themeKey, theme)) === "birthday"'),
    "theme gating should explicitly handle wedding and birthday field visibility"
  );
});

test("gallery link panel stays button only", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts/app.js");

  assert.ok(
    html.includes('id="eventGalleryActions"') &&
      html.includes("Share Gallery Link") &&
      html.includes("Open Gallery") &&
      !html.includes("Copy Link") &&
      !html.includes('id="currentEventName"') &&
      !html.includes('id="currentEventDate"'),
    "gallery link panel should only expose the two link buttons"
  );
  assert.ok(
    appScript.includes('DOM.eventGalleryActions.classList.toggle("hidden", !hasTheme);') &&
      appScript.includes('if (DOM.eventGalleryLink)') &&
      appScript.includes('getEventGalleryStatusText()'),
    "gallery link behavior should still drive the link target without extra panel copy"
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

test("guest booth flow uses attraction-style host moments", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
      html.includes('id="welcomeHostLine"') &&
      html.includes("Ready to make some memories?") &&
      html.includes("Choose your experience") &&
      html.includes('id="boothHostPrompt"') &&
      html.includes("Use the arrows to choose a look.") &&
      html.includes("Tap Take Photo when you are ready."),
    "welcome, choice, and camera states should have guest-facing host copy"
  );
  assert.ok(
    html.includes('id="reviewPanel"') &&
      html.includes("Love your photos?") &&
      !html.includes("Make sure everyone looks just right.") &&
      html.includes('id="lovePhotoBtn"') &&
      html.includes("LOVE IT!") &&
      html.includes('id="reviewRetakeBtn"'),
    "final preview should open with a simple review choice"
  );
  assert.ok(
    html.includes("Take them with you.") &&
      html.includes("Scan to save your photos.") &&
      html.includes('id="goodbyeOverlay"') &&
      html.includes("Thank You!") &&
      html.includes("Enjoy your photos!"),
    "save and goodbye states should use memory-focused copy"
  );
  assert.ok(
    appScript.includes("function getBoothPersonality()") &&
      appScript.includes("Capture a little holiday magic.") &&
      appScript.includes("Celebrate the moment.") &&
      appScript.includes("Go Hawks!") &&
      appScript.includes("syncBoothPersonality();"),
    "guest copy should adapt lightly to the active event/theme"
  );
  assert.ok(
      appScript.includes("function playBoothSound(") &&
      appScript.includes("countdown: { frequency") &&
      appScript.includes("flash: { frequency") &&
      appScript.includes("function getCountdownDurationSeconds()") &&
      appScript.includes("function showFlashBeat()") &&
      appScript.includes("function handleLovePhoto()") &&
      appScript.includes("Awesome!") &&
      appScript.includes("function revealFinalSaveStage()") &&
      appScript.includes("DOM.finalPreviewContent.addEventListener(\"click\", (event) => {") &&
      appScript.includes("const interactiveTarget = event.target.closest(") &&
      appScript.includes("if (interactiveTarget) event.stopPropagation();") &&
      !appScript.includes('co.textContent = "Flash";'),
    "the flow should include tiny sound cues, a visual flash beat, tap-to-exit share space, and a rewarding love-it transition"
  );
});

test("booth setup includes a five second countdown option", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="countdownFiveToggle"') &&
      appScript.includes("photoboothCountdownFiveSeconds") &&
      appScript.includes("setupCountdownFiveToggle()"),
    "the capture settings should expose a stored five second countdown option"
  );
});

test("booth filter carousel has touch-sized global controls", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('onclick="prevFilter()"') &&
      html.includes('onclick="nextFilter()"') &&
      appScript.includes("nextFilter,") &&
      appScript.includes("prevFilter,"),
    "filter carousel arrow buttons should call globally exposed handlers"
  );
  assert.ok(
    html.includes("width: 62px;") &&
      html.includes("height: 62px;") &&
      html.includes("font-size: 1.9rem;"),
    "filter carousel arrows should be large enough for touch use"
  );
});

test("booth frame selection starts plain and stays beside capture controls", () => {
  const html = readProjectFile("index.html");
  const app = readProjectFile("scripts/app.js");
  assert.ok(html.includes('id="frameCarousel"'));
  assert.ok(html.includes('id="frameCarouselName">No Frame'));
  assert.ok(app.includes("function moveBoothFrame(direction)"));
  assert.ok(app.includes("const entries = getFrameCarouselEntries();"));
  assert.ok(!app.includes("const first = getFirstPhotoOverlayForOrientation(next);"));
  assert.ok(!app.includes("selectFirstPhotoOverlayAfterWelcome"));
  assert.ok(
    app.includes("requestAnimationFrame(() => {\n    syncFrameCarouselUi();") &&
      html.includes("#boothScreen.booth-ready #mobileSettingsToggle {\n        display: none !important;"),
    "ready state should reveal the central frame carousel and retire the corner trigger"
  );
});

test("the no-frame live preview remains mirrored without changing capture output", () => {
  const html = readProjectFile("index.html");
  const app = readProjectFile("scripts/app.js");
  const livePreviewRule = html.slice(
    html.indexOf("#livePreviewCanvas {"),
    html.indexOf("#lastShot,", html.indexOf("#livePreviewCanvas {"))
  );

  assert.ok(livePreviewRule.includes("transform: scaleX(-1);"));
  assert.ok(app.includes("ctx.drawImage(processedCanvas, 0, 0, target.width, target.height);"));
});

test("filter controls are hidden during countdown and non-interactive booth states", () => {
  const html = readProjectFile("index.html");

  assert.ok(html.includes("#boothScreen.countdown-mode .filter-carousel,"));
  assert.ok(html.includes("#boothScreen.finalizing-mode .filter-carousel,"));
  assert.ok(html.includes("#boothScreen.share-mode .filter-carousel,"));
  assert.ok(html.includes("#boothScreen.welcome-active .filter-carousel {"));
});

test("completed guest flows return directly to the idle screen", () => {
  const app = readProjectFile("scripts/app.js");
  assert.ok(app.includes("function finishBoothFlow()"));
  assert.ok(app.includes('showWelcome("idle");'));
  assert.ok(app.includes("function exitFinalPreview() {\n  finishBoothFlow();"));
  assert.ok(app.includes("hidePreviewTimer = setTimeout(finishBoothFlow, 3000);"));
  assert.ok(app.includes("function retakePhoto() {\n  hideFinal();"));
});

test("final share QR is only marked ready after rendering succeeds", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("async function renderQrCode(canvas, text)") &&
      appScript.includes("function loadQrCodeLibrary") &&
      appScript.includes("https://unpkg.com/qrcode@1.5.1/build/qrcode.min.js"),
    "QR rendering should have an async fallback loader"
  );
  assert.ok(
    appScript.includes('qrContainer.dataset.ready = qrRendered ? "true" : "false"') &&
      appScript.includes('DOM.qrCodeContainer.dataset.ready = qrRendered ? "true" : "false"') &&
      appScript.includes('DOM.shareStatus.textContent = qrRendered ? "Link ready" : "QR failed"'),
    "final QR panels should expose ready state only after the canvas renders"
  );
});

test("final share panel appears immediately while QR is pending or failed", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");

  assert.ok(
    appScript.includes('DOM.qrCodeContainer.dataset.pending === "true"') &&
      appScript.includes('DOM.qrCodeContainer.dataset.error === "true"') &&
      appScript.includes('qrContainer.dataset.pending = "true"') &&
      appScript.includes('qrContainer.classList.remove("hidden")') &&
      appScript.includes('qrContainer.classList.add("experience-reveal")') &&
      appScript.includes('DOM.reviewPanel && DOM.reviewPanel.classList.contains("hidden")') &&
      appScript.includes("revealFinalSaveStage();") &&
      appScript.includes('qrContainer.dataset.error = qrRendered ? "false" : "true"'),
    "the QR panel should be visible as soon as rendering starts and remain available after review"
  );
  assert.ok(
    appScript.includes("if (skipShare && !isBoothTestMode())") &&
      appScript.includes("hidePreviewTimer = setTimeout(finishBoothFlow, 15000);"),
    "non-share gallery previews should finish through the idle-return path"
  );
  assert.ok(
    html.includes("grid-template-columns: minmax(0, 1fr) minmax(300px, clamp(320px, 24vw, 360px));") &&
      html.includes("max-width: 100%;") &&
      html.includes("max-height: calc(100svh - clamp(120px, 12vw, 180px));"),
    "final media should shrink inside the share grid so the QR panel remains in the viewport"
  );
});

test("share-ready QR uses a compact retake action without overlapping review controls", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");
  const qrStart = html.indexOf('id="qrCodeContainer"');
  const qrEnd = html.indexOf('</div>\n          <section id="paidPrintPanel"', qrStart);
  const qrMarkup = html.slice(qrStart, qrEnd);

  assert.equal((html.match(/id="reviewRetakeBtn"/g) || []).length, 1);
  assert.ok(qrMarkup.includes('id="reviewRetakeBtn" class="qr-retake-button"'));
  assert.ok(html.includes("#qrCodeContainer .qr-retake-button {"));
  assert.ok(appScript.includes('if (DOM.reviewPanel) DOM.reviewPanel.classList.add("hidden");'));
});

test("skin smoothing preserves detail instead of blurring the full face", () => {
  const smoothing = readProjectFile("scripts", "beauty", "smoothing.mjs");
  const masks = readProjectFile("scripts", "beauty", "masks.mjs");

  assert.ok(
    smoothing.includes("isSkinLikePixel(") &&
      smoothing.includes("detailProtection") &&
      smoothing.includes("getMaskWeight(") &&
      smoothing.includes("ctx.putImageData("),
    "skin smoothing should blend skin-like pixels selectively and protect high-detail facial features"
  );
  assert.ok(
    masks.includes("return centeredMask(width, height, 0.5, 0.46, 0.56, 0.68);"),
    "face mask fallback should not smooth the full camera frame when landmarks are unavailable"
  );
});

test("guest photo filters run through the unified live imaging pipeline", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes('id="livePreviewCanvas"') &&
      appScript.includes("function startLiveImagingPipeline()") &&
      appScript.includes("async function processCanvasThroughImagingPipeline(sourceCanvas)") &&
      appScript.includes("drawProcessedFrameToLivePreview(processed)") &&
      appScript.includes("getLivePreviewStream()"),
    "the live preview should render through a processed canvas that can feed slotted overlays"
  );
  assert.ok(
    appScript.includes("function applySelectedFilterToCanvas(canvas)") &&
      appScript.includes("processed = applySelectedFilterToCanvas(sourceCanvas)") &&
      appScript.includes("processed = await applySelectedBeautyToCanvas(processed)") &&
      appScript.includes("processed = applyAutoEnhanceCanvas(processed)") &&
      !appScript.includes("applyFilterToCanvas(ctx, targetW, targetH);\n\n  return c.toDataURL"),
    "selected filters and beauty passes should be baked into the shared imaging pipeline"
  );
  assert.ok(
    appScript.includes("const shot = await getCurrentProcessedFrameCanvas()") &&
      appScript.includes("__processedByLiveImagingPipeline") &&
      appScript.includes("? photoCanvas\n      : ensureEnhancedCanvas(photoCanvas)"),
    "capture and final print output should reuse the currently displayed processed frame"
  );
  assert.ok(
    !appScript.includes("DOM.video.style.filter = filterValue") &&
      !appScript.includes("media.style.filter = (filterDef && filterDef.css) || \"\""),
    "live preview should not keep a separate CSS-filter rendering path"
  );
});

test("output surfaces consume the finalized processed frame artifact", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("lastOutputSurfaceTrace = createOutputSurfaceTrace(finalUrl)") &&
      appScript.includes("previewUrl: finalUrl") &&
      appScript.includes("showFinal(\n      finalUrl") &&
      appScript.includes("addToGallery(finalUrl)"),
    "capture should create one finalized image artifact and pass it to upload, final preview, and gallery"
  );
  assert.ok(
    appScript.includes("function getShareOutputUrl()") &&
      appScript.includes("const url = getShareOutputUrl();") &&
      appScript.includes("qr: providedShareUrl") &&
      appScript.includes("print: printImageUrl") &&
      appScript.includes("download: url"),
    "QR, print, and download should consume the same resolved share output URL"
  );
  assert.ok(
    appScript.includes("recordGalleryPhoto(meta.slug, publicUrl") &&
      appScript.includes("galleryRemote: url") &&
      appScript.includes("remoteFinalUrl: publicUrl"),
    "production gallery records should use the uploaded URL created from the final artifact"
  );
  assert.ok(
    appScript.includes("photo_url: isVideo ? lastShareUrl || \"\" : lastShareUrl || imgUrl") &&
      appScript.includes("image_data_url: isVideo ? \"\" : imgUrl") &&
      appScript.includes("emailPhoto: templateParams.photo_url") &&
      appScript.includes("emailImageData: templateParams.image_data_url"),
    "email payloads should route the shared URL plus the exact final image data URL"
  );
  assert.ok(
    appScript.includes("getOutputSurfaceTrace: () => getOutputSurfaceTraceSnapshot()"),
    "browser verification should be able to inspect output surface routing"
  );
});

test("beauty processing is configured by filter choices, not guest controls", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("getGuestVisibleBeautyPresets") &&
      appScript.includes("function getSelectedFilterBeautySettings()") &&
      appScript.includes('beautyEngineModulePromise = import("./beauty/engine.mjs")') &&
      appScript.includes("await applySelectedBeautyToCanvas("),
    "beauty settings should be attached to existing filters and applied through the beauty engine"
  );

  assert.ok(
    !appScript.includes("beautySlider") &&
      !appScript.includes("beautyControls"),
    "guests should not get beauty adjustment controls"
  );
});

test("beauty presets use the configured preset contract", () => {
  const presets = readProjectFile("scripts", "beauty", "presets.mjs");
  const settings = readProjectFile("scripts", "beauty", "settings.mjs");
  const engine = readProjectFile("scripts", "beauty", "engine.mjs");
  const index = readProjectFile("scripts", "beauty", "index.mjs");
  const opencv = readProjectFile("scripts", "beauty", "opencv.mjs");

  assert.ok(
    presets.includes('id: "natural"') &&
      presets.includes('name: "Natural"') &&
      presets.includes("guestVisible: true") &&
      presets.includes("default: true") &&
      presets.includes("skinSmooth: 0") &&
      presets.includes("underEye: 4") &&
      presets.includes("exposure: 0") &&
      presets.includes("highlights: -10") &&
      presets.includes("sharpness: 12"),
    "natural preset should use the configured beauty and lighting schema"
  );
  assert.ok(
    settings.includes("DEFAULT_BEAUTY_VALUES") &&
      settings.includes("DEFAULT_LIGHTING_VALUES") &&
      settings.includes("normalizeBeautyPreset") &&
      presets.includes("getGuestVisibleBeautyPresets"),
    "preset normalization should keep beauty and lighting values in one contract"
  );
  assert.ok(
    engine.includes('from "./tracker.mjs"') &&
      engine.includes('from "./teeth.mjs"') &&
      engine.includes('from "./tone.mjs"') &&
      engine.includes('from "./lighting.mjs"') &&
      index.includes('from "./engine.mjs"') &&
      index.includes('from "./presets.mjs"'),
    "beauty modules should route through the renamed modular files"
  );
  assert.ok(
    opencv.includes("export async function initializeOpenCV()") &&
      opencv.includes("export async function matFromCanvas") &&
      opencv.includes("export function dispose") &&
      opencv.includes("export async function inpaint"),
    "OpenCV helpers should be modular optional utilities for future imaging work"
  );
});

test("auto enhancement and presets avoid full-face blur", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const presets = readProjectFile("scripts", "beauty", "presets.mjs");

  assert.ok(
    !appScript.includes("smoothingBlend") &&
      !appScript.includes('CanvasBuffer.get("beauty-pass"') &&
      !appScript.includes('softenedCtx.filter = "blur(1.8px) brightness(1.02)"'),
    "auto enhancement should not apply a full-canvas blur composite"
  );
  assert.ok(
    !presets.includes("skinSmooth: 15") &&
      !presets.includes("skinSmooth: 16") &&
      !presets.includes("skinSmooth: 20") &&
      !presets.includes("skinSmooth: 24") &&
      !presets.includes("skinSmooth: 36"),
    "guest-visible presets should not enable broad face smoothing by default"
  );
  assert.ok(
    !presets.includes("blemish: 14") &&
      !presets.includes("blemish: 16") &&
      !presets.includes("blemish: 18") &&
      !presets.includes("blemish: 20") &&
      !presets.includes("blemish: 24") &&
      !presets.includes("underEye: 10") &&
      !presets.includes("underEye: 12") &&
      !presets.includes("underEye: 20") &&
      !presets.includes("underEye: 22"),
    "guest-visible presets should keep blur-backed corrections subtle"
  );
});

test("blemish correction uses local healing before skin smoothing", () => {
  const blemish = readProjectFile("scripts", "beauty", "blemish.mjs");
  const engine = readProjectFile("scripts", "beauty", "engine.mjs");

  assert.ok(
    blemish.includes("const softened = document.createElement(\"canvas\")") &&
      blemish.includes("softenedCtx.filter = `blur(${1.2 + strength * 3}px)`") &&
      blemish.includes("* strength * 0.82") &&
      blemish.includes("const redExcess = red - (green + blue) / 2") &&
      blemish.includes("const darkSpot = sampleLuminance - luminance") &&
      blemish.includes("isSkinLikePixel(red, green, blue, luminance, saturation)") &&
      blemish.includes("lerp(red, redTarget, blend)"),
    "blemish correction should heal detected skin spots toward a local softened sample"
  );

  assert.ok(
    engine.indexOf("applyBlemishCorrection(canvas, masks.face, preset.beauty.blemish)") <
      engine.indexOf("applySmoothing(canvas, masks.face, preset.beauty.skinSmooth)"),
    "blemish detection should run before smoothing hides local spot contrast"
  );
});

test("under-eye correction uses feathered shadow and cool-cast correction", () => {
  const undereye = readProjectFile("scripts", "beauty", "undereye.mjs");

  assert.ok(
    undereye.includes("const softened = document.createElement(\"canvas\")") &&
      undereye.includes("softenedCtx.filter = `blur(${1.5 + strength * 3}px)`") &&
      undereye.includes("function getMaskWeight(") &&
      undereye.includes("const localShadow = clamp(") &&
      undereye.includes("const bluePurple = clamp(") &&
      undereye.includes("const neutralize = bluePurple * correction * 14") &&
      undereye.includes("lerp(blue, sampleBlue, blend) + lift * 0.62 - neutralize"),
    "under-eye correction should use feathered local shadow lifting and cool-cast neutralization"
  );
});

test("booth test mode provides deterministic camera, upload, and layout audit helpers", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes('getUrlParam("testMode") === "booth"') &&
      appScript.includes('DOM.videoContainer.dataset.boothTestCamera = "true"') &&
      appScript.includes("function applyBoothTestModeFromUrl()"),
    "booth test mode should be URL-gated and provide a fake camera marker"
  );
  assert.ok(
    appScript.includes("BOOTH_TEST_SHARE_URL") &&
      appScript.includes("result.publicUrl = BOOTH_TEST_SHARE_URL") &&
      appScript.includes("if (isBoothTestMode()) return;"),
    "booth test mode should bypass uploads and idle timers"
  );
  assert.ok(
    appScript.includes("__photoboothQA") &&
      appScript.includes("auditLayout: auditBoothLayout") &&
      appScript.includes("smallTapTargets") &&
      appScript.includes("overlaps"),
    "booth test mode should expose a compact layout audit helper"
  );
});
