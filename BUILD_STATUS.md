Current goal
- Fix theme-default asset saves so selected assets appear on the active theme.

What is done
- Removed the event-level reset pills for theme text, sizes, and logo.
- Added a visible saved-event selector and save action in the event setup panel.
- Clarified that gallery links use the saved event name/date or current session name.
- Let explicit session event names drive gallery tags before the quick-start date fallback.
- Hid partner name fields unless the current event theme is a wedding theme.
- Cleared current-session removed state when saving selected setup assets as theme defaults.
- Tightened the partner-field visibility check so multi-use general themes do not show wedding fields.
- Verified the full `npm test` suite passes.

What is in progress
- Nothing active.

Next steps
- Browser-check the admin event setup panel on the deployed page after deploy.

Known bugs/blockers
- None currently known for this change.

Important decisions
- Keep the existing event storage and `/api/events` sync path.
- Keep unnamed quick-start sessions on the date-based gallery fallback.
- Do not clear stored partner names when hiding non-wedding fields.
- Saving a selected asset as a theme default should make it visible in the active session immediately.
