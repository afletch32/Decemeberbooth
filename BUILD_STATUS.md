# Build status

- Current goal: Make the Print Queue shortcut and submissions use the selected event ID.
- Done: Selected saved events now take precedence over an old manual queue ID, and changing the selected event refreshes the queue shortcut.
- In progress: Commit, push, deploy, and verify production.
- Next steps: Verify the live queue shortcut carries the selected event ID.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the selected event's staff queue in a new tab; the optional manual queue ID is used when no saved event is selected. The adjacent Queue count continues to report pending uploads.
- Verification: `npm test` 288/288 pass. Playwright regression confirms the shortcut follows the selected event when an older manual ID is saved. `git diff --check` clean.
- Release: Pending for this change; Cloudflare Pages project `decemeberbooth`, production URL https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
