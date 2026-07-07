export function applyTeethWhitening(canvas, masks, amount = 0) {
  const strength = clamp(amount / 100, 0, 1);
  if (!canvas || strength <= 0) return canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  applyRegionLift(ctx, canvas.width, canvas.height, masks && masks.teeth, strength * 34);
  applyRegionLift(ctx, canvas.width, canvas.height, masks && masks.eyes, strength * 18);
  return canvas;
}

function applyRegionLift(ctx, width, height, mask, lift) {
  const region = normalizeRegion(mask, width, height);
  if (!region) return;

  const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const lightPixel = clamp((luminance - 80) / 175, 0, 1);
    data[index] = clamp(red + lift * lightPixel, 0, 255);
    data[index + 1] = clamp(green + lift * lightPixel, 0, 255);
    data[index + 2] = clamp(blue + lift * 0.9 * lightPixel, 0, 255);
  }
  ctx.putImageData(imageData, region.x, region.y);
}

function normalizeRegion(mask, width, height) {
  if (!mask) return null;
  const x = Math.max(0, Math.floor(mask.x));
  const y = Math.max(0, Math.floor(mask.y));
  const right = Math.min(width, Math.ceil(mask.x + mask.width));
  const bottom = Math.min(height, Math.ceil(mask.y + mask.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
