const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { walk, processDir } = require("./update-manifests");

async function withTempDir(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "update-manifests-"));
  try {
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("processes a root overlays directory", async () => {
  await withTempDir(async (root) => {
    const overlaysDir = path.join(root, "overlays");
    await fs.mkdir(overlaysDir, { recursive: true });

    await fs.writeFile(path.join(overlaysDir, "b.png"), "");
    await fs.writeFile(path.join(overlaysDir, "a.jpg"), "");
    await fs.writeFile(path.join(overlaysDir, "note.txt"), "");

    const results = await walk(overlaysDir, processDir);
    assert.deepStrictEqual(results, [
      { dir: overlaysDir, type: "overlays", count: 2 },
    ]);

    const manifest = JSON.parse(
      await fs.readFile(path.join(overlaysDir, "overlays.json"), "utf8"),
    );
    assert.deepStrictEqual(manifest, ["a.jpg", "b.png"]);
  });
});

test("merges existing template metadata", async () => {
  await withTempDir(async (root) => {
    const templatesDir = path.join(root, "templates");
    await fs.mkdir(templatesDir, { recursive: true });

    await fs.writeFile(path.join(templatesDir, "existing.png"), "");
    await fs.writeFile(path.join(templatesDir, "new.png"), "");
    await fs.writeFile(
      path.join(templatesDir, "templates.json"),
      JSON.stringify(
        [
          {
            src: "existing.png",
            layout: "custom_layout",
            note: "kept",
          },
        ],
        null,
        2,
      ),
    );

    const results = await walk(templatesDir, processDir);
    assert.deepStrictEqual(results, [
      { dir: templatesDir, type: "templates", count: 2 },
    ]);

    const manifest = JSON.parse(
      await fs.readFile(path.join(templatesDir, "templates.json"), "utf8"),
    );
    assert.deepStrictEqual(manifest, [
      { src: "existing.png", layout: "custom_layout", note: "kept" },
      { src: "new.png", layout: "double_column" },
    ]);
  });
});

test("writes backgrounds manifest with only images", async () => {
  await withTempDir(async (root) => {
    const backgroundsDir = path.join(root, "backgrounds");
    await fs.mkdir(backgroundsDir, { recursive: true });

    await fs.writeFile(path.join(backgroundsDir, "z.png"), "");
    await fs.writeFile(path.join(backgroundsDir, "a.jpg"), "");
    await fs.writeFile(path.join(backgroundsDir, "README.md"), "not image");

    const results = await walk(backgroundsDir, processDir);
    assert.deepStrictEqual(results, [
      { dir: backgroundsDir, type: "backgrounds", count: 2 },
    ]);

    const manifest = JSON.parse(
      await fs.readFile(path.join(backgroundsDir, "backgrounds.json"), "utf8"),
    );
    assert.deepStrictEqual(manifest, ["a.jpg", "z.png"]);
  });
});
