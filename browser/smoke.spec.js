const { test, expect } = require("@playwright/test");

const EXTERNAL_SCRIPT_STUBS = [
  {
    pattern: "https://cdn.tailwindcss.com/**",
    contentType: "application/javascript",
    body: "window.tailwind = window.tailwind || {};",
  },
  {
    pattern: "**/lucide.min.js",
    contentType: "application/javascript",
    body: "window.lucide = { createIcons: function () {} };",
  },
  {
    pattern: "**/qrcode.min.js",
    contentType: "application/javascript",
    body: "window.QRCode = { toCanvas: function (_canvas, _text, _options, callback) { if (typeof callback === \"function\") callback(null); } };",
  },
  {
    pattern: "**/email.min.js",
    contentType: "application/javascript",
    body: "window.emailjs = { init: function () {}, send: function () { return Promise.resolve({ status: 200, text: \"ok\" }); } };",
  },
  {
    pattern: "**/jszip.min.js",
    contentType: "application/javascript",
    body: "window.JSZip = function () {};",
  },
  {
    pattern: "**/selfie_segmentation.js",
    contentType: "application/javascript",
    body: "window.SelfieSegmentation = function () { this.setOptions = function () {}; this.onResults = function () {}; };",
  },
];

test.beforeEach(async ({ page }) => {
  const context = page.context();
  for (const stub of EXTERNAL_SCRIPT_STUBS) {
    await context.route(stub.pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: stub.contentType,
        body: stub.body,
      })
    );
  }
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    })
  );
  await context.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

async function getOptionValue(page, selector, matcher) {
  return page.locator(selector).evaluate((node, pattern) => {
    const regex = new RegExp(pattern, "i");
    const match = Array.from(node.options || []).find((option) =>
      regex.test(option.value || option.textContent || "")
    );
    return match ? match.value : "";
  }, matcher.source);
}

async function getOptionTexts(page, selector) {
  return page.locator(selector).evaluate((node) =>
    Array.from(node.options || []).map(
      (option) => `${option.value} ${option.textContent || ""}`.trim()
    )
  );
}

async function openBoothSettings(page) {
  await page.locator("#mobileSettingsToggle").click({ force: true });
  await expect(page.locator("#boothScreen")).toHaveClass(/mobile-settings-open/);
}

async function gotoApp(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

async function expectCreatePathValidation(page, options) {
  const {
    themePattern,
    eventType,
    visibleFieldSelectors,
    firstMessage,
    fillBetweenAlerts,
    secondMessage,
    firstInvalidSelectors,
    secondInvalidSelectors,
  } = options;

  await gotoApp(page, "/index.html");

  if (eventType) {
    await page.locator("#createPathEventType").evaluate((select, value) => {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, eventType);
  }

  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    themePattern
  );
  await expect(themeValue).not.toBe("");

  await page.selectOption("#createPathThemeSelect", themeValue);

  for (const selector of visibleFieldSelectors || []) {
    await expect(page.locator(selector)).not.toHaveClass(/hidden/);
  }

  await page.locator("#createEventBtn").click();
  await expect(page.locator("#createPathValidationMessage")).toHaveText(
    firstMessage
  );
  for (const selector of firstInvalidSelectors || []) {
    await expect(page.locator(selector)).toHaveAttribute("aria-invalid", "true");
  }

  await fillBetweenAlerts(page);

  await page.locator("#createEventBtn").click();
  await expect(page.locator("#createPathValidationMessage")).toHaveText(
    secondMessage
  );
}

async function createWeddingEvent(page, options = {}) {
  const {
    eventName = "Jordan and Alex",
    partner1 = "Jordan",
    partner2 = "Alex",
    date = "June 14, 2026",
  } = options;
  await gotoApp(page, "/index.html");
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /wedding/
  );
  await expect(themeValue).not.toBe("");
  if (await page.locator("#createPathEventName").count()) {
    await page.fill("#createPathEventName", eventName);
  }
  await page.selectOption("#createPathThemeSelect", themeValue);
  await page.fill("#createPathPartner1", partner1);
  await page.fill("#createPathPartner2", partner2);
  await page.evaluate((value) => {
    const dateFields = document.querySelector("#createPathDateFields");
    if (dateFields) dateFields.classList.remove("hidden");
    const input = document.querySelector("#createPathEventDate");
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, date);
  await page.locator("#createEventBtn").click();
  await expect(page.locator("#createPathValidationMessage")).toHaveClass(
    /hidden/
  );
  await expect(page.locator("#eventProfileSelect")).toHaveValue(/.+/);
}

test("overlay builder emits reusable text metadata when autofill fields are selected", async ({
  page,
}) => {
  await gotoApp(page, "/overlay-maker.html");

  await page.selectOption("#layoutType", "photo_strip");
  await page.selectOption("#autofillField", "couple_names");
  await page.selectOption("#secondaryAutofillField", "event_date");

  const manifestEntry = page.locator("#manifestEntry");
  await expect(manifestEntry).toContainText("\"textFields\"");
  await expect(manifestEntry).toContainText("\"couple_names\"");
  await expect(manifestEntry).toContainText("\"event_date\"");
});

test("overlay builder theme assignment dropdown loads saved themes", async ({
  page,
}) => {
  await gotoApp(page, "/overlay-maker.html");
  await page.evaluate(() => {
    localStorage.setItem(
      "photoboothThemes",
      JSON.stringify({
        wedding: {
          name: "Wedding",
          overlays: [],
          templates: [],
        },
      })
    );
    window.location.reload();
  });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => {
    const select = document.querySelector("#targetThemeKey");
    return !!(select && select.options && select.options.length > 0);
  });

  const optionTexts = await page.locator("#targetThemeKey option").evaluateAll((options) =>
    options.map((option) => `${option.value} ${option.textContent || ""}`.trim())
  );

  expect(optionTexts.join(" ")).toContain("Wedding");
});

test("overlay and template thumbnail sections remember their open state", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.evaluate(() => {
      localStorage.removeItem("photoboothAssetPanels");
      window.location.reload();
    }),
  ]);
  await page.waitForFunction(() => !!window.__photoboothTest);

  const overlayPanel = page.locator("#overlayThumbnailsPanel");
  const overlayHeader = page.locator("#overlayThumbnailsHeader");
  const templatePanel = page.locator("#templateThumbnailsPanel");
  const templateHeader = page.locator("#templateThumbnailsHeader");

  await expect(overlayHeader).toHaveAttribute("aria-expanded", "false");
  await expect(templateHeader).toHaveAttribute("aria-expanded", "false");

  await overlayHeader.evaluate((node) => node.click());
  await expect(overlayHeader).toHaveAttribute("aria-expanded", "true");
  await expect(overlayPanel).toHaveClass(/open/);

  await templateHeader.evaluate((node) => node.click());
  await expect(templateHeader).toHaveAttribute("aria-expanded", "true");
  await expect(templatePanel).toHaveClass(/open/);

  const storedPanels = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("photoboothAssetPanels") || "{}")
  );
  expect(storedPanels).toMatchObject({
    overlay: true,
    template: true,
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__photoboothTest);
  const storedAfterReload = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("photoboothAssetPanels") || "{}")
  );
  expect(storedAfterReload).toMatchObject(storedPanels);
});

test("admin can open the layout builder and return to booth setup", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  const popupPromise = page.waitForEvent("popup");
  await page.evaluate(() => openLayoutBuilder());
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.locator("#backButton")).toHaveText(
    "Back to Booth Setup"
  );

  await popup.locator("#backButton").click();
  await popup.waitForURL(/index\.html/);
  await expect(popup.locator("#adminScreen")).toBeVisible();
});

test("session setup cards route to the right admin actions", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  await expect(page.locator("#launchLayoutMode")).toHaveText("Normal Mode");
  await expect(page.locator("#launchOverlayName")).not.toContainText(
    "overlays available"
  );
  await expect(
    page.locator('.setup-session-item[data-session-action="event"]')
  ).toHaveCount(0);

  await page.locator('.setup-session-item[data-session-action="save"]').click();
  await expect(page.locator("#setupTabShare")).toHaveClass(/active/);
  await expect(page.locator("#sharingSection")).not.toHaveClass(/hidden/);

  await page.locator('.setup-session-item[data-session-action="camera"]').click();
  await expect(page.locator("#setupTabCapture")).toHaveClass(/active/);
  await expect(page.locator("#captureSection")).not.toHaveClass(/hidden/);
  await expect(page.locator("#startCameraButton")).toBeVisible();

  await page.locator('.setup-session-item[data-session-action="font"]').click();
  await expect(page.locator("#setupTabCapture")).toHaveClass(/active/);
  await expect(page.locator("#fontLibrarySection")).not.toHaveClass(/hidden/);
  await expect(page.locator("#addPairingBtn")).toBeVisible();

  await page.locator('.setup-session-item[data-session-action="theme"]').click();
  await expect(page.locator("#setupTabEvent")).toHaveClass(/active/);
  await expect(page.locator("#eventBasicsSection")).not.toHaveClass(/hidden/);
});

test("overlay and template summary panels toggle their thumbnail bodies", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.removeItem("photoboothAssetPanels");
  });
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  const overlayHeader = page.locator("#overlayThumbnailsHeader");
  const templateHeader = page.locator("#templateThumbnailsHeader");
  const overlayPanel = page.locator("#overlayThumbnailsPanel");
  const templatePanel = page.locator("#templateThumbnailsPanel");

  await expect(overlayHeader).toHaveAttribute("aria-expanded", "false");
  await expect(templateHeader).toHaveAttribute("aria-expanded", "false");

  await overlayHeader.evaluate((node) => node.click());
  await expect(overlayHeader).toHaveAttribute("aria-expanded", "true");
  await expect(overlayPanel).toHaveClass(/open/);

  await templateHeader.evaluate((node) => node.click());
  await expect(templateHeader).toHaveAttribute("aria-expanded", "true");
  await expect(templatePanel).toHaveClass(/open/);

  await expect(page.locator("#currentOverlays")).toBeVisible();
  await expect(page.locator("#currentTemplates")).toBeVisible();
});

test("overlay builder keeps strip slot metadata consistent across template families", async ({
  page,
}) => {
  await gotoApp(page, "/overlay-maker.html");
  await page.selectOption("#layoutType", "photo_strip");
  await page.selectOption("#autofillField", "event_name");

  const families = [
    "minimal",
    "minimal_dark",
    "signature_polaroid",
    "feathers",
    "seasonal_event",
  ];
  let baseline = null;
  for (const family of families) {
    await page.selectOption("#templateFamily", family);
    const manifest = await page.locator("#manifestEntry").evaluate((node) => {
      const raw = (node.textContent || "").trim().replace(/,$/, "");
      return JSON.parse(raw);
    });
    expect(manifest.layoutClass).toBe("photo_strip");
    expect(manifest.photoSlots).toHaveLength(6);
    if (!baseline) {
      baseline = manifest.photoSlots;
    } else {
      expect(manifest.photoSlots).toEqual(baseline);
    }
  }
});

test("overlay builder uses one canonical strip guide for every strip template", async ({
  page,
}) => {
  await gotoApp(page, "/overlay-maker.html");

  await page.selectOption("#layoutType", "photo_strip");
  await page.selectOption("#templateFamily", "seasonal_event");
  await page.selectOption("#templateVariant", "retro_party");
  await page.selectOption("#autofillField", "event_name");

  const guideValue = await page.locator("#layoutGuide").inputValue();
  expect(guideValue).toBe("strip_3");

  const manifest = await page.locator("#manifestEntry").evaluate((node) => {
    const raw = (node.textContent || "").trim().replace(/,$/, "");
    return JSON.parse(raw);
  });

  expect(manifest.layout).toBe("double_column");
  expect(manifest.layoutClass).toBe("photo_strip");
  expect(manifest.photoSlots).toHaveLength(6);
  expect(manifest.templateFamily).toBe("seasonal_event");
  expect(manifest.templateVariant).toBe("retro_party");
});

test("legacy string overlays normalize to a full-frame photo slot", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  const overlay = await page.evaluate(() => {
    return window.__photoboothTest.normalizeOverlayDefinition(
      "data:test/legacy-string-overlay"
    );
  });

  expect(overlay).toMatchObject({
    src: "data:test/legacy-string-overlay",
    renderSrc: "data:test/legacy-string-overlay",
  });
  expect(overlay.photoSlots).toHaveLength(1);
  expect(overlay.photoSlots[0]).toMatchObject({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test("photo overlays render mirrored live DOM slots", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.waitForFunction(
    () =>
      !!(
        window.__photoboothTest &&
        window.__photoboothTest.getActiveTheme &&
        window.__photoboothTest.getActiveTheme()
      )
  );
  const slotOverlay = await page.evaluate(() => {
    const [overlay] = window.__photoboothTest.setTestOverlays([
      {
        id: "smoke-photo-slot-overlay",
        name: "Smoke Photo Slot Overlay",
        type: "overlay",
        category: "wedding",
        src: "data:test/smoke-photo-slot-overlay",
        background: { type: "color", value: "#fffaf4" },
        foreground: {
          type: "image",
          src: "assets/wedding/timeless-romance/overlays/timeless-romance-single-overlay.svg",
        },
        photoSlots: [
          {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            borderRadius: 0.02,
            objectFit: "cover",
            objectPosition: "center",
          },
        ],
      },
    ]);
    return {
      src: overlay.src,
      photoSlots: overlay.photoSlots.length,
    };
  });

  await expect(page.locator(".photo-slot")).toHaveCount(slotOverlay.photoSlots);
  await expect(page.locator("#video")).toHaveClass(/hidden/);
  await expect(page.locator(".photo-slot video.photo-slot-media").first()).toHaveClass(/is-live/);
  await expect(page.locator(".photo-slot video.photo-slot-media").first()).toHaveAttribute(
    "style",
    /transform: scaleX\(-1\)/
  );
});

test("double-column strips use canonical slots with distinct photos", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  const samples = await page.evaluate(async () => {
    const makePhoto = (pattern, width = 80, height = 160) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = pattern === "third" ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (pattern === "second") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(30, 0, 20, canvas.height);
      }
      if (pattern === "third") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(30, 0, 20, canvas.height);
      }
      return canvas;
    };
    const templateSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">',
      '<rect width="1200" height="1800" fill="#ffeecc"/>',
      '<rect x="50" y="357" width="500" height="414" fill="#000"/>',
      '<rect x="50" y="823" width="500" height="414" fill="#000"/>',
      '<rect x="50" y="1288" width="500" height="413" fill="#000"/>',
      '<rect x="650" y="357" width="500" height="414" fill="#000"/>',
      '<rect x="650" y="823" width="500" height="414" fill="#000"/>',
      '<rect x="650" y="1288" width="500" height="413" fill="#000"/>',
      "</svg>",
    ].join("");
    const url = await window.__photoboothTest.composeStrip(
      {
        src: `data:image/svg+xml,${encodeURIComponent(templateSvg)}`,
        layout: "double_column",
        slots: [
          { x: 1, y: 1, w: 20, h: 20 },
          { x: 1, y: 30, w: 20, h: 20 },
          { x: 1, y: 60, w: 20, h: 20 },
          { x: 30, y: 1, w: 20, h: 20 },
          { x: 30, y: 30, w: 20, h: 20 },
          { x: 30, y: 60, w: 20, h: 20 },
        ],
      },
      [
        makePhoto("first"),
        makePhoto("second"),
        makePhoto("third"),
      ]
    );
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const pixelAt = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    return {
      leftTopSide: pixelAt(150, 564),
      leftTopCenter: pixelAt(300, 564),
      rightTopSide: pixelAt(750, 564),
      rightTopCenter: pixelAt(900, 564),
      leftMiddleSide: pixelAt(150, 1030),
      leftMiddleCenter: pixelAt(300, 1030),
      rightMiddleSide: pixelAt(750, 1030),
      rightMiddleCenter: pixelAt(900, 1030),
      leftBottomSide: pixelAt(150, 1494),
      leftBottomCenter: pixelAt(300, 1494),
      rightBottomSide: pixelAt(750, 1494),
      rightBottomCenter: pixelAt(900, 1494),
      ignoredMetadata: pixelAt(10, 10),
    };
  });

  const brightness = (pixel) => {
    const [r, g, b] = pixel;
    return (r + g + b) / 3;
  };
  const expectOpaque = (pixel) => {
    const [, , , a] = pixel;
    expect(a).toBe(255);
  };

  Object.values(samples).forEach(expectOpaque);
  expect(brightness(samples.leftTopSide)).toBeGreaterThan(120);
  expect(brightness(samples.leftTopCenter)).toBeGreaterThan(120);
  expect(brightness(samples.rightTopSide)).toBeGreaterThan(120);
  expect(brightness(samples.rightTopCenter)).toBeGreaterThan(120);
  expect(brightness(samples.leftMiddleSide)).toBeGreaterThan(120);
  expect(brightness(samples.leftMiddleCenter)).toBeLessThan(80);
  expect(brightness(samples.rightMiddleSide)).toBeGreaterThan(120);
  expect(brightness(samples.rightMiddleCenter)).toBeLessThan(80);
  expect(brightness(samples.leftBottomSide)).toBeLessThan(80);
  expect(brightness(samples.leftBottomCenter)).toBeGreaterThan(120);
  expect(brightness(samples.rightBottomSide)).toBeLessThan(80);
  expect(brightness(samples.rightBottomCenter)).toBeGreaterThan(120);
  expect(samples.ignoredMetadata[1]).toBeGreaterThan(150);
  expect(samples.ignoredMetadata[2]).toBeGreaterThan(150);
});

test("single-photo overlays fall back to one full-frame photo slot", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  const overlay = await page.evaluate(() => {
    return window.__photoboothTest.normalizeOverlayDefinition({
      src: "data:test/simple-overlay",
    });
  });

  expect(overlay).toMatchObject({
    src: "data:test/simple-overlay",
  });
  expect(overlay.photoSlots).toHaveLength(1);
  expect(overlay.photoSlots[0]).toMatchObject({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  await page.evaluate(() => {
    window.__photoboothTest.setTestOverlays([
      { src: "data:test/simple-overlay" },
    ]);
  });
  await expect(page.locator(".photo-slot")).toHaveCount(1);
  await expect(page.locator("#video")).toHaveClass(/hidden/);
});

test("setup screen keeps overlay choice in the booth and can start a plain layout", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.evaluate(() => {
    const normalize = window.__photoboothTest.normalizeOverlayDefinition;
    window.__photoboothTest.patchActiveTheme({
      overlaysTmp: [],
      overlaysRemoved: [],
      overlays: [
        normalize({
          id: "smoke-overlay-one",
          name: "Overlay One",
          src: "data:test/overlay-one",
        }),
        normalize({
          id: "smoke-overlay-two",
          name: "Overlay Two",
          src: "data:test/overlay-two",
        }),
      ],
    });
  });
  await expect(page.locator("#launchLayoutMode")).toHaveText("Normal Mode");
  await expect(page.locator("#launchOverlayName")).toContainText("Basic");
  await expect(page.locator("#launchOverlayCount")).toContainText("overlays");
  await expect(page.locator("#launchWarning")).toContainText(
    "Guests can choose from"
  );

  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#adminScreen")).toHaveClass(/hidden/);
  await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
  await page.locator("#startButton").click({ force: true });
  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Single Live Photo" })
    .click({ force: true });
  await expect(page.locator("#video")).not.toHaveClass(/hidden/);
  await expect(page.locator("#modeToggle")).toHaveText("Switch to 360 Mode");
  await page.evaluate(() => {
    const toggle = document.getElementById("modeToggle");
    if (toggle) toggle.click();
  });
  await expect(page.locator("#modeToggle")).toHaveText("Switch to Photo Mode");
  await page.evaluate(() => setMode("live-photo"));

  await expect(
    page.locator("#options .options-section-title").filter({
      hasText: "Choose Your Overlay",
    })
  ).toHaveText("Choose Your Overlay");
  const overlayCount = await page.evaluate(
    () => window.__photoboothTest.getOverlayList().length
  );
  expect(overlayCount).toBeGreaterThan(0);
  await page.evaluate(() => {
    const overlays = window.__photoboothTest.getOverlayList();
    if (!overlays.length) return;
    window.__photoboothTest.setTestOverlays([overlays[0]]);
  });
});

test("setup screen shows assigned asset counts and font summary", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  await page.evaluate(() => {
    window.__photoboothTest.patchActiveTheme({
      fontHeading: "Fraunces",
      fontBody: "Inter",
      name: "Garden Vows",
      overlays: [
        { id: "smoke-overlay-1", name: "Overlay One", src: "data:test/overlay-one" },
        { id: "smoke-overlay-2", name: "Overlay Two", src: "data:test/overlay-two" },
      ],
      templates: [
        {
          id: "smoke-launch-template-1",
          name: "Launch Strip",
          src: "data:test/launch-strip-1",
          layout: "photo_strip_3",
          slots: [
            { x: 0, y: 0, w: 100, h: 100 },
            { x: 0, y: 120, w: 100, h: 100 },
            { x: 0, y: 240, w: 100, h: 100 },
          ],
        },
        {
          id: "smoke-launch-template-2",
          name: "Launch Strip Two",
          src: "data:test/launch-strip-2",
          layout: "photo_strip_4",
          slots: [
            { x: 0, y: 0, w: 100, h: 100 },
            { x: 0, y: 120, w: 100, h: 100 },
            { x: 0, y: 240, w: 100, h: 100 },
            { x: 0, y: 360, w: 100, h: 100 },
          ],
        },
      ],
    });
  });

  await expect(page.locator("#launchLayoutMode")).toHaveText("Normal Mode");
  await expect(page.locator("#launchOverlayName")).toContainText("Garden Vows");
  await expect(page.locator("#launchFontStatus")).toContainText("Fraunces + Inter");
  const overlayCount = Number(
    (await page.locator("#launchOverlayCount").textContent())?.match(/(\d+)/)?.[1] ||
      0
  );
  const templateCount = Number(
    (await page.locator("#launchStripStatus").textContent())?.match(/(\d+)/)?.[1] ||
      0
  );
  expect(overlayCount).toBeGreaterThanOrEqual(2);
  expect(templateCount).toBeGreaterThanOrEqual(2);
  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
  await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
  await expect(page.locator("#mobileSettingsSheet")).toBeHidden();
  await expect(page.locator("#mobileSettingsToggle")).toBeHidden();
  await page.locator("#startButton").click({ force: true });
  await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
  await expect(page.locator("#mobileSettingsSheet")).toBeHidden();
  await expect(page.locator("#mobileSettingsToggle")).toBeHidden();
  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Photostrip" })
    .click({ force: true });
  await expect(page.locator("#boothScreen")).not.toHaveClass(/welcome-active/);
  await page.evaluate(() => setMode("strip"));
  await expect(page.locator("#controls .mode-btn[data-mode=\"strip\"]")).toHaveClass(/active/);
});

test("booth mode buttons switch frame sizing and option sets", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.evaluate(() => {
    const normalize = window.__photoboothTest.normalizeOverlayDefinition;
    window.__photoboothTest.patchActiveTheme({
      overlaysTmp: [],
      overlaysRemoved: [],
      overlays: [
        normalize({
          id: "smoke-photo-overlay",
          name: "Smoke Photo Overlay",
          src: "data:test/smoke-photo-overlay",
        }),
      ],
      captureLabel: "",
      templates: [
        {
          id: "smoke-strip-template",
          name: "Smoke Strip Template",
          src: "data:test/smoke-strip-template",
          layout: "photo_strip_3",
          slots: [
            { x: 0, y: 0, w: 100, h: 100 },
            { x: 0, y: 120, w: 100, h: 100 },
            { x: 0, y: 240, w: 100, h: 100 },
          ],
        },
      ],
    });
    const captureInput = document.querySelector("#eventCaptureLabelInput");
    if (captureInput) {
      captureInput.value = "";
      captureInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  await page.locator("#startBoothButton").click({ force: true });
  await page.locator("#startButton").click({ force: true });
  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Single Live Photo" })
    .click({ force: true });
  await expect(page.locator("#captureBtn")).toBeVisible();
  await expect(page.locator("#boothScreen")).toHaveClass(/booth-ready/);
  await expect(page.locator("#boothModeBar")).toBeHidden();
  await expect(page.locator("#boothHelperText")).toHaveCount(0);

  await page.evaluate(() => setMode("live-photo"));
  await expect(page.locator("#boothScreen")).toHaveClass(/mode-live-photo/);
  await expect(page.locator("#captureBtn")).toContainText("Take Live Photo");
  await expect(
    page.locator('#options .options-section-title').filter({
      hasText: "Choose Your Overlay",
    })
  ).toHaveCount(1);
  await expect(page.locator('#options .thumb[data-overlay-none="true"]')).toBeVisible();
  const liveOverlayCount = await page.evaluate(
    () => window.__photoboothTest.getOverlayList().length
  );
  expect(liveOverlayCount).toBeGreaterThan(0);
  const liveBox = await page.locator("#videoContainer").boundingBox();
  expect(liveBox.width / liveBox.height).toBeLessThan(1.8);

  await page.evaluate(() => setMode("still-photo"));
  await expect(page.locator("#boothScreen")).toHaveClass(/mode-still-photo/);
  await expect(page.locator("#captureBtn")).toContainText("Take Photo");
  const stillOverlayCount = await page.evaluate(
    () => window.__photoboothTest.getOverlayList().length
  );
  expect(stillOverlayCount).toBeGreaterThan(0);
  const stillBox = await page.locator("#videoContainer").boundingBox();
  expect(stillBox.width / stillBox.height).toBeLessThan(1.8);

  await page.evaluate(() => setMode("strip"));
  await expect(page.locator("#boothScreen")).toHaveClass(/mode-strip/);
  await expect(page.locator("#captureBtn")).toBeVisible();
  await expect(
    page.locator('#options .options-section-title').filter({
      hasText: "Choose Your Strip",
    })
  ).toHaveCount(1);
  const stripTemplateCount = await page.locator('#options .thumb[data-template-src]').count();
  expect(stripTemplateCount).toBeGreaterThan(0);
  await expect(page.locator('#options .thumb[data-overlay-none="true"]')).toHaveCount(0);
  const stripBox = await page.locator("#videoContainer").boundingBox();
  expect(stripBox.width / stripBox.height).toBeLessThan(1.8);
});

test("theme session text controls update booth labels without a saved event", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  await page.evaluate(() => {
    localStorage.removeItem("photoboothActiveEventId");
    window.__photoboothTest.patchActiveTheme({
      bannerText: "Original Banner",
      welcome: {
        title: "Original Welcome",
        prompt: "Original Start",
      },
      captureLabel: "Original Capture",
    });
  });

  await expect(page.locator("#eventBannerTextInput")).toBeEnabled();
  await expect(page.locator("#eventWelcomeTitleInput")).toBeEnabled();
  await expect(page.locator("#eventStartButtonTextInput")).toBeEnabled();
  await expect(page.locator("#eventCaptureLabelInput")).toBeEnabled();

  await page.fill("#eventBannerTextInput", "Custom Banner");
  await page.fill("#eventWelcomeTitleInput", "Custom Welcome");
  await page.fill("#eventStartButtonTextInput", "Begin Booth");
  await page.fill("#eventCaptureLabelInput", "Snap Now");

  await expect(page.locator("#stylePreviewHeading")).toHaveText("Custom Banner");
  await expect(page.locator("#stylePreviewSubheading")).toHaveText("Custom Welcome");
  await expect(page.locator("#stylePreviewButton")).toHaveText("Begin Booth");
  await expect(page.locator("#stylePreviewBody")).toHaveText("Snap Now");

  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#eventTitle")).toHaveText("Custom Banner");
  await expect(page.locator("#welcomeTitle")).toHaveText("Custom Welcome");
  await expect(page.locator("#startButton")).toHaveText("Begin Booth");

  await page.locator("#startButton").click({ force: true });
  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Single Still Photo" })
    .click({ force: true });
  await expect(page.locator("#captureBtn")).toHaveText("Snap Now");
});

test("photo overlay format selector filters portrait and landscape overlays", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);
  await page.evaluate(() => {
    const normalize = window.__photoboothTest.normalizeOverlayDefinition;
    window.__photoboothTest.patchActiveTheme({
      overlaysTmp: [],
      overlaysRemoved: [],
      overlays: [
        normalize({
          id: "portrait-overlay",
          name: "Portrait Overlay",
          src: "data:test/portrait-overlay",
          aspectRatio: "3:4",
        }),
        normalize({
          id: "landscape-overlay",
          name: "Landscape Overlay",
          src: "data:test/landscape-overlay",
          aspectRatio: "4:3",
        }),
      ],
    });
  });

  await page.locator("#startBoothButton").click({ force: true });
  await page.locator("#startButton").click({ force: true });
  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Single Live Photo" })
    .click({ force: true });
  await page.evaluate(() => setMode("live-photo"));
  await page.evaluate(() => window.__photoboothTest.setPhotoOverlayFormat("portrait"));

  await expect(page.locator(".photo-orientation-toggle")).toBeVisible();
  await expect(
    page.locator(".photo-orientation-btn.active")
  ).toHaveText("Portrait");
  await expect(page.locator('#options .thumb[data-overlay-src="data:test/portrait-overlay"]')).toHaveCount(1);
  await expect(page.locator('#options .thumb[data-overlay-src="data:test/landscape-overlay"]')).toHaveCount(0);
  await expect(page.locator("#videoWrap")).toHaveClass(/view-portrait/);
  expect(await page.evaluate(() => window.__photoboothTest.getResolvedCaptureAspectRatio())).toBeCloseTo(2 / 3, 2);

  await page.locator('.photo-orientation-btn[data-orientation="landscape"]').click();
  await expect(
    page.locator(".photo-orientation-btn.active")
  ).toHaveText("Landscape");
  await expect(page.locator('#options .thumb[data-overlay-src="data:test/portrait-overlay"]')).toHaveCount(0);
  await expect(page.locator('#options .thumb[data-overlay-src="data:test/landscape-overlay"]')).toHaveCount(1);
  await expect(page.locator("#videoWrap")).toHaveClass(/view-landscape/);
  expect(await page.evaluate(() => window.__photoboothTest.getResolvedCaptureAspectRatio())).toBeCloseTo(1.5, 2);
});

test("single photo exports use true 4x6 print dimensions", async ({ page }) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  const sizes = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 640;
    source.height = 480;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "#bfdfff";
    ctx.fillRect(0, 0, source.width, source.height);

    const readImageSize = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
      });

    window.__photoboothTest.setPhotoOverlayFormat("landscape");
    const landscapeUrl = await window.__photoboothTest.finalizeToPrint(source, null);
    window.__photoboothTest.setPhotoOverlayFormat("portrait");
    const portraitUrl = await window.__photoboothTest.finalizeToPrint(source, null);

    return {
      landscape: await readImageSize(landscapeUrl),
      portrait: await readImageSize(portraitUrl),
    };
  });

  expect(sizes.landscape).toEqual({ width: 1800, height: 1200 });
  expect(sizes.portrait).toEqual({ width: 1200, height: 1800 });
});

test("frame picker stays hidden until the welcome flow reaches capture", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.waitForFunction(() => !!window.__photoboothTest);

  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
  await expect(page.locator("#mobileSettingsSheet")).toBeHidden();
  await expect(page.locator("#mobileSettingsToggle")).toBeHidden();

  await page.locator("#startButton").click({ force: true });
  await expect(page.locator("#boothScreen")).toHaveClass(/welcome-active/);
  await expect(page.locator("#mobileSettingsSheet")).toBeHidden();
  await expect(page.locator("#mobileSettingsToggle")).toBeHidden();

  await page
    .locator(".welcome-mode-btn")
    .filter({ hasText: "Single Still Photo" })
    .click({ force: true });
  await expect(page.locator("#boothScreen")).not.toHaveClass(/welcome-active/);
  await expect(page.locator("#captureBtn")).toBeVisible();
  await expect(page.locator("#mobileSettingsSheet")).toBeVisible();
});

test("theme session wedding start does not require names or date", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.locator("[data-theme-filter-card=\"wedding\"]").click();
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /wedding/
  );
  await expect(themeValue).not.toBe("");
  await page.selectOption("#createPathThemeSelect", themeValue);
  await expect(page.locator("#createPathWeddingFields")).toHaveClass(/hidden/);
  await expect(page.locator("#createPathDateFields")).toHaveClass(/hidden/);
  await page.locator("#createEventBtn").click();
  await expect(page.locator("#createPathValidationMessage")).toHaveClass(
    /hidden/
  );
  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
});

test("theme session birthday start does not require birthday name or date", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.locator("[data-theme-filter-card=\"party\"]").click();
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /birthday/
  );
  await expect(themeValue).not.toBe("");
  await page.selectOption("#createPathThemeSelect", themeValue);
  await expect(page.locator("#createPathBirthdayFields")).toHaveClass(/hidden/);
  await expect(page.locator("#createPathDateFields")).toHaveClass(/hidden/);
  await page.locator("#createEventBtn").click();
  await expect(page.locator("#createPathValidationMessage")).toHaveClass(
    /hidden/
  );
  await page.locator("#startBoothButton").click({ force: true });
  await expect(page.locator("#boothScreen")).not.toHaveClass(/hidden/);
});

test("wedding theme filtering keeps the create-path selector on wedding themes", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.evaluate(() => {
    const themeType = document.querySelector("#createPathThemeType");
    if (themeType) {
      themeType.value = "standard";
      themeType.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const select = document.querySelector("#createPathEventType");
    if (!select) return;
    select.value = "wedding";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const options = await page
    .locator("#createPathThemeSelect option")
    .evaluateAll((node) =>
      node
        .filter((option) => !option.hidden)
        .map((option) => `${option.value} ${option.textContent || ""}`.trim())
    );
  const joined = options.join(" ").toLowerCase();
  expect(joined).toContain("wedding");
});

test("opaque wedding svg overlays are auto-fixed before render", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  const result = await page.evaluate(async () => {
    const timeless =
      await window.__photoboothTest.getOverlayFixedAsset(
        "assets/wedding/timeless-romance/overlays/timeless-romance-single-overlay.svg"
      );
    const garden =
      await window.__photoboothTest.getOverlayFixedAsset(
        "assets/wedding/garden-vows/overlays/garden-vows-single-overlay.svg"
      );
    const birthdayPng =
      await window.__photoboothTest.getOverlayFixedAsset(
        "assets/general/birthday/overlays/banner frame.png"
      );
    return {
      timeless,
      garden,
      birthdayPng,
    };
  });

  expect(result.timeless).toMatchObject({
    src: "assets/wedding/timeless-romance/overlays/timeless-romance-single-overlay.svg",
  });
  expect(result.timeless.renderSrc).toContain("data:image/svg+xml");
  expect(result.garden).toMatchObject({
    src: "assets/wedding/garden-vows/overlays/garden-vows-single-overlay.svg",
  });
  expect(result.garden.renderSrc).toContain("data:image/svg+xml");
  expect(result.birthdayPng).toBe(
    "assets/general/birthday/overlays/banner frame.png"
  );
});

test("single-photo overlay autofill renders couple names and date from the created event", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.evaluate(() => {
    const select = document.querySelector("#fontEventStyleSelect");
    if (select) {
      select.value = "wedding";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  let themeValue = "";
  await expect
    .poll(async () => {
      themeValue = await getOptionValue(page, "#createPathThemeSelect", /wedding/);
      return themeValue;
    })
    .not.toBe("");
  await page.selectOption("#createPathThemeSelect", themeValue);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const activeTheme = window.__photoboothTest.getActiveTheme();
        return activeTheme && typeof activeTheme === "object" ? "ready" : "";
      })
    )
    .toBe("ready");

  const fillTextCalls = await page.evaluate(async (themeKey) => {
    localStorage.setItem(
      "photoboothEvents",
      JSON.stringify([
        {
          id: "browser-render-event",
          name: "Jordan and Alex",
          date: "June 14, 2026",
          themeKey,
          partner1: "Jordan",
          partner2: "Alex",
          overrides: {
            backgrounds: [],
            overlays: [],
            templates: [],
            backgroundIndex: 0,
            greenBackgrounds: [],
            greenBackgroundIndex: 0,
          },
        },
      ])
    );
    localStorage.setItem("photoboothActiveEventId", "browser-render-event");

    const overlaySrc = "data:test/overlay-autofill";
    window.__photoboothTest.patchActiveTheme({
      overlays: [
        {
          src: overlaySrc,
          textFields: [
            {
              key: "couple_names",
              xPct: 0.1,
              yPct: 0.82,
              wPct: 0.8,
              hPct: 0.08,
            },
            {
              key: "event_date",
              xPct: 0.2,
              yPct: 0.9,
              wPct: 0.6,
              hPct: 0.05,
            },
          ],
        },
      ],
    });
    return window.__photoboothTest.probeOverlayAutofill(overlaySrc);
  }, themeValue);

  expect(fillTextCalls).toContain("Jordan & Alex");
  expect(fillTextCalls).toContain("June 14, 2026");
});

test("strip template autofill renders couple names and date from the active event", async ({
  page,
}) => {
  await gotoApp(page, "/index.html");
  await page.evaluate(() => {
    const select = document.querySelector("#fontEventStyleSelect");
    if (select) {
      select.value = "wedding";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /wedding/
  );
  await expect(themeValue).not.toBe("");
  await page.selectOption("#createPathThemeSelect", themeValue);

  const fillTextCalls = await page.evaluate(async (themeKey) => {
    localStorage.setItem(
      "photoboothEvents",
      JSON.stringify([
        {
          id: "browser-strip-event",
          name: "Jordan and Alex",
          date: "June 14, 2026",
          themeKey,
          partner1: "Jordan",
          partner2: "Alex",
          overrides: {
            backgrounds: [],
            overlays: [],
            templates: [],
            backgroundIndex: 0,
            greenBackgrounds: [],
            greenBackgroundIndex: 0,
          },
        },
      ])
    );
    localStorage.setItem("photoboothActiveEventId", "browser-strip-event");

    return window.__photoboothTest.probeTemplateAutofill({
      src: "data:test/template-autofill",
      layout: "photo_strip_3",
      textFields: [
        {
          key: "couple_names",
          xPct: 0.1,
          yPct: 0.86,
          wPct: 0.8,
          hPct: 0.06,
        },
        {
          key: "event_date",
          xPct: 0.2,
          yPct: 0.93,
          wPct: 0.6,
          hPct: 0.04,
        },
      ],
    });
  }, themeValue);

  expect(fillTextCalls).toContain("Jordan & Alex");
  expect(fillTextCalls).toContain("June 14, 2026");
});
