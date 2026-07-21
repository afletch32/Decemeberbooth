const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadExternalLibraryModule() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/external-library-loader.mjs"))
  );
}

function createLoaderHarness() {
  const windowRef = {};
  const scripts = [];
  const documentRef = {
    createElement() {
      return {};
    },
    head: {
      appendChild(script) {
        scripts.push(script);
      },
    },
  };
  return { documentRef, scripts, windowRef };
}

test("external libraries load only when their feature requests them", async () => {
  const { createExternalLibraryLoader } = await loadExternalLibraryModule();
  const harness = createLoaderHarness();
  const loader = createExternalLibraryLoader({
    getWindow: () => harness.windowRef,
    getDocument: () => harness.documentRef,
  });

  assert.equal(harness.scripts.length, 0);
  const pending = loader.loadQrCodeLibrary();
  assert.equal(harness.scripts.length, 1);
  assert.match(harness.scripts[0].src, /qrcode@1\.5\.1/);
  harness.windowRef.QRCode = { toCanvas() {} };
  harness.scripts[0].onload();
  assert.equal(await pending, harness.windowRef.QRCode);
});

test("external library requests share one in-flight script", async () => {
  const { createExternalLibraryLoader } = await loadExternalLibraryModule();
  const harness = createLoaderHarness();
  const loader = createExternalLibraryLoader({
    getWindow: () => harness.windowRef,
    getDocument: () => harness.documentRef,
  });

  const first = loader.loadEmailJsLibrary();
  const second = loader.loadEmailJsLibrary();
  assert.equal(harness.scripts.length, 1);
  harness.windowRef.emailjs = { send() {} };
  harness.scripts[0].onload();
  assert.equal(await first, harness.windowRef.emailjs);
  assert.equal(await second, harness.windowRef.emailjs);
});

test("initial HTML does not preload optional feature libraries", () => {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

  assert.ok(!html.includes("qrcode.min.js"));
  assert.ok(!html.includes("email.min.js"));
  assert.ok(!html.includes("jszip.min.js"));
  assert.ok(!html.includes("selfie_segmentation.js"));
});
