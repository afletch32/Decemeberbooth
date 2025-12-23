const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

function withTempEnv(fn) {
  return async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-server-"));
    const prev = process.env.DATA_ROOT;
    process.env.DATA_ROOT = tmp;
    try {
      return await fn(tmp);
    } finally {
      process.env.DATA_ROOT = prev;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  };
}

test("uploads are stored and served via /api/upload", withTempEnv(async () => {
  const { startServer, UPLOADS_DIR } = require("./server");
  const server = startServer(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const body = new FormData();
    body.append("file", new Blob(["hello"], { type: "text/plain" }), "greeting.txt");

    const resp = await fetch(`http://127.0.0.1:${port}/api/upload`, {
      method: "POST",
      body,
    });

    assert.equal(resp.status, 200);
    const json = await resp.json();
    assert.equal(json.ok, true);
    assert.ok(json.url.includes("/uploads/"));

    const saved = await fs.readFile(path.join(UPLOADS_DIR, json.filename), "utf8");
    assert.equal(saved, "hello");
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}));
