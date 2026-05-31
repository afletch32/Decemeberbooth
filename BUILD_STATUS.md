Current goal
- Simplify the overlay maker into a template-catalog flow with canonical layout geometry and a single uploaded logo slot.

What is done
- Reusable overlay/template autofill is implemented and covered by Node plus browser tests.
- Wedding theme selection excludes holiday themes in the shared selector.
- The selected-theme asset panel renders base theme assets instead of event-only overlays/templates.
- Reworked `overlay-maker.html` around built-in template families and variants instead of freeform decorative graphic placement.
- Standardized canonical layout classes for `single vertical`, `single horizontal`, and `photo strip`.
- Kept logo upload support, narrowed to one fixed logo slot per layout class.
- Added built-in rendering treatments for Minimal, Minimal Dark, Signature/Polaroid, Feathers, and Seasonal/Event variants.
- Updated overlay-maker unit coverage and browser smoke coverage to match the new catalog flow and canonical strip behavior.
- Tightened the final review/share layout so the QR panel has less fixed height and smaller QR/button sizing on narrow screens.
- Remote README/local network notes and local-data health check updates from `origin/main` are included.
- Live deploy verification is complete for the current template-catalog build, including the QR share screen sizing fix.
- Locked admin scrolling to the admin viewport so page-level scrolling stays contained.
- `npm test` passes.
- `npx playwright test browser/smoke.spec.js` passes.

What is in progress
- Rebasing local booth setup work on top of `origin/main`.

Next steps
- Continue replaying local commits, then run tests after the rebase completes.

Known bugs/blockers
- Cross-device sync still depends on using the live HTTP/HTTPS deployment rather than `file://`.
- Asset file persistence still depends on shared Cloudinary storage being configured for uploads.
- `npm run deploy` can fail when `CLOUDFLARE_API_TOKEN` is invalid in the shell environment.
- The live deployment is on a preview Pages URL and should be promoted only after final checks if needed.
- The current QR sizing fix has been deployed to preview Pages and still needs a visual sanity check on the actual review/share flow if desired.
- Admin scrolling is now contained inside `#adminScreen`; page/body scrolling stays locked while admin is open.

Important decisions
- Keep the app in vanilla HTML/CSS/JS.
- Keep booth overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep decorative template art built-in and fixed by family/variant instead of allowing freeform decorative PNG placement.
- Keep layout geometry canonical by layout class so all strip templates share one photo area system, and the same rule applies to single vertical and single horizontal templates.
- Cloudflare Pages deploy path is `npm run deploy` / `node tools/deploy.js`, which calls `wrangler pages deploy . --project-name decemeberbooth`.
- The current verified Pages URL is `https://139f6fbe.decemeberbooth.pages.dev`.
