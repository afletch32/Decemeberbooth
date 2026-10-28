# Build status

- Current goal: Add the new portrait Halloween frames to both built-in Halloween themes and verify their previews.
- Done: Added the ravens-and-pumpkins frame to Halloween and the ghost-and-pumpkin frame to Happy Halloween. Both transparent PNGs have matching WebP thumbnails and shared full-photo slot geometry. The migration and manifest checks include the new frames; the browser check loads each preview from the asset library. Shell cache is v70.
- In progress: Commit, push, deploy, and verify the live Halloween frames.
- Next steps: Check the live theme asset cards after deployment; keep physical iPad/Safari behavior as a device follow-up.
- Known bugs/blockers: General asset-library preview failures outside the two new Halloween frames are not covered by this focused fix. Device-specific iPad/Safari behavior is not verified.
- Important decisions: Keep both frames in their matching theme catalogs; preserve the existing vanilla app, theme migration behavior, and photo-storage flow.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
- Gallery typography (2026-10-27): Gallery headings use Montserrat and body text uses Inter regardless of booth theme font settings; theme colors and logos still apply. Focused gallery browser checks pass locally and on production (3/3 each). Full suite is 300/301 with the known unrelated Halloween manifest fixture failure. Commit `8b12b22` is pushed to `main` and active on Pages Production (`a1bed870`).
