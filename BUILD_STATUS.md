Current goal
- Simplify staff print controls for the first test print.

What is done
- Confirmed the worktree was clean before starting this checkpoint.
- Verified the current implementation keeps search, sort, favorites, and recents in the admin Asset Library.
- Verified the public booth picker still uses natural asset order, bounded show-more pagination, and no public search/favorite controls.
- Updated stale browser smoke coverage to use the current Asset Library category dropdown and asset-type pills.
- Verified `node --input-type=module --check < scripts/app.js` passes.
- Verified `npm test` passes.
- Verified focused browser coverage with `npm run test:browser -- --grep "Asset Library keeps admin filters|frame picker stays hidden"`.
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

What is in progress
- Nothing active.

Next steps
- Add the Canon SELPHY CP1500 to macOS before the live test print.
- Commit the verified checkpoint when ready.

Known bugs/blockers
- The requested dirty worktree was not present at start; `git status --short` was clean.

Important decisions
- Asset Library category dropdown is for event/theme categories.
- Asset Library pills are for asset type filtering.
- Search, sorting, favorites, and recents stay admin-only and must not appear in the public booth picker.
- Public picker behavior should remain simple: natural order, preserved scroll, and show-more pagination.
- Staff print queue URLs must use direct static routes, not extensionless redirects or fallbacks.
- Staff auth is optional; do not show token setup during normal local print testing.
