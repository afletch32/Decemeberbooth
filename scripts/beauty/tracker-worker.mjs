const TASKS_VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";
const TASKS_VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const MAX_ANALYSIS_EDGE = 320;

let landmarker = null;
let initializationPromise = null;

async function initialize() {
  if (landmarker) return landmarker;
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import(TASKS_VISION_URL);
      const vision = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM_URL);
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      return landmarker;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

async function analyzeFrame(bitmap, timestamp) {
  let analysisFrame = bitmap;
  let resizedFrame = null;
  try {
    if (typeof OffscreenCanvas === "function") {
      const scale = Math.min(1, MAX_ANALYSIS_EDGE / Math.max(bitmap.width, bitmap.height));
      if (scale < 1) {
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d", { alpha: false });
        if (context) {
          context.drawImage(bitmap, 0, 0, width, height);
          resizedFrame = canvas.transferToImageBitmap();
          analysisFrame = resizedFrame;
        }
      }
    }

    const result = landmarker.detectForVideo(analysisFrame, timestamp);
    const faceLandmarks = Array.isArray(result && result.faceLandmarks) && result.faceLandmarks[0]
      ? result.faceLandmarks[0].map((point) => ({ x: point.x, y: point.y, z: point.z }))
      : [];
    self.postMessage({ type: "frame-result", faceLandmarks });
  } finally {
    if (resizedFrame && typeof resizedFrame.close === "function") resizedFrame.close();
    if (bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

self.onmessage = async (event) => {
  const message = event && event.data;
  if (!message || typeof message !== "object") return;
  if (message.type === "frame") {
    try {
      await initialize();
      await analyzeFrame(message.bitmap, message.timestamp);
    } catch (_) {
      if (message.bitmap && typeof message.bitmap.close === "function") message.bitmap.close();
      self.postMessage({ type: "frame-error" });
    }
    return;
  }
};

void initialize().then(
  () => self.postMessage({ type: "ready" }),
  () => self.postMessage({ type: "initialization-error" })
);
