# Build status

- Current goal: Keep the theme picker stable while theme data updates.
- Done: Theme cards now keep their DOM nodes and loaded previews when other theme data changes; app-shell cache v16 is deployed to the branch preview.
- In progress: None.
- Next steps: Observe the picker during normal event setup.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (267/267); `git diff --check` is clean. Deployed preview returned HTTP 200 for the page, script, and service worker with the new module URL and cache v16. Rendered browser check switched from Sports back to All while retaining the selected Halloween theme.
- Release: Branch preview `https://agent-booth-asset-and-previe.decemeberbooth.pages.dev` updated at `a8d0f46`. Production alias remains unchanged.
