const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadRemoteSyncHelpers() {
  const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/remote-sync-utils.mjs"));
  return import(moduleUrl.href);
}

test("shouldEnableRemoteSync defaults on for localhost over http", async () => {
  const { shouldEnableRemoteSync } = await loadRemoteSyncHelpers();

  assert.equal(shouldEnableRemoteSync({
    protocol: "http:",
    host: "localhost",
    override: null
  }), true);
});

test("shouldEnableRemoteSync blocks file protocol", async () => {
  const { shouldEnableRemoteSync } = await loadRemoteSyncHelpers();

  assert.equal(shouldEnableRemoteSync({
    protocol: "file:",
    host: "",
    override: null
  }), false);
});

test("shouldEnableRemoteSync blocks github.io by default", async () => {
  const { shouldEnableRemoteSync } = await loadRemoteSyncHelpers();

  assert.equal(shouldEnableRemoteSync({
    protocol: "https:",
    host: "example.github.io",
    override: null
  }), false);
});

test("shouldEnableRemoteSync respects explicit overrides", async () => {
  const { shouldEnableRemoteSync } = await loadRemoteSyncHelpers();

  assert.equal(shouldEnableRemoteSync({
    protocol: "https:",
    host: "example.github.io",
    override: true
  }), true);

  assert.equal(shouldEnableRemoteSync({
    protocol: "https:",
    host: "my-app.pages.dev",
    override: false
  }), false);
});
