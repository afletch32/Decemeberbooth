export function applyUndereyeCorrection(canvas, mask, amount = 0) {
  const strength = clamp(amount / 100, 0, 1);
  if (!canvas || strength <= 0) return canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const region = normalizeRegion(mask, canvas.width, canvas.height);
  if (!region) return canvas;

  const softened = document.createElement("canvas");
  softened.width = canvas.width;
  softened.height = canvas.height;
  const softenedCtx = softened.getContext("2d");
  if (!softenedCtx) return canvas;

  softenedCtx.filter = `blur(${1.5 + strength * 3}px)`;
  softenedCtx.drawImage(canvas, 0, 0);
  softenedCtx.filter = "none";

  const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
  const softenedData = softenedCtx.getImageData(
    region.x,
    region.y,
    region.width,
    region.height
  ).data;
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % region.width;
    const y = Math.floor(pixel / region.width);
    const feather = getMaskWeight(x, y, region.width, region.height, mask.feather);
    if (feather <= 0) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const sampleRed = softenedData[index];
    const sampleGreen = softenedData[index + 1];
    const sampleBlue = softenedData[index + 2];
    const luminance = getLuminance(red, green, blue);
    const sampleLuminance = getLuminance(sampleRed, sampleGreen, sampleBlue);
    const shadow = clamp((145 - luminance) / 125, 0, 1);
    const localShadow = clamp((sampleLuminance - luminance + 8) / 52, 0, 1);
    const bluePurple = clamp((blue - green + (red - green) * 0.34) / 55, 0, 1);
    const correction = clamp(
      Math.max(shadow * 0.86, localShadow, bluePurple * 0.9) * strength * feather,
      0,
      0.5
    );
    if (correction <= 0) continue;

    const blend = correction * 0.26;
    const lift = correction * 22;
    const neutralize = bluePurple * correction * 14;
    data[index] = clamp(lerp(red, sampleRed, blend) + lift * 0.72, 0, 255);
    data[index + 1] = clamp(lerp(green, sampleGreen, blend) + lift, 0, 255);
    data[index + 2] = clamp(
      lerp(blue, sampleBlue, blend) + lift * 0.62 - neutralize,
      0,
      255
    );
  }
  ctx.putImageData(imageData, region.x, region.y);

  return canvas;
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

function getMaskWeight(x, y, width, height, feather = 0.2) {
  const radiusX = Math.max(1, width / 2);
  const radiusY = Math.max(1, height / 2);
  const centerX = radiusX;
  const centerY = radiusY * 0.72;
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const edge = Math.max(0.04, Number(feather) || 0.18);
  const ellipseWeight = clamp((1 - distance) / edge, 0, 1);
  const verticalWeight = clamp(1 - Math.abs(y / Math.max(1, height - 1) - 0.42) / 0.58, 0, 1);
  return ellipseWeight * verticalWeight;
}

function getLuminance(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}
