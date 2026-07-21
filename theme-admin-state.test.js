const { pathToFileURL } = require("node:url");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadThemeStateModule() {
  return import(pathToFileURL(join(process.cwd(), "scripts/theme-admin-state.mjs")));
}

test("theme admin state owns theme options and selection without DOM fields", async () => {
  const { createThemeAdminState } = await loadThemeStateModule();
  const state = createThemeAdminState();

  state.setThemeOptions([
    { value: "general:basic", textContent: "Basic" },
    { value: "summer:summer", textContent: "Summer" },
  ]);

  assert.deepEqual(state.getThemeOptions(), [
    { value: "general:basic", textContent: "Basic" },
    { value: "summer:summer", textContent: "Summer" },
  ]);
  assert.equal(state.getSelectedThemeKey(), "general:basic");
  assert.equal(state.setSelectedThemeKey("summer:summer"), true);
  assert.equal(state.getSelectedThemeKey(), "summer:summer");
  assert.equal(state.setSelectedThemeKey("missing"), false);
  assert.equal(state.getSelectedThemeKey(), "summer:summer");
});

test("theme admin editor draft resets independently of theme selection", async () => {
  const { createThemeAdminState } = await loadThemeStateModule();
  const state = createThemeAdminState();
  state.editor.name.value = "Custom";
  state.editor.welcomeTitle.value = "Welcome";
  state.editor.accent.value = "#123456";

  state.resetEditorDraft();

  assert.equal(state.editor.name.value, "");
  assert.equal(state.editor.welcomeTitle.value, "");
  assert.equal(state.editor.accent.value, "#ff0000");
  assert.equal(state.editor.accent2.value, "#ffffff");
});
