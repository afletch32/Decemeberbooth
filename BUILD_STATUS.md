# Build status

- Current goal: Provide a one-click macOS Chrome kiosk launcher for the booth.
- Done: Added a dedicated-profile Chrome launcher with kiosk and kiosk-printing flags; documented first-run camera setup, default printer setup, print behavior, and exit path.
- In progress: Validate the launcher and production release.
- Next steps: Run the launcher on the physical booth Mac, grant camera permission, and confirm its connected printer.
- Known bugs/blockers: Physical booth-device verification remains outstanding. Kiosk printing suppresses dialogs only for app-initiated print actions; it does not auto-print newly queued photos or lock macOS system shortcuts.
- Important decisions: Use the production booth URL and a separate Chrome profile to isolate camera permission and booth settings from personal browsing.
- Verification: Pending.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
