# Build Status

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