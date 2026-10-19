# Build status

- Current goal: Make live camera previews and final share screens fit phone and iPad viewports.
- Done: Removed hidden panel space from the live preview layout; resized the preview from available screen space; made short portrait share screens fit the photo, QR code, and actions.
- In progress: Commit, push, and production verification.
- Next steps: Confirm production CSS and app-shell cache update; physical iPad camera/print verification remains.
- Known bugs/blockers: Physical booth-device camera and printer verification remains outstanding.
- Important decisions: Preserve camera aspect ratio; on short phones, compact the share photo and QR card so the full action panel remains usable without clipping.
- Verification: `npm test` passes (288/288); Playwright sizing checks pass (2/2) across short phone, kiosk, and iPad viewports; `git diff --check` passes.
- Release: Changes will be pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
