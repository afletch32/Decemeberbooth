const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const app = readFileSync(join(process.cwd(), "scripts/app.js"), "utf8");
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} should close`);
}

test("Idle Screens are a first-class Cloudinary asset type", () => {
  assert.ok(app.includes('return "idle-screen"'));
  assert.ok(app.includes('kinds.push("idle-screens")'));
  assert.ok(app.includes('registerUploadedAsset(json.secure_url, kind'));
  assert.ok(html.includes("Idle Screens"));
  assert.ok(html.includes('id="addIdleScreensBtn"'));
  assert.ok(html.includes('id="idleScreensInput"'));
  assert.ok(app.includes("DOM.idleScreensInput.files"));
});

test("idle screens share canonical records and theme defaults", () => {
  assert.ok(app.includes('if (category === "idle-screen")'));
  assert.ok(app.includes('return "idleScreens"'));
  assert.ok(app.includes('{ key: "idle-screen", label: "Idle Screens" }'));
  assert.ok(app.includes("buttonZones:"));
});

test("idle screen editor state does not call late-defined helpers during app startup", () => {
  const stateIndex = app.indexOf("let idleScreenEditorZone =");
  const defaultsIndex = app.indexOf("const DEFAULT_IDLE_START_ZONE");
  assert.ok(stateIndex >= 0 && defaultsIndex > stateIndex);
  assert.ok(
    app.includes(
      "let idleScreenEditorZone = { x: 50, y: 73, width: 28, height: 20 };"
    )
  );
});

test("idle screen selection uses event orientation before theme and general fallbacks", () => {
  const resolver = extractFunction(app, "selectIdleScreenEntry");
  assert.ok(resolver.indexOf("find(eventEntries, orientation)") < resolver.indexOf("find(themeEntries, orientation)"));
  assert.ok(resolver.indexOf('find(themeEntries, orientation)') < resolver.indexOf('find(eventEntries, "general")'));
  assert.ok(resolver.indexOf('find(eventEntries, "general")') < resolver.indexOf('find(themeEntries, "general")'));
});

test("legacy welcome remains the fallback when custom artwork is unavailable", () => {
  assert.ok(app.includes("else clearCustomIdleScreen();"));
  assert.ok(app.includes("DOM.welcomeScreen.classList.remove(\"custom-idle-screen\")"));
  assert.ok(app.includes("DOM.welcomeImg.onerror = clearCustomIdleScreen"));
});

test("custom artwork hides legacy chrome only in custom idle mode", () => {
  assert.ok(html.includes("#welcomeScreen.custom-idle-screen #welcomeTitle"));
  assert.ok(html.includes("#welcomeScreen.custom-idle-screen #startButton"));
  assert.ok(html.includes("#welcomeScreen.custom-idle-screen #startButton:focus-visible"));
  assert.ok(html.includes("filter: none; backdrop-filter: none; -webkit-backdrop-filter: none;"));
});

test("the existing start handler remains the only guest start path", () => {
  assert.equal((html.match(/id="startButton"/g) || []).length, 1);
  assert.equal((html.match(/onclick="beginWelcome\(event\)"/g) || []).length, 1);
});

test("starting from custom artwork reveals the mode selection step", () => {
  const beginWelcome = extractFunction(app, "beginWelcome");
  assert.ok(beginWelcome.includes("clearCustomIdleScreen();"));
  assert.ok(
    beginWelcome.indexOf("clearCustomIdleScreen();") <
      beginWelcome.indexOf('setWelcomeFlowStep("mode");')
  );
});

test("returning from mode selection restores custom idle artwork", () => {
  const goBackFromWelcome = extractFunction(app, "goBackFromWelcome");
  assert.ok(goBackFromWelcome.includes('setWelcomeFlowStep("idle");'));
  assert.ok(goBackFromWelcome.includes("const idleEntry = selectIdleScreenEntry();"));
  assert.ok(goBackFromWelcome.includes("if (idleEntry) applyCustomIdleScreen(idleEntry);"));
});

test("welcome mode inline handlers can resolve their exported function", () => {
  assert.ok(html.includes("onclick=\"beginModeSelection('still-photo', event)\""));
  assert.ok(app.includes("  beginModeSelection,\n  beginWelcome,"));
});

test("cover bounds account for horizontal and vertical cropping", () => {
  const source = extractFunction(app, "getCoverImageRect");
  const getCoverImageRect = Function(`${source}; return getCoverImageRect;`)();
  assert.deepEqual(
    getCoverImageRect({ naturalWidth: 1600, naturalHeight: 900 }, { clientWidth: 1000, clientHeight: 1000 }),
    { left: -388.8888888888889, top: 0, width: 1777.7777777777778, height: 1000 }
  );
  const portraitCrop = getCoverImageRect(
    { naturalWidth: 900, naturalHeight: 1600 },
    { clientWidth: 1200, clientHeight: 800 }
  );
  assert.equal(portraitCrop.left, 0);
  assert.equal(portraitCrop.width, 1200);
  assert.ok(Math.abs(portraitCrop.top - -666.6666666666666) < 1e-9);
  assert.ok(Math.abs(portraitCrop.height - 2133.333333333333) < 1e-9);
});

test("resize and orientation changes recalculate hotspot placement", () => {
  assert.ok(app.includes('window.addEventListener("resize"'));
  assert.ok(app.includes('window.addEventListener("orientationchange"'));
  assert.ok(app.includes("positionIdleStartHotspot(idleEntry)"));
  assert.ok(app.includes("applyCustomIdleScreen(idleEntry)"));
});

test("admin editor supports bounded drag resize reset and save", () => {
  assert.ok(html.includes('id="idleScreenEditorZone"'));
  assert.ok(html.includes("Reset button position"));
  assert.ok(app.includes("setPointerCapture"));
  assert.ok(app.includes("normalizeIdleButtonZone"));
  assert.ok(app.includes('showToast("Idle screen hotspot saved.")'));
  assert.ok(
    html.includes('</div>\n\n  <div id="idleScreenEditorModal"'),
    "idle-screen editor should be mounted after the hidden booth screen"
  );
});

test("idle screen delivery does not introduce local asset paths", () => {
  const implementation = [
    extractFunction(app, "applyCustomIdleScreen"),
    extractFunction(app, "selectIdleScreenEntry"),
    extractFunction(app, "openIdleScreenEditor"),
  ].join("\n");
  assert.ok(!implementation.includes("/assets/"));
  assert.ok(!implementation.includes("res.cloudinary.com"));
});
