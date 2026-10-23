# Build status

- Current goal: Prevent stale theme saves from replacing unrelated shared themes.
- Done: Cropped five source designs and prepared transparent photo windows; added three frames and two strip templates to the Spring Hill Hawks theme, including defaults migration for existing saved themes. Released to production.
- In progress: Deploy the verified theme catalog merge to Pages Production.
- Next steps: Confirm the deployed API still serves the live catalog; consider transactional storage only if conflict-proof concurrent edits are required.
- Known bugs/blockers: Concurrent read-modify-write requests can still race because Cloudflare KV is not transactional; same-theme edits are last-write-wins. Theme deletion is not represented by the current whole-catalog PUT contract. The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail. Physical print quality has not been checked.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. The artwork stays in its own Hawks pizza asset folder.
- Verification: `npm test` passes (294/294), including theme merge regressions; isolated local API integration confirms omitted themes and metadata survive a stale catalog save. `node --check server.js` and `git diff --check` pass. Focused PayPal, wedding-print, print-persistence, asset-defaults, strip-slot, frame-picker, and layout-builder browser checks pass (12/12). The full browser suite has not been rerun after the earlier fixture corrections; its last serial run had 45 passed, 18 skipped, and 2 failures before those corrections.
- Release: Commit `4124048` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on 2026-10-23 as deployment `215ffce8`.
- Live check: Production root returns HTTP 200 and references `scripts/app.js?v=20261023-paypal-picker-sync`; `sw.js` reports `pb-app-shell-v57`. Wrangler identifies source `4124048` as Production on `main`. Local `exports/` files were excluded from the deployment.
- Theme sync: The live API currently stores nine theme records. Theme catalog PUTs now merge by theme ID and preserve omitted records and metadata. Concurrent KV writes are not atomic, and intentional theme deletion is not supported by this contract.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
