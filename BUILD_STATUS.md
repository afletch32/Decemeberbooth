# Build status

- Current goal: Keep the theme picker stable while theme data updates.
- Done: Theme cards keep their DOM nodes and loaded previews; their order is fixed per page load, dimensions stay fixed as text changes, and hover no longer lifts cards.
- In progress: Verify the follow-up in a rendered browser.
- Next steps: Confirm no card movement during catalog hydration and theme selection.
- Known bugs/blockers: Booth hardware camera/audio behavior remains unverified.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: Previous release passed `npm test` (267/267) and category switching on the branch preview. Follow-up stability changes are pending verification.
- Release: Branch preview was last updated at `a8d0f46`; production alias remains unchanged.
