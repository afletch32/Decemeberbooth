# Build status

- Current goal: Size the phone live-preview box to dominate the booth screen while keeping capture controls accessible.
- Done: Removed hidden panel space from live preview; enlarged portrait phone previews to 80–84% of viewport width; preserved the share photo, QR code, and actions layout.
- In progress: Physical booth-device verification.
- Next steps: On the booth iPhone/iPad, confirm camera sizing and a complete photo/share/print flow.
- Known bugs/blockers: Physical booth-device camera and printer verification remains outstanding.
- Important decisions: Keep portrait framing, expand preview to nearly full phone width and about 76% of the screen height, and leave room for the capture control and safe area.
- Verification: `npm test` passes (288/288); both Playwright viewport checks pass across 360×640, 390×844, and kiosk/iPad sizes; production preview measures 288×432 at 360×640 and 329×494 at 390×844; production share controls fit at 360×640; app, CSS, and service worker return HTTP 200.
- Release: Commit `873aac6` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `85624330` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
