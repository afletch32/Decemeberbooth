#!/usr/bin/env node
/**
 * Update theme definitions in scripts/app.js to use Cloudinary URLs
 * instead of local folder paths.
 *
 * Reads: tools/cloudinary-upload-map.json
 * Updates: scripts/app.js
 *
 * This script:
 * 1. Groups uploaded assets by theme and category
 * 2. Replaces folder-based theme paths (backgroundFolder, overlaysFolder, etc.)
 *    with explicit Cloudinary URL lists
 * 3. Removes the populateAllThemeAssetTmp() fallback dependency
 */

const fsp = require("fs/promises");
const path = require("path");

const MAPPING_FILE = path.resolve("tools/cloudinary-upload-map.json");
const APP_JS = path.resolve("scripts/app.js");

async function main() {
  // Read mapping
  const raw = await fsp.readFile(MAPPING_FILE, "utf8");
  const mapping = JSON.parse(raw);

  // Group assets by theme and category
  const themeAssets = {};
  const themeWelcome = {};

  for (const [relPath, info] of Object.entries(mapping)) {
    if (info.status !== "uploaded") continue;
    const { theme, category, url } = info;
    if (!themeAssets[theme]) themeAssets[theme] = { backgrounds: [], overlays: [], templates: [], logo: [] };
    if (category === "background") themeAssets[theme].backgrounds.push(url);
    else if (category === "overlay" || category === "overlays") {
      themeAssets[theme].overlays.push({ src: url, name: info.cloudinaryFileName.replace(path.extname(info.cloudinaryFileName), "") });
    } else if (category === "template" || category === "templates") {
      const layout = relPath.includes("single") ? "single_photo" : "double_column";
      themeAssets[theme].templates.push({ src: url, layout });
    } else if (category === "logo") {
      themeAssets[theme].logo.push(url);
    } else if (category === "welcome") {
      if (!themeWelcome[theme]) themeWelcome[theme] = {};
      if (relPath.includes("portrait")) themeWelcome[theme].portrait = url;
      else if (relPath.includes("landscape")) themeWelcome[theme].landscape = url;
    }
  }

  console.log("=== Theme Cloudinary Assets ===\n");

  // Special handling for shared/template themes mapped by the folder names
  const themeMap = {
    "basic": { key: "general:basic", root: "general", subRoot: "themes", themeKey: "basic" },
    "birthday": { key: "general:birthday", root: "general", subRoot: "themes", themeKey: "birthday" },
    "summer": { key: "general:summer", root: "general", subRoot: "themes", themeKey: "summer" },
    "hawks": { key: "school:hawks", root: "school", subRoot: "themes", themeKey: "hawks" },
    "ane": { key: "school:ane", root: "school", subRoot: "themes", themeKey: "ane" },
    "garden-vows": { key: "wedding:romantic", root: "wedding", subRoot: "themes", themeKey: "romantic" },
    "timeless-romance": { key: "wedding:timeless", root: "wedding", subRoot: "themes", themeKey: "timeless" },
    "fall-halloween": { key: "fall:halloween", root: "fall", subRoot: "holidays", themeKey: "halloween" },
    "winter-christmas": { key: "winter:christmas", root: "winter", subRoot: "holidays", themeKey: "christmas" },
    "winter-valentines": { key: "winter:valentines", root: "winter", subRoot: "holidays", themeKey: "valentines" },
    "spring-st-patricks-day": { key: "spring:stpatricksday", root: "spring", subRoot: "holidays", themeKey: "stpatricksday" },
    "summer-4th-of-july": { key: undefined, root: "summer", subRoot: "holidays", themeKey: "fourthofjuly" },
    "brandstudio": { key: "expo:brandStudio", root: "expo", subRoot: "themes", themeKey: "brandStudio" },
    "leadcapture": { key: "expo:leadCapture", root: "expo", subRoot: "themes", themeKey: "leadCapture" },
    "santas-workshop": { key: "winter:santasWorkshop", root: "winter", subRoot: "holidays", themeKey: "santasWorkshop" },
    "winter-wonderland": { key: "winter:winterWonderland", root: "winter", subRoot: "holidays", themeKey: "winterWonderland" },
  };

  for (const [theme, assets] of Object.entries(themeAssets)) {
    const tm = themeMap[theme];
    const label = tm ? tm.key : theme;
    console.log(`\n### ${label}`);
    if (assets.backgrounds.length) console.log(`  backgrounds:`);
    assets.backgrounds.forEach(u => console.log(`    - ${u}`));
    if (assets.overlays.length) console.log(`  overlays:`);
    assets.overlays.forEach(o => console.log(`    - ${o.src}`));
    if (assets.templates.length) console.log(`  templates:`);
    assets.templates.forEach(t => console.log(`    - ${t.src}`));
    if (themeWelcome[theme]) {
      console.log(`  welcome:`);
      if (themeWelcome[theme].portrait) console.log(`    portrait: ${themeWelcome[theme].portrait}`);
      if (themeWelcome[theme].landscape) console.log(`    landscape: ${themeWelcome[theme].landscape}`);
    }
  }

  console.log("\n\n=== Instructions ===\n");
  console.log("To update the theme definitions in scripts/app.js, replace:");
  console.log("  1. `backgroundFolder: 'assets/...'` → remove it, keep `backgrounds: ['url1', 'url2']`");
  console.log("  2. `overlaysFolder: 'assets/...'` → remove it, keep `overlays: [{src: 'url1'}, ...]`");
  console.log("  3. `templatesFolder: 'assets/...'` → remove it, keep `templates: [{src: 'url1', layout: '...'}, ...]`");
  console.log("  4. Remove `populateAllThemeAssetTmp()` call");
  console.log("  5. Remove the fallback to getBuiltinAssetManifest() in resolveBackgroundListFromFolder()\n");
}

main().catch(err => { console.error(err); process.exit(1); });