# Build status

- Current goal: Make the staff print queue easy to reach from booth setup.
- Done: A prominent “Open Print Queue” button in the setup status row opens the event-scoped staff queue; the upload Queue count stays accurate and the existing settings link and QR remain available. Repo instructions require scoped commit, push, production deploy, and live verification for every code change. Digital Only print mode remains fixed.
- In progress: None.
- Next steps: Confirm Digital Only behavior on the physical booth device when available.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the event-specific staff queue in a new tab; the adjacent Queue count continues to report pending uploads. Digital Only means no print controls or price notice in the guest flow; changing the dropdown saves the mode without requiring the separate settings button.
- Verification: `npm test` 288/288 pass. `git diff --check` clean. Production responded HTTP 200; the rendered setup page showed the earlier Print Queue shortcut linked to `staff-print.html?eventId=default`. Verify the newly prominent button after deployment.
- Release: Commit `d34a758` pushed to `codex/unify-guest-photo-filter` and deployed to production (deployment `d3e7969f`) at https://decemeberbooth.pages.dev/. The live setup page exposes the event-scoped staff queue shortcut.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
