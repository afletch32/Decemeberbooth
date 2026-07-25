function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function posterize(value, levels) {
  const step = 255 / Math.max(2, levels - 1);
  return Math.round(value / step) * step;
}

export function applyCartoonEffect(canvas, settings = {}) {
  if (!canvas || !settings.enabled) return canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  const source = new Uint8ClampedArray(pixels);
  const levels = Math.max(4, Math.min(10, Number(settings.levels) || 6));
  const edgeThreshold = Math.max(12, Math.min(96, Number(settings.edgeThreshold) || 42));
  const luminance = (index) =>
    source[index] * 0.299 + source[index + 1] * 0.587 + source[index + 2] * 0.114;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const right = x + 1 < width ? index + 4 : index;
      const below = y + 1 < height ? index + width * 4 : index;
      const edge = Math.abs(luminance(index) - luminance(right)) +
        Math.abs(luminance(index) - luminance(below));
      if (edge > edgeThreshold) {
        pixels[index] = 24;
        pixels[index + 1] = 3;
        pixels[index + 2] = 17;
        continue;
      }
      const red = posterize(source[index], levels);
      const green = posterize(source[index + 1], levels);
      const blue = posterize(source[index + 2], levels);
      pixels[index] = clampChannel(red * 1.13 + blue * 0.08);
      pixels[index + 1] = clampChannel(green * 0.62);
      pixels[index + 2] = clampChannel(blue * 0.96 + red * 0.12);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
