# Build status

- Current goal: Keep guest booth controls usable after launching a selected theme.
- Done: The overlay chooser stays hidden until requested, opens as a full-screen panel, closes with Done, and stays hidden on welcome screens. Deployed the fix and cache refresh to the branch preview.
- In progress: None.
- Next steps: Check theme sound playback on booth hardware.
- Known bugs/blockers: Booth hardware camera/audio behavior is not verified. The existing targeted picker browser flow uses an unreliable launch helper; direct browser interaction was verified. Three earlier intermediate commits contain malformed snapshots; the forward repair commit restores valid source at branch head.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `npm test` passes (267/267). A local browser flow confirmed the chooser opens, Done closes it, and the capture button remains clickable. The versioned module URL and app-shell cache were both bumped for offline clients.
- Release: Branch preview `https://agent-booth-asset-and-previe.decemeberbooth.pages.dev` updated with commits `91c5399` and `9fba4a8`; app shell cache v15. Production alias remains unchanged.
