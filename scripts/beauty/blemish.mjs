export function applyBlemishCorrection(canvas, mask, amount = 0) {
  const strength = clamp(amount / 100, 0, 1);
  if (!canvas || strength <= 0) return canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const region = normalizeRegion(mask, canvas.width, canvas.height);
  if (!region) return canvas;

  const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const warmSpot = red - Math.max(green, blue);
    if (warmSpot <= 8) continue;
    const correction = Math.min(warmSpot, 26) * strength * 0.45;
    data[index] = clamp(red - correction, 0, 255);
    data[index + 1] = clamp(green + correction * 0.18, 0, 255);
    data[index + 2] = clamp(blue + correction * 0.14, 0, 255);
  }
  ctx.putImageData(imageData, region.x, region.y);

  return canvas;
}

function normalizeRegion(mask, width, height) {
  const source = mask || { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.floor(source.x));
  const y = Math.max(0, Math.floor(source.y));
  const right = Math.min(width, Math.ceil(source.x + source.width));
  const bottom = Math.min(height, Math.ceil(source.y + source.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
