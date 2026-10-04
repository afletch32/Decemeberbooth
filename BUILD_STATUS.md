# Build status

- Current goal: Enable live PayPal checkout for paid booth prints.
- Done: Added server-created PayPal orders and server-verified captures through Cloudflare Pages Functions. Configured live mode at $3.00 USD per print, matching the existing booth price. Staff payment confirmation remains available.
- Verification: `npm test` passes (261 tests); the rendered Chromium admin check passes. Wrangler compiles the Pages Functions; the local endpoint reports live mode and correctly shows checkout as unconfigured without credentials.
- In progress: Add the live PayPal API credentials and deploy to production.
- Next steps: Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` as production secrets for the `decemeberbooth` Cloudflare Pages project, then deploy and verify live authentication without charging a payment.
- Known blockers: Cloudflare currently has no PayPal secrets. Credentials must come from the PayPal Business developer app and cannot be recovered from Cloudflare.
- Important decisions: Keep PayPal credentials server-side. Never run a real payment as a setup check.
