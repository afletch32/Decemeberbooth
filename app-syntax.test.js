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
