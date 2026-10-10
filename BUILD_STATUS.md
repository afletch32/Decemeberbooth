# Build status

- Current goal: Commit and deploy the approved Halloween overlays and graphic double-strip templates to production.
- Done: Two 1200×1800 sheets, each with identical 600×1800 strips and repeated photos 0,1,2. New 600×330 illustrated headers match each theme. Shared canonical geometry places 500×414 photo windows (bottom row 500×413) at standard positions. All apertures are fully transparent. Removed the incorrect tall-box sheets; single-photo overlays remain. Added reproducible template export and refreshed manifests/cache identifiers.
- In progress: Deploy the isolated, tested Halloween release to production and verify live assets.
- Next steps: Verify the production release. Unrelated wedding edits and asset deletions remain outside this commit.
- Known bugs/blockers: Full suite has two unrelated missing-wedding-manifest failures. Real guest camera/audio, physical printing, and sharing delivery remain unverified.
- Important decisions: Preserve the approved screen packs, simple borders, vanilla stack, and custom uploads. Template metadata and the existing renderer use one shared standard slot definition. New filenames avoid stale template cache hits. Both header artwork and photo order are identical across each sheet's two columns.
- Verification: Isolated committed-baseline release: `npm test` 270/270 pass. Shared checkout previously had 269 pass / 2 unrelated missing-wedding-manifest failures. Exact alpha-window crops and pixel-identical left/right halves checked for both files. Playwright verified theme/orientation selection and production composers with no page errors; outputs viewed at desktop/mobile sizes using synthetic colored photos. `git diff --check` clean.
- Release: User authorized commit and production deployment. Release includes only reviewed Halloween changes, with unrelated working-tree changes excluded; production verification pending.
