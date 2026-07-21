const VIDEO_PREVIEW_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f3f6fb"/><circle cx="200" cy="175" r="56" fill="#dbe4f0"/><path d="M184 142l54 33-54 33z" fill="#64748b"/><text x="200" y="275" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="#475569">Video</text></svg>'
  );

const BUNDLED_VIDEO_POSTERS = {
  "/assets/themes/back-to-school/amanda-north-coyotes-idle-wave-portrait.mp4":
    "/assets/themes/back-to-school/back-to-school-idle-portrait.png",
};

export function getVideoPreviewPosterSrc(entry, videoSrc = "") {
  const source = entry && typeof entry === "object" ? entry : {};
  const raw = source.raw && typeof source.raw === "object" ? source.raw : {};
  const explicitPoster = String(
    source.poster ||
      source.posterSrc ||
      source.thumbnail ||
      source.thumbnailUrl ||
      source.previewSrc ||
      raw.poster ||
      raw.posterSrc ||
      raw.thumbnail ||
      raw.thumbnailUrl ||
      raw.previewSrc ||
      ""
  ).trim();
  if (explicitPoster) return explicitPoster;

  const src = String(videoSrc || "").trim();
  const cleanSrc = src.split("#")[0].split("?")[0];
  if (BUNDLED_VIDEO_POSTERS[cleanSrc]) {
    return BUNDLED_VIDEO_POSTERS[cleanSrc];
  }
  const marker = "/video/upload/";
  if (src.includes(marker)) {
    return src.replace(marker, `${marker}so_0,f_jpg,q_auto/`);
  }
  return VIDEO_PREVIEW_PLACEHOLDER;
}
