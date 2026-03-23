import fs from "node:fs";
import path from "node:path";

/**
 * build-theme-manifest.mjs
 * Scans ./assets for themes with backgrounds/overlays/templates
 * Outputs: dist/themes.manifest.json, dist/themes.manifest.min.json, dist/themes_files_manifest.csv
 */

const ASSETS_ROOT = "assets";
const URL_PREFIX = "/assets";
const VALID_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

const NAME_OVERRIDES = {
  "ane": "Amanda North Elementary",
  "july4": "4th of July",
  "stpatricks": "St. Patrick's Day"
};

const DEFAULT_FONT_BY_THEME = {
  // "holidays/winter/christmas": "Mountains of Christmas",
  // "general/birthday": "Poppins",
};

const ACCENTS_BY_THEME = {
  // "holidays/fall/halloween": { accent: "#ff6f00", accent2: "#ffffff" },
};

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();
const list = (p) => fs.existsSync(p) ? fs.readdirSync(p) : [];

function toTitle(s) {
  const base = s.replace(/[-_]+/g, " ").trim();
  if (!base) return s;
  return base.split(" ").map(w => w ? (w[0].toUpperCase() + w.slice(1)) : "").join(" ");
}

function naturalSort(a, b) {
  const ax = [];
  const bx = [];
  a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { ax.push([$1 || Infinity, $2 || ""]); });
  b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { bx.push([$1 || Infinity, $2 || ""]); });
  while (ax.length && bx.length) {
    const an = ax.shift();
    const bn = bx.shift();
    const aN = isFinite(an[0]) ? Number(an[0]) : an[1];
    const bN = isFinite(bn[0]) ? Number(bn[0]) : bn[1];
    if (aN !== bN) return aN < bN ? -1 : 1;
  }
  return ax.length - bx.length;
}

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return VALID_EXT.includes(ext);
}

function collectImages(dir, urlBase) {
  const files = list(dir).filter(f => isImageFile(f)).sort(naturalSort);
  return files.map(f => path.posix.join(urlBase, f).replace(/\\/g, "/"));
}

function discoverThemes() {
  const results = [];
  function walk(currentAbs, relParts = []) {
    const entries = list(currentAbs).filter(name => !name.startsWith("."));
    for (const name of entries) {
      const abs = path.join(currentAbs, name);
      if (!isDir(abs)) continue;

      const sub = list(abs);
      const hasBg = sub.includes("backgrounds") && isDir(path.join(abs, "backgrounds"));
      const hasOv = sub.includes("overlays") && isDir(path.join(abs, "overlays"));
      const hasTp = sub.includes("templates") && isDir(path.join(abs, "templates"));

      if (hasBg && hasOv && hasTp) {
        const categoryPathParts = relParts;
        const themeSlug = name.toLowerCase();
        const categoryPath = categoryPathParts.join("/").toLowerCase();
        const slugKey = (categoryPath ? (categoryPath + "/" + themeSlug) : themeSlug);
        const dispName = NAME_OVERRIDES[themeSlug] || toTitle(themeSlug);

        const bgDir = path.join(abs, "backgrounds");
        const ovDir = path.join(abs, "overlays");
        const tpDir = path.join(abs, "templates");

        const urlBase = path.posix.join(URL_PREFIX, ...categoryPathParts, name).replace(/\\/g, "/");
        const urls = {
          backgrounds: collectImages(bgDir, path.posix.join(urlBase, "backgrounds").replace(/\\/g, "/")),
          overlays: collectImages(ovDir, path.posix.join(urlBase, "overlays").replace(/\\/g, "/")),
          templates: collectImages(tpDir, path.posix.join(urlBase, "templates").replace(/\\/g, "/"))
        };

        results.push({
          categoryPath,
          themeSlug,
          name: dispName,
          urls,
          font: DEFAULT_FONT_BY_THEME[slugKey] || undefined,
          accents: ACCENTS_BY_THEME[slugKey] || undefined
        });
        continue;
      }

      walk(abs, [...relParts, name]);
    }
  }

  const rootAbs = path.resolve(ASSETS_ROOT);
  if (!isDir(rootAbs)) {
    console.error(`[ERROR] Assets root "${ASSETS_ROOT}" not found. Run this from your project root.`);
    process.exit(1);
  }
  walk(rootAbs, []);
  return results;
}

function buildManifest(records) {
  const out = {};
  for (const r of records) {
    const cats = r.categoryPath ? r.categoryPath.split("/") : [];
    const top = cats[0] || "general";
    if (!out[top]) out[top] = { name: toTitle(top), themes: {} };
    const theme = {
      name: r.name,
      font: r.font,
      ...(r.accents ? { accent: r.accents.accent, accent2: r.accents.accent2 } : {}),
      backgrounds: r.urls.backgrounds,
      overlays: r.urls.overlays,
      templates: r.urls.templates
    };
    Object.keys(theme).forEach(k => theme[k] === undefined && delete theme[k]);
    out[top].themes[r.themeSlug] = theme;
  }
  return out;
}

function writeOutputs(obj) {
  ensureDir("dist");
  const prettyPath = path.resolve("dist/themes.manifest.json");
  const minPath = path.resolve("dist/themes.manifest.min.json");
  fs.writeFileSync(prettyPath, JSON.stringify(obj, null, 2), "utf8");
  fs.writeFileSync(minPath, JSON.stringify(obj), "utf8");
  console.log(`[OK] Wrote ${prettyPath}`);
  console.log(`[OK] Wrote ${minPath}`);
  return { prettyPath, minPath };
}

function writeCsv(records) {
  const rows = [["category_path","theme_slug","type","url"].join(",")];
  for (const r of records) {
    for (const kind of ["backgrounds","overlays","templates"]) {
      for (const u of r.urls[kind]) {
        rows.push([r.categoryPath, r.themeSlug, kind, u].map(v => String(v).replaceAll('"','""')).join(","));
      }
    }
  }
  ensureDir("dist");
  const csvPath = path.resolve("dist/themes_files_manifest.csv");
  fs.writeFileSync(csvPath, rows.join("\n"), "utf8");
  console.log(`[OK] Wrote ${csvPath}`);
}

function main() {
  const records = discoverThemes();
  if (!records.length) console.warn("[WARN] No themes found.");
  const manifest = buildManifest(records);
  writeCsv(records);
  const { minPath } = writeOutputs(manifest);
  console.log("\\nUpload to KV:");
  console.log("npx wrangler kv:key put --binding THEMES_KV themes --path " + path.relative(process.cwd(), minPath));
}
main();
