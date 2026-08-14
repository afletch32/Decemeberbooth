# Build status

- Current goal: Restore Spring Hill Hawks overlays in the live photo preview while preserving final/share rendering.
- Amanda North knowledge: Added the supplied campus/building, Coyotes logo and colors, school-supply motifs, “Building a Strong Foundation,” PTO badge, and premium overlay references to the theme creator guidance.
- Done: Added theme-aware public gallery styling, responsive photo grid, full-screen viewer, and bounded Load More rendering. Added a full-event-gallery action to the existing share screen. Gallery links now carry event/theme identifiers, and saved-event tags include the unique event ID so same-named events stay separate.
- Done: Repointed Spring Hill Hawks and Hawks Cheer overlay defaults from stale Cloudinary URLs to the committed `assets/school/hawks/overlays/` files used by the live-preview renderer.
- Done: Full `npm test` suite passes (135 tests), Hawks regression coverage passes, and local runtime serves representative Hawks overlay files with HTTP 200.
- Done: Capture flash is now explicitly armed only during capture, preventing overlay changes from triggering the flash effect.
- Done: Asset Library deletion now removes the deleted asset from the active session assignment before booth launch, including theme-backed defaults.
- Next steps: Perform a real camera/browser interaction on the booth device before deployment.
- Known bugs/blockers: Public gallery still depends on deployed `THEMES_KV`-backed gallery/events/themes Functions; Cloudinary image-list fallback may be unavailable when Cloudinary list delivery is disabled. Gallery links include the former name/date tag as a compatibility read so existing event photos remain visible.
- Important decisions: `/api/gallery` remains authoritative; individual QR URLs remain unchanged; no infinite scroll and no new storage system.
