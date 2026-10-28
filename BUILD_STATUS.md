# Build status

- Current goal: Make all Christmas and other holiday assets discoverable in the Asset Library.
- Done: Added holiday subfilters from the full built-in index; the library now collects unapproved built-in holiday assets and fetches the selected category from the remote asset API. Christmas-only tags are recognized as holiday metadata. Locally, Christmas shows its 7 backgrounds and 2 templates; `npm test` passes 301/301.
- In progress: Production release pending.
- Next steps: Deploy and verify the Christmas and Halloween filters on the canonical production URL.
- Known bugs/blockers: Holiday assets are listed only when their built-in theme or remote asset metadata identifies the holiday. Physical iPad/Safari behavior is not verified.
- Important decisions: Keep holiday filtering view-only and preserve theme approval rules; do not remove or replace existing assets.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
- Face tracking performance (2026-10-28): Moved MediaPipe inference into a module worker, capped scheduling at about 3.3 frames/second, downsized analysis frames to 320px, and kept preview processing nonblocking with a fallback when worker support or loading fails. Focused tracker tests pass (2/2); focused browser checks pass (2/2). Full suite currently has one unrelated setup-picker assertion failure; physical camera/iPad performance remains unverified.
- Beauty engine fix (2026-10-28): Corrected the lazy import from the booth renderer to `scripts/beauty/engine.mjs`; included in this release. Full suite now passes 301/301.
- Gallery typography (2026-10-27): Gallery headings use Montserrat and body text uses Inter regardless of booth theme font settings; theme colors and logos still apply. Focused gallery browser checks pass locally and on production (3/3 each). Full suite is 300/301 with the known unrelated Halloween manifest fixture failure. Commit `8b12b22` is pushed to `main` and active on Pages Production (`a1bed870`).
