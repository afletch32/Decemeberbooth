const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadApplyEventNameToTheme() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.applyEventNameToTheme;
}

async function loadMergeUniqueUrls() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.mergeUniqueUrls;
}

async function loadApplyThemeText() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.applyThemeText;
}

async function loadGetEventTextOverrides() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.getEventTextOverrides;
}

async function loadHasEventTextOverrides() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.hasEventTextOverrides;
}

async function loadFontStyleHelpers() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/event-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return {
    normalizeEventStyle: mod.normalizeEventStyle,
    inferThemeEventStyle: mod.inferThemeEventStyle,
    pairingSupportsEventStyle: mod.pairingSupportsEventStyle
  };
}

test("applyEventNameToTheme sets name and welcome title", async () => {
  const applyEventNameToTheme = await loadApplyEventNameToTheme();
  const theme = {};
  const result = applyEventNameToTheme(theme, "Holiday Party");

  assert.equal(result.name, "Holiday Party");
  assert.equal(result.welcome.title, "Holiday Party");
});

test("applyEventNameToTheme preserves existing welcome title", async () => {
  const applyEventNameToTheme = await loadApplyEventNameToTheme();
  const theme = { welcome: { title: "Existing Title" } };
  const result = applyEventNameToTheme(theme, "New Event");

  assert.equal(result.name, "New Event");
  assert.equal(result.welcome.title, "Existing Title");
});

test("mergeUniqueUrls keeps preferred order and removes duplicates", async () => {
  const mergeUniqueUrls = await loadMergeUniqueUrls();
  const result = mergeUniqueUrls(
    ["a.png", "b.png", "a.png"],
    ["b.png", "c.png"]
  );

  assert.deepEqual(result, ["a.png", "b.png", "c.png"]);
});

test("applyThemeText assigns theme text fields", async () => {
  const applyThemeText = await loadApplyThemeText();
  const theme = {};
  const result = applyThemeText(theme, {
    bannerText: "Party Time",
    welcomeTitle: "Welcome!",
    startButtonText: "Begin",
    captureLabel: "Snap"
  });

  assert.equal(result.bannerText, "Party Time");
  assert.equal(result.welcome.title, "Welcome!");
  assert.equal(result.welcome.prompt, "Begin");
  assert.equal(result.captureLabel, "Snap");
});

test("getEventTextOverrides provides empty strings for missing fields", async () => {
  const getEventTextOverrides = await loadGetEventTextOverrides();
  const result = getEventTextOverrides({});

  assert.deepEqual(result, {
    bannerText: "",
    welcomeTitle: "",
    welcomeTitleSize: null,
    startButtonText: "",
    captureLabel: ""
  });
});

test("hasEventTextOverrides detects non-empty override values", async () => {
  const hasEventTextOverrides = await loadHasEventTextOverrides();

  assert.equal(hasEventTextOverrides({}), false);
  assert.equal(hasEventTextOverrides({ bannerText: "Party" }), true);
  assert.equal(hasEventTextOverrides({ welcomeTitleSize: 48 }), true);
});

test("normalizeEventStyle collapses aliases to supported setup styles", async () => {
  const { normalizeEventStyle } = await loadFontStyleHelpers();

  assert.equal(normalizeEventStyle("Bridal"), "wedding");
  assert.equal(normalizeEventStyle("conference"), "expo");
  assert.equal(normalizeEventStyle("party"), "birthday");
  assert.equal(normalizeEventStyle("festival"), "community");
  assert.equal(normalizeEventStyle(""), "general");
});

test("inferThemeEventStyle prefers saved style and otherwise infers from theme data", async () => {
  const { inferThemeEventStyle } = await loadFontStyleHelpers();

  assert.equal(inferThemeEventStyle("general:basic", { fontPairingStyle: "expo" }), "expo");
  assert.equal(inferThemeEventStyle("winter:christmas", { name: "Winter Wonderland" }), "christmas");
  assert.equal(inferThemeEventStyle("general:basic", { name: "Neighborhood Expo Booth" }), "expo");
});

test("pairingSupportsEventStyle matches explicit style tags and general fallbacks", async () => {
  const { pairingSupportsEventStyle } = await loadFontStyleHelpers();

  assert.equal(pairingSupportsEventStyle({ styles: ["wedding"] }, "wedding"), true);
  assert.equal(pairingSupportsEventStyle({ styles: ["general"] }, "expo"), true);
  assert.equal(pairingSupportsEventStyle({ notes: "Romantic elegance for weddings" }, "wedding"), true);
  assert.equal(pairingSupportsEventStyle({ notes: "Spooky season" }, "expo"), false);
});
