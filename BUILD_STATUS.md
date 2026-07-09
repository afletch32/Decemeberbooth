Current goal
- Ensure Overlay Builder exports overlays/templates whose photo windows match runtime photo placement.

What is done
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
- Nothing active.

Next steps
- Review the spacing pass in the browser on the target iPad before the next live event.
- Test a newly generated overlay/template in the booth flow with a real captured photo.
- Test the SELPHY’s two-photo layout against a real print.

Known bugs/blockers
- The requested dirty worktree was not present at start; `git status --short` was clean.

Important decisions
- Asset Library category dropdown is for event/theme categories.
- Asset Library pills are for asset type filtering.
- Search, sorting, favorites, and recents stay admin-only and must not appear in the public booth picker.
- Public picker behavior should remain simple: natural order, preserved scroll, and show-more pagination.
- Staff print queue URLs must use direct static routes, not extensionless redirects or fallbacks.
- Staff auth is optional; do not show token setup during normal local print testing.
- Keep the staff layout choice local to the print screen unless the queue itself needs to own print layout metadata later.
- Treat this spacing pass as visual-only; do not mix it with print queue, theme dropdown, or storage behavior changes.
- Overlay Builder output should remain slot-based: exported PNG foregrounds have transparent photo windows, and manifests carry matching normalized `photoSlots`.
