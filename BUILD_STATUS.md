# Build status

- Current goal: Make live camera previews and final share screens fit phone and iPad viewports.
- Done: Removed hidden panel space from the live preview layout; resized the preview from available screen space; made short portrait share screens fit the photo, QR code, and actions; verified the production release.
- In progress: Physical booth-device verification.
- Next steps: On the booth iPad, confirm camera preview sizing and a complete photo/share/print flow.
- Known bugs/blockers: Physical booth-device camera and printer verification remains outstanding.
- Important decisions: Preserve camera aspect ratio; on short phones, compact the share photo and QR card so the full action panel remains usable without clipping.
- Verification: `npm test` passes (288/288); Playwright sizing checks pass (2/2) across short phone, kiosk, and iPad viewports; production phone and iPad share screens render and fit; production HTML, CSS, and service worker return HTTP 200.
- Release: Commit `b6788b5` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `a1aae23f` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
