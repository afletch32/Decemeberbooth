# Build status

- Current goal: Keep the active theme visible throughout the post-capture review and sharing flow.
- Done: Applied the selected theme's share artwork and colors to the photo-finalizing screen as well as the QR share screen.
- In progress: Validate, commit, push, deploy, and verify the post-capture theme continuity fix.
- Next steps: Check the guest flow on the booth iPad during the next setup.
- Known bugs/blockers: Physical iPad verification is outstanding.
- Important decisions: Reuse the selected theme's share screen across finalizing and QR states so the artwork and layout stay continuous while upload and QR generation finish.
- Verification: Pending for this change. Previous button release passed 288 unit tests, two focused browser checks, and a production Chrome guest-flow check at 390×844.
- Previous release: Button commits `85b0c2f` and `32539d7` are pushed to `codex/unify-guest-photo-filter`; `32539d7` is live on Pages Production as `8e2173e9` at https://decemeberbooth.pages.dev/.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Halloween fog release: `0b3c2ea`, deployed as `22d38325`; stationary artwork with drifting fog in both orientations.
- Eucalyptus wedding artwork and event-specific names/date remain part of the application.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
