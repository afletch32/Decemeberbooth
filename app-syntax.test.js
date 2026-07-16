const assert = require("assert");
const { readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const test = require("node:test");

test("browser app module parses as an ES module", () => {
  const appScript = readFileSync("scripts/app.js", "utf8");
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: appScript,
    encoding: "utf8",
  });

  assert.strictEqual(
    result.status,
    0,
    result.stderr || result.stdout || "scripts/app.js failed to parse"
  );
});

test("static element lookups and ID selectors target existing elements", () => {
  const html = readFileSync("index.html", "utf8");
  const appScript = readFileSync("scripts/app.js", "utf8");
  const styles = [
    ...Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi), (match) =>
      match[1]
    ),
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
