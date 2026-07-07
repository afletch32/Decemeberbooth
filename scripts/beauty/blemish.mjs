export function applyBlemishCorrection(canvas, mask, amount = 0) {
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

  softenedCtx.filter = `blur(${2 + strength * 5}px)`;
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
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const sampleRed = softenedData[index];
    const sampleGreen = softenedData[index + 1];
    const sampleBlue = softenedData[index + 2];
    const luminance = getLuminance(red, green, blue);
    const sampleLuminance = getLuminance(sampleRed, sampleGreen, sampleBlue);
    const localDifference =
      Math.abs(red - sampleRed) +
      Math.abs(green - sampleGreen) +
      Math.abs(blue - sampleBlue);
    const redExcess = red - (green + blue) / 2;
    const darkSpot = sampleLuminance - luminance;
    const saturation = getSaturation(red, green, blue);
    const skinLike = isSkinLikePixel(red, green, blue, luminance, saturation);
    const spotScore = Math.max(
      redExcess * 1.2,
      darkSpot * 1.4,
      saturation * localDifference * 0.55
    );

    if (!skinLike || localDifference < 10 || spotScore < 8) continue;

    const blend = clamp((spotScore / 32) * strength * 1.15, 0, 0.72);
    const redTarget = sampleRed - Math.max(0, redExcess) * 0.18;
    data[index] = clamp(lerp(red, redTarget, blend), 0, 255);
    data[index + 1] = clamp(lerp(green, sampleGreen, blend), 0, 255);
    data[index + 2] = clamp(lerp(blue, sampleBlue, blend), 0, 255);
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

function getLuminance(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function getSaturation(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max <= 0 ? 0 : (max - min) / max;
}

function isSkinLikePixel(red, green, blue, luminance, saturation) {
  if (luminance < 28 || luminance > 245 || saturation > 0.72) return false;
  if (red < blue * 0.72) return false;
  if (green < blue * 0.55) return false;
  return red >= green * 0.55;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}
