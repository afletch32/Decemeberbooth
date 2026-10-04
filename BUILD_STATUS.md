# Build status

- Current goal: Keep booth event themes organized and show the configured event print price before guest checkout.
- Done: Added the Spring Hill Hawks at Nissan Stadium theme with daytime river and aerial field guest screens, a date-enabled overlay and print template, and saved Cloudflare theme-record migration. Stabilized theme-picker filter controls. Added an event print price with a $3.00 default; PayPal configuration, order creation, and capture verification use the saved event price, and guests see it before checkout without choosing among prices.
- In progress: None.
- Next steps: Set each event’s print price in Event Setup before opening the booth.
- Known bugs/blockers: Live PayPal capture still needs a real purchase to verify end-to-end; no test charge was made during deployment.
- Important decisions: Store event prices on the existing shared event record, never in browser-only storage. Restrict event print price to $0.01–$999.99 USD. Stadium guest screens use separate daytime river and aerial-field assets.
- Verification: `npm test` passes (263/263). PayPal browser checks pass (3/3), including mobile viewport price display at 390 px. Wrangler compiled the Pages Functions bundle. Production alias serves the price notice and Nissan Stadium frame asset (HTTP 200); PayPal config reports live mode, configured, $3.00 USD default. No live purchase was made.
- Release: Commit `3399649` pushed to `main`; Pages deployment `https://dba6ca40.decemeberbooth.pages.dev` (production alias `https://decemeberbooth.pages.dev`).
