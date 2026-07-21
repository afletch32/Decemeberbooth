const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const app = readFileSync(join(process.cwd(), "scripts/app.js"), "utf8");
const idleScreenModule = readFileSync(join(process.cwd(), "scripts/idle-screen.mjs"), "utf8");
const assetLibraryUtils = readFileSync(
  join(process.cwd(), "scripts/asset-library-utils.mjs"),
  "utf8"
);
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

function extractFunctionFromEither(source, moduleSource, name) {
  const appIndex = source.indexOf(`function ${name}`);
  const moduleIndex = moduleSource.indexOf(`function ${name}`);
  if (appIndex === -1 && moduleIndex === -1) {
    throw new Error(`${name} should exist`);
  }
  const useApp = appIndex !== -1 && (moduleIndex === -1 || appIndex < moduleIndex);
  const chosenSource = useApp ? source : moduleSource;
  const start = useApp ? appIndex : moduleIndex;
  const bodyStart = chosenSource.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < chosenSource.length; index += 1) {
    if (chosenSource[index] === "{") depth += 1;
    if (chosenSource[index] === "}") depth -= 1;
    if (depth === 0) return chosenSource.slice(start, index + 1);
  }
  throw new Error(`${name} should close`);
}

function extractFunction(source, name) {
  return extractFunctionFromEither(source, idleScreenModule, name);
}

test("Idle Screens are a first-class Cloudinary asset type", () => {
  assert.ok(assetLibraryUtils.includes('return "idle-screen"'));
  assert.ok(app.includes('kinds.push("idle-screens")'));
  assert.ok(app.includes("registerUploadedAsset(deliveryUrl, kind"));
  assert.ok(html.includes("Idle Screens"));
  assert.ok(html.includes('id="addAssetsBtn"'));
  assert.ok(html.includes('id="bulkToIdleScreens"'));
  assert.ok(html.includes('id="bulkToPhotoChoiceScreens"'));
  assert.ok(!html.includes('id="addIdleScreensBtn"'));
  assert.ok(!html.includes('id="addPhotoChoiceScreenBtn"'));
});

test("idle screens share canonical records and theme defaults", () => {
  assert.ok(app.includes('if (category === "idle-screen")'));
  assert.ok(app.includes('return "idleScreens"'));
  assert.ok(app.includes('{ key: "idle-screen", label: "Idle Screens" }'));
  assert.ok(app.includes("buttonZones:"));
});

test("idle screen editor state does not call late-defined helpers during app startup", () => {
  const stateIndex = app.indexOf("let idleScreenEditorZone =");
  assert.ok(stateIndex >= 0);
  assert.ok(assetLibraryUtils.includes("const DEFAULT_IDLE_START_ZONE"));
  assert.ok(
    app.includes(
      "let idleScreenEditorZone = { x: 50, y: 73, width: 28, height: 20 };"
    )
  );
});

test("idle screen selection uses the manually selected event entry before theme defaults", () => {
  const resolver = extractFunctionFromEither(app, "", "selectIdleScreenEntry");
  assert.ok(
    resolver.includes("getIdleScreenAssignmentEntries()"),
    "the resolver should use the event and session assignment source"
  );
  assert.ok(
    resolver.includes("find(eventEntries) || find(themeEntries)"),
    "the selected event/session screen should win without changing with the viewport"
  );
  assert.ok(!resolver.includes("getIdleScreenViewportOrientation()"));
});

test("legacy welcome remains the fallback when custom artwork is unavailable", () => {
  assert.ok(app.includes("else clearCustomIdleScreen();"));
  assert.ok(app.includes("DOM.welcomeScreen.classList.remove(\"custom-idle-screen\")"));
  assert.ok(app.includes("media.onerror = clearCustomIdleScreen"));
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
  assert.ok(beginWelcome.includes("runWelcomeInteraction(event"));
  assert.ok(beginWelcome.includes("clearCustomIdleScreen();"));
  assert.ok(
    beginWelcome.indexOf("clearCustomIdleScreen();") <
      beginWelcome.indexOf('setWelcomeFlowStep("mode");')
  );
});

test("welcome hotspots provide a press response before changing screens", () => {
  const interaction = extractFunction(app, "runWelcomeInteraction");
  assert.ok(interaction.includes('classList.add("welcome-transitioning")'));
  assert.ok(interaction.includes('classList.add("welcome-hotspot-pressed")'));
  assert.ok(interaction.includes("window.setTimeout"));
  assert.ok(html.includes("#welcomeScreen.welcome-transitioning #welcomeOverlay::after"));
  assert.ok(html.includes("@keyframes welcomeHotspotPress"));
});

test("returning from mode selection restores custom idle artwork", () => {
  const goBackFromWelcome = extractFunction(app, "goBackFromWelcome");
  assert.ok(goBackFromWelcome.includes('setWelcomeFlowStep("idle");'));
  assert.ok(goBackFromWelcome.includes("const idleEntry = selectIdleScreenEntry();"));
  assert.ok(goBackFromWelcome.includes("if (idleEntry) applyCustomIdleScreen(idleEntry);"));
});

test("photo choice artwork uses two saved invisible hotspots", () => {
  assert.ok(html.includes('id="photoChoiceSingleZone"'));
  assert.ok(html.includes('id="photoChoiceStripZone"'));
  assert.ok(html.includes('custom-photo-choice-screen'));
  assert.ok(app.includes('role === "photo-choice"'));
  assert.ok(app.includes('place("still-photo", zones.singlePhoto'));
  assert.ok(app.includes('place("strip", zones.photoStrip'));
  assert.ok(app.includes("selectPhotoChoiceScreenEntry()"));
  assert.ok(
    html.includes(
      "#welcomeScreen.custom-photo-choice-screen .welcome-mode-btn > * { visibility: hidden !important; }"
    )
  );
});

test("custom welcome artwork hides legacy UI before its image finishes loading", () => {
  const photoChoice = extractFunction(app, "applyCustomPhotoChoiceScreen");
  const idle = extractFunction(app, "applyCustomIdleScreen");

  assert.ok(
    photoChoice.indexOf('classList.add("custom-photo-choice-screen",') <
      photoChoice.indexOf("loadWelcomeArtwork(")
  );
  assert.ok(
    idle.indexOf('classList.add("custom-idle-screen",') <
      idle.indexOf("loadWelcomeArtwork(")
  );
  assert.ok(html.includes("#welcomeScreen.custom-artwork-loading::after"));
  assert.ok(app.includes("startCustomArtworkLoadFallback();"));
  assert.ok(app.includes("}, 8000);"));
});

test("idle and photo choice screens accept looping video without blocking hotspots", () => {
  assert.ok(html.includes('id="bulkAssetsInput" accept="image/*,video/*"'));
  assert.ok(
    html.includes(
      "MP4 works for backgrounds, idle screens, and photo choice screens."
    )
  );
  assert.ok(
    html.includes(
      'id="welcomeVideo" class="hidden" autoplay muted loop playsinline'
    )
  );
  assert.ok(html.includes("#welcomeScreen.custom-idle-screen #welcomeVideo"));
  assert.ok(
    html.includes("#welcomeScreen.custom-photo-choice-screen #welcomeVideo")
  );
  assert.ok(html.includes("#welcomeVideo {") || html.includes("#welcomeVideo { z-index:"));
  assert.ok(app.includes("function isVideoAsset(entry)"));
  assert.ok(app.includes("function loadWelcomeArtwork(entry, onReady)"));
  assert.ok(app.includes("media.play().catch(() => {});"));
  assert.ok(app.includes("const media = getWelcomeArtworkMedia(entry);"));
});

test("Amanda North has a built-in portrait looping idle screen", () => {
  assert.ok(
    app.includes(
      'src: "/assets/themes/back-to-school/amanda-north-coyotes-idle-wave-portrait.mp4"'
    )
  );
  assert.ok(app.includes('orientation: "portrait"'));
  assert.ok(
    app.includes(
      'poster: "/assets/themes/back-to-school/back-to-school-idle-portrait.png"'
    )
  );
  assert.ok(app.includes("start: { x: 50, y: 88, width: 84, height: 14 }"));
});

test("admin video previews use still images without downloading or autoplaying MP4s", () => {
  const preview = extractFunction(app, "createAssetPreviewMedia");
  assert.ok(preview.includes('document.createElement("img")'));
  assert.ok(preview.includes("getVideoPreviewPosterSrc(entry, src)"));
  assert.ok(!preview.includes('document.createElement("video")'));
  assert.ok(!preview.includes(".play()"));
});

test("video screen hotspots use media dimensions in runtime and editor", () => {
  const coverRect = extractFunction(app, "getCoverImageRect");
  assert.ok(coverRect.includes("img.videoWidth"));
  assert.ok(coverRect.includes("img.videoHeight"));
  assert.ok(html.includes('id="idleScreenEditorVideo"'));
  assert.ok(app.includes("function getIdleScreenEditorMedia()"));
  assert.ok(app.includes("DOM.idleScreenEditorVideo.onloadedmetadata"));
  assert.ok(app.includes("contentType: (file && file.type) || \"\""));
});

test("background assets accept video and render through shared video surfaces", () => {
  assert.ok(html.includes('id="themeBackground" accept="image/*,video/*"'));
  assert.ok(
    html.includes('id="themeGreenBackgrounds" accept="image/*,video/*"')
  );
  assert.ok(html.includes('id="boothBackgroundVideo"'));
  assert.ok(html.includes('id="photoBackgroundVideo"'));
  assert.ok(app.includes("setLoopingVideoSource(DOM.boothBackgroundVideo, bg)"));
  assert.ok(
    app.includes("setLoopingVideoSource(DOM.photoBackgroundVideo, background.src)")
  );
  assert.ok(app.includes('isVideoFile ? "video" : "image"'));
  assert.ok(app.includes("const bgImg = await loadDrawableMedia(bg);"));
});

test("shared photo choice uploads persist as photo-choice idle screens", () => {
  assert.ok(app.includes('kinds.push("photo-choice-screens")'));
  assert.ok(
    assetLibraryUtils.includes('raw === "photo-choice-screens"') &&
      assetLibraryUtils.includes('return "idle-screen"')
  );
  assert.ok(
    app.includes('isPhotoChoiceAssetKind(kind) ? "photo-choice" : "idle"')
  );
  assert.ok(app.includes("replaceIdleScreenRoleEntry("));
  assert.ok(
    app.includes('isPhotoChoiceAssetKind(kind) ? "photo-choice" : undefined')
  );
});

test("selecting a screen replaces only the matching role", () => {
  const replaceSource = extractFunctionFromEither(
    app,
    "",
    "replaceIdleScreenRoleEntry"
  );
  const replaceIdleScreenRoleEntry = Function(
    `${replaceSource}; return replaceIdleScreenRoleEntry;`
  )();
  const entries = [
    { src: "idle-landscape.mp4", role: "idle", orientation: "landscape" },
    {
      src: "choice-landscape.mp4",
      role: "photo-choice",
      orientation: "landscape",
    },
  ];
  const replacement = {
    src: "idle-portrait.mp4",
    role: "idle",
    orientation: "portrait",
  };

  assert.deepEqual(
    replaceIdleScreenRoleEntry(entries, replacement),
    [entries[1], replacement]
  );
});

test("uploaded idle screen entries preserve their detected orientation", () => {
  const builder = extractFunctionFromEither(
    app,
    "",
    "buildIdleScreenEntryFromUrl"
  );
  assert.ok(builder.includes("storedAsset && storedAsset.orientation"));
  assert.ok(builder.includes("inferAssetOrientationFromName(file)"));
  assert.ok(!builder.includes('orientation: "general"'));
});

test("Asset Library cards identify idle-screen orientation and role", () => {
  assert.ok(app.includes('orientationBadge.textContent ='));
  assert.ok(app.includes('? "Portrait"'));
  assert.ok(app.includes(': "Landscape"'));
  assert.ok(app.includes('? "Photo choice" : "Idle screen"'));
  assert.ok(app.includes('container.classList.contains("asset-library-card")'));
  assert.ok(app.includes('fallback.textContent = "Preview unavailable"'));
  assert.ok(html.includes(".asset-library-preview-fallback"));
  const canonicalRow = extractFunction(app, "createCanonicalAssetRow");
  assert.ok(canonicalRow.includes("normalizeIdleScreenOrientation(raw.orientation)"));
  assert.ok(canonicalRow.includes('raw.role === "photo-choice"'));
  assert.ok(canonicalRow.includes("contentType: String(raw.contentType"));
  const effectiveSelection = extractFunction(
    app,
    "getSessionEffectiveAssetSourceSet"
  );
  assert.ok(effectiveSelection.includes('["idle", "photo-choice"]'));
  assert.ok(
    effectiveSelection.includes(
      "findRole(assignedEntries, role) || findRole(themeEntries, role)"
    )
  );
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
  assert.ok(app.includes('"Idle screen hotspot saved."'));
  assert.ok(
    html.includes('</div>\n\n  <div id="idleScreenEditorModal"'),
    "idle-screen editor should be mounted after the hidden booth screen"
  );
});

test("idle screen delivery does not introduce local asset paths", () => {
  const implementation = [
    extractFunction(app, "applyCustomIdleScreen"),
    extractFunctionFromEither(app, idleScreenModule, "selectIdleScreenEntry"),
    extractFunction(app, "openIdleScreenEditor"),
  ].join("\n");
  assert.ok(!implementation.includes("/assets/"));
  assert.ok(!implementation.includes("res.cloudinary.com"));
});
