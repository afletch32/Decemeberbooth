import { initializeFaceTracker, detectFace } from "./tracker.mjs";
import { buildBeautyMasks, buildSkinMaskCanvas } from "./masks.mjs";
import { normalizeBeautyPreset } from "./settings.mjs";
import { applySmoothing } from "./smoothing.mjs";
import { applyGpuSmoothing } from "./gpu-smoothing.mjs";
import { applyTeethWhitening } from "./teeth.mjs";
import { applyBlemishCorrection } from "./blemish.mjs";
import { applyUndereyeCorrection } from "./undereye.mjs";
import { applyToneCorrection } from "./tone.mjs";
import { applyLightingCorrection } from "./lighting.mjs";
import { applyCartoonEffect } from "./cartoon.mjs";

let trackerReady = false;
let trackerInitialization = null;
let trackerRetryAfter = 0;
const TRACKER_INIT_TIMEOUT_MS = 10000;
const TRACKER_RETRY_DELAY_MS = 30000;

export async function initializeBeautyEngine() {
  if (trackerReady) return true;
  if (trackerInitialization) return trackerInitialization;
  if (Date.now() < trackerRetryAfter) return false;

  trackerInitialization = new Promise((resolve) => {
    let settled = false;
    const finish = (ready, error = null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      trackerReady = ready;
      trackerRetryAfter = ready ? 0 : Date.now() + TRACKER_RETRY_DELAY_MS;
      trackerInitialization = null;
      if (error) console.warn("Beauty face tracker unavailable; retrying later", error);
      resolve(ready);
    };
    const timeoutId = window.setTimeout(
      () => finish(false, new Error("Face tracker initialization timed out")),
      TRACKER_INIT_TIMEOUT_MS
    );
    initializeFaceTracker().then(
      () => finish(true),
      (error) => finish(false, error)
    );
  });
  return trackerInitialization;
}

export async function applyBeautyFrame({ canvas, video, settings } = {}) {
  const preset = normalizeBeautyPreset(settings);
  if (!canvas || !preset.beauty.enabled) return canvas;

  let faceResult = null;
  if (video) {
    // Face tracking loads in the background. Until ready, both preview and
    // capture use the same preset corrections with a full-frame mask.
    void initializeBeautyEngine();
    if (trackerReady) {
      try {
        faceResult = detectFace(video);
      } catch (error) {
        console.warn("Beauty face detection failed", error);
      }
    }
  }

  const masks = buildBeautyMasks(faceResult, canvas.width, canvas.height);
  applyLightingCorrection(canvas, preset.lighting);
  applyBlemishCorrection(canvas, masks.face, preset.beauty.blemish);
  const gpuMask = buildSkinMaskCanvas(
    faceResult && faceResult.faceLandmarks ? faceResult.faceLandmarks[0] : null,
    canvas.width,
    canvas.height
  );
  if (!applyGpuSmoothing(canvas, gpuMask, preset.beauty.skinSmooth)) {
    applySmoothing(canvas, masks.face, preset.beauty.skinSmooth);
  }
  applyUndereyeCorrection(canvas, masks.underEyes, preset.beauty.underEye);
  applyTeethWhitening(canvas, masks, preset.beauty.teeth);
  applyToneCorrection(canvas, masks.face, {
    shine: preset.beauty.shine,
    tone: preset.beauty.tone,
  });
  if (!preset.cartoon.deliveryOnly) applyCartoonEffect(canvas, preset.cartoon);
  return canvas;
}
