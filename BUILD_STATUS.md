# Build status

- Current goal: Provide Spring Hill Hawks 2026 paired strips and portrait overlays in both pizza and regular styles.
- Done: Added matching 2026 artwork to both styles, refined pizza to clean cartoon wedges, removed cheese-like drips from the regular overlay, and preserved all transparent photo windows. Added versioned asset paths and migration that replaces the four unbranded picker entries.
- In progress: No code work remains.
- Next steps: Check physical print sharpness when practical.
- Known bugs/blockers: Concurrent read-modify-write requests can still race because Cloudflare KV is not transactional; same-theme edits are last-write-wins. Theme deletion is not represented by the current whole-catalog PUT contract. The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail. Physical print quality has not been checked.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. Preserve the existing pizza asset folder paths; keep these designs exclusively in Hawks Cheer.
- Verification: `npm test` passes (294/294). Focused Hawks Cheer render and legacy-catalog migration browser checks pass (2/2), including transparent-slot alpha, repeated photo order, and removal of replaced entries. Production browser loads `scripts/app.js?v=20261024-hawks-cheer-2026` without page errors; `/api/themes` contains all four new assets and none of the four replaced paths. All four image URLs return HTTP 200.
- Release: Commit `4124048` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on 2026-10-23 as deployment `215ffce8`.
- Live check: Production root returns HTTP 200 and references `scripts/app.js?v=20261023-paypal-picker-sync`; `sw.js` reports `pb-app-shell-v57`. Wrangler identifies source `4124048` as Production on `main`. Local `exports/` files were excluded from the deployment.
- Theme sync release: Commit `8caf82e` pushed to `codex/unify-guest-photo-filter` and deployed as Pages Production on `main`, deployment `1ed6f017`. The preview and canonical URLs both return HTTP 200 and preserve all 10 live theme records. The untracked `exports/` folder was excluded.
- Theme sync: Theme catalog PUTs merge by theme ID and preserve omitted records and metadata. Concurrent KV read-modify-write requests are not atomic, and intentional theme deletion is not supported by this contract.
- Hawks Cheer pizza release: Commit `676fa2f` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on `main` as `35548d0f`. Production root returns HTTP 200, loads `scripts/app.js?v=20261024-hawks-cheer-pizza`, and `sw.js` reports `pb-app-shell-v58`. The live picker displays “Spring Hill Hawks Cheer”; `/api/themes` now has three pizza overlays and two pizza templates under `school.themes.hawksCheer`, with none under `school.themes.hawks`. Untracked `exports/` was excluded.
- Hawks Cheer overlay extension: Commit `1132269` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on `main` as `dcefb81b`. Added paired 2×6 strips and portrait single-photo overlays with and without pizza; production migration now stores five Cheer overlays and four Cheer templates. Live page references `scripts/app.js?v=20261024-hawks-cheer-overlays`; `sw.js` reports `pb-app-shell-v59`.
- Hawks Cheer 2026 set: Commit `e503f39` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production on `main` as `5d540e8b`. Added the pizza and regular paired-strip and portrait art with transparent photo slots. Browser verification confirms the live catalog contains all four new assets and removes all four replaced paths.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
