#!/usr/bin/env node
/**
 * Bulk upload all local assets to Cloudinary with normalized names.
 *
 * Usage:
 *   node tools/bulk-upload-to-cloudinary.js
 *
 * Environment variables (or defaults):
 *   CLOUD_NAME=afletch32
 *   UPLOAD_PRESET=photobooth_unsigned
 *   CLOUD_FOLDER=photobooth/events
 *
 * Output:
 *   tools/cloudinary-upload-map.json — mapping of original local paths to Cloudinary URLs
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const CLOUD_NAME = process.env.CLOUD_NAME || "afletch32";
const UPLOAD_PRESET = process.env.UPLOAD_PRESET || "photobooth_unsigned";
const CLOUD_FOLDER = (process.env.CLOUD_FOLDER || "photobooth/events").replace(/\/+$/, "");
const ASSETS_DIR = path.resolve("assets");
const OUTPUT_MAP = path.resolve("tools/cloudinary-upload-map.json");

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

// Determine theme and category from path
// Path patterns:
//   assets/{themeGroup}/{themeName}/{category}/file.ext
//   assets/{themeGroup}/{themeName}/welcome/file.ext
//   assets/{themeGroup}/summer/holidays/... etc
function parsePath(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  // parts[0] = themeGroup (general, wedding, holidays, school)
  // parts[1] = themeName (basic, birthday, timeless-romance, christmas, hawks, etc)
  // parts[2] = category (backgrounds, overlays, templates, welcome) or sub-theme
  // parts[3] = category if parts[2] is a sub-theme

  if (parts.length < 3) return null;

  const group = parts[0];
  let theme = parts[1];
  let category = parts.length >= 3 ? parts[2] : "";

  // Handle "holidays/{season}/{holiday}/..." -> theme = holiday name
  if (group === "holidays" && parts.length >= 3) {
    theme = parts[1] + "-" + parts[2]; // e.g. "fall-halloween", "winter-christmas"
    category = parts.length >= 4 ? parts[3] : "";
  }

  // Handle "school/{schoolName}/{category}/..." -> group = school, theme = schoolName
  if (group === "school" && parts.length >= 3) {
    theme = theme;
    category = parts[2];
  }

  // Normalize category
  const categoryMap = {
    "backgrounds": "background",
    "overlays": "overlay",
    "templates": "template",
    "welcome": "welcome",
  };

  category = categoryMap[category] || category;

  return { group, theme, category };
}

function normalizeName(name) {
  const ext = path.extname(name);
  let base = path.basename(name, ext);

  // Normalize: lowercase, replace colons with hyphens, replace spaces/special chars with hyphens
  base = base
    .toLowerCase()
    .replace(/:/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!base) return null;
  return base + ext;
}

function buildCloudinaryFileName(theme, category, originalName) {
  const ext = path.extname(originalName);
  let base = path.basename(originalName, ext);

  // Extract the meaningful descriptor from the original name
  // Remove theme/category prefixes if they already exist
  const themeSlug = theme.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const catSlug = category.toLowerCase();

  // Clean the base name
  let descriptor = base
    .toLowerCase()
    .replace(/:/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Remove any leading theme/category prefixes from descriptor to avoid duplication
  const prefixPattern = new RegExp(`^${themeSlug}-?${catSlug}?-?|^${catSlug}-?`, "i");
  descriptor = descriptor.replace(prefixPattern, "").replace(/^-+|-+$/g, "");

  // If nothing left after stripping, use the original
  if (!descriptor) {
    descriptor = base
      .toLowerCase()
      .replace(/:/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const fileName = `${themeSlug}-${catSlug}-${descriptor}${ext}`;
  return fileName;
}

async function uploadToCloudinary(filePath, cloudinaryFileName, folder) {
  const formData = new FormData();
  const fileBuffer = await fsp.readFile(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append("file", new File([blob], cloudinaryFileName, { type: "image/png" }));
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  try {
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    if (!resp.ok) {
      const errText = await resp.text();
      return { error: `HTTP ${resp.status}: ${errText}` };
    }
    const json = await resp.json();
    if (json && json.secure_url) {
      return { url: json.secure_url, publicId: json.public_id };
    }
    return { error: "No secure_url in response" };
  } catch (err) {
    return { error: err.message };
  }
}

async function walkAssets() {
  const results = [];

  async function walk(dir, relativePath) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (entry.isFile() && IMG_EXT.has(path.extname(entry.name).toLowerCase())) {
        results.push({ fullPath, relPath, fileName: entry.name });
      }
    }
  }

  await walk(ASSETS_DIR, "");
  return results;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) console.log("=== DRY RUN (no uploads) ===\n");
  else console.log("=== Bulk Upload Assets to Cloudinary ===\n");
  console.log(`Cloud:     ${CLOUD_NAME}`);
  console.log(`Preset:    ${UPLOAD_PRESET}`);
  console.log(`Folder:    ${CLOUD_FOLDER}/assets`);
  console.log(`Scanning:  ${ASSETS_DIR}\n`);

  if (!(await fsp.stat(ASSETS_DIR).catch(() => null))) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }

  const files = await walkAssets();
  console.log(`Found ${files.length} asset files.\n`);

  if (files.length === 0) {
    console.log("No assets to upload.");
    return;
  }

  const mapping = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const { fullPath, relPath, fileName } = files[i];
    const parsed = parsePath(relPath);

    if (!parsed) {
      console.log(`[SKIP] ${relPath} — could not determine theme/category`);
      mapping[relPath] = { status: "skipped", reason: "could not parse path" };
      continue;
    }

    const { theme, category } = parsed;
    const cloudinaryFileName = buildCloudinaryFileName(theme, category, fileName);
    const folder = `${CLOUD_FOLDER}/assets`;

    const progress = `[${i + 1}/${files.length}]`;

    if (isDryRun) {
      console.log(`${progress} ${cloudinaryFileName}  ←  ${relPath}`);
      mapping[relPath] = {
        status: "dry-run",
        cloudinaryFileName,
        theme,
        category,
        originalPath: relPath,
      };
      successCount++;
    } else {
      console.log(`${progress} Uploading: ${cloudinaryFileName}`);

      const result = await uploadToCloudinary(fullPath, cloudinaryFileName, folder);

      if (result.url) {
        mapping[relPath] = {
          status: "uploaded",
          url: result.url,
          publicId: result.publicId,
          cloudinaryFileName,
          theme,
          category,
        };
        successCount++;
        console.log(`  ✓ ${result.url}`);
      } else {
        mapping[relPath] = {
          status: "failed",
          error: result.error,
          theme,
          category,
        };
        failCount++;
        console.log(`  ✗ ${result.error}`);
      }
    }
  }

  // Write mapping file
  const mapDir = path.dirname(OUTPUT_MAP);
  await fsp.mkdir(mapDir, { recursive: true });
  await fsp.writeFile(OUTPUT_MAP, JSON.stringify(mapping, null, 2));
  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed:  ${failCount}`);
  console.log(`Mapping: ${OUTPUT_MAP}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});