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

  blurredCtx.filter = `blur(${1 + strength * 4}px)`;
  blurredCtx.drawImage(canvas, 0, 0);
  blurredCtx.filter = "none";

  ctx.save();
  applyMaskClip(ctx, mask, canvas.width, canvas.height);
  ctx.globalAlpha = strength * 0.38;
  ctx.drawImage(blurred, 0, 0);
  ctx.restore();

  return canvas;
}

function applyMaskClip(ctx, mask, width, height) {
  const region = mask || { x: 0, y: 0, width, height };
  ctx.beginPath();
  ctx.ellipse(
    region.x + region.width / 2,
    region.y + region.height / 2,
    Math.max(1, region.width / 2),
    Math.max(1, region.height / 2),
    0,
    0,
    Math.PI * 2
  );
  ctx.clip();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
