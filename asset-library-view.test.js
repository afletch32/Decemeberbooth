const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadAssetLibraryView() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/asset-library-view.mjs"))
  );
}

const rows = [
  {
    id: "overlay:school",
    category: "overlay",
    name: "School Frame",
    tags: ["hawks"],
    themeKeys: ["school:hawks"],
    createdAt: "2026-07-18T12:00:00.000Z",
  },
  {
    id: "background:wedding",
    category: "background",
    name: "Wedding Garden",
    url: "assets/wedding/garden.jpg",
    createdAt: "2026-07-20T12:00:00.000Z",
  },
  {
    id: "idle:summer",
    category: "idle-screen",
    name: "Summer Welcome",
    tags: ["portrait"],
    themeKeys: ["summer:pool"],
    createdAt: "2026-07-19T12:00:00.000Z",
  },
];

test("asset view categories derive from theme keys and asset metadata", async () => {
  const {
    getAssetLibraryFilterCategories,
    themeKeyToCategory,
  } = await loadAssetLibraryView();

  assert.equal(themeKeyToCategory("school:hawks"), "school");
  assert.equal(themeKeyToCategory("summer:pool"), "holidays");
  assert.equal(themeKeyToCategory("general:birthday"), "birthday");
  assert.deepEqual(getAssetLibraryFilterCategories(rows[0]), ["school"]);
  assert.deepEqual(getAssetLibraryFilterCategories(rows[1]), ["wedding"]);
  assert.deepEqual(
    getAssetLibraryFilterCategories({ name: "Uncategorized upload" }),
    ["general"]
  );
});

test("asset view filters combine type, event category, and search", async () => {
  const { filterAssetLibraryRows } = await loadAssetLibraryView();

  assert.deepEqual(
    filterAssetLibraryRows(rows, { pillCategory: "idle-screen" }).map(
      (asset) => asset.id
    ),
    ["idle:summer"]
  );
  assert.deepEqual(
    filterAssetLibraryRows(rows, { category: "school", query: "hawks" }).map(
      (asset) => asset.id
    ),
    ["overlay:school"]
  );
});

test("asset view sorting preserves every supported admin sort mode", async () => {
  const { sortAssetLibraryRows } = await loadAssetLibraryView();
  const options = {
    favoriteKeys: ["idle:summer"],
    recentKeys: ["overlay:school", "background:wedding"],
  };

  assert.deepEqual(
    sortAssetLibraryRows(rows, "newest", options).map((asset) => asset.id),
    ["background:wedding", "idle:summer", "overlay:school"]
  );
  assert.deepEqual(
    sortAssetLibraryRows(rows, "oldest", options).map((asset) => asset.id),
    ["overlay:school", "idle:summer", "background:wedding"]
  );
  assert.equal(sortAssetLibraryRows(rows, "favorites", options)[0].id, "idle:summer");
  assert.deepEqual(
    sortAssetLibraryRows(rows, "recent", options)
      .slice(0, 2)
      .map((asset) => asset.id),
    ["overlay:school", "background:wedding"]
  );
  assert.deepEqual(
    sortAssetLibraryRows(rows, "category", options).map((asset) => asset.id),
    ["background:wedding", "overlay:school", "idle:summer"]
  );
});
