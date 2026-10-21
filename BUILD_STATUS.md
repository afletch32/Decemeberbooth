# Build status

- Current goal: Make photo-choice artwork hotspots invisible while keeping them usable.
- Done: Replaced visible Photo and Photo Strip controls over custom photo-choice artwork with transparent, positioned touch targets. Added accessible labels and a visible keyboard focus indicator.
- In progress: Commit, push, production deployment, and live verification.
- Next steps: Check on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Custom artwork owns the visible photo-choice labels; invisible buttons provide the positioned touch and keyboard action zones.
- Verification: `npm test` passes (289/289); the focused responsive photo-choice browser check passes (1/1); `git diff --check` passes.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
