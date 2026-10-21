# Build status

- Current goal: Keep unrelated event settings out of Wedding Setup.
- Done: Made the date input fill its grid column; included the active wedding theme assets in the Asset Library; derive readable names from string asset paths; hide booth shape and print settings while wedding setup is active.
- In progress: Commit, push, production deployment, and live verification.
- Next steps: Check the wedding setup and asset library on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: Pending focused setup browser check and full unit suite.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
