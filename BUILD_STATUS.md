# Build status

- Current goal: Make holiday assets easy to browse and remove reliably from the Asset Library.
- Done: Added a holiday subfilter from the full built-in holiday index (including Halloween and Christmas); added current-theme add/remove actions; made removal persist as a hidden tombstone so theme references cannot restore removed catalog entries. Existing Halloween overlays and templates remain listed until individually removed. Added landscape Halloween frames and manifest entries. Local UI shows 7 Halloween assets; `npm test` passes 301/301; transparent frame centers verified.
- In progress: Local implementation is complete; scoped commit, push and production deployment are pending.
- Next steps: Release the scoped catalog and deletion changes, then verify the canonical production UI.
- Known bugs/blockers: Selecting Christmas currently shows no matching assets in this local catalog. Tombstones hide catalog entries but retain source files in Cloudinary or the repository. Physical iPad/Safari behavior is not verified.
- Important decisions: Keep holiday filtering view-only; preserve existing assets until the user explicitly removes them. Keep removal recoverable through persisted hidden state.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
- Beauty engine fix (2026-10-28): Corrected the lazy import from the booth renderer to `scripts/beauty/engine.mjs`; included in this release. Full suite now passes 301/301.
- Gallery typography (2026-10-27): Gallery headings use Montserrat and body text uses Inter regardless of booth theme font settings; theme colors and logos still apply. Focused gallery browser checks pass locally and on production (3/3 each). Full suite is 300/301 with the known unrelated Halloween manifest fixture failure. Commit `8b12b22` is pushed to `main` and active on Pages Production (`a1bed870`).
