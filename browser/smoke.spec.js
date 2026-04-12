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

async function installAlertSpy(page) {
  await page.addInitScript(() => {
    window.__testAlerts = [];
    window.alert = (message) => {
      window.__testAlerts.push(String(message));
    };
  });
}

async function getAlerts(page) {
  return page.evaluate(() => window.__testAlerts || []);
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
  await installAlertSpy(page);
  await page.goto("/index.html");

  const weddingValue = await getOptionValue(page, "#createPathThemeSelect", /wedding:/);
  await expect(weddingValue).not.toBe("");

  await page.fill("#createPathEventName", "Jordan and Alex");
  await page.selectOption("#createPathThemeSelect", weddingValue);

  await expect(page.locator("#createPathWeddingFields")).not.toHaveClass(/hidden/);
  await expect(page.locator("#createPathDateFields")).not.toHaveClass(/hidden/);

  await page.locator("#createEventBtn").click();
  await expect.poll(() => getAlerts(page)).toContain(
    "Enter both partner names for a wedding event."
  );

  await page.fill("#createPathPartner1", "Jordan");
  await page.fill("#createPathPartner2", "Alex");

  await page.locator("#createEventBtn").click();
  await expect.poll(() => getAlerts(page)).toContain("Enter the wedding date.");
});

test("fast birthday event creation requires birthday name and date", async ({
  page,
}) => {
  await installAlertSpy(page);
  await page.goto("/index.html");

  const birthdayValue = await getOptionValue(
    page,
    "#createPathThemeSelect",
    /birthday/
  );
  await expect(birthdayValue).not.toBe("");

  await page.fill("#createPathEventName", "Maddie Birthday Bash");
  await page.selectOption("#createPathThemeSelect", birthdayValue);

  await expect(page.locator("#createPathBirthdayFields")).not.toHaveClass(
    /hidden/
  );
  await expect(page.locator("#createPathDateFields")).not.toHaveClass(/hidden/);

  await page.locator("#createEventBtn").click();
  await expect.poll(() => getAlerts(page)).toContain("Enter the birthday name.");

  await page.fill("#createPathBirthdayName", "Maddie");

  await page.locator("#createEventBtn").click();
  await expect.poll(() => getAlerts(page)).toContain("Enter the birthday date.");
});
