const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function readProjectFile(...parts) {
  return fs.readFileSync(path.join(__dirname, ...parts), "utf8");
}

test("pages functions provide live sync endpoints for themes, events, and fonts", () => {
  const themesFn = readProjectFile("functions", "api", "themes.js");
  const eventsFn = readProjectFile("functions", "api", "events.js");
  const fontsFn = readProjectFile("functions", "api", "fonts.js");

  assert.ok(
    themesFn.includes('await env.THEMES_KV.put("themes"'),
    "themes Pages function should persist shared theme data in KV"
  );
  assert.ok(
    eventsFn.includes('await env.THEMES_KV.put("events"'),
    "events Pages function should persist shared event data in KV"
  );
  assert.ok(
    fontsFn.includes('await env.FONTS_KV.put("fonts"'),
    "fonts Pages function should persist shared font data in KV"
  );
  assert.ok(
    themesFn.includes('"Access-Control-Allow-Methods": "GET, PUT, OPTIONS"'),
    "themes endpoint should allow the same cross-device sync verbs as local dev"
  );
  assert.ok(
    eventsFn.includes("function normalizeEventsPayload(payload)"),
    "events endpoint should normalize stored payloads for older array-only data"
  );
});
