const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("app syncs events through the remote sync flow", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes('await fetch("/api/events", { cache: "no-store" });'),
    "events should be fetched from the shared remote endpoint"
  );
  assert.ok(
    appScript.includes('await fetch("/api/events", {'),
    "events should be pushed to the shared remote endpoint"
  );
  assert.ok(
    appScript.includes("function scheduleEventsRemoteSync()"),
    "event edits should use debounced remote sync"
  );
  assert.ok(
    appScript.includes("if (!options.skipRemoteSync) scheduleEventsRemoteSync();"),
    "local event updates should trigger remote sync by default"
  );
});

test("server exposes persistent event sync endpoints", () => {
  const serverScript = readProjectFile("server.js");

  assert.ok(
    serverScript.includes("app.get('/api/events'"),
    "server should expose a read endpoint for synced events"
  );
  assert.ok(
    serverScript.includes("app.put('/api/events'"),
    "server should expose a write endpoint for synced events"
  );
  assert.ok(
    serverScript.includes("writeJsonFile('events.json', payload);"),
    "server should persist synced events payloads"
  );
});
