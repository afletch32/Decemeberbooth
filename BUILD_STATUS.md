# Build status

- Current goal: Release the Halloween theme and asset corrections on the production branch.
- Done: Merged the Halloween theme, preview, sound-trigger, and asset catalog changes with current production. Retired Halloween background references are replaced with current portrait and landscape assets in saved local and remote event overrides; custom backgrounds are preserved.
- In progress: None.
- Next steps: Observe the live booth flow for any remaining theme or event migration issues.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and a real PayPal capture remain unverified.
- Important decisions: Remove only references to retired Halloween assets. Keep Cloudflare `main` as the production source.
- Verification: `npm test` passes (281/281). The targeted Chromium startup test for old Halloween event overrides passes (1/1); `git diff --check` is clean.
- Release: Production merge `3dc3d64` was pushed to `main` and deployed to Cloudflare Pages as `341112f8` on 2026-10-10. `https://decemeberbooth.pages.dev/` serves app shell version `20261010-halloween-background-cleanup` and cache `pb-app-shell-v25`.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
