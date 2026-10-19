# Build status

- Current goal: Provide a one-click macOS Chrome kiosk launcher for the booth.
- Done: Added a dedicated-profile Chrome launcher with kiosk and kiosk-printing flags; documented first-run camera setup, default printer setup, print behavior, and exit path.
- In progress: Physical booth setup and device verification.
- Next steps: On the booth Mac, open the launcher, grant camera permission, and confirm the connected printer.
- Known bugs/blockers: Physical booth-device verification remains outstanding. Kiosk printing suppresses dialogs only for app-initiated print actions; it does not auto-print newly queued photos or lock macOS system shortcuts.
- Important decisions: Use the production booth URL and a separate Chrome profile to isolate camera permission and booth settings from personal browsing.
- Verification: `zsh -n launch-booth-kiosk.command`, `git diff --check`, and `npm test` (288/288) pass. Production booth and launcher both respond HTTP 200; deployed launcher SHA-256 matches the committed file.
- Release: Launcher commit `05b859f` pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `57f85f96` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
