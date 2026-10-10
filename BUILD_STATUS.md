# Build status

- Current goal: Release the Halloween theme and asset corrections on the production branch.
- Done: Merged the Halloween theme, preview, sound-trigger, and asset catalog changes with current production. Retired Halloween background references are replaced with current portrait and landscape assets in saved local and remote event overrides; custom backgrounds are preserved.
- In progress: Push the verified production merge and deploy it to Cloudflare Pages.
- Next steps: Confirm the production deployment and live app shell.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and a real PayPal capture remain unverified.
- Important decisions: Remove only references to retired Halloween assets. Keep Cloudflare `main` as the production source.
- Verification: `npm test` passes (281/281). The targeted Chromium startup test for old Halloween event overrides passes (1/1); `git diff --check` is clean.
- Release: Pending production push and deployment.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
