# Build status

- Current goal: Restore the full Halloween theme picker and show every available theme card.
- Done: Theme cards keep their DOM nodes and loaded previews; their order is fixed per page load, dimensions stay fixed as text changes, and hover no longer lifts cards. Removed the eight-card cap and added a fallback that restores built-in Halloween frame definitions when saved records contain only image paths.
- In progress: Run automated and rendered preview checks, then release to the existing branch preview.
- Next steps: Verify both Halloween cards and the full catalog on the preview branch.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: Prior stability release passed `npm test` (267/267) and category switching on the branch preview. Halloween catalog repair checks are pending.
- Release: Branch preview was last updated at `a8d0f46`; production alias remains unchanged.
