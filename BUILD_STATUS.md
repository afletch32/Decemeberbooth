# Build status

- Current goal: Add portrait Halloween frames to both built-in Halloween themes and verify their previews.
- Done: Added the ravens-and-pumpkins frame to Halloween and the ghost-and-pumpkin frame to Happy Halloween. Their transparent PNGs include matching WebP thumbnails and full-photo slots. Both frames appear in the built-in theme catalogs and load in the asset library. Added horizontal touch swipes on the live photo preview to cycle photo frames, including the no-frame option, and a visible swipe hint. Focused mobile browser check passes. Current `npm test` is 299/301; two asset-library scoping checks fail alongside unrelated uncommitted asset-library edits. Halloween browser check passes locally and on production; booth release gate passes 18/18. Deployed production commit `ebe2152` to Cloudflare Pages; canonical files match the committed release. Shell cache is v70.
- In progress: Swipe frame selection is implemented and locally verified; release is pending scoped commit and deployment.
- Next steps: Deploy the swipe interaction, then check both the frames and gesture on the event iPad when available.
- Known bugs/blockers: Other existing asset-library preview failures are outside this Halloween asset change. Physical iPad/Safari behavior is not verified.
- Important decisions: Keep each frame in its matching Halloween theme; preserve the existing vanilla app, migration behavior, and photo-storage flow.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
- Gallery typography (2026-10-27): Gallery headings use Montserrat and body text uses Inter regardless of booth theme font settings; theme colors and logos still apply. Focused gallery browser checks pass locally and on production (3/3 each). Full suite is 300/301 with the known unrelated Halloween manifest fixture failure. Commit `8b12b22` is pushed to `main` and active on Pages Production (`a1bed870`).
