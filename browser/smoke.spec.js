const { test, expect } = require("@playwright/test");

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

async function expectCreatePathValidation(page, options) {
  const {
    themePattern,
    eventName,
    visibleFieldSelectors,
    firstMessage,
    fillBetweenAlerts,
    secondMessage,
    firstInvalidSelectors,
    secondInvalidSelectors,
  } = options;

  await page.goto("/index.html");

  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    themePattern
  );
  await expect(themeValue).not.toBe("");

  await page.fill("#createPathEventName", eventName);
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
  await page.goto("/index.html");
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /wedding/
  );
  await expect(themeValue).not.toBe("");
  await page.fill("#createPathEventName", eventName);
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

test("overlay builder emits reusable text metadata for any overlay", async ({
  page,
}) => {
  await page.goto("/overlay-maker.html");

  await page.selectOption("#autofillField", "couple_names");
  await page.selectOption("#secondaryAutofillField", "event_date");

  const manifestEntry = page.locator("#manifestEntry");
  await expect(manifestEntry).toContainText("\"textFields\"");
  await expect(manifestEntry).toContainText("\"couple_names\"");
  await expect(manifestEntry).toContainText("\"event_date\"");
});

test("fast wedding event creation requires couple names and date", async ({
  page,
}) => {
  await expectCreatePathValidation(page, {
    themePattern: /wedding/,
    eventName: "Jordan and Alex",
    visibleFieldSelectors: ["#createPathWeddingFields"],
    firstMessage: "Enter both partner names for a wedding event.",
    firstInvalidSelectors: ["#createPathPartner1", "#createPathPartner2"],
    fillBetweenAlerts: async (nextPage) => {
      await nextPage.fill("#createPathPartner1", "Jordan");
      await nextPage.fill("#createPathPartner2", "Alex");
    },
    secondMessage: "Enter the wedding date.",
  });
});

test("fast birthday event creation requires birthday name and date", async ({
  page,
}) => {
  await expectCreatePathValidation(page, {
    themePattern: /birthday/,
    eventName: "Maddie Birthday Bash",
    visibleFieldSelectors: ["#createPathBirthdayFields"],
    firstMessage: "Enter the birthday name.",
    firstInvalidSelectors: ["#createPathBirthdayName"],
    fillBetweenAlerts: async (nextPage) => {
      await nextPage.fill("#createPathBirthdayName", "Maddie");
    },
    secondMessage: "Enter the birthday date.",
  });
});

test("wedding theme filtering hides holiday themes in the shared selector", async ({
  page,
}) => {
  await page.goto("/index.html");
  await page.evaluate(() => {
    const select = document.querySelector("#fontEventStyleSelect");
    if (!select) return;
    select.value = "wedding";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const options = await getOptionTexts(page, "#eventSelect");
  const joined = options.join(" ").toLowerCase();

  expect(joined).not.toContain("halloween");
  expect(joined).not.toContain("christmas");
  expect(joined).not.toContain("valentine");
});

test("single-photo overlay autofill renders couple names and date from the created event", async ({
  page,
}) => {
  await page.goto("/index.html");
  const themeValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /wedding/
  );
  await expect(themeValue).not.toBe("");
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
  await page.goto("/index.html");
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
