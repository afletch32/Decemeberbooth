# Build status

- Current goal: Use one guest filter consistently in preview, captured photos, and strip/single outputs.
- Done: Removed the separate enhancement selector, Bridal Glow defaults, legacy local setting reads, and output-only enhancement pass. Preview now runs the selected preset's beauty adjustments too. Finalizers process raw inputs once and preserve already-filtered captures. Added pipeline regression tests and a browser pixel-parity test; updated cache identifiers.
- In progress: None for the guest-filter correction.
- Next steps: Refresh the booth page to load the single-preset rendering path.
- Known bugs/blockers: A real guest-device face/camera/print/share run remains unverified. Browser tests use synthetic pixels and stub external face/CDN dependencies; Cloudinary delivery transformations are outside this check.
- Important decisions: The shared admin-selected guest preset is the only local photo-look control. Existing preset definitions and custom preset overrides remain available. Already-processed photos retain their look during output composition.
- Verification: `npm test` 288/288 pass. Playwright guest-filter parity test passes for all six presets: zero pixel differences between preview and capture, and no additional filtering in strip/single export. Legacy Bridal Glow storage has no effect. No page errors; `git diff --check` clean.
- Release: Feature commit `16113b7` pushed to `codex/unify-guest-photo-filter` and deployed to production as `1af13df6` at https://decemeberbooth.pages.dev/. Production HTML, app module, and service worker match the committed files. Live browser parity passed for all six presets with the legacy Bridal Glow setting present, with zero pixel differences and no page errors. Shared production settings were not modified during the test.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
