# Build status

- Current goal: Remember the operator's Allow Retakes setting and apply it to the guest final screen.
- Done: The retake preference now loads and saves locally and the final screen hides Retake when disabled. Added browser coverage for reload persistence and final-screen visibility.
- In progress: None.
- Next steps: Check the remembered setting on the physical booth device.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: Retakes default to enabled for existing installations with no saved preference. The operator's setting applies across browser reloads on the same booth device.
- Verification: `npm test` 288/288 pass. Focused Playwright retake flow passes across reload and guest final screen. `git diff --check` clean.
- Release: Pending deployment verification.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
