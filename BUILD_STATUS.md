# Build status

- Current goal: Restore both Halloween themes in the picker and display the full theme catalog.
- Done: Theme cards keep their DOM nodes and loaded previews; their order is fixed per page load, dimensions stay fixed as text changes, and hover no longer lifts cards. Removed the eight-card cap and added a fallback that restores built-in Halloween frame definitions when saved records contain only image paths.
- In progress: The Wedding card is backed by an existing built-in theme and setup workflow; waiting for direction on hiding it from the picker.
- Next steps: Apply the Wedding picker choice if requested; release the verified regression checks.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (268/268); the focused browser smoke check passes. Fresh branch preview shows both Halloween cards and all eight catalog cards. Production alias remains unchanged.
- Release: Branch preview updated at `d875d32`; production alias remains unchanged.
