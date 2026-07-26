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

const PNG_FIXTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function uploadFixture(port, contents = PNG_FIXTURE, name = "fixture.png") {
  const body = new FormData();
  body.append("file", new Blob([contents], { type: "image/png" }), name);
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
    const saved = await fs.readFile(path.join(UPLOADS_DIR, json.filename));
    assert.deepEqual(saved, PNG_FIXTURE);
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

test("asset library deduplicates URL variants by category", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const first = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "overlay",
        url: "/assets/events/demo/overlays/frame.png?v=old",
        name: "Frame",
        tags: ["event"],
      }),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "overlay",
        url: "assets/events/demo/overlays/frame.png#cache",
        name: "Frame Duplicate",
        tags: ["duplicate"],
      }),
    });
    assert.equal(second.status, 200);

    const list = await fetch(`http://127.0.0.1:${port}/api/assets`);
    assert.equal(list.status, 200);
    const payload = await list.json();
    assert.equal(payload.assets.length, 1);
    assert.equal(
      payload.assets[0].id,
      "overlay:assets/events/demo/overlays/frame.png"
    );
    assert.deepEqual(payload.assets[0].tags.sort(), ["duplicate", "event"]);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("asset library can return only the requested theme category", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    for (const [name, tag] of [["Birthday frame", "birthday"], ["Wedding frame", "wedding"]]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "overlay",
          url: `https://example.test/${tag}-${name.replace(/ /g, "-")}.png`,
          name,
          tags: [tag],
        }),
      });
      assert.equal(response.status, 200);
    }
    const response = await fetch(`http://127.0.0.1:${port}/api/assets?themeCategory=birthday`);
    const payload = await response.json();
    assert.equal(payload.assets.length, 1);
    assert.equal(payload.assets[0].name, "Birthday frame");
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("print queue shares items by event and requires manual payment before staff workflow", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const imageUrl = "https://res.cloudinary.com/demo/image/upload/v1/booth/final.jpg";
    const post = await fetch(`http://127.0.0.1:${port}/api/print-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "summer fair", imageUrl }),
    });
    assert.equal(post.status, 201);
    const created = await post.json();
    assert.equal(created.item.paymentStatus, "unpaid");
    assert.equal(created.item.printStatus, "new");
    assert.equal(created.item.quantity, 1);

    const duplicate = await fetch(`http://127.0.0.1:${port}/api/print-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "summer-fair", imageUrl }),
    });
    assert.equal((await duplicate.json()).created, false);

    const paid = await fetch(`http://127.0.0.1:${port}/api/print-queue/${created.item.id}?eventId=summer-fair`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "summer-fair", printStatus: "printed", paymentStatus: "paid" }),
    });
    const paidItem = (await paid.json()).item;
    assert.equal(paidItem.printStatus, "printed");
    assert.equal(paidItem.paymentStatus, "paid");
    assert.ok(paidItem.paidAt);
    assert.ok(paidItem.printedAt);

    const listed = await fetch(`http://127.0.0.1:${port}/api/print-queue?eventId=summer-fair`);
    assert.equal((await listed.json()).items.length, 1);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("print queue supports sponsor-covered prints without payment", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const post = await fetch(`http://127.0.0.1:${port}/api/print-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "included-prints",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/booth/included.jpg",
        paymentRequired: false,
        quantity: 2,
      }),
    });
    const item = (await post.json()).item;
    assert.equal(item.printStatus, "new");
    assert.equal(item.paymentStatus, "comped");
    assert.equal(item.paymentRequired, false);
    assert.equal(item.quantity, 2);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("local uploads can be deleted through /api/upload", withTempEnv(async (_tmp, t) => {
  const { UPLOADS_DIR } = loadServerModule();
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const upload = await uploadFixture(port, PNG_FIXTURE, "delete-me.png");

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

test("gallery index stores Cloudinary URLs by tag", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const firstUrl = "https://res.cloudinary.com/demo/image/upload/v1/booth/first.jpg";
    const secondUrl = "https://res.cloudinary.com/demo/image/upload/v1/booth/second.jpg";

    const postFirst = await fetch(`http://127.0.0.1:${port}/api/gallery?tag=Photos 2026/06/07`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: firstUrl,
        title: "Photos - 2026-06-07",
        created_at: "2026-06-07T12:00:00.000Z",
        capture_id: "capture-one",
      }),
    });

    assert.equal(postFirst.status, 200);
    assert.deepEqual(await postFirst.json(), { ok: true, count: 1 });

    const postSecond = await fetch(`http://127.0.0.1:${port}/api/gallery?tag=photos-2026-06-07`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secure_url: secondUrl,
        title: "Updated title",
        created_at: "2026-06-07T12:01:00.000Z",
        capture_id: "capture-two",
        resource_type: "video",
        mode: "message",
      }),
    });

    assert.equal(postSecond.status, 200);
    assert.deepEqual(await postSecond.json(), { ok: true, count: 2 });

    const getResp = await fetch(`http://127.0.0.1:${port}/api/gallery?tag=photos-2026-06-07`);
    assert.equal(getResp.status, 200);
    const getJson = await getResp.json();
    assert.equal(getJson.tag, "photos-2026-06-07");
    assert.equal(getJson.title, "Updated title");
    assert.deepEqual(
      getJson.resources.map((item) => item.secure_url),
      [secondUrl, firstUrl]
    );
    assert.equal(getJson.resources[0].resource_type, "video");
    assert.equal(getJson.resources[0].type, "video");
    assert.equal(getJson.resources[0].mode, "message");
    assert.equal(getJson.resources[0].capture_id, "capture-two");
    assert.equal(getJson.resources[1].resource_type, "image");

    const retryUrl = "https://res.cloudinary.com/demo/image/upload/v1/booth/retry.jpg";
    const retryResp = await fetch(`http://127.0.0.1:${port}/api/gallery?tag=photos-2026-06-07`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secure_url: retryUrl,
        title: "Retry title",
        created_at: "2026-06-07T12:02:00.000Z",
        capture_id: "capture-two",
      }),
    });
    assert.equal(retryResp.status, 200);
    assert.deepEqual(await retryResp.json(), { ok: true, count: 2 });
    const retryGetResp = await fetch(`http://127.0.0.1:${port}/api/gallery?tag=photos-2026-06-07`);
    const retryJson = await retryGetResp.json();
    assert.deepEqual(
      retryJson.resources.map((item) => item.secure_url),
      [retryUrl, firstUrl]
    );
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));

test("asset library stores uploaded Cloudinary asset metadata", withTempEnv(async (_tmp, t) => {
  const server = await startTempServer(t);
  if (!server) return;
  try {
    const { port } = server.address();
    const assetUrl = "https://res.cloudinary.com/demo/image/upload/v1/booth/summer-overlay.png";

    const postResp = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "overlay:summer",
        category: "overlays",
        url: assetUrl,
        name: "Summer Overlay",
        tags: ["Summer", "party", "summer"],
        folder: "photobooth/assets/overlays",
        customizable: true,
        editableFields: ["Event Name", "date", "school name"],
      }),
    });
    assert.equal(postResp.status, 200);
    assert.equal((await postResp.json()).ok, true);

    const getResp = await fetch(`http://127.0.0.1:${port}/api/assets`);
    assert.equal(getResp.status, 200);
    const getJson = await getResp.json();
    assert.equal(getJson.assets.length, 1);
    assert.equal(getJson.assets[0].category, "overlay");
    assert.deepEqual(getJson.assets[0].tags, ["summer", "party"]);
    assert.equal(getJson.assets[0].customizable, true);
    assert.deepEqual(getJson.assets[0].editableFields, [
      "eventName",
      "date",
      "schoolName",
    ]);

    const patchResp = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "overlay:summer",
        archived: true,
        hidden: true,
        name: "Renamed Summer Overlay",
        tags: "school, reusable",
        editableFields: "title, button text",
      }),
    });
    assert.equal(patchResp.status, 200);
    const archivedResp = await fetch(`http://127.0.0.1:${port}/api/assets`);
    const archivedJson = await archivedResp.json();
    assert.equal(archivedJson.assets[0].archived, true);
    assert.equal(archivedJson.assets[0].hidden, true);
    assert.equal(archivedJson.assets[0].name, "Renamed Summer Overlay");
    assert.deepEqual(archivedJson.assets[0].tags, ["school", "reusable"]);
    assert.deepEqual(archivedJson.assets[0].editableFields, [
      "title",
      "buttonText",
    ]);

    const deleteResp = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "overlay:summer" }),
    });
    assert.equal(deleteResp.status, 200);
    const emptyResp = await fetch(`http://127.0.0.1:${port}/api/assets`);
    assert.deepEqual(await emptyResp.json(), { assets: [] });

    const relativeResp = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "background:assets/general/basic/backgrounds/background.png",
        category: "background",
        url: "assets/general/basic/backgrounds/background.png",
        name: "Renamed Default Background",
        hidden: true,
        archived: true,
      }),
    });
    assert.equal(relativeResp.status, 200);
    const relativeJson = await (await fetch(`http://127.0.0.1:${port}/api/assets`)).json();
    assert.equal(relativeJson.assets[0].url, "assets/general/basic/backgrounds/background.png");
    assert.equal(relativeJson.assets[0].hidden, true);
    assert.equal(relativeJson.assets[0].name, "Renamed Default Background");
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}));
