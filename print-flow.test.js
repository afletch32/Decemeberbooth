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
  assert.ok(app.includes('const noPaymentRequired = settings.mode === "free"'));
});

test("staff must clear payment before printing paid queue items", () => {
  const staff = read("scripts", "staff-print.js");
  assert.ok(staff.includes('data-action="paid"'));
  assert.ok(staff.includes('paymentStatus: "paid"'));
  assert.ok(staff.includes('item.paymentStatus === "paid" || item.paymentStatus === "comped"'));
  assert.ok(staff.includes('${paymentCleared ? "" : "disabled"}>Open/Print'));
  assert.ok(staff.includes('${paymentCleared ? "" : "disabled"}>Mark Printed'));
});
