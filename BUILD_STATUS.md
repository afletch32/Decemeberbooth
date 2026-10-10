# Build status

- Current goal: Keep the Halloween booth backdrop visible when the camera preview has no frames.
- Done: The camera preview frame is transparent so the animated Halloween backdrop remains visible while the camera is unavailable or starting. Existing live camera pixels stay above the backdrop. Retired Halloween references are migrated to the current portrait and landscape pair; custom backgrounds are preserved.
- In progress: None.
- Next steps: Observe the live booth flow for any remaining theme or event migration issues.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and a real PayPal capture remain unverified.
- Important decisions: Remove only references to retired Halloween assets. Keep Cloudflare `main` as the production source.
- Verification: `npm test` passes (281/281). The targeted Chromium backdrop and live-camera tests pass (2/2); `git diff --check` is clean.
- Release: Pending production verification for the camera-preview backdrop fix. The prior Halloween cleanup is live on `main` as of 2026-10-10.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
