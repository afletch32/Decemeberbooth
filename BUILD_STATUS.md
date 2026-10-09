# Build status

- Current goal: Release the completed Halloween theme, setup, print, and camera-preview updates in meaningful segments.
- Done: Bundled animated Halloween backgrounds; fixed local media previews; restored the compact theme picker, orientation quick picks, expandable selected assets, overlay sheet, and selected-theme bounds; moved print mode and paid price visibility into Event Setup; reduced live-preview work to 640px at up to 20 fps while retaining full-resolution capture; assigned five Halloween sound effects to guest-flow events.
- In progress: Verify and deploy the Halloween sound segment.
- Next steps: Check sound playback on booth hardware; consider promoting the branch preview after review.
- Known bugs/blockers: Booth hardware camera/audio behavior is not verified. Three earlier intermediate commits contain malformed snapshots; the forward repair commit restores valid source at branch head.
- Important decisions: Use existing theme sound slots; Halloween start, button tap, countdown, capture, and thank-you moments use bundled effects. QR-ready retains the existing spooky synthesized cue.
- Verification: `node --input-type=module --check < scripts/app.js` passes; `npm test` passes (267/267); focused Chromium live-preview/capture check passed (1/1). Each Halloween MP3 probes as valid audio, with durations from 1.071 to 8.040 seconds.
- Release: UI/preview branch deployment: `https://agent-booth-asset-and-previe.decemeberbooth.pages.dev`. Sound segment pending deployment; production alias remains unchanged.
