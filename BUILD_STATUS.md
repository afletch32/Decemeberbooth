# Build status

- Current goal: Set a separate operator-controlled print price for each saved event; stabilize the theme picker.
- Done: Added an event price field with a $3.00 default. PayPal config, order creation, and capture verification now use the saved event price; guests are not offered price choices. Existing events without a saved amount use the default.
- In progress: Theme picker flicker fix is ready in source; production deployment is pending.
- Next steps: Deploy, then set each event’s price in Event Setup before opening the booth.
- Known bugs/blockers: Live PayPal capture still needs a real purchase to verify end-to-end; no test charge will be made during deployment.
- Important decisions: Store event prices on the existing shared event record, never in browser-only storage. Restrict event print price to $0.01–$999.99 USD.
- Verification: `npm test` passes (263/263). Targeted Playwright coverage is blocked by an unrelated existing save-button locator matching both "Save Event Price" and "Save as New Event".
- Prior completed work: Deployed the Spring Hill Hawks at Nissan Stadium theme with separate daytime river and aerial-field guest screens, a date-enabled overlay and print template, stable theme-category controls, and a migration for the saved Cloudflare theme record.
- Release: Commit `9a15324` pushed to `main`; production deployment `https://0d22ac6c.decemeberbooth.pages.dev` (alias `https://decemeberbooth.pages.dev`).
- Latest Pages deployment: `https://2966b5ea.decemeberbooth.pages.dev` (production alias `https://decemeberbooth.pages.dev`).
