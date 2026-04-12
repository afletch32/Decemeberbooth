/**
 * scripts/canvas-utils.mjs
 * Utilities for high-performance canvas operations and buffer management.
 */

export const CanvasBuffer = {
  _buffers: {},
  /**
   * Gets a reusable canvas instance (OffscreenCanvas if supported).
   * Resizes the canvas only if dimensions have changed.
   */
  get(id, w, h) {
    if (!this._buffers[id]) {
      this._buffers[id] =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(w, h)
          : document.createElement("canvas");
    }
    const canvas = this._buffers[id];
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // Clear the buffer for new drawing
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, w, h);
    return canvas;
  },
};

/**
 * Bridge for OffscreenCanvas to data URL for consumption by <img> elements.
 */
export async function offscreenToDataURL(offscreen) {
  const blob = await offscreen.convertToBlob({ type: "image/png" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
