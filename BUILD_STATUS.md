# Build status

- Current goal: Make Admin photo-window geometry apply to booth overlays and preserve multi-photo strip layouts.
- Done: Admin editor displays, selects, moves, resizes, and saves every existing photo slot. Saved asset-library slot geometry applies to booth overlays, and the current view refreshes after save. Added Hawks tea-party and Back to School overlay assets, Halloween manifest updates, and five sound assets. Spring Hill Hawks Cheer uses a transparent touch target over its idle artwork button; portrait and landscape browser flows pass. Shell cache is v68. Source and asset commits are on `main`.
- In progress: Verify deployed Admin geometry editing and physical booth strip placement.
- Next steps: Check the overlay editor and actual strip/photo placement on the booth device.
- Known bugs/blockers: `npm test` has one unrelated Halloween manifest fixture failure against the existing working-tree manifest edits; 300/301 tests pass. The Hawks portrait and landscape release-gate checks pass. Device-specific iPad/Safari behavior is not verified.
- Important decisions: Keep existing theme geometry when no Admin asset override exists; Admin edits affect all slots and store their geometry on the existing asset record. Preserve the vanilla app and current photo-storage flow.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
