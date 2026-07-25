const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function readProjectFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

test("managed asset uploads are Cloudinary-only", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes('showToast("Upload failed: configure Cloudinary first.");'),
    "asset upload failures should point users to Cloudinary"
  );
  assert.ok(
    !appScript.includes("uploadAssetToLocalApi"),
    "asset uploads should not keep a local-disk fallback"
  );
});

test("asset migration UI is exposed from the Cloudinary settings section", () => {
  const html = readProjectFile("index.html");
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    html.includes('id="migrateAssetsBtn" onclick="saveCloudinarySettings(); migrateAllManagedLocalAssets()"'),
    "Cloudinary settings should expose a migrate assets action"
  );
  assert.ok(
    appScript.includes("async function migrateAllManagedLocalAssets()"),
    "the app should define a full migration workflow"
  );
  assert.ok(
    appScript.includes("migrateAllManagedLocalAssets,"),
    "the migration workflow should be exported for inline button handlers"
  );
});

test("no-event booth uploads use a date Cloudinary folder", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function getDateSessionSlug()"),
    "theme sessions should normalize a local date slug"
  );
  assert.ok(
    appScript.includes("return buildDateSessionFolderPath({ base, date: quickStartDate });"),
    "no-event capture uploads should write into their date folder"
  );
  assert.ok(
    appScript.includes("quickStartDate\n      ? `Photos - ${quickStartDate}`"),
    "no-event gallery titles should use the date"
  );
});

test("capture modes share one canonical upload pipeline", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("async function uploadCaptureOnce(options = {})"),
    "captures should upload through one high-level pipeline"
  );
  assert.ok(
    appScript.includes("await recordGalleryPhoto(meta.slug, publicUrl"),
    "the canonical pipeline should save the same uploaded URL to the gallery"
  );
  assert.ok(
    appScript.includes("shareUrl: uploadResult.publicUrl"),
    "final screens should receive the uploaded URL instead of uploading again"
  );
  assert.ok(
    appScript.includes("enqueueFinalPrintIfNeeded(pendingFinalPrintImageUrl, true)") &&
      appScript.includes('shareType === "image"') &&
      appScript.includes("service-worker share cache is offline fallback only") &&
      appScript.includes("Print queue waiting for shared upload") &&
      appScript.includes("Print queue failed"),
    "print queue submissions should use remote image uploads, skip live/video captures, and surface failures"
  );
  assert.ok(
    !appScript.includes("handleCaptureUpload("),
    "capture flows should not use the old gallery-only upload path"
  );
  assert.ok(
    !appScript.includes("publishFinalShareUrl("),
    "final preview should not start a second share upload"
  );
  assert.ok(
    !appScript.includes("publishShareImage(") &&
      !appScript.includes("publishShareVideo("),
    "legacy image/video share upload helpers should be removed"
  );
});

test("staff print route links and popup printing handle reliable handoff", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const staffScript = readProjectFile("scripts", "staff-print.js");
  const html = readProjectFile("staff-print.html");
  const serverScript = readProjectFile("server.js");
  const pagesPrintQueueFn = readProjectFile("functions", "api", "print-queue.js");

  assert.ok(
    appScript.includes('new URL("staff-print.html", window.location.href)'),
    "copied staff queue links should target the real static staff-print.html route"
  );
  assert.ok(
    staffScript.includes("if (image.complete)") &&
      staffScript.includes("images.length") &&
      staffScript.includes("image.naturalWidth > 0") &&
      staffScript.includes("Photo could not load."),
    "staff print popup should print cached images and surface image load failures"
  );
  assert.ok(
    html.includes('id="setToken"') &&
      html.includes("hidden") &&
      html.includes("Unlock Staff Actions"),
    "staff token setup should stay hidden unless the server requires it"
  );
  assert.ok(
    html.includes('id="printLayout"') &&
      html.includes("1 full-size photo") &&
      html.includes("2 copies of the photo") &&
      html.includes("Session print defaults") &&
      staffScript.includes("Change for this photo") &&
      staffScript.includes("Use session default"),
    "staff print page should expose a layout choice for single-photo and 2-up pages"
  );
  assert.ok(
    serverScript.includes("staffAuthRequired: Boolean") &&
      pagesPrintQueueFn.includes("staffAuthRequired: Boolean") &&
      staffScript.includes("tokenButton.hidden = !staffAuthRequired"),
    "staff queue should reveal the token control only when staff auth is configured"
  );
  assert.ok(
    staffScript.includes("photoboothStaffPrintLayout") &&
      staffScript.includes('layout === "double"') &&
      staffScript.includes('grid-template-"+(landscape?"columns":"rows")+":1fr 1fr'),
    "staff print popup should support a 2-up 4x6 composition"
  );
  assert.ok(
    !html.includes('id="printRotation"') &&
      !staffScript.includes("photoboothStaffPrintRotation") &&
      html.includes('id="printPreviewSheet"') &&
      staffScript.includes("function renderPrintPreview()"),
    "staff print setup should use a live sheet preview instead of a separate rotation control"
  );
});

test("upload failures are queued with retry and gallery metadata", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function createCaptureUploadId("),
    "capture retries should use a stable capture id"
  );
  assert.ok(
    appScript.includes("async function queueCaptureForRetry(options = {})"),
    "failed captures should be queued through a shared retry helper"
  );
  assert.ok(
    appScript.includes("function queuePendingGalleryRecord(record = {})"),
    "successful uploads with gallery failures should queue gallery retries"
  );
  assert.ok(
    appScript.includes("async function flushPendingGalleryRecords()"),
    "queued gallery writes should be retried later"
  );
  assert.ok(
    appScript.includes("capture_id: options.captureId"),
    "gallery records should include capture ids for dedupe"
  );
  assert.ok(
    appScript.includes("isFlushingPendingUploads"),
    "pending upload flushing should guard against duplicate concurrent retries"
  );
  assert.ok(
    appScript.includes("Capture retry backup could not be saved before upload."),
    "online uploads should warn if the pre-upload safety queue cannot be saved"
  );
  assert.ok(
    appScript.includes("removePendingUpload(meta.captureId)"),
    "successful uploads should clear their pre-upload safety queue item"
  );
});

test("uploaded assets register in a persistent shared library", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes('id="uploadedAssetLibraryPanel"'),
    "advanced controls should expose the uploaded asset library"
  );
  assert.ok(
    html.includes('id="assetLibrarySearch"') &&
      html.includes('id="assetLibraryCategory"') &&
      html.includes('id="assetLibraryPills"') &&
      html.includes('id="assetLibrarySort"') &&
      html.includes('value="general"') &&
      html.includes('value="school"') &&
      html.includes('value="wedding"') &&
      html.includes('value="holidays"') &&
      html.includes('value="favorites"') &&
      html.includes('value="recent"') &&
      !html.includes('value="background"') &&
      !html.includes('value="overlay"') &&
      !html.includes('value="template"') &&
      !html.includes('id="assetUploadTags"') &&
      !html.includes('id="assetLibraryHasEditableField"'),
    "asset library should support search, category filters, category pills, and favorite/recent sorting without asset-type dropdown duplicates or upload-tag/editable-field admin controls"
  );
  assert.ok(
    appScript.includes('fetch("/api/assets"') &&
      appScript.includes("registerUploadedAsset(deliveryUrl, kind"),
    "Cloudinary asset uploads should persist metadata to the shared asset API"
  );
  assert.ok(
    appScript.includes("function getCanonicalAssetCollection(category = \"\")") &&
      appScript.includes('getVisibleLibraryAssets("background")') &&
      appScript.includes('getVisibleLibraryAssets("overlay")') &&
      appScript.includes('getVisibleLibraryAssets("template")'),
    "setup pickers and Asset Library should share one canonical asset collection"
  );
  assert.ok(
    appScript.includes("function archiveLibraryAssetByUrl(url)") &&
      appScript.includes('method: "DELETE"'),
    "library assets should support hiding/archiving and deletion"
  );
  assert.ok(
    appScript.includes('const repoBackedAsset = fallbackAsset && fallbackAsset.source === "theme";') &&
      appScript.includes("await updateAssetLibraryItem(") &&
      appScript.includes("hidden: true,") &&
      appScript.includes("archived: true,"),
    "repo-backed asset deletes should keep a local/remote tombstone instead of reappearing from theme manifests"
  );
});

test("bulk uploads provide a dedicated Thank You screen path", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes('id="bulkToThankYouScreens"'),
    "Add Assets should expose a Thank You screen destination"
  );
  assert.ok(
    appScript.includes('kinds.push("thank-you-screens")') &&
      appScript.includes("function buildThankYouScreenEntryFromUrl") &&
      appScript.includes("overrides.thankYouScreens"),
    "Thank You uploads should persist with their event or theme"
  );
});

test("managed video assets use optimized Cloudinary delivery URLs", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const cloudinaryUtils = readProjectFile("scripts", "cloudinary-utils.mjs");

  assert.ok(
    appScript.includes("buildBoothVideoUrl(originalUrl)") &&
      appScript.includes("index[indexKey] = deliveryUrl") &&
      appScript.includes("return deliveryUrl"),
    "video uploads should save and return the booth-ready URL"
  );
  assert.ok(
    cloudinaryUtils.includes('const marker = "/video/upload/";') &&
      cloudinaryUtils.includes(
        "c_limit,w_1200,h_1200,f_mp4,vc_h264,q_auto:good,fps_30,ac_none"
      ) &&
      !cloudinaryUtils.includes('const separator = trimmed.includes("?")'),
    "Cloudinary transformations should be inserted into the delivery path"
  );
  assert.ok(
    appScript.includes('contentType: isVideoFile ? "video/mp4"') &&
      appScript.includes("originalSrc: originalUrl") &&
      appScript.includes("orientation,"),
    "optimized video records should retain source and orientation metadata"
  );
});

test("asset uploads show an in-progress state and repair legacy Hawks paths", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const assetLibraryUtils = readProjectFile("scripts", "asset-library-utils.mjs");
  const assetsFn = readProjectFile("functions", "api", "assets.js");
  const html = readProjectFile("index.html");

  assert.ok(
    appScript.includes("function setBulkAssetUploadBusy(isBusy)") &&
      appScript.includes('DOM.bulkAssetApply.textContent = busy ? "Uploading…" : "Upload";') &&
      appScript.includes('DOM.bulkAssetModal.setAttribute("aria-busy"'),
    "the upload modal should clearly show and protect an in-progress upload"
  );
  assert.ok(
    appScript.includes("normalizeLegacyAssetUrl") &&
      assetLibraryUtils.includes("function normalizeLegacyAssetUrl(value)") &&
      assetLibraryUtils.includes('"assets/school/hawks/"') &&
      assetsFn.includes("function normalizeLegacyAssetUrl(value)") &&
      assetsFn.includes('"assets/school/hawks/"'),
    "saved records using the former Hawks folder should resolve to the current assets"
  );
  assert.ok(
    html.includes('id="bulkToBackgrounds" value="backgrounds" checked') &&
      html.includes('id="bulkToGreenBackgrounds" value="greenBackgrounds"') &&
      html.includes('id="bulkToOverlays"> Overlays'),
    "the general asset upload should offer one clear standard or green-screen background destination"
  );
});

test("managed asset uploads validate files, block duplicates, and report failures", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    appScript.includes("function validateManagedAssetUpload(file, kind)") &&
      appScript.includes("MAX_MANAGED_ASSET_UPLOAD_BYTES") &&
      appScript.includes("supportedVideoUploadTypes") &&
      appScript.includes("supportedVideoUploadExtensions"),
    "asset uploads should reject empty, oversized, and unsupported files"
  );
  assert.ok(
    appScript.includes("activeManagedAssetUploads.has(uploadKey)") &&
      appScript.includes("activeManagedAssetUploads.set(uploadKey, uploadPromise)") &&
      appScript.includes("activeManagedAssetUploads.delete(uploadKey)"),
    "duplicate in-flight uploads should share one promise"
  );
  assert.ok(
    appScript.includes("if (!resp.ok)") &&
      appScript.includes("getCloudinaryUploadFailureMessage(json, resp.status)") &&
      appScript.includes('console.error("Managed asset upload failed", error)') &&
      !appScript.includes("async function uploadAsset(file, kind, options = {}) {\n  try {"),
    "Cloudinary failures should be checked and surfaced instead of silently swallowed"
  );
  assert.ok(
    appScript.includes('showToast(isVideoFile ? "Uploading video…"') &&
      appScript.includes('showToast("Preparing booth video…")') &&
      appScript.includes('showToast("Video ready.")'),
    "video uploads should report upload, preparation, and completion states"
  );
});

test("asset library management supports sorting and category metadata", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const assetLibraryView = readProjectFile("scripts", "asset-library-view.mjs");
  const html = readProjectFile("index.html");

  assert.ok(
    html.includes('<option value="">Main Category</option>') &&
      html.includes('<option value="general">General</option>') &&
      html.includes('<option value="school">School</option>') &&
      html.includes('<option value="wedding">Wedding</option>') &&
      html.includes('<option value="holidays">Holidays</option>') &&
      !html.includes('<option value="customizable">Customizable Assets</option>') &&
      !html.includes('<option value="eventName">Event Name</option>'),
    "asset library should expose event/theme category filters instead of editable-field filters"
  );
  assert.ok(
    appScript.includes("function getFilteredAssetLibraryRows()") &&
      appScript.includes("filterAssetLibraryRows(") &&
      assetLibraryView.includes('sortMode === "name"') &&
      assetLibraryView.includes('sortMode === "oldest"') &&
      assetLibraryView.includes("function assetMatchesLibraryCategoryFilter") &&
      assetLibraryView.includes("getAssetLibraryFilterCategories(asset)") &&
      appScript.includes("themeKeys.map(themeKeyToCategory)") &&
      assetLibraryView.includes('["fall", "winter", "spring", "summer"].includes(root)') &&
      assetLibraryView.includes("function addAssetCategoryHint(") &&
      assetLibraryView.includes('return "holidays";'),
    "asset library rows should support sorting and category filtering"
  );
  assert.ok(
    appScript.includes("function promptForAssetName(asset)") &&
      appScript.includes("function promptForAssetTags(asset)") &&
      !appScript.includes("function promptForAssetEditableFields(asset)"),
    "uploaded asset cards should support rename/tag editing without admin editable-field prompts"
  );
  assert.ok(
    appScript.includes("function collectThemeAssetRows(category = \"\")") &&
      appScript.includes("mergeCanonicalAssetWithStoredRecord"),
    "theme-file assets and stored metadata should merge into the same asset provider"
  );
  assert.ok(
    appScript.includes("customizable:") &&
      appScript.includes("editableFields:") &&
      appScript.includes("detectEditableFieldsFromText"),
    "customizable detection metadata should be normalized and detected"
  );
});

test("asset library defaults to the selected theme main category", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const html = readProjectFile("index.html");

  assert.ok(html.includes('<option value="">Main Category</option>'));
  assert.ok(!html.includes('<option value="">All Categories</option>'));
  assert.ok(appScript.includes("function getMainAssetLibraryCategory()"));
  assert.ok(
    appScript.includes("getMainAssetLibraryCategory(),") &&
      appScript.includes("tags: normalizeAssetTags([")
  );
  assert.ok(
    appScript.includes(
      "DOM.assetLibraryCategory.value || getMainAssetLibraryCategory()"
    )
  );
  assert.ok(
    appScript.includes('DOM.assetLibraryCategory.value = "";') &&
      appScript.includes("selectedCategory || getMainAssetLibraryCategory()")
  );
});

test("canonical asset collection includes explicit theme arrays and deduplicates category URLs", () => {
  const appScript = readProjectFile("scripts", "app.js");
  const assetLibraryUtils = readProjectFile("scripts", "asset-library-utils.mjs");

  assert.ok(
    appScript.includes("theme.backgrounds.forEach") &&
      appScript.includes("theme.overlays.forEach") &&
      appScript.includes("theme.templates.forEach"),
    "explicit theme backgrounds, overlays, and templates should feed the canonical collection"
  );
  assert.ok(
    assetLibraryUtils.includes("function getAssetLibraryUrlKey(url)") &&
      appScript.includes("const key = row.id;") &&
      appScript.includes("getAssetLibraryId(normalizedCategory, src)"),
    "canonical entries should deduplicate by category and normalized URL"
  );
  assert.ok(
    assetLibraryUtils.includes('replace(/^\\/+/, "")') &&
      assetLibraryUtils.includes("raw.split(\"#\")[0].split(\"?\")[0]"),
    "asset library ids should collapse leading-slash and cache-busted URL variants"
  );
  assert.ok(
    appScript.includes("discardStaleSessionLibraryAssets") &&
      appScript.includes("canonicalSources.background.has"),
    "stale session selections should be excluded when they are absent from the canonical collection"
  );
});

test("asset library cards hide source labels and manage every asset through metadata", () => {
  const appScript = readProjectFile("scripts", "app.js");

  assert.ok(
    !appScript.includes('asset.source === "builtin" ? "Built-in" : "Uploaded"') &&
      !appScript.includes("Uploaded •") &&
      !appScript.includes("Built-in •"),
    "asset cards should not render source labels"
  );
  assert.ok(
    appScript.includes('meta.textContent = [asset.category, getAssetCreatedAtLabel(asset)]') &&
      !appScript.includes('useBtn.textContent = isSelected ? "Deselect" : "Select";') &&
      !appScript.includes("asset-library-card.selected::after") &&
      !appScript.includes("asset-item.selected::after"),
    "asset cards should show simple category/date metadata and rely on border/opacity state instead of badges"
  );
  assert.ok(
    appScript.includes("method: index >= 0 ? \"PATCH\" : \"POST\"") &&
      appScript.includes("{ hidden: true, archived: true }"),
    "renaming/tagging/deleting repo-backed assets should create stored metadata overrides or tombstones"
  );
  assert.ok(
    appScript.includes("clearSessionRemovedAsset") &&
      appScript.includes("addSessionAssetUrl"),
    "card toggles should restore theme assets from session removals and add session-only assets"
  );
});
