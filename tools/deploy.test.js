const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  DEFAULT_PROJECT,
  buildDeployArgs,
  getPagesProjectName,
  readPagesProjectName,
} = require("./deploy");

async function withTempFile(contents, fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "deploy-config-"));
  const configPath = path.join(root, "wrangler.toml");
  try {
    await fs.writeFile(configPath, contents, "utf8");
    return await fn(configPath);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("getPagesProjectName prefers environment overrides", () => {
  const env = {
    CF_PAGES_PROJECT: "from-cf-pages-project",
    CLOUDFLARE_PAGES_PROJECT: "from-cloudflare-pages-project",
  };

  assert.equal(getPagesProjectName(env, "/missing/wrangler.toml"), "from-cf-pages-project");
});

test("getPagesProjectName falls back to wrangler.toml name", async () => {
  await withTempFile('name = "decemeberbooth"\n', async (configPath) => {
    assert.equal(getPagesProjectName({}, configPath), "decemeberbooth");
    assert.equal(readPagesProjectName(configPath), "decemeberbooth");
  });
});

test("getPagesProjectName uses the default when config is missing", () => {
  assert.equal(getPagesProjectName({}, "/missing/wrangler.toml"), DEFAULT_PROJECT);
});

test("buildDeployArgs uses the resolved project name", async () => {
  await withTempFile('name = "decemeberbooth"\n', async (configPath) => {
    assert.deepEqual(buildDeployArgs({}, configPath), [
      "pages",
      "deploy",
      ".",
      "--project-name",
      "decemeberbooth",
    ]);
  });
});
