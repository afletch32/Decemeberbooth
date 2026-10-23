# Build status

- Current goal: Keep PayPal, wedding-print, and booth-picker releases aligned.
- Done: Cropped five source designs and prepared transparent photo windows; added three frames and two strip templates to the Spring Hill Hawks theme, including defaults migration for existing saved themes. Released to production.
- In progress: None.
- Next steps: Rerun the full browser suite after the fixture corrections; check physical print sharpness when practical.
- Known bugs/blockers: The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail. Physical print quality has not been checked.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. The artwork stays in its own Hawks pizza asset folder.
- Verification: `npm test` passes (291/291); focused PayPal, wedding-print, print-persistence, asset-defaults, strip-slot, frame-picker, and layout-builder browser checks pass (12/12). The last full serial browser run before final fixture isolation had 45 passed, 18 skipped, and 2 failures; focused reruns passed both affected cases. The full suite has not been rerun after those fixture changes.
- Release: Commit `4124048` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on 2026-10-23 as deployment `215ffce8`.
- Live check: Production root returns HTTP 200 and references `scripts/app.js?v=20261023-paypal-picker-sync`; `sw.js` reports `pb-app-shell-v57`. Wrangler identifies source `4124048` as Production on `main`. Local `exports/` files were excluded from the deployment.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
