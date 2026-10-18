# Build status

- Current goal: Remove the unused Event Type selector while keeping wedding setup available.
- Done: Replaced Event Type with a dedicated “Set Up a Wedding” action; standard events default to general, saved wedding events remain editable, and the wedding flow has a cancel action. The top Print Queue shortcut and repo release instructions remain in place.
- In progress: None.
- Next steps: None for the event setup change; verify wedding creation on the booth device when next used.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the event-specific staff queue in a new tab; the adjacent Queue count continues to report pending uploads. Digital Only means no print controls or price notice in the guest flow; changing the dropdown saves the mode without requiring the separate settings button.
- Verification: `npm test` 288/288 pass. Wedding setup Playwright flow passes. Production responded HTTP 200; live setup has no Event Type selector and the Wedding action opens the name/date form. `git diff --check` clean.
- Release: Commit `cacd94d` pushed to `codex/unify-guest-photo-filter` and deployed to production (deployment `56096070`) at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
