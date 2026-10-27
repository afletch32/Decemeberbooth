const assert = require("node:assert/strict");
const { test } = require("node:test");

test("launch prepares the theme once before switching screens", async () => {
  const { createImagingModule } = await import("./scripts/app/booth/imaging.mjs");
  let loads = 0;
  const calls = [];
  const runtime = {
    activeTheme: null,
    prepareThemeSessionFromSetup() { this.activeTheme = {}; loads++; },
    getSelectedThemeKey: () => "school:hawksCheer",
    loadTheme() { this.activeTheme = {}; loads++; },
    DOM: { allowRetakes: { checked: true } },
  };
  const imaging = createImagingModule(runtime);
  // Stop at the first booth transition: the camera path is checked in-browser.
  runtime.DOM.boothScreen = { classList: { remove() { calls.push(loads); throw new Error("transition"); } } };
  await assert.rejects(imaging.startBooth(), /transition/);
  assert.deepEqual(calls, [1]);
  loads = 0;
  await assert.rejects(imaging.startBooth({ preserveSession: true }), /transition/);
  assert.equal(loads, 1);
});

test("font picker setup shares initialization without rebuilding on each theme load", async () => {
  const { createEditorManagementModule } = await import("./scripts/app/themes/editor-management.mjs");
  let refreshes = 0;
  const runtime = { reloadFontPickerOptions: async () => { refreshes++; } };
  const { setupFontPicker } = createEditorManagementModule(runtime);
  await Promise.all([setupFontPicker(), setupFontPicker()]);
  await setupFontPicker();
  assert.equal(refreshes, 1);
  assert.equal(runtime.fontPickerInitialized, true);
});

test("font refresh reuses the manifest and still merges newly stored families", async (t) => {
  const { createFontPickerModule } = await import("./scripts/app/themes/font-picker.mjs");
  let requests = 0;
  let stored = [];
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return { ok: true, json: async () => ({ available: [{ name: "Original" }] }) };
  });
  const priorStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => JSON.stringify(stored) };
  t.after(() => { globalThis.localStorage = priorStorage; });
  const runtime = {
    fontsRemoteRequested: true,
    DOM: {},
    buildGoogleFontsURL: () => "",
    getSelectedThemeTarget: () => ({}),
  };
  const { reloadFontPickerOptions } = createFontPickerModule(runtime);
  await reloadFontPickerOptions();
  stored = [{ type: "family", value: "Uploaded" }];
  await reloadFontPickerOptions();
  assert.equal(requests, 1);
  assert.deepEqual(runtime.fontCatalog.available.map((font) => font.name), ["Original", "Uploaded"]);
});
