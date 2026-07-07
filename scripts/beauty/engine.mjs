import { initializeFaceTracker, detectFace } from "./tracker.mjs";
import { buildBeautyMasks } from "./masks.mjs";
import { normalizeBeautyPreset } from "./settings.mjs";
import { applySmoothing } from "./smoothing.mjs";
import { applyTeethWhitening } from "./teeth.mjs";
import { applyBlemishCorrection } from "./blemish.mjs";
import { applyUndereyeCorrection } from "./undereye.mjs";
import { applyToneCorrection } from "./tone.mjs";
import { applyLightingCorrection } from "./lighting.mjs";

let trackerReady = false;
let trackerFailed = false;

export async function initializeBeautyEngine() {
  if (trackerReady || trackerFailed) return trackerReady;
  try {
    await initializeFaceTracker();
    trackerReady = true;
  } catch (error) {
    trackerFailed = true;
    console.warn("Beauty face tracker unavailable", error);
  }
  return trackerReady;
}

export async function applyBeautyFrame({ canvas, video, settings } = {}) {
  const preset = normalizeBeautyPreset(settings);
  if (!canvas || !preset.beauty.enabled) return canvas;

  let faceResult = null;
  if (video) {
    await initializeBeautyEngine();
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
  applySmoothing(canvas, masks.face, preset.beauty.skinSmooth);
  applyBlemishCorrection(canvas, masks.face, preset.beauty.blemish);
  applyUndereyeCorrection(canvas, masks.underEyes, preset.beauty.underEye);
  applyTeethWhitening(canvas, masks, preset.beauty.teeth);
  applyToneCorrection(canvas, masks.face, {
    shine: preset.beauty.shine,
    tone: preset.beauty.tone,
  });
  return canvas;
}
