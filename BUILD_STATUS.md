Current goal
- Ensure current-theme asset defaults show immediately after save.

What is done
- Added a shared theme-default writer for asset-library and setup-screen saves.
- Added modal rehydration from the saved theme object before the defaults editor closes.
- Exported the asset theme-default count helper to the browser test harness.
- Added Playwright regressions for asset-library defaults persistence and setup defaults reopen.
- Tightened the setup-screen test to lock in the shared defaults helper path.
- Grouped theme-default modal choices by the intended parent category/season.
- Added parent group checkboxes that select all child themes while preserving leaf-key saves.
- Suppressed legacy flat built-in roots from the `Other` group.
- Cleared current-session removed state when saving an asset default to the active theme.
- Added a browser regression for current-theme defaults appearing immediately after save.
- Verified the targeted regressions and full `npm test` suite pass.

What is in progress
- Nothing active.

Next steps
- Have the active-theme asset assignment flow checked in the browser.

Known bugs/blockers
- None currently known for this change.

Important decisions
- Keep the asset-library and setup-screen defaults editors on one save path.
- Rehydrate the modal from saved theme state instead of checkbox memory.
- Keep season/category parent checkboxes as UI-only controls; save only concrete theme keys.
- Saving a default to the active theme should also restore it in the current session view.
- Preserve the existing asset storage and filtering contracts.
