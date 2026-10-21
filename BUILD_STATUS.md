# Build status

- Current goal: Add a complete Minimal Wedding style alongside Eucalyptus in Wedding Setup.
- Done: Built eight portrait/landscape Minimal Wedding screens; added a saved wedding style choice and retained wedding-only theme selection.
- In progress: Commit, push, and deploy the Minimal Wedding theme.
- Next steps: Check the wedding setup and asset library on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (290/290); focused Chromium wedding checks pass (2/2), confirming both wedding-only choices, saved Minimal style, correct screen dimensions, and successful asset loading; `git diff --check` passes.
- Release: Previous wedding setup release commit `95090bf` is deployed. Minimal Wedding release pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
