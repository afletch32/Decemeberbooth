# Build status

- Current goal: Match the Halloween welcome start button to the static marquee artwork and make its pressed state clear.
- Done: Applied the selected theme's share artwork and colors to the photo-finalizing screen and QR share screen; aligned the Halloween landscape start button with its marquee, styled it to match, and added a visible held press effect.
- In progress: Physical booth-device verification.
- Next steps: Check the guest flow on the booth iPad during the next setup.
- Known bugs/blockers: Physical iPad verification is outstanding.
- Important decisions: Reuse the selected theme's share screen in both post-capture states. The Halloween start control remains a real accessible button, aligned with the artwork marquee, and uses a distinct pressed state.
- Verification: `npm test` passes (289/289); targeted Playwright check passes (1/1), confirming marquee styling, pressed appearance, and advancement to photo choice. `git diff --check` passes. Physical iPad verification remains outstanding.
- Release: Commit `e9b018f` is pushed to `codex/unify-guest-photo-filter` and deployed to Pages Production as `2075191e` at https://decemeberbooth.pages.dev/. Production HTML, app module, and service worker return HTTP 200; live markers confirm the marquee styles and shell cache v46.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
