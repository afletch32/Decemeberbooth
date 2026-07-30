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

test("idle screens share canonical records while staying out of the library view", () => {
  assert.ok(app.includes('if (category === "idle-screen")'));
  assert.ok(app.includes('return "idleScreens"'));
  assert.ok(
    app.includes(
      'if (normalizeUploadedAssetCategory(asset && asset.category) === "idle-screen")'
    )
  );
  assert.ok(!app.includes('{ key: "idle-screen", label: "Idle Screens" }'));
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

test("idle screen selection uses the matching event entry and selected booth shape", () => {
  const resolver = extractFunctionFromEither(app, "", "selectIdleScreenEntry");
  assert.ok(
    resolver.includes("getIdleScreenAssignmentEntries()"),
    "the resolver should use the event and session assignment source"
  );
  assert.ok(
    resolver.includes("find(eventEntries) || find(themeEntries)"),
    "the selected event/session screen should win without changing with the viewport"
  );
  assert.ok(resolver.includes("getGuestScreenOrientation()"));
  assert.ok(resolver.includes("normalizeIdleScreenOrientation(entry.orientation)"));
});

test("theme selection uses one booth screen shape for every themed guest screen", () => {
  assert.ok(html.includes('id="guestScreenOrientation"'));
  assert.ok(html.includes("Booth screen shape"));
  assert.ok(app.includes("function getGuestScreenOrientation()"));
  assert.ok(app.includes("function setGuestScreenOrientation(value)"));
  assert.ok(app.includes("const orientation = getGuestScreenOrientation();"));
  assert.ok(app.includes("getActiveBackground(theme);"));
  const idleResolver = extractFunctionFromEither(app, "", "selectIdleScreenEntry");
  const choiceResolver = extractFunctionFromEither(app, "", "selectPhotoChoiceScreenEntry");
  assert.ok(idleResolver.includes("find(eventEntries) || find(themeEntries)"));
  assert.ok(choiceResolver.includes("find(eventEntries) || find(themeEntries)"));
  assert.ok(!idleResolver.includes("idleEntries[0]"));
  assert.ok(!choiceResolver.includes("choiceEntries[0]"));
});

test("Amanda North STREAM Night includes the complete six-screen foundation pack", () => {
  [
    "stream-night-background-portrait.png",
    "stream-night-background-landscape.png",
    "stream-night-idle-portrait.png",
    "stream-night-idle-landscape.png",
    "stream-night-photo-choice-portrait.png",
    "stream-night-photo-choice-landscape.png",
  ].forEach((filename) => {
    assert.ok(
      readFileSync(join(process.cwd(), "assets/themes/stream-night", filename)).length > 0,
      `${filename} should be bundled`
    );
  });
  assert.ok(app.includes('name: "Amanda North STREAM Night"'));
  assert.ok(app.includes('role: "photo-choice"'));
});

test("General Back to School stays separate from Amanda North artwork", () => {
  [
    "back-to-school-background-portrait.png",
    "back-to-school-background-landscape.png",
    "back-to-school-idle-portrait.png",
    "back-to-school-idle-landscape.png",
    "back-to-school-photo-choice-portrait.png",
    "back-to-school-photo-choice-landscape.png",
    "back-to-school-thank-you-portrait.png",
    "back-to-school-thank-you-landscape.png",
  ].forEach((filename) => {
    assert.ok(
      readFileSync(
        join(process.cwd(), "assets/themes/general-back-to-school", filename)
      ).length > 0,
      `${filename} should be bundled`
    );
  });
  assert.ok(app.includes('backToSchool: {'));
  assert.ok(app.includes('name: "Back to School"'));
  assert.ok(
    app.includes('src: "/assets/themes/general-back-to-school/back-to-school-idle-portrait.png"')
  );
  assert.ok(app.includes('name: "Back to School photo choice portrait"'));
  assert.ok(app.includes('name: "Back to School photo choice landscape"'));
  assert.ok(app.includes('name: "Back to School Thank You screen portrait"'));
  assert.ok(app.includes('name: "Back to School Thank You screen landscape"'));
  assert.ok(!app.includes('src: "/assets/themes/back-to-school/back-to-school-idle-portrait.png",\n            name: "Back to School idle screen portrait"'));
});

test("Spring Hill Hawks includes its complete navy green and white screen pack", () => {
  const assetDirectory = join(
    process.cwd(),
    "assets/themes/spring-hill-hawks"
  );
  const assets = [
    ["spring-hill-hawks-background-portrait.png", 1200, 1800],
    ["spring-hill-hawks-background-landscape.png", 1800, 1200],
    ["spring-hill-hawks-idle-portrait.png", 1200, 1800],
    ["spring-hill-hawks-idle-landscape.png", 1800, 1200],
    ["spring-hill-hawks-photo-choice-portrait.png", 1200, 1800],
    ["spring-hill-hawks-photo-choice-landscape.png", 1800, 1200],
    ["spring-hill-hawks-thank-you-portrait.png", 1200, 1800],
    ["spring-hill-hawks-thank-you-landscape.png", 1800, 1200],
  ];
  assets.forEach(([filename, width, height]) => {
    const image = readFileSync(join(assetDirectory, filename));
    assert.ok(image.length > 0, `${filename} should be bundled`);
    assert.equal(image.readUInt32BE(16), width, `${filename} should have the required width`);
    assert.equal(image.readUInt32BE(20), height, `${filename} should have the required height`);
    const deliveryImage = readFileSync(
      join(assetDirectory, filename.replace(/\.png$/, ".webp"))
    );
    assert.ok(deliveryImage.length > 0, `${filename} should have a WebP delivery copy`);
  });

  assert.ok(app.includes('name: "Spring Hill Hawks"'));
  assert.ok(
    app.includes(
      'logo: "/assets/themes/spring-hill-hawks/spring-hill-hawks-logo.png"'
    )
  );
  assert.ok(
    app.includes(
      'src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-idle-landscape.webp"'
    )
  );
  assert.ok(app.includes("start: { x: 50, y: 75, width: 68, height: 14 }"));
  assert.ok(app.includes("singlePhoto: { x: 31, y: 57, width: 34, height: 45 }"));
  assert.ok(app.includes("photoStrip: { x: 69, y: 57, width: 34, height: 45 }"));
  assert.ok(app.includes("function migrateSpringHillHawksAssets"));
  assert.ok(!app.includes('name: "Spring Hill Hawks Cheer"'));
});

test("Avery's guest screens use bundled WebP artwork", () => {
  [
    "avery-birthday-idle-portrait.webp",
    "avery-birthday-idle-landscape.webp",
    "avery-birthday-photo-choice-portrait.webp",
    "avery-birthday-photo-choice-landscape.webp",
  ].forEach((filename) => {
    assert.ok(
      readFileSync(join(process.cwd(), "assets/themes/avery-birthday", filename)).length > 0,
      `${filename} should be bundled`
    );
  });
  assert.ok(app.includes('src: "/assets/themes/avery-birthday/avery-birthday-idle-landscape.webp"'));
  assert.ok(app.includes('src: "/assets/themes/avery-birthday/avery-birthday-photo-choice-landscape.webp"'));
  assert.ok(app.includes("function migrateOptimizedAveryScreenAssets"));
  assert.ok(app.includes("avery-birthday-idle-landscape.png\": \"/assets/themes/avery-birthday/avery-birthday-idle-landscape.webp"));
  assert.ok(app.includes('"/assets/themes/avery-birthday/avery-birthday-background-landscape.webp"'));
  assert.ok(app.includes('src: "/assets/themes/avery-birthday/avery-birthday-background-landscape.webp"'));
  assert.ok(app.includes('src: "/assets/themes/avery-birthday/avery-birthday-share-portrait.webp"'));
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

test("Amanda North uses its custom photo-choice artwork after Tap to Start", () => {
  [
    "back-to-school-photo-choice-portrait.png",
    "back-to-school-photo-choice-landscape.png",
  ].forEach((filename) => {
    assert.ok(
      readFileSync(join(process.cwd(), "assets/themes/back-to-school", filename)).length > 0,
      `${filename} should be bundled`
    );
  });
  assert.ok(app.includes('name: "Amanda North Coyote photo choice portrait"'));
  assert.ok(app.includes('name: "Amanda North Coyote photo choice landscape"'));
  assert.ok(app.includes("singlePhoto: { x: 50, y: 40, width: 78, height: 28 }"));
  assert.ok(app.includes("photoStrip: { x: 70, y: 60, width: 31, height: 52 }"));
  assert.ok(app.includes("function migrateAmandaNorthScreenAssets"));
  assert.ok(app.includes("migratedAmandaNorthScreens"));
});

test("Amanda North provides portrait and landscape share-screen artwork", () => {
  assert.ok(
    app.includes('src: "/assets/themes/back-to-school/back-to-school-share-portrait.png"')
  );
  assert.ok(
    app.includes('src: "/assets/themes/back-to-school/back-to-school-share-landscape.png"')
  );
  assert.ok(app.includes("function applyThemeShareScreen(theme)"));
  assert.ok(html.includes("#boothScreen.has-theme-share-screen.share-mode #finalPreview"));
  assert.ok(
    readFileSync(
      join(process.cwd(), "assets/themes/back-to-school/back-to-school-share-portrait.png")
    ).length > 0
  );
  assert.ok(
    readFileSync(
      join(process.cwd(), "assets/themes/back-to-school/back-to-school-share-landscape.png")
    ).length > 0
  );
});

test("Avery provides dedicated portrait and landscape thank-you screens", () => {
  assert.ok(
    app.includes(
      'src: "/assets/themes/avery-birthday/avery-birthday-thank-you-portrait.webp"'
    )
  );
  assert.ok(
    app.includes(
      'src: "/assets/themes/avery-birthday/avery-birthday-thank-you-landscape.webp"'
    )
  );
  assert.ok(app.includes("const thankYouScreens = Array.isArray(theme && theme.thankYouScreens)"));
  assert.ok(
    readFileSync(
      join(process.cwd(), "assets/themes/avery-birthday/avery-birthday-thank-you-portrait.webp")
    ).length > 0
  );
  assert.ok(
    readFileSync(
      join(process.cwd(), "assets/themes/avery-birthday/avery-birthday-thank-you-landscape.webp")
    ).length > 0
  );
  assert.ok(html.includes("#boothScreen.has-theme-goodbye-screen .goodbye-card h2"));
  assert.ok(html.includes("<h2>Thank You!</h2>"));
});

test("Avery uses themed button and vintage-camera flash sounds", () => {
  assert.ok(
    app.includes('tap: "digital-circus-button"') &&
      app.includes('flash: "vintage-camera"'),
    "Avery should define distinct interaction sound cues"
  );
  assert.ok(
    app.includes('themeSound === "vintage-camera"') &&
      app.includes('themeSound === "digital-circus-button"'),
    "the booth audio system should render Avery's themed effects"
  );
});

test("Avery alternates its share-ready cue", () => {
  assert.ok(app.includes("shareReadyAlternates"));
  assert.ok(app.includes("adam-what-do-you-think.mp3"));
  assert.ok(app.includes("const themeSoundEffectIndexes = new WeakMap()"));
  assert.ok(
    readFileSync(
      join(process.cwd(), "assets/themes/avery-birthday/sounds/adam-what-do-you-think.mp3")
    ).length > 0
  );
});

test("Avery includes dedicated portrait and landscape carnival overlays", () => {
  const portrait = "assets/themes/avery-birthday/avery-birthday-carnival-overlay-portrait.png";
  const landscape = "assets/themes/avery-birthday/avery-birthday-carnival-overlay-landscape.png";

  assert.ok(app.includes("Avery birthday carnival overlay portrait"));
  assert.ok(app.includes("Avery birthday carnival overlay landscape"));
  assert.ok(readFileSync(join(process.cwd(), portrait)).length > 0);
  assert.ok(readFileSync(join(process.cwd(), landscape)).length > 0);
});

test("Avery includes infernal-town background and overlay pairs", () => {
  const assets = [
    "assets/themes/avery-birthday/avery-birthday-infernal-town-background-portrait.png",
    "assets/themes/avery-birthday/avery-birthday-infernal-town-background-landscape.png",
    "assets/themes/avery-birthday/avery-birthday-infernal-town-overlay-portrait.png",
    "assets/themes/avery-birthday/avery-birthday-infernal-town-overlay-landscape.png",
  ];

  assert.ok(app.includes("Avery infernal town overlay portrait"));
  assert.ok(app.includes("Avery infernal town overlay landscape"));
  assert.ok(app.includes("avery-birthday-infernal-town-background-portrait.png"));
  assert.ok(app.includes("avery-birthday-infernal-town-background-landscape.png"));
  assert.ok(app.includes("greenBackgrounds: ["));
  assets.forEach((asset) => {
    assert.ok(readFileSync(join(process.cwd(), asset)).length > 0);
  });
});

test("saved Avery themes receive new built-in overlays without replacing custom ones", () => {
  const migration = extractFunction(app, "migrateOptimizedAveryScreenAssets");

  assert.ok(migration.includes("const overlayDefaults"));
  assert.ok(migration.includes("const builtinOverlayBackgrounds"));
  assert.ok(migration.includes("overlay.background = cloneThemeValue(pairedBackground)"));
  assert.ok(migration.includes("...missingOverlayDefaults.map(cloneThemeValue)"));
  assert.ok(migration.includes("removedOverlaySources.has(src)"));
  assert.ok(migration.includes("const backgroundDefaults"));
  assert.ok(migration.includes("...missingBackgroundDefaults.map(cloneThemeValue)"));
  assert.ok(migration.includes("const greenBackgroundDefaults"));
  assert.ok(migration.includes("...missingGreenBackgroundDefaults.map(cloneThemeValue)"));
});

test("custom guest artwork keeps lightweight ambient motion without blocking hotspots", () => {
  assert.ok(html.includes("#welcomeScreen.custom-idle-screen::before"));
  assert.ok(html.includes("#welcomeScreen.custom-photo-choice-screen::before"));
  assert.ok(html.includes("animation: boothArtworkSparkle 12s linear infinite"));
  assert.ok(html.includes("#boothScreen.has-theme-goodbye-screen #goodbyeOverlay::after"));
  assert.ok(html.includes("@keyframes boothThankYouSweep"));
  assert.ok(html.includes("pointer-events: none;"));
  assert.ok(html.includes("@media (prefers-reduced-motion: reduce)"));
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

test("saving a preset screen replaces only the matching role and orientation", () => {
  const replaceSource = extractFunctionFromEither(
    app,
    "",
    "replaceIdleScreenRoleEntry"
  );
  const replaceIdleScreenRoleEntry = Function(
    `function normalizeIdleScreenOrientation(value) {
      return String(value || "").toLowerCase() === "portrait"
        ? "portrait"
        : "landscape";
    }
    ${replaceSource};
    return replaceIdleScreenRoleEntry;`
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
    [...entries, replacement]
  );
  assert.deepEqual(
    replaceIdleScreenRoleEntry(entries, {
      src: "idle-landscape-new.mp4",
      role: "idle",
      orientation: "landscape",
    }),
    [
      entries[1],
      {
        src: "idle-landscape-new.mp4",
        role: "idle",
        orientation: "landscape",
      },
    ]
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

test("preset screens retain orientation and role metadata without library cards", () => {
  const canonicalRow = extractFunction(app, "createCanonicalAssetRow");
  assert.ok(canonicalRow.includes("normalizeIdleScreenOrientation(raw.orientation)"));
  assert.ok(canonicalRow.includes('raw.role === "photo-choice"'));
  assert.ok(canonicalRow.includes("contentType: String(raw.contentType"));
  const visibleRows = extractFunction(app, "getVisibleAssetLibraryRows");
  assert.ok(visibleRows.includes('"idle-screen"'));
  assert.ok(visibleRows.includes("return false"));
  const effectiveSelection = extractFunction(
    app,
    "getSessionEffectiveAssetSourceSet"
  );
  assert.ok(effectiveSelection.includes('["idle", "photo-choice"]'));
  assert.ok(effectiveSelection.includes("getGuestScreenOrientation()"));
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
