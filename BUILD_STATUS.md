Current goal
- Make the live capture preview the dominant booth-ready surface across supported kiosk viewports.

What is done
- Replaced the full-width captured-photo band with a compact floating thumbnail tray that hides when empty or outside booth-ready state.
- Replaced the booth-ready three-column layout with one centered, shrinkable camera column for standard photo modes.
- Moved frame selection behind the existing `Choose Frame` sheet instead of permanently reserving a desktop column.
- Reduced decorative camera chrome and removed the ready-state host prompt from layout space.
- Kept the shutter button in flow as a prominent, touch-safe action below the camera.
- Enlarged and centered the existing countdown presentation over the camera without changing countdown logic.
- Scoped the new capture grid away from 360 mode.
- Added real-flow browser coverage for camera prominence, collisions, frame-sheet bounds, portrait orientation, and countdown placement.
- Verified focused capture browser coverage passes across eight kiosk and tablet viewports.
- Reworked the effective final-preview stylesheet around available width and height instead of viewport-derived minimum sizing and an absolutely positioned action panel.
- Kept compact landscape and 4:3 displays in a shrinkable two-column layout; portrait uses a bounded stacked layout.
- Constrained the displayed QR canvas as a square inside a shrinkable grid track so both panel width and height limit it.
- Added focused browser coverage for final-preview, photo, actions, QR panel, and QR bounds across supported landscape and tablet portrait sizes.
- Verified the focused final-share browser regression passes with the paid-print panel visible.
- Verified `npm test` passes with 127 tests.
- Replaced the link panel content with only `Share Link` and `Open Link` buttons.
- Removed event-name and event-date wording from the setup screen labels.
- Relabeled the event date field as session date.
- Kept the event name field relabeled as session name.
- Added birthday-only and wedding-only theme gating for advanced event fields.
- Relabeled the existing event name field as session name.
- Kept the session date default tied to the current local date.
- Routed upload folder selection through the existing session name/date fields.
- Added regression coverage for the session naming and folder resolver.
- Added a collapsible selected-assets toggle to the setup screen.
- Wired the toggle summary to the existing background, overlay, and template count labels.
- Added a setup-screen regression test for the new collapsible summary.
- Confirmed the worktree was clean before starting this checkpoint.
- Verified the current implementation keeps search, sort, favorites, and recents in the admin Asset Library.
- Verified the public booth picker still uses natural asset order, bounded show-more pagination, and no public search/favorite controls.
- Updated stale browser smoke coverage to use the current Asset Library category dropdown and asset-type pills.
- Verified `node --input-type=module --check < scripts/app.js` passes.
- Verified `npm test` passes.
- Verified focused browser coverage with `npm run test:browser -- --grep "Asset Library keeps admin filters|frame picker stays hidden"`.
- Fixed Overlay Builder photo boxes so custom-drawn slot edits persist into preview, PNG export, and manifest metadata.
- Updated Overlay Builder manifest output so single-photo overlays and photo-strip templates both export normalized `photoSlots`.
- Verified exported builder assets still cut transparent photo windows aligned with the emitted slots.
- Verified focused overlay/template coverage with `node --test overlay-maker.test.js overlay-slot-rendering.test.js template-rendering.test.js`.
- Fixed after-capture final preview sizing so the review and QR/share panels stay inside the booth viewport instead of creating horizontal overflow.
- Added browser smoke coverage for both the review panel and QR/share panel viewport bounds after capture.
- Reduced after-capture glass blur so the review/share screen is less hazy.
- Reduced guest photo blur by lowering blur-backed blemish and under-eye correction strengths and blur radii.
- Updated beauty preset tests to keep guest-visible blur-backed corrections subtle.
- Kept the final photo preview size intact while moving the review/share action card inside the right edge of the viewport.
- Expanded browser smoke coverage to assert after-capture controls stay inside the viewport vertically and horizontally.
- Verified focused browser coverage with `npm run test:browser -- --grep "booth test camera displays and captures"`.
- Verified `node --input-type=module --check < scripts/app.js` passes.
- Verified `node --test setup-screen.test.js` passes.
- Verified `npm test` passes.
- Verified `git diff --check` passes.
- Verified `/staff-print` returns 404 while `/staff-print.html` returns 200 on the local server.
- Fixed copied staff queue links to target `staff-print.html` directly.
- Hardened the staff print popup so cached images still trigger print and failed image loads show a clear message.
- Verified `node --input-type=module --check < scripts/app.js` and `node --check scripts/staff-print.js` pass.
- Verified `npm test` passes.
- Verified the local staff route returns 200 at `/staff-print.html`.
- Hid the staff token control by default and renamed it to `Unlock Staff Actions`.
- Added API metadata so the staff token control appears only when `PRINT_QUEUE_STAFF_TOKEN` is configured.
- Verified `node --input-type=module --check < scripts/app.js`, `node --check scripts/staff-print.js`, and `node --check server.js` pass.
- Verified `npm test` passes.
- Verified the local staff page renders the token control as hidden.
- Added a staff layout selector for `1 photo on 4x6` and `2 photos on 4x6`.
- Added a 2-up print composition path that duplicates the queued image on the print page.
- Normalized margins, padding, and gaps across the main booth/admin app, staff print screen, gallery, overlay maker, and final-preview sizing CSS to 8-point spacing values.
- Applied responsive page padding rules: 32px desktop, 24px tablet, and 16px mobile where page-level padding is owned by these screens.
- Verified `node --input-type=module --check < scripts/app.js` and `node --check scripts/staff-print.js` pass.
- Verified `npm test` passes.
- Verified focused browser coverage with `npm run test:browser -- --grep "Asset Library keeps admin filters|frame picker stays hidden"`.

What is in progress
- None.

Next steps
- Review the revised capture hierarchy on physical kiosk hardware when available.

Known bugs/blockers
- The requested dirty worktree was not present at start; `git status --short` was clean.

Important decisions
- Keep captured-photo history available as a compact tray without letting it consume capture-layout height.
- Keep the capture refactor CSS-only and preserve all camera, countdown, orientation, overlay, hardware, and 360 behavior.
- Keep secondary frame controls collapsed until the guest requests them.
- Keep QR generation and all share/upload/print/image-processing logic unchanged; this fix is CSS and layout-test only.
- Use orientation and available height for share-screen layout decisions instead of switching to one column based on width alone.
- Asset Library category dropdown is for event/theme categories.
- Asset Library pills are for asset type filtering.
- Search, sorting, favorites, and recents stay admin-only and must not appear in the public booth picker.
- Public picker behavior should remain simple: natural order, preserved scroll, and show-more pagination.
- Staff print queue URLs must use direct static routes, not extensionless redirects or fallbacks.
- Staff auth is optional; do not show token setup during normal local print testing.
- Keep the staff layout choice local to the print screen unless the queue itself needs to own print layout metadata later.
- Treat this spacing pass as visual-only; do not mix it with print queue, theme dropdown, or storage behavior changes.
- Overlay Builder output should remain slot-based: exported PNG foregrounds have transparent photo windows, and manifests carry matching normalized `photoSlots`.
