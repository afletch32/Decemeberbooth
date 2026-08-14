const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("asset deletion removes the item from the active session", () => {
  const app = fs.readFileSync("scripts/app.js", "utf8");
  const deleteStart = app.indexOf("async function deleteAssetLibraryItem(");
  const deleteEnd = app.indexOf("\nfunction archiveLibraryAssetByUrl", deleteStart);
  const deleteFlow = app.slice(deleteStart, deleteEnd);
  assert.match(deleteFlow, /removeSessionAssetBySrc\(category, fallbackUrl\)/);
  assert.match(deleteFlow, /updateLaunchSummary\(\)/);
});
