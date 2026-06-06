Current goal
- Simplify booth setup into a theme session flow that does not require creating an event.

What is done
- Replaced the default create-event setup with `Theme Session` copy and a theme-first start path.
- Replaced the theme type dropdown with touch-friendly filter cards for All Themes, Wedding, Expo, Party, and Community.
- Kept the hidden backing filter/select behavior so existing theme filtering logic remains stable.
- Removed required event name/date/detail validation from the normal booth launch path.
- Added runtime session-only asset state for backgrounds, green-screen backgrounds, overlays, templates, logo, and character.
- Merged session assets ahead of base theme assets without saving them to stored events or themes.
- Changed no-event booth launches to clear `activeEventId`, keep the selected theme active, and set the session date to today.
- Changed no-event photo upload folders, gallery tags, and gallery titles to use the local `YYYY-MM-DD` date.
- Preserved the captured date slug on pending offline uploads.
- Removed the stale `assets/general/basic/overlays/sparkles.png` overlay reference; `sparkles.png` is a background asset.
- Updated setup, Cloudinary utility, and asset upload tests for the new flow.
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
- Changed live-photo QR to publish the poster image immediately, matching the still-photo QR path, while video upload can continue in the background.
- Added real share-screen state to hide the `Choose Frame` button and settings sheet during final QR preview.
- Fixed overlay classification so missing layout metadata no longer turns normal photo overlays into strip assets.
- Added slot-aware built-in metadata for wedding overlays and strip templates so the first guest render has usable photo windows before async manifests finish loading.
- Qualified overlay foreground paths from manifests so SVG overlay art loads from the correct folder.
- Locked admin scrolling to the admin viewport so page-level scrolling stays contained.
- `npm test` passes.
- Local Playwright live-photo flow check passes with fake camera.
- Local Playwright visual check passes at a 1512x790 viewport with fake camera input.
- Live Pages verification confirms the removed controls are gone, the QR remains fully visible, and tapping the result overlay exits the share view.

What is in progress
- No active theme-session implementation work.

Next steps
- Test one real device capture with Cloudinary configured to confirm the date-based folder is created remotely.
- Test Live Photo frame selection plus Photostrip template selection on the preview URL.

Known bugs/blockers
- Cross-device sync still depends on using the live HTTP/HTTPS deployment rather than `file://`.
- Asset file persistence still depends on shared Cloudinary storage being configured for uploads.
- Full photo upload verification requires Cloudinary credentials and a real capture/upload run.
- The live deployment is on a preview Pages URL and should be promoted only after final checks if needed.
- Admin scrolling is now contained inside `#adminScreen`; page/body scrolling stays locked while admin is open.
- Latest preview includes explicit wedding strip slots and distinct-photo strip composition.
- Live-photo video preview now prioritizes the recorded clip; the poster image is still used as the fallback/thumbnail.
- Live-photo QR now prioritizes reliability: guests get a poster-image QR immediately instead of waiting on video upload.
- Wedding demo currently ships one single-photo overlay and one photostrip template per wedding theme.

Important decisions
- Keep the app in vanilla HTML/CSS/JS.
- Keep booth overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep decorative template art built-in and fixed by family/variant instead of allowing freeform decorative PNG placement.
- Keep layout geometry canonical by layout class so all strip templates share one photo area system, and the same rule applies to single vertical and single horizontal templates.
- Cloudflare Pages deploy path is `npm run deploy` / `node tools/deploy.js`, which calls `wrangler pages deploy . --project-name decemeberbooth`.
- Keep the QR/share fix inside the existing result screen; no new route or redirect is needed.
- Normal booth launch no longer requires an event record; saved events are reusable profiles only.
- No legacy event-first behavior needs to be preserved because this booth has only been used for tests.
- No-event sessions save photos under the booth browser's local date using `YYYY-MM-DD`.
- Session-only uploads affect the current booth run only and are not persisted to saved themes or event records.
- The current verified Pages URL is `https://a1a18a6a.decemeberbooth.pages.dev`.
