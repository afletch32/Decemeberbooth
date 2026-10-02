const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadThemeCatalogUtils() {
  return import(pathToFileURL(join(process.cwd(), "scripts/theme-catalog-utils.mjs")));
}

test("theme catalog keeps only approved complete theme packs", async () => {
  const { pruneUnapprovedThemes } = await loadThemeCatalogUtils();
  const catalog = {
    general: { name: "General", themes: { summer: {}, basic: {} } },
    expo: { name: "Expo", themes: { brandStudio: {}, leadCapture: {} } },
    client: { name: "Client", themes: { custom: {} } },
    clientCustom: { name: "Custom Theme", backgrounds: [] },
  };

  const removed = pruneUnapprovedThemes(
    catalog,
    new Set(["general:summer"])
  );

  assert.equal(removed, true);
  assert.deepEqual(catalog, {
    general: { name: "General", themes: { summer: {} } },
  });
});

test("theme catalog removes empty roots left by stale unapproved packs", async () => {
  const { pruneUnapprovedThemes } = await loadThemeCatalogUtils();
  const catalog = {
    general: { name: "General", themes: { summer: {} } },
    expo: { name: "Expo", themes: { brandStudio: {}, leadCapture: {} } },
    "legacy-general": { name: "Basic", themes: { basic: {} } },
  };

  pruneUnapprovedThemes(catalog, new Set(["general:summer"]));

  assert.deepEqual(catalog, {
    general: { name: "General", themes: { summer: {} } },
  });
});
