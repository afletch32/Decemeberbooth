# Build status

- Current goal: Refine Minimal Wedding to match the user's monochrome photo-keepsake reference.
- Done: Replaced the warm floral screens with clean paper, black-and-white typography, and sparse botanical details; added dedicated transparent portrait/landscape frames and a three-photo strip with aligned photo openings.
- In progress: Physical check of the revised wedding artwork on the booth iPad.
- Next steps: Check the wedding setup and printed keepsakes on the booth iPad at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (290/290); focused Chromium wedding check passes (1/1), including loading the new screens, overlays, and strip; overlay photo openings and strip slots were checked against their transparent pixels; `git diff --check` passes.
- Release: Commit `0e01424` pushed to `codex/unify-guest-photo-filter`; deployed to Pages Production on 2026-10-21 as `f8efcc81` at https://decemeberbooth.pages.dev/.
- Live check: Wedding setup shows the keepsake description, and the idle screen, both overlays, and strip return HTTP 200.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
