const BUILTIN_ASSET_MANIFESTS = {
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
  "assets/wedding/timeless-romance/backgrounds/": [
    "background.svg",
    "timeless-romance-bg-4.png",
    "timeless-romance-bg-5.png",
    "timeless-romance-bg-6.png",
    "timeless-romance-bg-8.png"
  ],
  "assets/wedding/timeless-romance/overlays/": [
    {
      src: "timeless-romance-strip-overlay.svg",
      id: "timeless-romance-strip",
      name: "Timeless Romance Strip",
      type: "photo-strip-layout",
      category: "wedding",
      aspectRatio: "1:3",
      background: { type: "color", value: "#fffcf8" },
      foreground: { type: "image", src: "timeless-romance-strip-overlay.svg" },
      photoSlots: [
        { x: 0.1083, y: 0.213, width: 0.7833, height: 0.1833, borderRadius: 0.02, objectFit: "cover", objectPosition: "center" },
        { x: 0.1083, y: 0.4185, width: 0.7833, height: 0.1833, borderRadius: 0.02, objectFit: "cover", objectPosition: "center" },
        { x: 0.1083, y: 0.6241, width: 0.7833, height: 0.1833, borderRadius: 0.02, objectFit: "cover", objectPosition: "center" }
      ]
    },
    {
      src: "timeless-romance-single-overlay.svg",
      id: "timeless-romance-single",
      name: "Timeless Romance Single",
      type: "overlay",
      category: "wedding",
      aspectRatio: "3:2",
      background: { type: "color", value: "#fffcf8" },
      foreground: { type: "image", src: "timeless-romance-single-overlay.svg" },
      photoSlots: [
        { x: 0.0811, y: 0.3583, width: 0.8378, height: 0.4883, borderRadius: 0.02, objectFit: "cover", objectPosition: "center" }
      ]
    }
  ],
  "assets/wedding/timeless-romance/templates/": [
    {
      src: "timeless-romance-strip-template.svg",
      layout: "photo_strip_3",
      slots: [
        { x: 86, y: 468, w: 548, h: 380 },
        { x: 86, y: 912, w: 548, h: 380 },
        { x: 86, y: 1356, w: 548, h: 380 }
      ]
    },
    { src: "timeless-romance-single-template.svg", layout: "single_photo" }
  ],
  "assets/wedding/garden-vows/backgrounds/": [
    "background.svg",
    "garden-vows-bg-1.png",
    "garden-vows-bg-2.png",
    "garden-vows-bg-3.png",
    "garden-vows-bg-7.png"
  ],
  "assets/wedding/garden-vows/overlays/": [
    {
      src: "garden-vows-single-portrait.png",
      id: "garden-vows-single-portrait",
      name: "Wedding Photo · Portrait",
      type: "overlay",
      category: "wedding",
      orientation: "portrait",
      aspectRatio: "2:3",
      foreground: { type: "image", src: "garden-vows-single-portrait.png" },
      photoSlots: [
        { x: 0.1572, y: 0.095, width: 0.6875, height: 0.68, objectFit: "cover" },
      ]
    },
    {
      src: "garden-vows-single-landscape.png",
      id: "garden-vows-single-landscape",
      name: "Wedding Photo · Landscape",
      type: "overlay",
      category: "wedding",
      orientation: "landscape",
      aspectRatio: "3:2",
      foreground: { type: "image", src: "garden-vows-single-landscape.png" },
      photoSlots: [
        { x: 0.118, y: 0.128, width: 0.765, height: 0.617, objectFit: "cover" },
      ]
    }
  ],
  "assets/wedding/garden-vows/templates/": [
    {
      src: "garden-vows-three-photo-strip.png",
      name: "Wedding Three-Photo Strip",
      layout: "photo_strip_3",
      slots: [
        { x: 130, y: 148, w: 468, h: 459 },
        { x: 129, y: 693, w: 474, h: 455 },
        { x: 130, y: 1234, w: 470, h: 452 }
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
  "assets/holidays/fall/halloween/backgrounds/": [
    "halloween-background-grey-1.jpg",
    "halloween-background-pink.png"
  ],
  "assets/holidays/fall/halloween/overlays/": [
    "1.png",
    "11.png",
    "12.png",
    "13.png",
    "2.png",
    "3.png",
    "4.png",
    "5.png",
    "6.png",
    "fall-leaves-frame.png",
    "graveyard-transparent-frame.png",
    "halloween-overlay-ghosts.png",
    "halloween-frame-boo.png",
    "halloween-frame-fog.png",
    "halloween-frame-groovy-ghosties.png",
    "halloween-frame-groovy.png",
    "halloween-frame-haunted-house.png",
    "halloween-frame-landscape-3.png",
    "halloween-frame-landscape-5.png",
    "halloween-frame-landscape-6.png",
    "halloween-frame-landscape-7.png",
    "halloween-frame-landscape-6.png",
    "halloween-frame-landscape-10.png",
    "halloween-frame-landscape-9.png",
    "halloween-frame-skeletons.png",
    "smoke-corner-frame.png"
  ],
  "assets/holidays/fall/halloween/templates/": [
    { src: "halloween-template-2.png", layout: "double_column", headerPct: 0.22, columnPadPct: 0.055, slotSpacingPct: 0.024, footerPct: 0.035 },
    { src: "halloween-template-3.png", layout: "double_column", headerPct: 0.22, columnPadPct: 0.055, slotSpacingPct: 0.024, footerPct: 0.035 },
    { src: "halloween-template-4.png", layout: "double_column", headerPct: 0.22, columnPadPct: 0.055, slotSpacingPct: 0.024, footerPct: 0.035 },
    { src: "halloween-template-maddies.png", layout: "double_column", headerPct: 0.22, columnPadPct: 0.055, slotSpacingPct: 0.024, footerPct: 0.035 }
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
