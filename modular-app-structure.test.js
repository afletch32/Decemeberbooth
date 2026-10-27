const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function listFiles(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(file, extension);
    return entry.isFile() && file.endsWith(extension) ? [file] : [];
  });
}

function lineCount(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).length;
}

test("booth entry, static page, and feature modules stay within size limits", () => {
  assert.ok(lineCount("scripts/app.js") <= 500, "app.js must remain a small composition root");
  assert.ok(lineCount("index.html") <= 1500, "index.html must remain a static page shell");
  assert.ok(!fs.readFileSync("index.html", "utf8").includes("<style"), "page CSS belongs in stylesheets");

  for (const file of listFiles("scripts/app", ".mjs")) {
    assert.ok(lineCount(file) <= 2000, `${file} must stay a focused feature module`);
  }
  for (const file of listFiles("styles", ".css").filter((name) => path.basename(name).startsWith("app-"))) {
    assert.ok(lineCount(file) <= 2000, `${file} must stay a focused stylesheet`);
  }
});

test("service worker precaches every application module and split stylesheet", () => {
  const serviceWorker = fs.readFileSync("sw.js", "utf8");
  const html = fs.readFileSync("index.html", "utf8");
  const previewStylesheet = html.match(/href="(final-preview-sizing-fix\.css\?v=[^"]+)"/);
  assert.ok(previewStylesheet, "the final preview stylesheet should have a cache-busting version");
  assert.ok(
    serviceWorker.includes(`"${previewStylesheet[1]}"`),
    "the service worker should precache the exact final preview stylesheet URL for offline use"
  );

  for (const file of listFiles("scripts/app", ".mjs")) {
    const assetPath = file.split(path.sep).join("/");
    assert.ok(serviceWorker.includes(`"${assetPath}"`), `${assetPath} should be in the app shell cache`);
  }
  for (const file of listFiles("styles", ".css").filter((name) => path.basename(name).startsWith("app-"))) {
    const assetPath = file.split(path.sep).join("/");
    assert.ok(serviceWorker.includes(`"${assetPath}"`), `${assetPath} should be in the app shell cache`);
  }
});
