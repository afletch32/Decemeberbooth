# Hawks Cheer tea party artwork

Five transparent PNG foreground assets, added to the existing Hawks Cheer theme. No screens or new theme were created. Generated with the built-in image tool; each composition was generated separately and original alpha was preserved.

| File | Pixels | Use |
| --- | --- | --- |
| hawks-cheer-tea-party-single-photo-portrait.png | 1024 × 1536 | Navy single photo |
| hawks-cheer-tea-party-single-photo-landscape.png | 1536 × 1024 | Navy single photo |
| hawks-cheer-tea-party-double-2x6-three-photo-strips.png | 1024 × 1536 | Navy two-column strip |
| hawks-cheer-garden-tea-party-single-photo-portrait-simple-v2.png | 1024 × 1536 | Garden single photo |
| hawks-cheer-garden-tea-party-double-2x6-three-photo-strips-simple-v2.png | 1024 × 1536 | Garden two-column strip |

## Blueprint and generation prompts

- Navy set: existing Hawks logo, navy/kelly-green/ivory palette, porcelain teapot and stacked teacups, white roses, green leaves, satin cheer bows, lace and fine gold accents. Dimensional commercial illustration with readable Hawks Cheer / Tea Party lettering.
- Garden set, simple v2: user requested less intricate artwork. Generation prompts retain blush/lavender/sage/ivory, a thin straight sage border, one tiny floral accent, one teacup and one butterfly. Remove dense florals, filigree, lace, pearls, wisteria, keys, watches and plaques. Restrained sage Hawks Cheer / Tea Party / Spring Hill lettering and more open photo space. The original ornate source PNGs are retained for recovery but removed from saved and default theme choices.
- Both sets: transparent photo openings, no guest photos, dates, QR codes or controls. Independent single-photo orientations and separate double-column templates with three photos repeated in each column.

## Production geometry and validation

Normalized photo rectangles and source indices are recorded on each asset in `scripts/app/themes/builtin-catalog.mjs`; they are consumed by the existing slot renderer. The source tool returned the native resolutions above rather than the requested 1200 × 1800 / 1800 × 1200 exports. These aspect ratios match the existing output classes; no stretching or orientation conversion was used.

The ornamental artwork overlaps window edges; photo bounds cover the opening behind it. The alpha channel and artwork were preserved. These are decorative openings, not guaranteed completely transparent rectangular cutouts. Rendered compositions were visually inspected for coverage, legible text, independent orientations, three visible photos in each strip, and correctly repeated source photos. Automated browser coverage checks all five compositions and repeated photo mapping. Physical printing and iPad camera testing are not covered by these checks.
