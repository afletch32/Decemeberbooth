# Build status

- Current goal: Keep the cheerleaders' pizza artwork in the clearly named Spring Hill Hawks Cheer theme.
- Done: Moved the five pizza designs from football Hawks to Hawks Cheer, pinned the picker label as “Spring Hill Hawks Cheer,” and added a migration for previously saved catalogs.
- In progress: None.
- Next steps: Check physical print sharpness when practical.
- Known bugs/blockers: Concurrent read-modify-write requests can still race because Cloudflare KV is not transactional; same-theme edits are last-write-wins. Theme deletion is not represented by the current whole-catalog PUT contract. The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail. Physical print quality has not been checked.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. Preserve the existing pizza asset folder paths; keep these designs exclusively in Hawks Cheer.
- Verification: `npm test` passes (294/294). Focused Hawks Cheer render and legacy-catalog migration browser checks pass (2/2); migration removes pizza entries from football Hawks and places three overlays plus two templates in Hawks Cheer. `git diff --check` passes. The full browser suite has not been rerun after earlier fixture corrections; its last serial run had 45 passed, 18 skipped, and 2 failures before those corrections.
- Release: Commit `4124048` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on 2026-10-23 as deployment `215ffce8`.
- Live check: Production root returns HTTP 200 and references `scripts/app.js?v=20261023-paypal-picker-sync`; `sw.js` reports `pb-app-shell-v57`. Wrangler identifies source `4124048` as Production on `main`. Local `exports/` files were excluded from the deployment.
- Theme sync release: Commit `8caf82e` pushed to `codex/unify-guest-photo-filter` and deployed as Pages Production on `main`, deployment `1ed6f017`. The preview and canonical URLs both return HTTP 200 and preserve all 10 live theme records. The untracked `exports/` folder was excluded.
- Theme sync: Theme catalog PUTs merge by theme ID and preserve omitted records and metadata. Concurrent KV read-modify-write requests are not atomic, and intentional theme deletion is not supported by this contract.
- Hawks Cheer pizza release: Commit `676fa2f` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on `main` as `35548d0f`. Production root returns HTTP 200, loads `scripts/app.js?v=20261024-hawks-cheer-pizza`, and `sw.js` reports `pb-app-shell-v58`. The live picker displays “Spring Hill Hawks Cheer”; `/api/themes` now has three pizza overlays and two pizza templates under `school.themes.hawksCheer`, with none under `school.themes.hawks`. Untracked `exports/` was excluded.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
