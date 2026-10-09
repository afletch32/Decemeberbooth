# Build status

- Current goal: Keep the theme picker stable while theme data updates.
- Done: Theme cards now keep their DOM nodes and loaded previews when other theme data changes; the app-shell cache version is v16.
- In progress: Rendered browser verification.
- Next steps: Confirm that theme cards and preview images remain steady during category changes and catalog refreshes.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified. The current in-app browser blocks inspection of its local-file page, so rendered verification was unavailable in this turn.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (267/267); `git diff --check` is clean. Rendered browser verification could not run because the in-app browser blocks inspection of its local-file page. The versioned module URL and app-shell cache were both bumped for offline clients.
- Release: Branch preview `https://agent-booth-asset-and-previe.decemeberbooth.pages.dev` updated with commits `91c5399` and `9fba4a8`; app shell cache v15. Production alias remains unchanged.
