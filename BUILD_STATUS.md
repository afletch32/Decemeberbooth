# Build status

- Current goal: Keep the enlarged live camera preview fully visible without cropping its side edges.
- Done: Removed hidden panel space from live preview; enlarged portrait phone previews to 80–84% of viewport width; changed the live camera surfaces to contain the full camera image; preserved share layout.
- In progress: Physical booth-device verification.
- Next steps: On the booth iPhone/iPad, confirm the full camera view and a complete photo/share/print flow.
- Known bugs/blockers: Physical booth-device camera and printer verification remains outstanding.
- Important decisions: Keep the preview box large, fit the complete live camera feed inside it, and leave room for the capture control and safe area.
- Verification: `npm test` passes (288/288); the Playwright camera-preview check passes at five phone, tablet, and kiosk sizes. Production Chrome check at 390×844 confirms camera and processed preview use `contain`, the frame remains 329×494, and the capture button stays visible; app, CSS, and service worker return HTTP 200.
- Release: Commit `05541de` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `5a26c397` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
