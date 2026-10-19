# Build status

- Current goal: Make the empty Session Print Defaults preview follow the selected paper orientation.
- Done: The Print Queue shortcut and submissions use the selected saved event ID; the empty session preview now reflects selected paper direction and layout.
- In progress: Commit, push, deploy, and verify the production update.
- Next steps: Confirm the live staff queue serves the updated preview.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the selected event's staff queue in a new tab; the optional manual queue ID is used when no saved event is selected. The adjacent Queue count continues to report pending uploads.
- Verification: `npm test` 288/288 pass. Staff queue browser regression confirms the empty preview changes from portrait to landscape; `git diff --check` clean.
- Release: Previous queue fix and cache bust are pushed to `codex/unify-guest-photo-filter` and deployed to production at https://decemeberbooth.pages.dev/. This preview fix is pending release.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
