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
- Remote README/local network notes and local-data health check updates from `origin/main` are included.

What is in progress
- Rebasing local booth setup work on top of `origin/main`.

Next steps
- Continue replaying local commits, then run tests after the rebase completes.

Known bugs/blockers
- Cross-device sync still depends on using the live HTTP/HTTPS deployment rather than `file://`.
- Asset file persistence still depends on shared Cloudinary storage being configured for uploads.
- `npm run deploy` can fail when `CLOUDFLARE_API_TOKEN` is invalid in the shell environment.

Important decisions
- Keep the app in vanilla HTML/CSS/JS.
- Keep booth overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep decorative template art built-in and fixed by family/variant instead of allowing freeform decorative PNG placement.
- Keep layout geometry canonical by layout class so all strip templates share one photo area system.
