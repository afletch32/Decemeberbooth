const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadFormatRecordingTime() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/recording-utils.mjs"));
  const mod = await import(moduleUrl.href);
  return mod.formatRecordingTime;
}

test("formatRecordingTime formats mm:ss with rounding", async () => {
  const formatRecordingTime = await loadFormatRecordingTime();
  assert.equal(formatRecordingTime(0), "00:00");
  assert.equal(formatRecordingTime(999), "00:01");
  assert.equal(formatRecordingTime(1000), "00:01");
  assert.equal(formatRecordingTime(61000), "01:01");
});
