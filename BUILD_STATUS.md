# Build status

- Current goal: Remove the unused Event Type selector while keeping wedding setup available.
- Done: Replaced Event Type with a dedicated “Set Up a Wedding” action; standard events default to general, saved wedding events remain editable, and the wedding flow has a cancel action. The top Print Queue shortcut and repo release instructions remain in place.
- In progress: Commit, push, deploy, and verify the wedding setup action.
- Next steps: Verify the deployed setup has no Event Type selector and the Wedding action still creates a wedding event.
- Known bugs/blockers: Physical booth-device verification remains outstanding.
- Important decisions: The top Print Queue shortcut opens the event-specific staff queue in a new tab; the adjacent Queue count continues to report pending uploads. Digital Only means no print controls or price notice in the guest flow; changing the dropdown saves the mode without requiring the separate settings button.
- Verification: `npm test` 288/288 pass. Wedding setup Playwright flow passes. `git diff --check` clean.
- Release: The prominent Open Print Queue button is deployed at https://decemeberbooth.pages.dev/ (deployment `9f0d74ca`); wedding-action release is in progress.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
