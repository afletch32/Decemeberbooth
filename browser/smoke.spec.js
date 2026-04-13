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

  for (const selector of visibleFieldSelectors) {
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
  for (const selector of secondInvalidSelectors || []) {
    await expect(page.locator(selector)).toHaveAttribute("aria-invalid", "true");
  }
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
    themePattern: /wedding:/,
    eventName: "Jordan and Alex",
    visibleFieldSelectors: ["#createPathWeddingFields", "#createPathDateFields"],
    firstMessage: "Enter both partner names for a wedding event.",
    firstInvalidSelectors: ["#createPathPartner1", "#createPathPartner2"],
    fillBetweenAlerts: async (nextPage) => {
      await nextPage.fill("#createPathPartner1", "Jordan");
      await nextPage.fill("#createPathPartner2", "Alex");
    },
    secondMessage: "Enter the wedding date.",
    secondInvalidSelectors: ["#createPathEventDate"],
  });
});

test("fast birthday event creation requires birthday name and date", async ({
  page,
}) => {
  await expectCreatePathValidation(page, {
    themePattern: /birthday/,
    eventName: "Maddie Birthday Bash",
    visibleFieldSelectors: ["#createPathBirthdayFields", "#createPathDateFields"],
    firstMessage: "Enter the birthday name.",
    firstInvalidSelectors: ["#createPathBirthdayName"],
    fillBetweenAlerts: async (nextPage) => {
      await nextPage.fill("#createPathBirthdayName", "Maddie");
    },
    secondMessage: "Enter the birthday date.",
    secondInvalidSelectors: ["#createPathEventDate"],
  });
});
