# Build status

- Current goal: Keep guest booth controls usable after launching a selected theme.
- Done: The overlay chooser stays hidden until requested, opens as a full-screen panel, closes with Done, and stays hidden on welcome screens.
- In progress: Verify the branch preview after cache invalidation.
- Next steps: Verify the branch preview after release; check theme sound playback on booth hardware.
- Known bugs/blockers: Booth hardware camera/audio behavior is not verified. Three earlier intermediate commits contain malformed snapshots; the forward repair commit restores valid source at branch head.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (267/267). A local browser flow confirmed the chooser opens, Done closes it, and the capture button remains clickable. The versioned module URL and app-shell cache were both bumped for offline clients.
- Release: UI/preview branch deployment: `https://agent-booth-asset-and-previe.decemeberbooth.pages.dev`. Sound segment pending deployment; production alias remains unchanged.
