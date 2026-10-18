# Build status

- Current goal: Keep print pricing hidden when the booth is set to Digital Only.
- Done: Print mode changes now persist immediately. In-flight paid-price lookups are ignored after changing away from Paid Printing.
- In progress: None.
- Next steps: Confirm the setting on the physical booth device after selecting Digital Only once.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: Digital Only means no print controls or price notice in the guest flow; changing the dropdown saves the mode without requiring the separate settings button.
- Verification: `npm test` 288/288 pass. Playwright covers changing from Paid Printing to Digital Only, persistence after reload, and hidden print controls and price notice on the guest screen. `git diff --check` clean.
- Release: Commit `d15078a` pushed to `codex/unify-guest-photo-filter` and deployed to production as `5041c431` at https://decemeberbooth.pages.dev/. The live Playwright flow verified that Digital Only saves across reload and suppresses the guest print controls and price notice.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
