const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("repository AGENTS instructions are present", () => {
  const contents = readFileSync(join(process.cwd(), "AGENTS.md"), "utf8");

  assert.ok(contents.includes("Agent Instructions"), "AGENTS.md should describe agent guidance");
  assert.ok(
    contents.includes("double quotes"),
    "AGENTS.md should include string style guidance"
  );
  assert.ok(
    contents.includes("npm test"),
    "AGENTS.md should note testing expectations"
  );
});
