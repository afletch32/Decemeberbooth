import { STANDARD_DOUBLE_COLUMN_STRIP_SLOTS } from "./strip-layout-utils.mjs";

// file: scripts/halloween-assets.mjs
// Shared production geometry for the two Halloween frame packs.
export const HALLOWEEN_PHOTO_SLOTS = {
  portrait: [{ x: 0, y: 0, width: 1, height: 1, borderRadius: 0 }],
  landscape: [{ x: 0, y: 0, width: 1, height: 1, borderRadius: 0 }],
  strip: STANDARD_DOUBLE_COLUMN_STRIP_SLOTS.map(({ x, y, w, h }, index) => ({
    x: x / 1200, y: y / 1800, width: w / 1200, height: h / 1800,
    sourceIndex: index % 3, borderRadius: 0,
  })),
};

const PACKS = [
  { key: "halloween", folder: "halloween", name: "Halloween" },
  { key: "cuteHalloween", folder: "cute-halloween", name: "Happy Halloween" },
];

function createPack({ folder, name }, prefix = "") {
  return {
    overlays: ["portrait", "landscape"].map((orientation) => ({
      src: `${prefix}${folder}-simple-single-photo-${orientation}.png`,
      name: `${name} simple single photo ${orientation}`,
      type: "photo",
      orientation,
      aspectRatio: orientation === "portrait" ? "2:3" : "3:2",
      photoSlots: structuredClone(HALLOWEEN_PHOTO_SLOTS[orientation]),
    })),
    templates: [{
      src: `${prefix}${folder}-graphic-double-column-strip.png`,
      name: `${name} graphic identical double strips`,
      layout: "double_column",
      orientation: "portrait",
      photoSlots: structuredClone(HALLOWEEN_PHOTO_SLOTS.strip),
    }],
  };
}

export const HALLOWEEN_ASSET_MANIFESTS = Object.fromEntries(
  PACKS.flatMap((pack) => {
    const assets = createPack(pack);
    return ["overlays", "templates"].map((field) => [
      `assets/themes/${pack.folder}/${field}/`, assets[field],
    ]);
  })
);

function isRetiredHalloweenAsset(entry) {
  const src = typeof entry === "string" ? entry : entry?.src || "";
  return /\/overlays\/(?:halloween|happy-halloween)-single-photo-(?:portrait|landscape)\.(?:svg|png)$/.test(src) ||
    src.includes("/fall-halloween-template-") ||
    /(?:^|\/)halloween-template-(?:2|3|4|maddies)\.png(?:[?#].*)?$/.test(src) ||
    /\/(?:halloween|cute-halloween)-simple-(?:three-photo|double-column)-strip\.png$/.test(src);
}

// Replace shipped legacy frames while keeping operator-added assets.
export function migrateHalloweenThemeAssets(target) {
  let changed = false;
  for (const pack of PACKS) {
    const theme = target?.fall?.holidays?.[pack.key];
    if (!theme) continue;
    const expected = createPack(pack);
    for (const field of ["overlays", "templates"]) {
      const base = `/assets/themes/${pack.folder}/${field}/`;
      const defaults = expected[field].map((entry) => ({ ...entry, src: base + entry.src }));
      const sources = new Set(defaults.map((entry) => entry.src));
      const custom = (theme[field] || []).filter((entry) =>
        !isRetiredHalloweenAsset(entry) && !sources.has(typeof entry === "string" ? entry : entry.src)
      );
      const next = [...defaults, ...custom];
      if (JSON.stringify(theme[field]) !== JSON.stringify(next)) {
        theme[field] = next;
        changed = true;
      }
    }
  }
  return changed;
}
