# Build status

- Current goal: Fix the wedding setup form and show generated wedding assets in the library.
- Done: Made the date input fill its grid column; included the active wedding theme assets in the Asset Library; derive readable names from string asset paths instead of showing “Untitled asset.”
- In progress: Physical booth-device verification at the next setup.
- Next steps: Check the wedding setup and asset library on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (289/289); the focused wedding browser check passes (1/1), verifying equal field widths, all five wedding library assets, and named backgrounds; `git diff --check` passes.
- Release: Commit `76a3e38` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production as `9e2d5a30` at https://decemeberbooth.pages.dev/. Live page and service worker return HTTP 200 with the wedding input sizing and app-shell cache v50.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
