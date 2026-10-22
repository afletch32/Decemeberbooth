# Build status

- Current goal: Match Minimal Wedding print layout to the user's two-strip reference.
- Done: Minimal Wedding now uses two matching vertical three-photo strips side by side on one print, with duplicate names and date on both strips.
- In progress: Commit, push, and deploy the verified two-strip print layout.
- Next steps: Check the printed keepsake on the booth printer at the next setup.
- Known bugs/blockers: Physical booth-device verification is outstanding.
- Important decisions: Keep the Asset Library scoped to the selected theme while including generated wedding themes as asset sources.
- Verification: `npm test` passes (290/290); focused Chromium wedding render check passes (1/1), confirming three captured images repeat in the same positions across both strips; `git diff --check` passes.
- Release: Commit `0e01424` / Pages deployment `f8efcc81` had the single-strip print layout. Two-strip correction is pending sync.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
