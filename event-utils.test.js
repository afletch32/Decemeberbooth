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
