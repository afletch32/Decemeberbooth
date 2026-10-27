const assert = require("assert");
const fs = require("node:fs");
const { readFileSync } = require("fs");
const path = require("node:path");
const { spawnSync } = require("child_process");
const test = require("node:test");

function listModules(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return listModules(file);
    return entry.isFile() && entry.name.endsWith(".mjs") ? [file] : [];
  });
}

test("browser app entry and feature modules parse as ES modules", () => {
  const files = ["scripts/app.js", ...listModules("scripts/app")];
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
      input: readFileSync(file, "utf8"),
      encoding: "utf8",
    });
    assert.strictEqual(result.status, 0, result.stderr || result.stdout || `${file} failed to parse`);
  }
});

test("static element lookups and ID selectors target existing elements", () => {
  const html = readFileSync("index.html", "utf8");
  const { readAppSource } = require("./test-utils/app-source.cjs");
  const appScript = readAppSource();
  const styles = [
    ...fs.readdirSync("styles").filter((name) => name.startsWith("app-") && name.endsWith(".css"))
      .map((name) => readFileSync(path.join("styles", name), "utf8")),
    readFileSync("final-preview-sizing-fix.css", "utf8"),
    readFileSync("fonts.css", "utf8"),
  ].join("\n");
  const knownIds = new Set(
    Array.from(html.matchAll(/\bid=["']([^"']+)["']/g), (match) => match[1])
  );
  for (const match of appScript.matchAll(/\bid=[\\"']([^\\"']+)[\\"']/g)) {
    knownIds.add(match[1]);
  }
  for (const match of appScript.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)) {
    knownIds.add(match[1]);
  }

  const missingLookups = Array.from(
    appScript.matchAll(/document\.getElementById\(\s*["']([^"']+)["']\s*\)/g),
    (match) => match[1]
  ).filter((id) => !knownIds.has(id));
  const missingSelectors = Array.from(
    new Set(
      Array.from(styles.matchAll(/#([A-Za-z_][\w-]*)/g), (match) => match[1])
    )
  ).filter((id) => !knownIds.has(id) && !/^[a-f0-9]{3,8}$/i.test(id));

  assert.deepStrictEqual(missingLookups, []);
  assert.deepStrictEqual(missingSelectors, []);
});
