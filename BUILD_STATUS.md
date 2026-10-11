# Build status

- Current goal: Ship the intended theme cleanup and themed capture/share improvements on top of the current production camera-preview fixes.
- Done: Capture previews reject late live redraws after freezing. Share views use orientation-matched Share art, Thank You art, or a still theme background; share chrome and QR panels follow the theme palette. Live booth header is hidden when frame artwork supplies branding, and guest controls use theme accents. Retired theme packs and legacy Halloween selections were removed from catalogs and asset manifests. The current production live-camera source-frame renderer is preserved.
- In progress: None.
- Next steps: Verify with a real guest device that camera capture holds the still frame and that theme artwork and controls match through sharing.
- Known bugs/blockers: Real guest camera/audio, physical printing, sharing delivery, and PayPal capture remain unverified. Eucalyptus artwork files are not present locally although wedding theme metadata references those asset paths.
- Important decisions: Keep Cloudflare `main` as the production source. Remove only retired theme assets; retain custom uploads and theme-specific orientation variants.
- Verification: `npm test` passes (283/283); Chromium live-preview capture and final-share viewport tests pass (2/2); the share viewport test covers eight kiosk sizes; `git diff --check` passes. Production root and app-shell cache were fetched successfully after deployment.
- Release: PR #21 merged as `382166b`; Cloudflare Pages production deployment `8c04231a-de1a-45bd-8d08-08528d567070` is active at `https://decemeberbooth.pages.dev/`.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
