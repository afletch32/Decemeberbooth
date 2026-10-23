# Build status

- Current goal: Add the Hawks pizza photo frames and three-photo strips to Decemberbooth.
- Done: Cropped five source designs and prepared transparent photo windows; added three frames and two strip templates to the Spring Hill Hawks theme, including defaults migration for existing saved themes.
- In progress: Ready to commit the scoped release.
- Next steps: Push, deploy, and verify the production theme.
- Known bugs/blockers: The source collage crops are low resolution; native crop dimensions are retained to avoid inventing image detail.
- Important decisions: Single-photo designs are overlays; the two three-photo designs are strip templates. The artwork stays in its own Hawks pizza asset folder.
- Verification: `npm test` passes (291/291); focused Chromium check passes (1/1), confirming the two three-photo strips and three single-photo frames render photos through their openings. The full browser suite reported 39 passed, 6 failed, and 18 skipped; failures were in PayPal, asset-library persistence/selection, strip-slot rendering, and frame-picker visibility checks.
- Release: Pending.
- Live check: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
