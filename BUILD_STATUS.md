Current goal
- Restore setup-screen click handlers on the deployed photobooth app.

What is done
- Fixed the malformed Asset Library block in [`scripts/app.js`](scripts/app.js:14664) so `renderAssetLibrary()` closes before later app functions.
- Restored [`toggleLibraryAsset()`](scripts/app.js:14860) at top level.
- Restored the final [`Object.assign(window, { ... })`](scripts/app.js:20335) export block to top level so inline setup buttons can call their handlers.
- Added [`app-syntax.test.js`](app-syntax.test.js:1) to parse `scripts/app.js` as a browser ES module during `npm test`.
- Verified locally that setup tabs respond and Overlay Builder opens its direct URL.
- Deployed and verified `https://decemeberbooth.pages.dev` with setup tabs and Overlay Builder responding without console errors.

What is in progress
- None.

Next steps
- None.

Known bugs/blockers
- Queueing requires a public final image URL, so offline/local-only final images are not shared until the existing upload path has produced one.
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Keep setup buttons exported through the existing `window` assignment because `index.html` uses inline handlers.
- Keep the new parser test in `npm test` so a future unterminated app module fails before deployment.
