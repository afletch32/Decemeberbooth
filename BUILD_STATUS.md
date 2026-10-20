# Build status

- Current goal: Keep the active theme visible throughout the post-capture review and sharing flow.
- Done: Applied the selected theme's share artwork and colors to the photo-finalizing screen as well as the QR share screen.
- In progress: Physical booth-device verification.
- Next steps: Check the guest flow on the booth iPad during the next setup.
- Known bugs/blockers: Physical iPad verification is outstanding.
- Important decisions: Reuse the selected theme's share screen in both post-capture states and keep the finalizing surface transparent enough for the artwork to remain visible beneath the photo.
- Verification: `npm test` passes (288/288); focused Playwright checks pass (2/2), including the pre-QR finalizing state and multi-viewport share flow. The final production image-visibility check is pending.
- Previous release: Commit `5e126d4` is pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `b7d455a4` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
