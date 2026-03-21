#!/usr/bin/env node
/**
 * Backward-compatible wrapper.
 * Canonical manifest generator lives at tools/update-manifests.js.
 */
const { spawn } = require("child_process");
const path = require("path");

const script = path.resolve(__dirname, "tools/update-manifests.js");
const args = [script, ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code || 0);
});

