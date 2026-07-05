Current goal
- Add the new Fourth of July assets as selectable overlays.

What is done
- Implemented Cloudinary transformation support, including UI selection and integration with upload logic.
- Welcome now has ambient motion, event-logo drift, tap-anywhere copy, and theme-aware host language.
- Experience selection uses large Photo / Photo Strip cards with lifted touch/hover motion.
- Camera and countdown states use host-style prompts, a 3-2-1-SMILE beat, and tiny generated sound cues after guest interaction.
- Final preview opens on an emotional review gate with LOVE IT / Retake; LOVE IT briefly changes to Awesome before revealing save/print.
- QR/save and print copy now sells the memory/keepsake instead of software or paper.
- Goodbye has a short thank-you celebration with confetti-style motion.
- Cloudinary share uploads now prefer Media Flow derived URLs from the `eager` response before falling back to the base `secure_url`, so QR/share and print can use the enhanced asset URL automatically.
- Public booth search/favorite controls remain removed; admin Asset Library still owns search, sorting, favorites, and recents.
- Replaced 8 filter effects with 5 guest-friendly filters (Natural, Soft, Bright, Clean, B&W) selectable via liquid-glass arrows beside the video preview.
- Removed filter grid thumbnails and "Overlay Format" (portrait/landscape) from the guest booth panel.
- Renamed "Choose Your Overlay" section to "Choose Your Frame".
- Added keyboard arrow key support for cycling filters on the booth screen.
- Enlarged guest filter carousel arrow targets, clarified the helper prompt, and exposed filter arrow handlers for inline button clicks.
- Final share QR rendering now waits for successful canvas rendering, retries the QR library from a fallback CDN if needed, and shows a clear failure state instead of a blank QR panel.
- Added `?testMode=booth` to disable idle timeouts, use deterministic share URLs, mark the test camera state, and expose `window.__photoboothQA.auditLayout()` for overlap/tap-target audits.
- Restored the booth test-mode implementation after verification caught missing app helpers.
- QR/share panel now appears after LOVE IT while QR rendering is pending or failed instead of staying hidden.
- Shareable final previews no longer auto-close after 15 seconds before guests can scan.
- Guest filters now apply to the normal live video, slot-based overlay preview media, frozen preview, and captured photo pixels before final overlay composition.
- Added a Fourth of July summer holiday theme that points at `assets/holidays/summer/4th-of-july/overlays/`.
- Registered the two new Fourth of July PNGs in the overlay manifest and built-in asset manifest.
- Full node suite passed: `npm test` (112 tests).
- Targeted Cloudinary parser tests passed: `npm test -- cloudinary-utils.test.js`.
- Targeted setup-screen regression tests passed: `npm test -- setup-screen.test.js`.
- Targeted Fourth of July asset/theme tests passed: `npm test -- builtin-asset-manifests.test.js setup-screen.test.js`.

What is in progress
- None.

Next steps
- Verify the Fourth of July theme on a live booth device and choose default assignment if needed.

Recent asset library improvements
- Delete now fully removes assets from the library and remote storage (no more hidden/archived ghost records).
- Replaced editable-field dropdown filter with a simple "Has editable fields" checkbox.
- Removed per-card editable-field badges and "Fields" prompt button from the asset library grid.
- Added "Sort by Category" option to the asset library sort dropdown (groups backgrounds → overlays → templates).
- Asset library pills (All / Backgrounds / Overlays / Templates) provide quick category filtering with counts.
- Added theme-based category filtering (General, School, Wedding, Holidays) to the asset library dropdown.
- Removed "Tags for new uploads" field and "Has editable fields" checkbox from admin UI.
- Editable fields are now auto-detected from overlay builder metadata, not manually configured in admin.
- Category filter now matches assets against their theme-derived categories (e.g., school:hawks → School).
- Delete for theme-backed assets now creates a tombstone record instead of disappearing.

Known bugs/blockers
- Headless Playwright loaded the normal page, but the booth test-mode QA URL crashed/hung in Chromium during smoke verification; run the final QR/filter pass on a live device.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Keep the attraction layer as copy, motion, sound cues, and state transitions only.
- Do not change overlay rendering, capture composition, share uploads, print queue contracts, or admin asset state.
- Resolve Cloudinary share URLs by preferring the first valid `eager` URL produced by preset-driven Media Flow, then falling back to the upload response `secure_url`.
- Generate tiny sound cues with Web Audio after guest interaction; do not add audio files.
- Photo filter effects use CSS filters for live preview and canvas pixel manipulation for final export.
- Keep booth test mode URL-gated; it should make uploads/timers deterministic without changing normal guest flow.
- Keep final share previews open for scanning; only non-share gallery previews use the short auto-close timer.
