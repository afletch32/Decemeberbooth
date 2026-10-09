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

test("Halloween background videos use their bundled thumbnail posters", async () => {
  const { getVideoPreviewPosterSrc } = await loadMediaPreviewUtils();
  assert.equal(
    getVideoPreviewPosterSrc(
      {},
      "/assets/themes/halloween/halloween-background-portrait.mp4"
    ),
    "/assets/themes/halloween/halloween-background-portrait.thumb.webp"
  );
  assert.equal(
    getVideoPreviewPosterSrc(
      {},
      "/assets/themes/halloween/halloween-background-landscape.mp4"
    ),
    "/assets/themes/halloween/halloween-background-landscape.thumb.webp"
  );
});

test("file-based previews resolve from the app folder and hosted paths stay root-relative", async () => {
  const { resolvePreviewAssetSrc } = await loadMediaPreviewUtils();
  const filePage =
    "file:///Users/example/Decemberbooth/index.html";
  assert.equal(
    resolvePreviewAssetSrc(
      "/assets/themes/halloween/halloween-idle-portrait.thumb.webp",
      filePage
    ),
    "file:///Users/example/Decemberbooth/assets/themes/halloween/halloween-idle-portrait.thumb.webp"
  );
  assert.equal(
    resolvePreviewAssetSrc(
      "/assets/themes/halloween/halloween-idle-portrait.thumb.webp",
      "https://booth.example/index.html"
    ),
    "/assets/themes/halloween/halloween-idle-portrait.thumb.webp"
  );
});
