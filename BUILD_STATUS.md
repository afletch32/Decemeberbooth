# Build status

- Current goal: Make theme welcome and photo-choice buttons visible, readable, and easy to tap.
- Done: Styled the existing controls with theme-aware contrast, labels, focus/pressed feedback, and touch-sized targets; aligned them to the displayed artwork and clamped them within the screen.
- In progress: Commit, push, deploy, and verify the theme button update.
- Next steps: Confirm the deployed controls on the production guest flow; physical iPad booth verification remains useful.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Preserve the theme artwork as the full-screen background while keeping actions as accessible HTML buttons; align zones to `object-fit` rendering.
- Verification: `npm test` passes (288/288); focused Playwright checks pass (2/2) at 390×844 and 844×390, covering the camera preview and themed guest actions.
- Previous release: Commit `05541de` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `5a26c397` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
