# Build status

- Current goal: Make the Halloween start control visually match the artwork's printed marquee.
- Done: Removed duplicate button styling and label, retained an accessible transparent touch target, added a pressed overlay, and tightened its bounds to fit the viewport.
- In progress: Commit, push, production deployment, and live verification.
- Next steps: Verify the production welcome screen after deployment; check on the booth iPad at the next setup.
- Known bugs/blockers: Physical iPad verification is outstanding.
- Important decisions: The printed artwork provides the only visible button label; the HTML button remains the accessible interactive target.
- Verification: `npm test` passes (289/289); the focused Playwright check passes (1/1), including pressed state and transition to photo choice; `git diff --check` passes.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
