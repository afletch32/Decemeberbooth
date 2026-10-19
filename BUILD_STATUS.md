# Build status

- Current goal: Make the Print Queue shortcut and submissions use the selected event ID.
- Done: Selected saved events now take precedence over an old manual queue ID, every active-event change refreshes the queue shortcut, and the app-shell cache versions are bumped for returning booths.
- In progress: None.
- Next steps: Verify queue use on the physical booth when it is next in service.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the selected event's staff queue in a new tab; the optional manual queue ID is used when no saved event is selected. The adjacent Queue count continues to report pending uploads.
- Verification: `npm test` 288/288 pass. Playwright regression confirms the shortcut follows the selected event when an older manual ID is saved. Production serves the new app script and service worker cache version; canonical page responds HTTP 200. `git diff --check` clean.
- Release: Queue fix and cache bust pushed to `codex/unify-guest-photo-filter` and deployed to production at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
