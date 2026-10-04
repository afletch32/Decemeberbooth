# Build status

- Current goal: Enable live PayPal checkout for paid booth prints.
- Done: Added server-created PayPal orders and server-verified captures through Cloudflare Pages Functions. Configured live mode at $3.00 USD per print and retained staff payment confirmation. Stored the PayPal app credentials as encrypted production secrets.
- Verification: `npm test` passes (261 tests); the rendered Chromium admin check passes. Wrangler compiled the Pages Functions. Production `/api/paypal/config` confirms live checkout is configured at $3.00 USD; the production page returns HTTP 200.
- In progress: None.
- Next steps: Complete a real customer purchase only when ready to collect payment; no charge was made during setup.
- Known blockers: Live PayPal authentication and checkout approval were not exercised with a real purchase.
- Important decisions: Keep the PayPal secret server-side. PayPal Client ID is public and used by the browser SDK. Never run a real payment as a setup check.
- Release: Commit `ac73eee` pushed to `main`; production deployment `https://a6081d13.decemeberbooth.pages.dev` (alias `https://decemeberbooth.pages.dev`).
