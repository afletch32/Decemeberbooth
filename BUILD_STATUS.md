# Build status

- Current goal: Keep Wedding Setup scoped to its Eucalyptus Wedding theme.
- Done: Made the date input fill its grid column; included the active wedding theme assets in the Asset Library; derive readable names from string asset paths; hide booth shape and print settings while wedding setup is active; show Eucalyptus Wedding as the selected theme and guard against switching a wedding to another theme.
- In progress: Physical booth-device verification at the next setup.
- Next steps: Check the wedding setup and asset library on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (289/289); focused wedding browser check passes (1/1), confirming Eucalyptus Wedding is visible, general theme browsing stays hidden, and booth shape/print controls remain hidden; `git diff --check` passes.
- Release: Commit `95090bf` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production on 2026-10-21. Canonical production HTML shows the Eucalyptus choice and updated app module version; service worker returns cache v52. Deployment list lookup failed due to Cloudflare API connectivity, but canonical endpoint verification succeeded.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
