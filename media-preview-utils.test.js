const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");
const assert = require("node:assert/strict");

async function loadMediaPreviewUtils() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/media-preview-utils.mjs"))
  );
}

test("video preview uses an explicit bundled poster when available", async () => {
  const { getVideoPreviewPosterSrc } = await loadMediaPreviewUtils();
  assert.equal(
    getVideoPreviewPosterSrc(
      { raw: { poster: "assets/posters/welcome.jpg" } },
      "assets/welcome.mp4"
    ),
    "assets/posters/welcome.jpg"
  );
});

test("Cloudinary video preview requests a first-frame JPG", async () => {
  const { getVideoPreviewPosterSrc } = await loadMediaPreviewUtils();
  assert.equal(
    getVideoPreviewPosterSrc(
      {},
      "https://res.cloudinary.com/demo/video/upload/v1/welcome.mp4"
    ),
    "https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto/v1/welcome.mp4"
  );
});

test("local videos without posters use an inline placeholder", async () => {
  const { getVideoPreviewPosterSrc } = await loadMediaPreviewUtils();
  assert.match(getVideoPreviewPosterSrc({}, "assets/welcome.mp4"), /^data:image\/svg\+xml/);
});

test("bundled videos keep their poster when legacy theme state lacks metadata", async () => {
  const { getVideoPreviewPosterSrc } = await loadMediaPreviewUtils();
  assert.equal(
    getVideoPreviewPosterSrc(
      {},
      "/assets/themes/back-to-school/amanda-north-coyotes-idle-wave-portrait.mp4"
    ),
    "/assets/themes/back-to-school/back-to-school-idle-portrait.png"
  );
});
