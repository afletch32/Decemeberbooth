# Build status

- Current goal: Make Admin photo-window geometry apply to booth overlays and preserve multi-photo strip layouts.
- Done: Admin editor displays, selects, moves, resizes, and saves every existing photo slot. Saved asset-library slot geometry is applied when overlays are normalized, and the current booth view refreshes after save. Spring Hill Hawks Cheer uses a transparent touch target over the button baked into its idle artwork; portrait and landscape browser flows pass. Shell cache is v68.
- In progress: Commit, push, deploy to Cloudflare Pages production, then check the canonical endpoint.
- Next steps: Confirm the deployed editor/runtime assets load from production; verify the actual strip and photo placement in the booth.
- Known bugs/blockers: `npm test` has one unrelated Halloween manifest fixture failure against the existing working-tree manifest edits; 300/301 tests pass. The Hawks portrait and landscape release-gate checks pass. Device-specific iPad/Safari behavior is not verified.
- Important decisions: Keep existing theme geometry when no Admin asset override exists; Admin edits affect all slots and store their geometry on the existing asset record. Preserve the vanilla app and current photo-storage flow.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
