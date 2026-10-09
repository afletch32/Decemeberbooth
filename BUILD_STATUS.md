# Build status

- Current goal: Retire the built-in Wedding theme while preserving Wedding event setup.
- Done: Removed Wedding preset definitions and stale saved catalog entries. Event setup now has an Event Type choice, saves Wedding events with partner names/date, and exposes partner fields when Wedding is selected. The picker shows the full catalog and both Halloween themes.
- In progress: None.
- Next steps: Select Event Type Wedding, choose a look, enter event details, and save to set up a wedding event. Use the theme creation tools to make a custom wedding look if needed.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (268/268); focused Playwright checks pass (2/2). Rendered preview shows both Halloween cards, no Wedding preset, and Wedding event type with visible partner fields.
- Release: Branch preview updated at `2809f28` ([open preview](https://agent-booth-asset-and-previe.decemeberbooth.pages.dev/)); production alias remains unchanged.
