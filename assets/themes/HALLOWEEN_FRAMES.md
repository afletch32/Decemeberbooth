# Halloween frames and strip templates

## Problem and redesign

The first frames were too ornate. The later double-column sheets inherited boxes that were too tall because the old wide strip had been compressed. The final templates use the repo's canonical double-strip geometry and a dedicated illustrated header above each strip. Both columns repeat the same artwork and photo sequence.

## Finished files

Each template is a 1200×1800 RGBA PNG: two 600×1800 strips printed side by side.

- `halloween/templates/halloween-graphic-double-column-strip.png`
- `cute-halloween/templates/cute-halloween-graphic-double-column-strip.png`

Each has a matching `.thumb.webp` and is registered in its folder's `templates.json`. Obsolete wide single strips and the incorrect tall-box double strips have been removed from these template folders.

Single-photo overlays remain in each theme's `overlays/` folder: `{theme}-simple-single-photo-portrait.png` (1200×1800) and `{theme}-simple-single-photo-landscape.png` (1800×1200). They retain the earlier simpler perimeter treatment and full-canvas photo layering.

## Artwork blueprint

References: the approved idle, photo-choice, background, and thank-you screen packs.

- Halloween header: orange jack-o-lantern, amber moon, bats, and gold HALLOWEEN wording on black.
- Happy Halloween header: smiling ghost, black kitten, pumpkin with pink bow, pink moon/stars, and Happy Halloween wording on purple.
- Header PNGs are saved in `{theme}/graphics/{theme}-strip-header.png`, 600×330, opaque.
- Header graphics were generated separately with built-in Image Gen. Prompt direction: one wide 600×330 header matching the approved screen, readable exact theme title, featured characters below the title, no controls, photos, QR codes, or photo windows.
- Below the artwork, each template uses quiet dark margins and thin accent borders. Finished illustration stays entirely above the photo openings.

## Exact photo geometry

Canonical geometry is shared by the app renderer and template metadata through `scripts/strip-layout-utils.mjs`.

| Column | Source photo | x | y | Width | Height |
| --- | --- | --- | --- | --- | --- |
| Left | 0 | 50 | 357 | 500 | 414 |
| Left | 1 | 50 | 823 | 500 | 414 |
| Left | 2 | 50 | 1288 | 500 | 413 |
| Right | 0 | 650 | 357 | 500 | 414 |
| Right | 1 | 650 | 823 | 500 | 414 |
| Right | 2 | 650 | 1288 | 500 | 413 |

Normalized coordinates divide x/width by 1200 and y/height by 1800. Source indices repeat 0,1,2 in both columns. Every photo aperture is exactly rectangular, fully transparent, and free of decorative pixels. The one-pixel bottom-row difference preserves the app's established geometry.

`node tools/build-halloween-templates.js` exports the header artwork into canonical print geometry using the existing Playwright dependency and an installed browser. It creates a single 600×1800 strip and duplicates it exactly, including its alpha windows. The header artwork is the illustration; canvas operations only establish the precise print layout and borders.

## Integration patch

`halloween-assets.mjs` owns manifest entries and saved-theme migration, retaining custom uploads and replacing the retired shipped defaults. New template filenames prevent stale artwork cache hits. `app.js` imports the shared standard slot geometry; the app-shell cache and module query are updated together, with the new module included in offline shell assets.

## QA — October 9, 2026

Local route: `http://127.0.0.1:4321/index.html?testMode=booth`. Browser plugin unavailable; Playwright with installed Chrome was used. Third-party scripts/fonts were stubbed.

Flow: select each theme → choose guest orientation → run the production photo and strip composers → inspect desktop/mobile output previews using synthetic colored photos.

| Check | Result |
| --- | --- |
| Page identity / meaningful content | Pass: Event Photobooth setup rendered |
| Framework overlay / page errors | Pass: none observed |
| Template dimensions | Pass: 1200×1800 |
| Exact apertures | Pass: all six windows at standard coordinates have alpha zero |
| Header artwork safety | Pass: confined above photo windows |
| Identical columns | Pass: asset and production-output halves are pixel-identical |
| Theme / orientation / photo order | Pass: expected assets and duplicated 0,1,2 sequence |
| Focused unit checks | Pass: 59/59 |
| Full npm test | 269 passed; 2 fail because the unrelated Eucalyptus wedding manifest is missing |
| Diff whitespace | Pass |

Screenshots: `/tmp/halloween-frames-desktop.png`, `/tmp/halloween-frames-mobile.png`. No real camera capture, physical printing, sharing-provider delivery, or production deployment was exercised. Install the Browser plugin for integrated browser checks in future work.

Files changed in this redesign: `scripts/strip-layout-utils.mjs`, `scripts/halloween-assets.mjs`, `scripts/app.js`, `tools/build-halloween-templates.js`, `halloween-assets.test.js`, `slow-connection-cache.test.js`, `index.html`, `sw.js`, header PNGs, new template PNGs/thumbnails/manifests, this document, and `BUILD_STATUS.md`.
