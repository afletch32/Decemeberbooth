# Build status

- Current goal: Make Admin photo-window geometry apply to booth overlays and preserve multi-photo strip layouts.
- Done: Admin editor displays, selects, moves, resizes, and saves every existing photo slot. Saved asset-library slot geometry is applied when overlays are normalized, and the current booth view refreshes after save. Updated the shell cache version.
- In progress: Commit, push, deploy to Cloudflare Pages production, then check the canonical endpoint.
- Next steps: Confirm the deployed editor/runtime assets load from production; verify the actual strip and photo placement in the booth.
- Known bugs/blockers: No source-level blocker known. Browser/device booth flow is not verified in this turn.
- Important decisions: Keep existing theme geometry when no Admin asset override exists; Admin edits affect all slots and store their geometry on the existing asset record. Preserve the vanilla app and current photo-storage flow.
- Production target: Cloudflare Pages project `decemeberbooth`, branch `main`, `https://decemeberbooth.pages.dev/`.
