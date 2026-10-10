# Build status

- Current goal: Restore the live camera preview while retaining the selected filter and lightweight preview processing.
- Done: The camera preview frame is transparent so the animated Halloween backdrop remains visible while the camera is unavailable or starting. Added the missing low-resolution source-frame renderer used by the live imaging loop; it crops to the active orientation and camera zoom before processing.
- In progress: None.
- Next steps: Reload the booth page; test the real camera on the HTTPS production URL with camera permission granted.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and a real PayPal capture remain unverified.
- Important decisions: Remove only references to retired Halloween assets. Keep Cloudflare `main` as the production source.
- Verification: `npm test` passes (281/281) in the clean production snapshot. The targeted Chromium live-preview flow passes (1/1). Module syntax, production HTTP responses, renderer/cache version checks, and `git diff --check` pass. Real camera hardware was not exercised here.
- Release: Fix commit `f357c35` is live on Cloudflare Pages production deployment `bc3a7a2b-b651-4e33-9d12-b9b7dbcccb86` (2026-10-10).

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
