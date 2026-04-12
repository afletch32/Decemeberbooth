const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

function withTempEnv(fn) {
  return async (t) => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-server-"));
    const prev = process.env.DATA_ROOT;
    process.env.DATA_ROOT = tmp;
    t.after(async () => {
      process.env.DATA_ROOT = prev;
      await fs.rm(tmp, { recursive: true, force: true });
    });
    try {
      return await fn(tmp, t);
    } finally {
      // Cleanup is registered with the test runner so early skips still restore env.
    }
  };
}

function loadServerModule() {
  delete require.cache[require.resolve("./server")];
  return require("./server");
}

async function startTempServer(t) {
  const { startServer } = loadServerModule();
  const server = startServer(0, "127.0.0.1");
  const waitForServer = new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    await waitForServer;
    return server;
  } catch (err) {
    if (err && err.code === "EPERM") {
      t.skip("Socket listen is blocked in this sandbox.");
      return null;
    }
    throw err;
  }
}

async function uploadFixture(port, contents = "hello", name = "greeting.txt") {
  const body = new FormData();
  body.append("file", new Blob([contents], { type: "text/plain" }), name);
  const resp = await fetch(`http://127.0.0.1:${port}/api/upload`, {
    method: "POST",
    body,
  });
  assert.equal(resp.status, 200);
  const json = await resp.json();
  assert.equal(json.ok, true);
  assert.ok(json.url.includes("/uploads/"));
  return json;
}

test("uploads are stored and served via /api/upload", withTempEnv(async (_tmp, t) => {
  const { UPLOADS_DIR } = loadServerModule();
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const json = await uploadFixture(port);
    const saved = await fs.readFile(path.join(UPLOADS_DIR, json.filename), "utf8");
    assert.equal(saved, "hello");
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("resolveUploadFilepath only accepts direct /uploads references", withTempEnv(async () => {
  const { resolveUploadFilepath, UPLOADS_DIR } = loadServerModule();
  assert.equal(
    resolveUploadFilepath("/uploads/test.png"),
    path.join(UPLOADS_DIR, "test.png")
  );
  assert.equal(
    resolveUploadFilepath("http://localhost/uploads/test.png"),
    path.join(UPLOADS_DIR, "test.png")
  );
  assert.equal(resolveUploadFilepath("/uploads/nested/test.png"), null);
  assert.equal(resolveUploadFilepath("/uploads/../test.png"), null);
  assert.equal(resolveUploadFilepath("/not-uploads/test.png"), null);
}));

test("local uploads can be deleted through /api/upload", withTempEnv(async (_tmp, t) => {
  const { UPLOADS_DIR } = loadServerModule();
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const upload = await uploadFixture(port, "bye", "delete-me.txt");

    const delResp = await fetch(`http://127.0.0.1:${port}/api/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: upload.url }),
    });

    assert.equal(delResp.status, 200);
    const json = await delResp.json();
    assert.equal(json.ok, true);
    await assert.rejects(fs.readFile(path.join(UPLOADS_DIR, upload.filename), "utf8"));
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("events payloads are stored and loaded via /api/events", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const payload = {
      events: [{ id: "spring-fair-1", name: "Spring Fair", themeKey: "general:basic" }],
      activeEventId: "spring-fair-1",
    };

    const putResp = await fetch(`http://127.0.0.1:${port}/api/events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(putResp.status, 200);
    const putJson = await putResp.json();
    assert.equal(putJson.ok, true);

    const getResp = await fetch(`http://127.0.0.1:${port}/api/events`);
    assert.equal(getResp.status, 200);
    const getJson = await getResp.json();
    assert.deepEqual(getJson, payload);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));
