const FRAME_INTERVAL_MS = 300;
const INITIALIZATION_TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 30000;

export function createFaceTracker(dependencies = {}) {
  const WorkerConstructor = dependencies.WorkerConstructor || globalThis.Worker;
  const createBitmap = dependencies.createImageBitmap || globalThis.createImageBitmap;
  const now = dependencies.now || (() => performance.now());
  const dateNow = dependencies.dateNow || (() => Date.now());
  const schedule = dependencies.setTimeout || globalThis.setTimeout.bind(globalThis);
  const cancel = dependencies.clearTimeout || globalThis.clearTimeout.bind(globalThis);

  let worker = null;
  let workerReady = false;
  let initializationPromise = null;
  let initializationResolve = null;
  let initializationTimer = null;
  let retryAfter = 0;
  let framePending = false;
  let lastFrameAt = -Infinity;
  let lastTimestamp = 0;
  let latestFaceResult = null;

  function finishInitialization(ready) {
    if (initializationTimer !== null) cancel(initializationTimer);
    initializationTimer = null;
    const resolve = initializationResolve;
    initializationResolve = null;
    initializationPromise = null;
    if (resolve) resolve(ready);
  }

  function stopWorker(shouldRetry) {
    const currentWorker = worker;
    worker = null;
    workerReady = false;
    framePending = false;
    latestFaceResult = null;
    if (shouldRetry) retryAfter = dateNow() + RETRY_DELAY_MS;
    if (currentWorker) currentWorker.terminate();
    finishInitialization(false);
  }

  function initialize() {
    if (workerReady) return Promise.resolve(true);
    if (initializationPromise) return initializationPromise;
    if (dateNow() < retryAfter) return Promise.resolve(false);
    if (typeof WorkerConstructor !== "function" || typeof createBitmap !== "function") {
      retryAfter = dateNow() + RETRY_DELAY_MS;
      return Promise.resolve(false);
    }

    initializationPromise = new Promise((resolve) => {
      initializationResolve = resolve;
      try {
        worker = new WorkerConstructor(new URL("./tracker-worker.mjs", import.meta.url), {
          type: "module",
        });
        worker.onmessage = (event) => {
          const message = event && event.data;
          if (!message || typeof message !== "object") return;
          if (message.type === "ready") {
            workerReady = true;
            retryAfter = 0;
            finishInitialization(true);
            return;
          }
          if (message.type === "frame-result") {
            framePending = false;
            latestFaceResult = normalizeFaceResult(message.faceLandmarks);
            return;
          }
          if (message.type === "frame-error") framePending = false;
          if (message.type === "initialization-error") stopWorker(true);
        };
        worker.onerror = () => stopWorker(true);
        initializationTimer = schedule(() => stopWorker(true), INITIALIZATION_TIMEOUT_MS);
      } catch (_) {
        stopWorker(true);
      }
    });

    return initializationPromise;
  }

  function request(video) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return latestFaceResult;
    }
    if (typeof createBitmap !== "function") return latestFaceResult;
    if (!workerReady) {
      if (dateNow() >= retryAfter) void initialize();
      return latestFaceResult;
    }

    const frameTime = now();
    if (framePending || frameTime - lastFrameAt < FRAME_INTERVAL_MS) return latestFaceResult;
    framePending = true;
    lastFrameAt = frameTime;
    const timestamp = Math.max(frameTime, lastTimestamp + 1);
    lastTimestamp = timestamp;

    Promise.resolve()
      .then(() => createBitmap(video))
      .then((bitmap) => {
        if (!bitmap) {
          framePending = false;
          return;
        }
        if (!workerReady || !worker) {
          if (typeof bitmap.close === "function") bitmap.close();
          framePending = false;
          return;
        }
        worker.postMessage({ type: "frame", bitmap, timestamp }, [bitmap]);
      })
      .catch(() => {
        framePending = false;
      });

    return latestFaceResult;
  }

  function destroy() {
    stopWorker(false);
    retryAfter = 0;
    lastFrameAt = -Infinity;
    lastTimestamp = 0;
  }

  return { initialize, request, destroy };
}

const faceTracker = createFaceTracker();

export function initializeFaceTracker() {
  return faceTracker.initialize();
}

export function detectFace(video) {
  return faceTracker.request(video);
}

function normalizeFaceResult(faceLandmarks) {
  if (!Array.isArray(faceLandmarks) || faceLandmarks.length === 0) {
    return { faceLandmarks: [] };
  }
  return {
    faceLandmarks: [
      faceLandmarks.map((point) => ({
        x: Number(point && point.x) || 0,
        y: Number(point && point.y) || 0,
        z: Number(point && point.z) || 0,
      })),
    ],
  };
}
