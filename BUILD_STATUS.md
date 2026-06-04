Current goal
- Fix QR reliability after live-photo capture.

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
- Removed the guest-facing `Done`, `Retake`, and disabled email placeholder controls from the QR/share panel.
- Changed the result overlay so clicking/tapping anywhere on the result screen continues out of the share view.
- Kept the QR panel layout sizing fix so the QR canvas stays fully visible.
- Simplified the live booth screen into a focused kiosk layout.
- Fixed still-photo capture so it uses the white flash path and cannot trigger live-photo recording feedback.
- Routed photostrip/layout primary action to the strip sequence instead of the single-photo flow.
- Added built-in template folder fallback so photostrip templates are available immediately.
- Added explicit photo-slot geometry for built-in wedding strip templates.
- Fixed strip composition to use manifest slots directly and draw framed SVG templates before placing photos.
- Cloned enhanced strip photos before composition so each captured shot stays distinct.
- Fixed live-photo mode so choosing `Single Live Photo` always records the motion clip.
- Fixed live-photo final preview so an available recorded clip renders as video, including demo/background flows.
- Passed a video share payload into the QR/share flow for live-photo captures.
- Added a live-photo QR fallback: try the video share first, then fall back to the poster image if video publishing does not return quickly.
- Locked admin scrolling to the admin viewport so page-level scrolling stays contained.
- `npm test` passes.
- Local Playwright live-photo flow check passes with fake camera.
- Local Playwright visual check passes at a 1512x790 viewport with fake camera input.
- Live Pages verification confirms the removed controls are gone, the QR remains fully visible, and tapping the result overlay exits the share view.

What is in progress
- Rebasing local booth setup work on top of `origin/main`.

Next steps
- Continue replaying local commits, then run tests after the rebase completes.

Known bugs/blockers
- Cross-device sync still depends on using the live HTTP/HTTPS deployment rather than `file://`.
- Asset file persistence still depends on shared Cloudinary storage being configured for uploads.
- `npm run deploy` can fail when `CLOUDFLARE_API_TOKEN` is invalid in the shell environment.
- The live deployment is on a preview Pages URL and should be promoted only after final checks if needed.
- The current QR-only share screen is deployed and layout-checked on preview Pages.
- Browser smoke currently has unrelated failures around setup/theme expectations in this dirty workspace.
- Admin scrolling is now contained inside `#adminScreen`; page/body scrolling stays locked while admin is open.
- Latest preview includes explicit wedding strip slots and distinct-photo strip composition.
- Live-photo video preview now prioritizes the recorded clip; the poster image is still used as the fallback/thumbnail.
- Live-photo QR prioritizes a video URL, but can publish the poster image so the QR does not disappear if video upload is slow or unavailable.

Important decisions
- Keep the app in vanilla HTML/CSS/JS.
- Keep booth overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep decorative template art built-in and fixed by family/variant instead of allowing freeform decorative PNG placement.
- Keep layout geometry canonical by layout class so all strip templates share one photo area system, and the same rule applies to single vertical and single horizontal templates.
- Cloudflare Pages deploy path is `npm run deploy` / `node tools/deploy.js`, which calls `wrangler pages deploy . --project-name decemeberbooth`.
- Keep the QR/share fix inside the existing result screen; no new route or redirect is needed.
- The current verified Pages URL is `https://82f8446b.decemeberbooth.pages.dev`.
