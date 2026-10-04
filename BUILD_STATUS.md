# Build status

- Current goal: Set a separate operator-controlled print price for each saved event.
- Done: Added an event price field with a $3.00 default. PayPal config, order creation, and capture verification now use the saved event price; guests are not offered price choices. Existing events without a saved amount use the default.
- In progress: None.
- Next steps: Deploy, then set each event’s price in Event Setup before opening the booth.
- Known bugs/blockers: Live PayPal capture still needs a real purchase to verify end-to-end; no test charge will be made during deployment.
- Important decisions: Store event prices on the existing shared event record, never in browser-only storage. Restrict event print price to $0.01–$999.99 USD.
- Verification: `npm test` passes (262 tests); both PayPal checkout browser checks pass; Wrangler Pages Functions compile. Production page and PayPal config endpoint return successfully in live mode with the $3.00 default.
- Prior completed work: Registered and deployed the Spring Hill Hawks at Titans Stadium theme using existing Hawks branding (`https://29e0d38e.decemeberbooth.pages.dev`).
- Release: Commit `9a15324` pushed to `main`; production deployment `https://0d22ac6c.decemeberbooth.pages.dev` (alias `https://decemeberbooth.pages.dev`).
