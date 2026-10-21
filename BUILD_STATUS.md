# Build status

- Current goal: Make photo-choice artwork hotspots invisible while keeping them usable.
- Done: Replaced visible Photo and Photo Strip controls over custom photo-choice artwork with transparent, positioned touch targets. Added accessible labels and a visible keyboard focus indicator.
- In progress: Physical booth-device verification at the next setup.
- Next steps: Check on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Custom artwork owns the visible photo-choice labels; invisible buttons provide the positioned touch and keyboard action zones.
- Verification: `npm test` passes (289/289); focused browser checks pass for portrait and landscape photo-choice hotspots and the Halloween marquee button; `git diff --check` passes. Production HTML and service worker return HTTP 200 with the expected styles and cache marker.
- Release: Commit `20f8b57` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production as `5b5e3d9b` at https://decemeberbooth.pages.dev/. The live release includes transparent artwork hotspots, stable theme-card dimensions, and the Halloween marquee fix; shell cache v49.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
