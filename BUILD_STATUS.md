# Build status

- Current goal: Remove retired Halloween backgrounds from the saved theme and event data, then release the correction.
- Done: Theme migration replaces retired Halloween background URLs with the current portrait and landscape assets while preserving custom backgrounds. Event migration removes retired references from local and remote event overrides. Built-in manifests list the current Halloween background pairs, and generated asset manifests no longer list the deleted legacy Halloween theme.
- In progress: Commit, push, and deploy the focused repair.
- Next steps: Verify the production bundle and the live theme data migration path.
- Known bugs/blockers: Real guest camera/audio, physical printing, and sharing delivery remain unverified.
- Important decisions: Preserve current themes and operator-added backgrounds; remove only references to the retired Halloween asset URLs.
- Verification: `npm test` passes (274/274). Targeted Playwright startup test passes; `git diff --check` is clean.
- Release: Pending.
