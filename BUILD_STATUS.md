# Build Status

## Current goal

- Remove obsolete font and deleted-element code without changing the active booth flow.

## Current progress

- Installed and validated the personal `photo-booth-theme-creator` skill at `/Users/ashleyfletcher/.agents/skills/photo-booth-theme-creator`.
- Linked the skill into `/Users/ashleyfletcher/.codex/skills` for Codex discovery while keeping one canonical copy.
- Confirmed the complete six-asset workflow, independent portrait/landscape composition rules, screen-specific touch-zone rules, prompt guidance, and quality checklist.
- Added the approved Summer portrait and landscape idle screens as bundled craftsmanship and recomposition references without making their imagery a theme default.
- Added eight read-only popular font pairs to the existing setup dropdown, with no individual-font choices.
- Removed the legacy dual-font modal, hidden heading/body controls, editable custom-pairing storage/UI, quick-pick grids, and duplicate dual-font initializer.
- Removed the remaining individual-font add, preview, suggestion, option-population, and single-font activation helpers.
- Removed stale JavaScript element lookups, deleted final-review/email UI hooks, and orphaned CSS selectors; added regression coverage for future stale IDs.
- Replaced the staff rotation control with a live diagram and plain-language summary showing one or two photos on portrait or landscape paper.
- Removed the Love It review stage.
- Increased QR render and display size.
- Print-enabled sessions show Retake and Print below the QR; Print explicitly submits to the existing queue.
- Removed the separate printed-photo card and its remaining Love your photos heading from final-screen markup.

## Photo Choice Screen Feature

**Status**: Complete ✅

**Date**: 2025-07-12

**Summary**: Successfully implemented Summer-only photo choice screen with dual hotspots.

### Implementation Notes

- Added dedicated upload action (`Add Photo Choice Screen` button + hidden input)
- Route photo-choice uploads through bulk modal as `photo-choice` role
- Preserve role and zones in normalization/persistence across all paths:
  - `registerUploadedAsset()` - explicit photo-choice role and buttonZones
  - `normalizeAssetLibraryPayload()` - preserves role and zones
  - `buildIdleScreenEntryFromUrl()` - sets role and default zones
  - `buildThemeDefaultAssetEntry()` - includes buttonZones
  - `updateAssetLibraryItem()` - normalizes buttonZones
- Editor UX complete:
  - Title: "Position Photo Choice Hotspots"
  - Two editable zones (Single Photo, Photo Strip)
  - Save toast: "Photo choice hotspots saved."
  - Asset card action: "Position Choices" for photo-choice assets
- Runtime behavior verified:
  - Summer idle artwork -> Start hotspot -> Summer photo-choice artwork
  - Single Photo hotspot resolves to `still-photo` button
  - Photo Strip hotspot resolves to `strip` button
  - Back restores custom idle artwork
  - Resize/orientation recalculates choice zones
  - Themes without photo-choice asset show legacy mode buttons

### Test Results

```bash
node --test idle-screen.test.js setup-screen.test.js mobile-flow.test.js
```

**Result**: 64/64 tests passing (0 failures)

Key test coverage:
- Idle screens as first-class Cloudinary asset type
- Canonical records and theme defaults
- Editor state initialization
- Event/theme orientation fallbacks
- Photo choice dual hotspots
- Asset path validation (no local paths)
- Mobile flow, setup, and booth behavior

### Deployment Notes

- Ready for manual runtime verification on Summer theme
- Upload `photo choice.png` using new action
- Assign to Summer theme through Theme Defaults model
- Deploy with `npm run deploy` after verification

### Parser Regression Fix

- Removed the broken idle-screen imports that collided with existing app functions.
- Restored the app-local idle and photo-choice selectors used by the welcome flow.
- Removed the duplicate `clearCustomIdleScreen` export from `scripts/idle-screen.mjs`.
- Verified both browser modules parse and all 149 automated tests pass.
- Next step: deploy, then verify the admin and booth flows in the browser.

### Photo Choice Persistence Fix

- Fixed the dedicated photo-choice upload route so it saves as an idle-screen asset with `role: "photo-choice"`.
- Preserve the normal idle screen when adding or replacing photo-choice artwork.
- Added regression coverage for upload classification and persistence.
- Verified the browser module parses, the focused idle-screen suite passes 16/16, and the full suite passes 150/150.

### Final Share QR Visibility Fix

- Reveal the QR panel immediately when a public share URL enters QR rendering.
- Keep the existing pending, success, failure, and review-stage behavior unchanged.
- Added regression coverage for immediate QR visibility.
- Verified the focused setup suite passes 46/46 and the full suite passes 150/150.

### No-Frame Preview Mirroring Fix

- Mirror `#livePreviewCanvas` when the booth uses the No Frame preview path.
- Leave processed capture and final output pixels unchanged.
- Added regression coverage for the preview-only transform.

### Booth State Visibility Fixes

- Hide legacy headings, icons, and labels over custom photo-choice artwork while preserving hotspot buttons.
- Hide filter arrows and the filter name during countdown, finalizing, share, and welcome states.
- Enter the custom idle or photo-choice state before remote artwork finishes loading so slow connections do not flash the legacy UI.
- Verified 65/65 focused tests and 153/153 full-suite tests pass.

### QR Retake Layout

- Move Retake into the QR panel as a compact button directly below the code.
- Hide the review card once a public share URL is ready, preventing QR/review overlap.
- Preserve the existing retake handler and capture reset behavior.
- Verified the focused setup suite passes 49/49 and the full suite passes 154/154.

### Blank Booth Launch Fix

- Prevent booth launch from hiding Setup unless a valid theme resolves.
- Show a dedicated loading surface while custom idle or photo-choice artwork loads.
- Fall back to the standard welcome screen after eight seconds if remote artwork stalls.
- Verified 67/67 focused tests and 155/155 full-suite tests pass.

### Off-Screen Booth Root Fix

- Runtime diagnostics proved the loaded welcome image and screen were positioned one viewport below the visible page.
- Anchor `#boothScreen` to the viewport with fixed positioning and full inset dimensions.
- Keep the existing hidden-state behavior for returning to Setup.
- Verified 50/50 focused setup tests and 156/156 full-suite tests pass.

### Frame Transition Flash Fix

- Eliminated white flash between frame changes by smoothing live preview transitions.
- Added CSS opacity transition to `#photoSlotLayer` for cross-fade effect.
- Modified freeze/unfreeze logic to fade out/in live preview instead of instant hide/show.
- Preserved all existing capture and processing logic; only visual transition behavior changed.
- Verified focused overlay-slot tests pass (34/34) and full suite passes (153/153).
