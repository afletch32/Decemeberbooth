# Build status

- Current goal: Complete the saved theme and asset cleanup, and keep Halloween capture and share screens visually consistent.
- Done: Frozen captures block late live-preview redraws. Share screens use orientation-matched Share art, Thank You art, or a still theme background, and the share shell and QR panel use the active palette. Live booth branding comes from frame artwork, and guest controls follow the theme accent. Retired theme assets were removed from generated catalogs and manifests.
- In progress: Commit, push, deploy, and verify the intended worktree changes.
- Next steps: Verify the production app shell and updated theme behavior after deployment.
- Known bugs/blockers: Real guest camera/audio, physical printing, and sharing delivery remain unverified. Eucalyptus theme artwork files are not present locally; wedding theme metadata points to the expected asset paths.
- Important decisions: Preserve the approved screen packs, simple borders, vanilla stack, and custom uploads. Template metadata and the existing renderer use one shared standard slot definition. New filenames avoid stale template cache hits. Both header artwork and photo order are identical across each sheet's two columns.
- Verification: `npm test` passes (276/276); live-preview capture and final-share Chromium tests pass (2/2); final-share viewport test covers eight kiosk sizes; `git diff --check` is clean.
- Release: Pending.
