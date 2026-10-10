# Build status

- Current goal: Restore the live camera preview while retaining the selected filter and lightweight preview processing.
- Done: The camera preview frame is transparent so the animated Halloween backdrop remains visible while the camera is unavailable or starting. Added the missing low-resolution source-frame renderer used by the live imaging loop; it crops to the active orientation and camera zoom before processing.
- In progress: None.
- Next steps: Deploy and confirm the live preview renderer is served from production.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and a real PayPal capture remain unverified.
- Important decisions: Remove only references to retired Halloween assets. Keep Cloudflare `main` as the production source.
- Verification: Static diff review confirms the previously missing live preview renderer now supplies the live imaging loop. `git diff --check` is clean.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
