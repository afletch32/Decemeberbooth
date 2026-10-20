# Build status

- Current goal: Make theme welcome and photo-choice buttons visible, readable, and easy to tap.
- Done: Added theme-aware button styling and labels, aligned controls with the displayed artwork, clamped them to the screen, and hid them until artwork positioning completes.
- In progress: Physical booth-device verification.
- Next steps: Confirm the guest flow on the booth iPad during the next setup.
- Known bugs/blockers: Physical iPad verification is outstanding.
- Important decisions: Preserve theme artwork as the background and use accessible HTML controls; match artwork `object-fit` geometry and avoid showing unpositioned controls during loading.
- Verification: `npm test` passes (288/288); focused Playwright checks pass (2/2) at 390×844 and 844×390. Production Chrome at 390×844 confirms visible controls stay within screen bounds, photo selection reaches capture, and no page errors occur.
- Release: Commits `85b0c2f` and `32539d7` pushed to `codex/unify-guest-photo-filter`; `32539d7` deployed to Pages Production as `8e2173e9` on `main` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
