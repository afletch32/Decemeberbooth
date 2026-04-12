const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("managed asset uploads are Cloudinary-only", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes('showToast("Upload failed: configure Cloudinary to store assets.");'),
    "asset upload failures should point users to Cloudinary"
  );
  assert.ok(
    !appScript.includes("uploadAssetToLocalApi"),
    "asset uploads should not keep a local-disk fallback"
  );
});

test("asset migration UI is exposed from the Cloudinary settings section", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="migrateAssetsBtn" onclick="saveCloudinarySettings(); migrateAllManagedLocalAssets()"'),
    "Cloudinary settings should expose a migrate assets action"
  );
  assert.ok(
    appScript.includes("async function migrateAllManagedLocalAssets()"),
    "the app should define a full migration workflow"
  );
  assert.ok(
    appScript.includes("migrateAllManagedLocalAssets,"),
    "the migration workflow should be exported for inline button handlers"
  );
});
