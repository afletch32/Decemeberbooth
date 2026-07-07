export function applySmoothing(canvas, mask, amount = 0) {
  const strength = clamp(amount / 100, 0, 1);
  if (!canvas || strength <= 0) return canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const blurred = document.createElement("canvas");
  blurred.width = canvas.width;
  blurred.height = canvas.height;
  const blurredCtx = blurred.getContext("2d");
  if (!blurredCtx) return canvas;

  blurredCtx.filter = `blur(${0.8 + strength * 2.4}px)`;
  blurredCtx.drawImage(canvas, 0, 0);
  blurredCtx.filter = "none";

  const region = normalizeRegion(mask, canvas.width, canvas.height);
  const source = ctx.getImageData(region.x, region.y, region.width, region.height);
  const softened = blurredCtx.getImageData(
    region.x,
    region.y,
    region.width,
    region.height
  );
  const data = source.data;
  const softenedData = softened.data;

  for (let index = 0; index < data.length; index += 4) {
    const pixelIndex = index / 4;
    const x = pixelIndex % region.width;
    const y = Math.floor(pixelIndex / region.width);
    const maskWeight = getMaskWeight(x, y, region.width, region.height, region.feather);
    if (maskWeight <= 0) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = getLuminance(red, green, blue);
    const saturation = getSaturation(red, green, blue);
    if (!isSkinLikePixel(red, green, blue, luminance, saturation)) continue;

    const softRed = softenedData[index];
    const softGreen = softenedData[index + 1];
    const softBlue = softenedData[index + 2];
    const detailDelta =
      Math.abs(red - softRed) + Math.abs(green - softGreen) + Math.abs(blue - softBlue);
    const detailProtection = clamp((detailDelta - 12) / 48, 0, 1);
    const blend = strength * 0.26 * maskWeight * (1 - detailProtection * 0.78);
    if (blend <= 0) continue;

    data[index] = lerp(red, softRed, blend);
    data[index + 1] = lerp(green, softGreen, blend);
    data[index + 2] = lerp(blue, softBlue, blend);
  }

  ctx.putImageData(source, region.x, region.y);

  return canvas;
}

function normalizeRegion(mask, width, height) {
  const fallback = {
    x: width * 0.22,
    y: height * 0.12,
    width: width * 0.56,
    height: height * 0.68,
    feather: 0.22
  };
  const region = mask || fallback;
  const x = Math.floor(clamp(region.x, 0, width - 1));
  const y = Math.floor(clamp(region.y, 0, height - 1));
  const right = Math.ceil(clamp(region.x + region.width, x + 1, width));
  const bottom = Math.ceil(clamp(region.y + region.height, y + 1, height));
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
    feather: clamp(region.feather || 0.18, 0.04, 0.45)
  };
}

function getMaskWeight(x, y, width, height, feather = 0.18) {
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const radiusX = Math.max(1, width / 2);
  const radiusY = Math.max(1, height / 2);
  const normalized =
    ((x - centerX) * (x - centerX)) / (radiusX * radiusX) +
    ((y - centerY) * (y - centerY)) / (radiusY * radiusY);
  if (normalized >= 1) return 0;
  const edgeStart = Math.max(0.2, 1 - feather);
  if (normalized <= edgeStart) return 1;
  return clamp((1 - normalized) / (1 - edgeStart), 0, 1);
}

function isSkinLikePixel(red, green, blue, luminance, saturation) {
  const warmEnough = red > blue + 6 && green > blue - 14;
  const balanced = red > 45 && green > 34 && blue > 24 && red - green < 85;
  const notTooDark = luminance > 44;
  const notTooBright = luminance < 238;
  const notGray = saturation > 0.08;
  return warmEnough && balanced && notTooDark && notTooBright && notGray;
}

function getLuminance(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function getSaturation(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max === 0 ? 0 : (max - min) / max;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
