# Build status

- Current goal: Sync verified PayPal, wedding-print, asset-picker, and frame-picker fixes.
- Done: Cropped five source designs and prepared transparent photo windows; added three frames and two strip templates to the Spring Hill Hawks theme, including defaults migration for existing saved themes. Released to production.
- In progress: Prepare a clean, scoped production release.
- Next steps: Verify deployment marker, app bundle, and relevant production routes.
- Known bugs/blockers: The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail. Physical print quality has not been checked.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. The artwork stays in its own Hawks pizza asset folder.
- Verification: `npm test` passes (291/291). PayPal browser checks pass (4/4); focused wedding, print-persistence, asset defaults/grouping, strip slots, picker, and layout-builder checks pass. Full serial browser run: 45 passed, 18 skipped, 2 failed; asset-default persistence now has remote sync isolated and passes individually, while the layout-builder popup timed out in-suite but passed in isolation. Full suite has not been rerun after those test-fixture updates.
- Release: Commit `ce5fa27` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on 2026-10-22 as deployment `20636999`.
- Live check: Production root references `20261022-hawks-pizza-templates`; app script and all five PNG assets return HTTP 200. The Wrangler deployment record identifies `ce5fa27` as Production on `main`. Follow-up fixes are not yet deployed.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
