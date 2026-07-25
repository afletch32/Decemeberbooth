# Build Status

## Current goal

- Deliver polished, Snapchat-style photo correction without complicating the guest capture flow.

## Current progress

- Upgraded the guest filter carousel from mild generic looks to camera-ready Natural, Soft Glow, Golden Hour, Vivid, and Mono presets. Each now includes restrained face-aware smoothing and targeted lighting correction, while Natural remains the default.
- Fixed the idle timeout so it returns to the welcome screen without briefly showing Thank You; that overlay now appears only when a guest completes a final-preview flow.
- Thank You now uses the selected theme's matching share artwork, or its selected background when no share artwork is supplied.
- Added Thank You Screens to the shared Add Assets upload flow. Image uploads save as orientation-aware theme or event completion artwork and override the fallback completion backdrop.
- Added Avery-specific interaction audio: a playful digital-circus button click and a mechanical vintage-camera shutter at the capture flash, alongside Avery's existing voice clips.
- Avery's QR/share-ready cue now alternates between the existing "What Do You Think?" clip and Adam's "What Do You Think?" clip each time a new share link is ready.
- Added independently composed Avery carnival overlays for portrait and landscape photos, with transparent center windows and the matching curtain, marquee-light, checkerboard, tent, Ferris-wheel, and silhouette edge treatment.
- Added a targeted Avery migration so existing saved/local or remote theme copies receive the new built-in overlays without replacing custom overlays or restoring an operator-removed overlay.
- Redesigned the Event step around a visual theme picker with category filters, selected-theme summary, and a direct Continue to Capture action; saved events and session naming now follow as secondary controls.
- Theme picker previews now prefer supplied idle-screen artwork (including the Amanda North Back to School pack poster) before a theme background, so operators see the real guest visual when one exists.
- Expanded the Amanda North Back to School pack with independently composed portrait and landscape share-screen backdrops. The live final-photo and QR controls render over the new artwork rather than using baked-in placeholder sharing content.
- Created and registered the Amanda North STREAM Night foundation pack: reusable backgrounds, Tap to Start idle screens, and photo-choice screens in portrait and landscape. Runtime selection now prefers the matching orientation for both idle and photo-choice artwork.
- Categorized STREAM Night under Schools in the fast setup picker.
- Added Avery's Birthday portrait and landscape idle/photo-choice artwork with touch-safe Start, Single Photo, and Photo Strip hotspots; its sound profile plays Digital Circus on Start, Moxie after capture, and What Do You Think after the QR link renders.
- Optimized Avery's four guest screens as bundled WebP artwork at the existing dimensions, reducing the idle-screen downloads from 2.7–3.4 MB to 272–296 KB without changing the visual composition or hotspot geometry.
- Added matching Avery birthday reusable backgrounds and share screens in portrait and landscape, with dark carnival-neon edge framing and clear center zones for live camera, final-photo, QR, and thank-you UI.
- Replaced Avery's landscape background and share-screen base with a character-free dark carnival stage so the live camera and final photo have an uncluttered backdrop.
- Added dedicated Avery birthday Thank You screens in portrait and landscape, so the completion moment uses the matching dark carnival stage instead of reusing the share background.
- Styled the live Thank You! message for themed completion screens with high-contrast carnival typography, so the text remains prominent over Avery's dark artwork.
- Restored subtle animated sparkles over custom idle and photo-choice artwork, plus a gentle Thank You light sweep; all motion is non-interactive and disabled for reduced-motion guests.
- Created the six-piece Amanda North Elementary Coyote Back to School artwork foundation pack, with bright royal-navy, sky-blue, and gold portrait and landscape backgrounds, idle screens, and photo-choice screens.
- Registered the optimized Amanda North Coyote portrait waving idle MP4 as the ANE theme's looping guest idle screen, with a touch-safe Start hotspot over the artwork button.
- Replaced autoplaying admin video previews with lazy still images: Cloudinary first-frame JPGs, explicit bundled posters, or a local placeholder.
- Scoped Asset Library rendering and search to the selected theme's main event category by default; choosing another Category switches the preview scope, and clearing filters returns to the main category.
- Simplified the default Event admin step to Saved Event, Session Name, Theme, and selected-asset summary; optional guest text, font, date, preset editing, and the Asset Library now stay collapsed until requested.
- Tightened the Event setup first viewport: compacted the title, statuses, flow navigation, asset summary, and setup controls so configuration begins without a long scroll.
- Removed the non-actionable yellow overlay warning and promoted Theme to the first, largest, touch-friendly Event setup control.
- Fixed inactive setup sections so they no longer reserve invisible space above the active tab.
- Moved frequently changed print controls to the top of Share and separated print, QR/cloud, email, and device settings with jump navigation.
- Collapsed the less-frequently changed paid-print copy fields into a dedicated subsection.
- Setup tabs now bring the selected section directly into view.
- Matched URL and long-text fields to the rest of the Share form and removed the retired control's leftover gap.
- Replaced the tall setup status cards with compact one-line statuses and green indicator dots.
- Moved event-specific staff queue access to the top of Share with open, copy, and QR sharing controls.
- Turned setup into a numbered Event → Capture → Share → Launch flow with Continue actions between steps.
- Grouped Event settings into Basics, Guest Screen, Event Assets, and collapsed asset-library sections.
- Grouped Capture settings into Guest Options, Timing, Camera Quality, and collapsed Operator Tools.
- Collapsed low-frequency Cloudinary and email connection settings in Share.
- Replaced competing top launch actions with one Share-only Launch Booth action that starts the booth directly.
- Installed and validated the personal `photo-booth-theme-creator` skill at `/Users/ashleyfletcher/.agents/skills/photo-booth-theme-creator`.
- Linked the skill into `/Users/ashleyfletcher/.codex/skills` for Codex discovery while keeping one canonical copy.
- Confirmed the complete six-asset workflow, independent portrait/landscape composition rules, screen-specific touch-zone rules, prompt guidance, and quality checklist.
- Added the approved Summer portrait and landscape idle screens as bundled craftsmanship and recomposition references without making their imagery a theme default.
- Added eight read-only popular font pairs to the existing setup dropdown, with no individual-font choices.
- Removed the legacy dual-font modal, hidden heading/body controls, editable custom-pairing storage/UI, quick-pick grids, and duplicate dual-font initializer.
- Removed the remaining individual-font add, preview, suggestion, option-population, and single-font activation helpers.
- Removed stale JavaScript element lookups, deleted final-review/email UI hooks, and orphaned CSS selectors; added regression coverage for future stale IDs.
- Replaced the staff rotation control with a live diagram and plain-language summary showing one or two photos on portrait or landscape paper.
- Kept print layout and paper direction as session defaults while adding a visual per-photo override with a one-click return to the session default.
- Hardened managed asset uploads with file validation, duplicate-submit protection, Cloudinary response checks, and actionable status/error messages.
- Managed booth videos now save and use an H.264 MP4 Cloudinary delivery URL limited to 1200 × 1200, 30 fps, automatic good quality, and no audio.
- Preserve the original Cloudinary source URL and detected portrait/landscape orientation as asset metadata.
- Removed the Love It review stage.
- Increased QR render and display size.
- Print-enabled sessions show Retake and Print below the QR; Print explicitly submits to the existing queue.
- Removed the separate printed-photo card and its remaining Love your photos heading from final-screen markup.
- Fixed hidden setup controls and inactive sections so they no longer reserve blank layout space.
- Restored Asset Library and Current Selections as open-by-default event panels.
- Relabeled Device Tools as Advanced Device Tools to distinguish operator fallbacks from normal setup.
- Kept Asset Library cards and type counts available across theme selections, including idle and photo-choice screens.
- Kept Asset Library card refreshes on the active library theme so saved-event background additions retain their green selected outline.
- Fixed Asset Library card toggles so background selection and event-asset removal immediately match the toast, green outline, badge, and effective session state.
- Fixed theme normalization so frame objects remain valid image definitions, and corrupted `[object Object]` frame lists restore from built-in theme frames for live preview and final output.
- Repaired legacy `assets/Hawks/...` records to the current `assets/school/hawks/...` paths so older previews load again.
- Added a disabled `Uploading…` state while asset files are being sent, preventing duplicate clicks and making MP4 progress clear.
- Defaulted the general Add Assets modal to Backgrounds only so an MP4 is not also submitted to the unsupported overlay destination.
- Removed the redundant Idle Screen and Photo Choice upload buttons; one Add Assets flow now handles all destinations from its checklist.
- Removed the unused admin modal navigation, backdrop, and close controls that had no current trigger.
- Removed the dead session-card router and its links to retired asset buttons.
- Removed orphan handlers for the retired per-type asset upload buttons; the shared Add Assets handler is now the only upload entry point.
- Verified the cleanup with 94 focused checks, all 177 automated tests, and a browser MP4 selection for Photo Choice Screens with no console warnings or errors.
- Removed the hidden legacy theme-editor panel and its hidden form fields from `index.html`.
- Moved selected-theme options, selection, editor mode, and theme draft values into the dedicated `scripts/theme-admin-state.mjs` module.
- Removed the retired quick-theme-card renderer and hidden live-preview DOM logic from the main app bundle.
- Added focused tests for the modular state contract and for keeping the retired hidden markup out of HTML.
- Fixed the visible Base Theme summary so changing the setup theme refreshes it from the newly loaded theme instead of leaving the previous theme name and counts.
- Added a touch-safe press ripple for Start and photo-choice hotspots, including invisible hotspots over custom screen artwork.
- Added a short transition hold so guests see their tap register before the next welcome or camera screen appears.
- Extracted Asset Library category, URL, metadata, deduplication, and screen-record normalization from `scripts/app.js` into `scripts/asset-library-utils.mjs`.
- Added direct unit coverage for legacy URL repair, cache-safe IDs, duplicate merging, idle/photo-choice metadata, and unsafe record rejection.
- Extracted Asset Library category inference, search matching, filtering, and sorting into `scripts/asset-library-view.mjs` with pure view-model tests.
- Removed unused JSZip startup loading and deferred QRCode, EmailJS, and MediaPipe Selfie Segmentation until their features are used.

## Next steps

- Validate the new looks on the booth camera with real skin tones and both portrait and landscape lighting.

## Known bugs/blockers

- No active blocker. The correction strength should be tuned with real event-camera lighting before any stronger retouching is added.

## Photo Choice Screen Feature

**Status**: Complete ✅

**Date**: 2025-07-12

**Summary**: Successfully implemented Summer-only photo choice screen with dual hotspots.

### Implementation Notes

- Route photo-choice uploads through the shared Add Assets modal as `photo-choice` role
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

### Direct Booth Launch

- Removed the redundant Ready to launch confirmation.
- The Share-stage Launch Booth action now enters the guest booth immediately.
- The fixed launch dock is hidden after Setup closes so it cannot cover the guest screen.
- Added regression coverage for the direct launch path.

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

### Moving Screen and Background Support

- Added looping MP4 support for booth backgrounds, idle screens, photo-choice screens, and green-screen backgrounds.
- Kept Start and photo-mode hotspots as real controls layered above the video.
- Keep every uploaded portrait and landscape file as its own Asset Library record.
- Let the operator choose the active idle and photo-choice files from the library; selecting a different orientation replaces only the matching screen role.
- Do not switch screen artwork when the browser or device orientation changes.
- Carry the video orientation detected from its dimensions into the saved theme or event screen entry.
- Keep saved video cards visible and selectable when their preview thumbnail cannot load.
- Restore the mobile frame-menu trigger so it remains visible and tappable while the booth is ready.
- Added video previews to setup, Asset Library, and hotspot positioning tools.
- Route supported video uploads through Cloudinary's video endpoint while keeping image-only assets protected.
- Preserve a video background frame when producing the final still photo.
- Added regression coverage for upload routing, playback surfaces, hotspot geometry, and saved output rendering.
- Added regression coverage for Cloudinary transformation-path generation, upload validation, duplicate blocking, and non-OK responses.
- Verified 23 idle-screen tests, 80 focused setup/idle tests, and 175 full-suite tests pass.
- Verified the booth transformation path returns an H.264 MP4 response from Cloudinary.
- Optimized the four supplied 30-second Summer videos to H.264, 30 fps, approximately 7 MB each.
- Next step: verify a real Cloudinary video upload on the booth device before deployment.
