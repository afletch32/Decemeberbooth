const test = require("node:test");
const assert = require("node:assert/strict");

test("face tracking runs through a throttled worker and returns its latest result immediately", async () => {
  const { createFaceTracker } = await import("./scripts/beauty/tracker.mjs?worker-test");
  let clock = 1000;
  const workers = [];
  const frames = [];

  class FakeWorker {
    constructor() {
      workers.push(this);
      setImmediate(() => this.onmessage({ data: { type: "ready" } }));
    }

    postMessage(message) {
      frames.push(message);
      setImmediate(() => this.onmessage({
        data: {
          type: "frame-result",
          faceLandmarks: [{ x: 0.25, y: 0.5, z: -0.1 }],
        },
      }));
    }

    terminate() {}
  }

  const tracker = createFaceTracker({
    WorkerConstructor: FakeWorker,
    createImageBitmap: async () => ({ close() {} }),
    now: () => clock,
    dateNow: () => clock,
  });
  const video = { readyState: 2, videoWidth: 640, videoHeight: 480 };

  assert.equal(tracker.request(video), null);
  assert.equal(await tracker.initialize(), true);
  assert.equal(tracker.request(video), null);
  assert.equal(frames.length, 0, "frame capture should be scheduled asynchronously");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].type, "frame");

  await new Promise((resolve) => setImmediate(resolve));
  const result = tracker.request(video);
  assert.deepEqual(result, {
    faceLandmarks: [[{ x: 0.25, y: 0.5, z: -0.1 }]],
  });

  clock += 100;
  tracker.request(video);
  assert.equal(frames.length, 1, "requests inside the interval should be skipped");
  clock += 250;
  tracker.request(video);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(frames.length, 2);
  assert.equal(workers.length, 1);
  tracker.destroy();
});

test("face tracking falls back immediately when workers or bitmap capture are unavailable", async () => {
  const { createFaceTracker } = await import("./scripts/beauty/tracker.mjs?fallback-test");
  const tracker = createFaceTracker({ WorkerConstructor: null, createImageBitmap: null });

  assert.equal(await tracker.initialize(), false);
  assert.equal(tracker.request({ readyState: 2, videoWidth: 640, videoHeight: 480 }), null);
  tracker.destroy();
});
