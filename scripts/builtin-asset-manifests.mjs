import { HALLOWEEN_ASSET_MANIFESTS } from "./halloween-assets.mjs";

const BUILTIN_ASSET_MANIFESTS = {
  ...HALLOWEEN_ASSET_MANIFESTS,
  "assets/general/birthday/backgrounds/": [
    "birthday-background-1.png"
  ],
  "assets/general/birthday/overlays/": [
    "7.png",
    "banner-frame.png",
    "birthday-confetti-frame.png",
    "colorful-sparkle-frame.png",
    "double-photo-birthday-frame.png",
    "happy-birthday-balloons-frame.png",
    "sparkle-sides-frame.png"
  ],
  "assets/general/summer/overlays/": [
    "13.png",
    "4th-of-july.png",
    "border-with-frame.png",
    "border.png",
    "enchanted-woodland-photo-booth-frame.png",
    "fantasy.png",
    "hello-summer.png",
    "pink-and-yellow.png",
    "pool-with-frame-2.png",
    "pool-with-frame.png",
    "tropical-border-2.png",
    "tropical-border-with-frame.png",
    "tropical-border.png"
  ],
  "assets/general/birthday/templates/": [
    { src: "birthday-banner.png", layout: "double_column", slots: [
      { x: 50, y: 357, w: 500, h: 414 },
      { x: 50, y: 823, w: 500, h: 414 },
      { x: 50, y: 1288, w: 500, h: 413 },
      { x: 650, y: 357, w: 500, h: 414 },
      { x: 650, y: 823, w: 500, h: 414 },
      { x: 650, y: 1288, w: 500, h: 413 }
    ] },
    { src: "birthday.png", layout: "double_column", slots: [
      { x: 50, y: 357, w: 500, h: 414 },
      { x: 50, y: 823, w: 500, h: 414 },
      { x: 50, y: 1288, w: 500, h: 413 },
      { x: 650, y: 357, w: 500, h: 414 },
      { x: 650, y: 823, w: 500, h: 414 },
      { x: 650, y: 1288, w: 500, h: 413 }
    ] }
  ],
  "assets/themes/eucalyptus-wedding/": [
    { src: "eucalyptus-wedding-background-portrait.webp", category: "background", orientation: "portrait" },
    { src: "eucalyptus-wedding-background-landscape.webp", category: "background", orientation: "landscape" },
    { src: "eucalyptus-wedding-idle-portrait.webp", category: "idle-screen", role: "idle", orientation: "portrait" },
    { src: "eucalyptus-wedding-idle-landscape.webp", category: "idle-screen", role: "idle", orientation: "landscape" },
    { src: "eucalyptus-wedding-photo-choice-portrait.webp", category: "idle-screen", role: "photo-choice", orientation: "portrait" },
    { src: "eucalyptus-wedding-photo-choice-landscape.webp", category: "idle-screen", role: "photo-choice", orientation: "landscape" },
    { src: "eucalyptus-wedding-thank-you-portrait.webp", category: "thank-you-screen", orientation: "portrait" },
    { src: "eucalyptus-wedding-thank-you-landscape.webp", category: "thank-you-screen", orientation: "landscape" },
    {
      src: "eucalyptus-wedding-overlay-portrait.png",
      id: "eucalyptus-wedding-portrait",
      name: "Eucalyptus Wedding Portrait",
      type: "overlay",
      category: "wedding",
      orientation: "portrait",
      aspectRatio: "2:3",
      foreground: { type: "image", src: "eucalyptus-wedding-overlay-portrait.png" },
      photoSlots: [{ x: 0.112, y: 0.072, width: 0.777, height: 0.777, objectFit: "cover" }],
      textFields: [
        { key: "couple_names", xPct: 0.16, yPct: 0.858, wPct: 0.68, hPct: 0.035, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 48, minFontSize: 24, color: "#405745", align: "center" },
        { key: "event_date", xPct: 0.2, yPct: 0.908, wPct: 0.6, hPct: 0.026, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 25, minFontSize: 15, color: "#6e755f", align: "center" }
      ]
    },
    {
      src: "eucalyptus-wedding-overlay-landscape.png",
      id: "eucalyptus-wedding-landscape",
      name: "Eucalyptus Wedding Landscape",
      type: "overlay",
      category: "wedding",
      orientation: "landscape",
      aspectRatio: "3:2",
      foreground: { type: "image", src: "eucalyptus-wedding-overlay-landscape.png" },
      photoSlots: [{ x: 0.05, y: 0.10, width: 0.90, height: 0.80, objectFit: "cover" }],
      textFields: [
        { key: "couple_names", xPct: 0.2, yPct: 0.905, wPct: 0.6, hPct: 0.032, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 43, minFontSize: 22, color: "#405745", align: "center" },
        { key: "event_date", xPct: 0.25, yPct: 0.949, wPct: 0.5, hPct: 0.023, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 22, minFontSize: 14, color: "#6e755f", align: "center" }
      ]
    },
    {
      src: "eucalyptus-wedding-three-photo-strip.png",
      category: "template",
      name: "Eucalyptus Wedding Three-Photo Strip",
      layout: "photo_strip_3",
      photoSlots: [
        { x: 0.125, y: 0.083, width: 0.75, height: 0.24, sourceIndex: 0 },
        { x: 0.125, y: 0.354, width: 0.75, height: 0.248, sourceIndex: 1 },
        { x: 0.125, y: 0.636, width: 0.75, height: 0.237, sourceIndex: 2 }
      ],
      textFields: [
        { key: "couple_names", xPct: 0.17, yPct: 0.902, wPct: 0.66, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#405745", align: "center" },
        { key: "event_date", xPct: 0.25, yPct: 0.94, wPct: 0.5, hPct: 0.02, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 21, minFontSize: 14, color: "#6e755f", align: "center" }
      ]
    }
  ],
  "assets/themes/minimal-wedding/": [
    { src: "minimal-wedding-background-portrait.webp", category: "background", orientation: "portrait" },
    { src: "minimal-wedding-background-landscape.webp", category: "background", orientation: "landscape" },
    { src: "minimal-wedding-idle-portrait.webp", category: "idle-screen", role: "idle", orientation: "portrait" },
    { src: "minimal-wedding-idle-landscape.webp", category: "idle-screen", role: "idle", orientation: "landscape" },
    { src: "minimal-wedding-photo-choice-portrait.webp", category: "idle-screen", role: "photo-choice", orientation: "portrait" },
    { src: "minimal-wedding-photo-choice-landscape.webp", category: "idle-screen", role: "photo-choice", orientation: "landscape" },
    { src: "minimal-wedding-thank-you-portrait.webp", category: "thank-you-screen", orientation: "portrait" },
    { src: "minimal-wedding-thank-you-landscape.webp", category: "thank-you-screen", orientation: "landscape" },
    {
      src: "minimal-wedding-overlay-portrait.png",
      id: "minimal-wedding-portrait",
      name: "Minimal Wedding Portrait",
      type: "overlay",
      category: "wedding",
      orientation: "portrait",
      aspectRatio: "2:3",
      foreground: { type: "image", src: "minimal-wedding-overlay-portrait.png" },
      photoSlots: [{ x: 0.154, y: 0.117, width: 0.692, height: 0.669, objectFit: "cover" }],
      textFields: [
        { key: "couple_names", xPct: 0.16, yPct: 0.816, wPct: 0.68, hPct: 0.035, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 48, minFontSize: 24, color: "#262626", align: "center" },
        { key: "event_date", xPct: 0.2, yPct: 0.866, wPct: 0.6, hPct: 0.026, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 25, minFontSize: 15, color: "#555555", align: "center" }
      ]
    },
    {
      src: "minimal-wedding-overlay-landscape.png",
      id: "minimal-wedding-landscape",
      name: "Minimal Wedding Landscape",
      type: "overlay",
      category: "wedding",
      orientation: "landscape",
      aspectRatio: "3:2",
      foreground: { type: "image", src: "minimal-wedding-overlay-landscape.png" },
      photoSlots: [{ x: 0.052, y: 0.103, width: 0.898, height: 0.776, objectFit: "cover" }],
      textFields: [
        { key: "couple_names", xPct: 0.2, yPct: 0.905, wPct: 0.6, hPct: 0.032, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 43, minFontSize: 22, color: "#262626", align: "center" },
        { key: "event_date", xPct: 0.25, yPct: 0.949, wPct: 0.5, hPct: 0.023, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 22, minFontSize: 14, color: "#555555", align: "center" }
      ]
    },
    {
      src: "minimal-wedding-three-photo-strip.png",
      category: "template",
      name: "Minimal Wedding Three-Photo Strip",
      layout: "photo_strip_3",
      photoSlots: [
        { x: 0.099, y: 0.086, width: 0.356, height: 0.226, sourceIndex: 0 },
        { x: 0.099, y: 0.335, width: 0.356, height: 0.226, sourceIndex: 1 },
        { x: 0.099, y: 0.585, width: 0.356, height: 0.235, sourceIndex: 2 },
        { x: 0.545, y: 0.086, width: 0.352, height: 0.226, sourceIndex: 0 },
        { x: 0.545, y: 0.335, width: 0.352, height: 0.226, sourceIndex: 1 },
        { x: 0.545, y: 0.585, width: 0.352, height: 0.235, sourceIndex: 2 }
      ],
      textFields: [
        { key: "couple_names", xPct: 0.07, yPct: 0.845, wPct: 0.4, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#262626", align: "center" },
        { key: "event_date", xPct: 0.07, yPct: 0.89, wPct: 0.4, hPct: 0.02, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 21, minFontSize: 14, color: "#555555", align: "center" },
        { key: "couple_names", xPct: 0.53, yPct: 0.845, wPct: 0.4, hPct: 0.03, fontFamily: "'Great Vibes', cursive", fontWeight: "400", fontSize: 38, minFontSize: 20, color: "#262626", align: "center" },
        { key: "event_date", xPct: 0.53, yPct: 0.89, wPct: 0.4, hPct: 0.02, fontFamily: "'Lora', serif", fontWeight: "400", fontSize: 21, minFontSize: 14, color: "#555555", align: "center" }
      ]
    }
  ],
  "assets/school/hawks/overlays/": [
    "1.png",
    "2.png",
    "3.png",
    "hawks-frame-cheerleader.png",
    "hawks-frame-fan.png",
    "hawks-frame-go-hawks.png",
    "hawks-frame-grass.png",
    "hawks-frame-helmets.png",
    "hawks-frame-players.png"
  ],
  "assets/school/hawks/templates/": [
    {
      src: "go-hawks.png",
      layout: "double_column",
      slots: [
        { x: 50, y: 357, w: 500, h: 414 },
        { x: 50, y: 823, w: 500, h: 414 },
        { x: 50, y: 1288, w: 500, h: 413 },
        { x: 650, y: 357, w: 500, h: 414 },
        { x: 650, y: 823, w: 500, h: 414 },
        { x: 650, y: 1288, w: 500, h: 413 }
      ]
    }
  ],
  "assets/school/ane/overlays/": [
    "ane-frame-stream-night-landscape-2.png",
    "school-frame-landscape-1.png"
  ],
  "assets/holidays/winter/christmas/backgrounds/": [
    "christmas-background-1.png",
    "christmas-background-2.png",
    "christmas-background-3.png",
    "christmas-background-4.png",
    "christmas-background-5.png",
    "christmas.png",
    "winter.png"
  ],
  "assets/holidays/winter/christmas/overlays/": [],
  "assets/holidays/winter/christmas/templates/": [
    { src: "christmas-template-1.png", layout: "double_column", slots: [
      { x: 50, y: 357, w: 500, h: 414 },
      { x: 50, y: 823, w: 500, h: 414 },
      { x: 50, y: 1288, w: 500, h: 413 },
      { x: 650, y: 357, w: 500, h: 414 },
      { x: 650, y: 823, w: 500, h: 414 },
      { x: 650, y: 1288, w: 500, h: 413 }
    ] },
    { src: "merry-christmas.png", layout: "double_column", slots: [
      { x: 50, y: 357, w: 500, h: 414 },
      { x: 50, y: 823, w: 500, h: 414 },
      { x: 50, y: 1288, w: 500, h: 413 },
      { x: 650, y: 357, w: 500, h: 414 },
      { x: 650, y: 823, w: 500, h: 414 },
      { x: 650, y: 1288, w: 500, h: 413 }
    ] }
  ],
  "assets/holidays/winter/valentines/backgrounds/": [
    "valentines-background-1.png",
    "valentines-background-2.png"
  ],
  "assets/holidays/winter/valentines/templates/": [
    { src: "valentines-pink.png", layout: "double_column" }
  ],
  "assets/holidays/summer/4th-of-july/overlays/": [
    "4thoverlay.png",
    "4thoverlay1.png"
  ],
  "assets/holidays/spring/st-patricks-day/backgrounds/": [
    "st-patricks-day-background-1.png"
  ],
  "assets/holidays/spring/st-patricks-day/templates/": [
    { src: "st-patricks-day.png", layout: "double_column" },
    { src: "st-patricks-day-template-1.png", layout: "double_column" }
  ]
};

function normalizeFolder(folder) {
  const trimmed = (folder || "").toString().trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getBuiltinAssetManifest(folder) {
  const key = normalizeFolder(folder);
  const manifest = BUILTIN_ASSET_MANIFESTS[key];
  if (!Array.isArray(manifest)) return [];
  return manifest.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    return { ...entry };
  });
}
