# Build status

- Current goal: Keep setup theme browsing clear and make holiday assets discoverable by category.
- Done: Removed the duplicate Browse All Themes dropdown; the main picker remains. Avery's Birthday is cataloged under General and the picker classifies it as General. Holiday filters load built-in and remote assets; production Christmas results verified at 13 cards (backgrounds and templates).
- In progress: Deploy the setup picker cleanup.
- Next steps: Verify setup layout and Christmas filter on the canonical production URL.
- Known bugs/blockers: User reports Christmas overlays that are absent from the current 13 returned Christmas filter results; physical iPad/Safari behavior is not verified.
- Important decisions: Keep holiday filtering view-only and preserve existing assets and theme approval rules.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
- Face tracking performance (2026-10-28): Moved MediaPipe inference into a module worker, capped scheduling at about 3.3 frames/second, downsized analysis frames to 320px, and kept preview processing nonblocking with a fallback when worker support or loading fails. Focused tracker tests pass (2/2); focused browser checks pass (2/2). Full suite currently has one unrelated setup-picker assertion failure; physical camera/iPad performance remains unverified.
- Beauty engine fix (2026-10-28): Corrected the lazy import from the booth renderer to `scripts/beauty/engine.mjs`; included in this release. Full suite now passes 301/301.
- Gallery typography (2026-10-27): Gallery headings use Montserrat and body text uses Inter regardless of booth theme font settings; theme colors and logos still apply. Focused gallery browser checks pass locally and on production (3/3 each). Full suite is 300/301 with the known unrelated Halloween manifest fixture failure. Commit `8b12b22` is pushed to `main` and active on Pages Production (`a1bed870`).
