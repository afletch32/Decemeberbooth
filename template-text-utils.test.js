const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadTemplateTextUtils() {
  const moduleUrl = pathToFileURL(
    join(process.cwd(), "scripts/template-text-utils.mjs")
  );
  return import(moduleUrl.href);
}

test("resolveTemplateTextValue supports event autofill aliases", async () => {
  const { resolveTemplateTextValue } = await loadTemplateTextUtils();
  const event = {
    partner1: "Alex",
    partner2: "Jordan",
    birthdayName: "Maddie",
    expoCompany: "Acme Booths",
    name: "Launch Party",
    date: "April 2026",
  };

  assert.equal(resolveTemplateTextValue("couple_names", event), "Alex & Jordan");
  assert.equal(resolveTemplateTextValue("birthdayName", event), "Maddie");
  assert.equal(resolveTemplateTextValue("expo_company", event), "Acme Booths");
  assert.equal(resolveTemplateTextValue("event_name", event), "Launch Party");
  assert.equal(resolveTemplateTextValue("event_date", event), "April 2026");
});

test("normalizeTemplateTextFields keeps valid field definitions", async () => {
  const { normalizeTemplateTextFields } = await loadTemplateTextUtils();
  const result = normalizeTemplateTextFields([
    {
      key: "couple_names",
      xPct: 0.1,
      yPct: 0.8,
      wPct: 0.8,
      hPct: 0.1,
      fontFamily: '"DM Sans", sans-serif',
      fontSize: 36,
    },
    { key: "", xPct: 0.1, yPct: 0.1, wPct: 0.1, hPct: 0.1 },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].key, "couple_names");
  assert.equal(result[0].fontSize, 36);
});

test("resolveTemplateTextRect converts percentage-based fields into canvas pixels", async () => {
  const { resolveTemplateTextRect } = await loadTemplateTextUtils();
  const rect = resolveTemplateTextRect(
    { key: "event_name", xPct: 0.1, yPct: 0.2, wPct: 0.5, hPct: 0.15 },
    1200,
    1800
  );

  assert.deepEqual(rect, { x: 120, y: 360, w: 600, h: 270 });
});

test("validateCreatePathEventDetails requires names and date for weddings", async () => {
  const { validateCreatePathEventDetails } = await loadTemplateTextUtils();

  assert.deepEqual(
    validateCreatePathEventDetails("wedding", {
      partner1: "Alex",
      partner2: "",
      date: "June 14, 2026",
    }),
    {
      ok: false,
      message: "Enter both partner names for a wedding event.",
      fields: ["partner1", "partner2"],
    }
  );

  assert.deepEqual(
    validateCreatePathEventDetails("wedding", {
      partner1: "Alex",
      partner2: "Jordan",
      date: "",
    }),
    {
      ok: false,
      message: "Enter the wedding date.",
      fields: ["date"],
    }
  );
});

test("validateCreatePathEventDetails requires name and date for birthdays", async () => {
  const { validateCreatePathEventDetails } = await loadTemplateTextUtils();

  assert.deepEqual(
    validateCreatePathEventDetails("birthday", {
      birthdayName: "",
      date: "April 27, 2026",
    }),
    {
      ok: false,
      message: "Enter the birthday name.",
      fields: ["birthdayName"],
    }
  );

  assert.deepEqual(
    validateCreatePathEventDetails("birthday", {
      birthdayName: "Maddie",
      date: "",
    }),
    {
      ok: false,
      message: "Enter the birthday date.",
      fields: ["date"],
    }
  );

  assert.deepEqual(
    validateCreatePathEventDetails("birthday", {
      birthdayName: "Maddie",
      date: "April 27, 2026",
    }),
    { ok: true, message: "", fields: [] }
  );
});
