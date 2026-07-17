const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function read(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("admin exposes explicit off free and paid print modes", () => {
  const html = read("index.html");
  assert.ok(html.includes('<option value="off">Off</option>'));
  assert.ok(html.includes('<option value="free">Free Printing</option>'));
  assert.ok(html.includes('<option value="paid">Paid Printing</option>'));
});

test("legacy paid queue settings migrate to explicit print modes", () => {
  const app = read("scripts", "app.js");
  assert.ok(app.includes('if (settings.mode === "paid-queue")'));
  assert.ok(app.includes('settings.noPaymentRequired === true ? "free" : "paid"'));
});

test("free printing queues comped items and paid printing requires payment", () => {
  const app = read("scripts", "app.js");
  assert.ok(app.includes('paymentRequired: settings.mode === "paid"'));
  assert.ok(app.includes('if (settings.mode === "off" || !printEligible) return;'));
});

test("staff must clear payment before printing paid queue items", () => {
  const staff = read("scripts", "staff-print.js");
  assert.ok(staff.includes('data-action="paid"'));
  assert.ok(staff.includes('paymentStatus: "paid"'));
  assert.ok(staff.includes('item.paymentStatus === "paid" || item.paymentStatus === "comped"'));
  assert.ok(staff.includes('${paymentCleared ? "" : "disabled"}>Open/Print'));
  assert.ok(staff.includes('${paymentCleared ? "" : "disabled"}>Mark Printed'));
});

test("staff print settings explain the sheet arrangement visually", () => {
  const html = read("staff-print.html");
  const staff = read("scripts", "staff-print.js");

  assert.ok(html.includes("Photos on each sheet"));
  assert.ok(html.includes("Paper direction"));
  assert.ok(html.includes("Session print defaults"));
  assert.ok(html.includes("unless you change one photo below"));
  assert.ok(html.includes('id="printPreviewSheet"'));
  assert.ok(html.includes('id="printPreviewSummary"'));
  assert.ok(staff.includes("function renderPrintPreview()"));
  assert.ok(staff.includes('sheetLandscape ? " side by side" : " stacked"'));
  assert.ok(staff.includes('count === 1 ? "photo" : "photos"'));
  assert.ok(!html.includes('id="printRotation"'));
  assert.ok(!staff.includes("photoboothStaffPrintRotation"));
});

test("staff can override the session print layout for one queued photo", () => {
  const html = read("staff-print.html");
  const staff = read("scripts", "staff-print.js");

  assert.ok(html.includes("Session default preview"));
  assert.ok(staff.includes("photoboothStaffPrintOverrides"));
  assert.ok(staff.includes("function getResolvedPrintSettings(item)"));
  assert.ok(staff.includes("Change for this photo"));
  assert.ok(staff.includes("Use session default"));
  assert.ok(staff.includes('data-print-setting="layout"'));
  assert.ok(staff.includes('data-print-setting="orientation"'));
  assert.ok(staff.includes("settings.isOverride ? \"Custom\" : \"Session default\""));
  assert.ok(
    staff.includes(
      "openPrintWindowForImage(item.imageUrl, settings.layout, settings.orientation)"
    )
  );
});
