# Photo Choice Screen Handoff

## Goal

Add a custom **Summer-only** photo-choice screen using `photo choice.png` from:

`/Users/ashleyfletcher/Library/Mobile Documents/com~apple~CloudDocs/background photochoice summer.zip`

It must behave like the custom idle screen:

- Cloudinary-hosted artwork, not a local runtime path.
- Landscape artwork with cover-fit hotspot mapping.
- One invisible, editable hotspot for **Single Photo**.
- One invisible, editable hotspot for **Photo Strip**.
- Back from this screen restores the Summer custom idle screen.
- Other themes keep the existing button-based photo-choice fallback.

## Current state

Partial implementation is present in commit `50ec5eb`. **Do not deploy until the dedicated upload path and browser verification are complete.**

Implemented:

- `photo-choice` role inferred from filenames matching `photo choice`.
- Default percentage zones:
  - `singlePhoto`: `{ x: 34, y: 59, width: 27, height: 50 }`
  - `photoStrip`: `{ x: 66, y: 59, width: 27, height: 50 }`
- Runtime selectors for idle versus photo-choice entries.
- Custom photo-choice presentation class and transparent runtime buttons.
- Two editor zones and drag/resize support.
- Single Photo routes to `still-photo`; Photo Strip routes to `strip`.
- Focused static tests currently pass: `node --test idle-screen.test.js setup-screen.test.js`.

The current uncommitted changes are this handoff file and the concise `BUILD_STATUS.md` pointer. Photo-choice HTML, CSS, JavaScript, and focused tests are already tracked; inspect them before extending.

## Required remaining work

### 1. Add a dedicated upload action

Do not make the user upload this through the generic Idle Screens button.

Add:

- Visible Asset Library button: `Add Photo Choice Screen`.
- Hidden input accepting images, preferably one file.
- DOM references and change handler.
- Upload destination may reuse the existing `idle-screens` Cloudinary kind, but the registered record must set `role: "photo-choice"` explicitly.
- Avoid relying only on filename inference; pass role metadata from the dedicated uploader.
- Clear the input when the upload modal closes.

Suggested identifiers:

- `addPhotoChoiceScreenBtn`
- `photoChoiceScreenInput`
- `bulkToPhotoChoiceScreen` only if reusing the bulk modal is still the simplest existing pattern.

### 2. Preserve role and both zones everywhere

Audit every idle-screen normalization/persistence path. A photo-choice record must retain:

```js
{
  role: "photo-choice",
  orientation: "landscape",
  buttonZones: {
    singlePhoto: { x, y, width, height },
    photoStrip: { x, y, width, height }
  }
}
```

Check at minimum:

- `registerUploadedAsset()`
- `normalizeAssetLibrary()`
- `buildIdleScreenEntryFromUrl()` or a new explicit builder
- `buildThemeDefaultAssetEntry()`
- `updateAssetLibraryItem()` normalization
- remote asset sync payloads
- theme-default assignment
- event overrides and `activeSessionAssets.idleScreens`

Do not let the normal idle selector choose `role: "photo-choice"`, and do not let the photo-choice selector choose a normal idle asset.

### 3. Make assignment Summer-only

- Upload `photo choice.png` using the new action.
- Assign it only to the Summer theme through the existing Theme Defaults model.
- Do not assign it to General, weddings, schools, holidays, or any other theme.
- Do not hardcode its Cloudinary URL into the application.
- Confirm save, immediate display, and display after refresh.

### 4. Finish editor UX

- Editor title: `Position Photo Choice Hotspots`.
- Show only the two choice zones for photo-choice assets.
- Show only the Start zone for normal idle assets.
- Reset restores the two default zones above.
- Save copy: `Photo choice hotspots saved.`
- Asset card action: `Position Choices` for photo-choice assets, `Position Start` for idle assets.
- Confirm both zones remain editable after reopening and refreshing.

### 5. Runtime behavior to verify

Flow under test:

`Summer idle artwork -> Start hotspot -> Summer photo-choice artwork -> Single Photo or Photo Strip hotspot -> correct capture flow`

Also verify:

- Photo-choice screen uses the same cover geometry as the displayed artwork.
- Hotspots are visually transparent and not blurred.
- Single Photo hotspot resolves to the existing `still-photo` button.
- Photo Strip hotspot resolves to the existing `strip` button.
- Back restores the Summer custom idle artwork and Start hotspot.
- Resize/orientation change recalculates both choice zones.
- A theme without a photo-choice asset shows the legacy mode buttons.

## Tests

Required static checks:

```bash
node --input-type=module --check < scripts/app.js
node --test idle-screen.test.js setup-screen.test.js mobile-flow.test.js
git diff --check
```

Add/extend tests for:

- Dedicated upload action and input.
- Explicit `photo-choice` role persistence.
- Both zone objects survive normalization and theme assignment.
- Idle and photo-choice selection remain separated.
- Back restores custom idle artwork.
- Legacy choice fallback remains available for non-Summer themes.

Required browser checks with Playwright:

- Upload/assign to Summer if test fixtures support Cloudinary mocks.
- Start on custom Summer idle screen.
- Click Start hotspot.
- Confirm custom photo-choice artwork is visible.
- Center hit-test each hotspot and verify the correct existing mode button.
- Click each hotspot in separate runs and verify correct capture mode.
- Press Back and verify custom idle artwork returns.
- Verify at landscape kiosk/tablet viewport sizes.

## Guardrails

- Preserve vanilla HTML/CSS/JS.
- Use double quotes in JavaScript.
- Keep Cloudinary as the shared source of truth.
- No base64 or local filesystem runtime source.
- Do not create a second mode-selection flow; reuse `beginModeSelection()` and existing buttons.
- Do not change capture, overlay, template, print, QR, or storage contracts outside this feature.
- Update `BUILD_STATUS.md` after completion.
- Run tests before committing.
- Commit, push, and deploy only after runtime verification succeeds.

## Asset evidence

ZIP contents:

- `1.png` — plain Summer background, not the choice screen.
- `photo choice.png` — **selected artwork**.
- `photo choice (2).png` — not selected.

All three files are 1536x1024 landscape PNGs.
