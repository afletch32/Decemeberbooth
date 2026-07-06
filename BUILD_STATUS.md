Current goal
- Fix asset-library theme-default modal grouping and parent theme selection.

What is done
- Added a shared theme-default writer for asset-library and setup-screen saves.
- Added modal rehydration from the saved theme object before the defaults editor closes.
- Exported the asset theme-default count helper to the browser test harness.
- Added Playwright regressions for asset-library defaults persistence and setup defaults reopen.
- Tightened the setup-screen test to lock in the shared defaults helper path.
- Grouped theme-default modal choices by the intended parent category/season.
- Added parent group checkboxes that select all child themes while preserving leaf-key saves.
- Suppressed legacy flat built-in roots from the `Other` group.

What is in progress
- Running the targeted grouping and persistence regressions.

Next steps
- Run the targeted browser and node regressions, then the full suite if they stay clean.

Known bugs/blockers
- The aggregate `npm test` run still hits the existing Node test-runner deserialization error in `server.test.js`, but the file passes when run directly.

Important decisions
- Keep the asset-library and setup-screen defaults editors on one save path.
- Rehydrate the modal from saved theme state instead of checkbox memory.
- Keep season/category parent checkboxes as UI-only controls; save only concrete theme keys.
- Preserve the existing asset storage and filtering contracts.
