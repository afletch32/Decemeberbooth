# Build status

- Current goal: Keep the guest camera preview responsive while the beauty face tracker loads or is unavailable.
- Done: CDN tracker import now loads only during background initialization. Preview and capture apply the selected preset immediately without waiting for face tracking; initialization is shared, bounded by a 10-second timeout, and retries after a 30-second cooldown.
- In progress: None.
- Next steps: Verify the improvement with a guest camera on the booth device.
- Known bugs/blockers: Real guest-device camera, face tracking, print, and share remain unverified.
- Important decisions: No beauty mode or filter is silently changed while the tracker is loading. Preset corrections use the existing full-frame fallback mask until face landmarks are available.
- Verification: `npm test` 288/288 pass. Playwright guest filter parity passes across all six presets. A browser test held the MediaPipe CDN request open and confirmed beauty processing returned in under one second. `git diff --check` clean.
- Release: Feature commit `7a06eee` pushed to `codex/unify-guest-photo-filter` and deployed to the production branch as `602e171f` at https://decemeberbooth.pages.dev/. Live browser parity passed for all six presets, and a live browser test with the MediaPipe CDN stalled confirmed processing returned in under one second. Production HTML, service worker, beauty engine, and tracker hashes match the deployed commit.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
