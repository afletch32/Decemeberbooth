Current goal
- Add a stable booth test mode that makes guest-flow QA faster without changing production behavior.

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
- Full node suite passed: `npm test` (108 tests).
- Rendered test-mode load passed at `/index.html?testMode=booth` with `window.__photoboothQA.auditLayout()` available and no relevant browser errors.
- Rendered smoke passed for welcome-to-capture and desktop/mobile finalizing visibility.
- Targeted Cloudinary parser tests passed: `npm test -- cloudinary-utils.test.js`.

What is in progress
- None.

Next steps
- Use `?testMode=booth` for the next booth UI audit pass.

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
- None known.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Keep the attraction layer as copy, motion, sound cues, and state transitions only.
- Do not change overlay rendering, capture composition, share uploads, print queue contracts, or admin asset state.
- Resolve Cloudinary share URLs by preferring the first valid `eager` URL produced by preset-driven Media Flow, then falling back to the upload response `secure_url`.
- Generate tiny sound cues with Web Audio after guest interaction; do not add audio files.
- Photo filter effects use CSS filters for live preview and canvas pixel manipulation for final export.
- Keep booth test mode URL-gated; it should make uploads/timers deterministic without changing normal guest flow.
