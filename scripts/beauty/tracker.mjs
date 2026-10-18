let landmarker = null;
let initializationPromise = null;

export async function initializeFaceTracker() {
  if (landmarker) return landmarker;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      });
      return landmarker;
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

export function detectFace(video) {
  if (!landmarker || !video) return null;

  return landmarker.detectForVideo(video, performance.now());
}
