export function applyLightingCorrection(canvas, lighting = {}) {
  if (!canvas) return canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const exposure = value(lighting.exposure);
  const contrast = value(lighting.contrast);
  const warmth = value(lighting.warmth);
  const vibrance = value(lighting.vibrance);
  const highlights = value(lighting.highlights);
  const shadows = value(lighting.shadows);
  const sharpness = value(lighting.sharpness);

  if (!exposure && !contrast && !warmth && !vibrance && !highlights && !shadows && !sharpness) {
    return canvas;
  }

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let index = 0; index < data.length; index += 4) {
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const shadowAmount = clamp((145 - luminance) / 145, 0, 1);
    const highlightAmount = clamp((luminance - 165) / 90, 0, 1);
    const maxChannel = Math.max(red, green, blue);
    const saturationGap = maxChannel - Math.min(red, green, blue);
    const vibranceAmount = (1 - clamp(saturationGap / 128, 0, 1)) * vibrance;

    red += exposure + shadows * shadowAmount + highlights * highlightAmount;
    green += exposure + shadows * shadowAmount + highlights * highlightAmount;
    blue += exposure + shadows * shadowAmount + highlights * highlightAmount;

    red += warmth * 0.9;
    blue -= warmth * 0.7;

    red += (red - luminance) * vibranceAmount * 0.012;
    green += (green - luminance) * vibranceAmount * 0.012;
    blue += (blue - luminance) * vibranceAmount * 0.012;

    data[index] = clamp(contrastFactor * (red - 128) + 128, 0, 255);
    data[index + 1] = clamp(contrastFactor * (green - 128) + 128, 0, 255);
    data[index + 2] = clamp(contrastFactor * (blue - 128) + 128, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
  applySharpness(ctx, canvas, sharpness);
  return canvas;
}

function applySharpness(ctx, canvas, amount) {
  const strength = Math.max(0, amount) / 100;
  if (!strength) return;
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  const copyCtx = copy.getContext("2d");
  if (!copyCtx) return;
  copyCtx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.filter = `contrast(${1 + strength * 0.28}) saturate(${1 + strength * 0.08})`;
  ctx.globalAlpha = Math.min(0.35, strength * 0.45);
  ctx.drawImage(copy, 0, 0);
  ctx.restore();
}

function value(input) {
  const number = Number(input);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(-100, number));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
