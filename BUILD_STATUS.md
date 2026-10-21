# Build status

- Current goal: Sync the theme-card stability fix.
- Done: Kept theme cards at a constant border width during selection; verified the Halloween marquee touch-target fix is deployed.
- In progress: Physical booth-device verification at the next setup.
- Next steps: Check on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Theme selection changes only the border color, preventing a visible size jump.
- Verification: `npm test` passes (289/289); the focused setup browser check passes (1/1); `git diff --check` passes.
- Release: Commit `c67cb66` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production as `d27e0186` at https://decemeberbooth.pages.dev/. Live HTML and service worker return HTTP 200 and include the stable card border, Halloween hotspot, app module version, and shell cache v48.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
