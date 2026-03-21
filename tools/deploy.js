#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEFAULT_PROJECT = "decemeberbooth";

function readPagesProjectName(configPath = path.resolve(__dirname, "..", "wrangler.toml")) {
  try {
    const contents = fs.readFileSync(configPath, "utf8");
    const match = contents.match(/^\s*name\s*=\s*"([^"]+)"/m);
    return match ? match[1] : null;
  } catch (_err) {
    return null;
  }
}

function getPagesProjectName(env = process.env, configPath) {
  return (
    env.CF_PAGES_PROJECT ||
    env.CLOUDFLARE_PAGES_PROJECT ||
    readPagesProjectName(configPath) ||
    DEFAULT_PROJECT
  );
}

function buildDeployArgs(env = process.env, configPath) {
  return ["pages", "deploy", ".", "--project-name", getPagesProjectName(env, configPath)];
}

function main() {
  if (process.env.CF_PAGES) {
    console.log("Skipping wrangler deploy inside Cloudflare Pages build (CF_PAGES detected).");
    process.exit(0);
  }

  const args = buildDeployArgs();
  const child = spawn("npx", ["wrangler", ...args], { stdio: "inherit", shell: true });
  child.on("exit", (code) => process.exit(code || 0));
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_PROJECT,
  buildDeployArgs,
  getPagesProjectName,
  readPagesProjectName,
};
