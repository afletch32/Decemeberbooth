# Build status

- Current goal: Keep unrelated event settings out of Wedding Setup.
- Done: Made the date input fill its grid column; included the active wedding theme assets in the Asset Library; derive readable names from string asset paths; hide booth shape and print settings while wedding setup is active.
- In progress: Physical booth-device verification at the next setup.
- Next steps: Check the wedding setup and asset library on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (289/289); focused wedding browser check passes (1/1), confirming the general booth-shape and print controls are hidden both before and after creating the wedding event, while Saved Event remains available; `git diff --check` passes. Production HTML and service worker return HTTP 200 with the new rule and cache marker.
- Release: Commit `6e236ce` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production as `46e75fd7` at https://decemeberbooth.pages.dev/. App shell cache v51.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
