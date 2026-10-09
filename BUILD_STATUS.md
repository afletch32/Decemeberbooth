# Build status

- Current goal: Retire the built-in Wedding theme while preserving Wedding event setup.
- Done: Removed the Wedding preset definitions and stale catalog entry; added an Event Type choice to saved event setup, with Wedding partner fields and values carried into the new event. Prior Halloween repair keeps both Halloween cards visible and removes the eight-card cap.
- In progress: Validate the wedding event flow and theme catalog before updating the branch preview.
- Next steps: Deploy to the existing branch preview and verify the Wedding preset is gone while Wedding event type remains available.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (268/268); focused browser checks confirm no Wedding theme card and a saved Wedding event with partner names/date. Production alias remains unchanged.
- Release: Branch preview last updated at `d875d32`; Wedding retirement preview pending.
