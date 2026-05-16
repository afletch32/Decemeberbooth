Current goal
- Fix theme asset switching so the selected theme always shows its own assets, and keep holiday themes out of wedding flows.

What is done
- Reusable overlay/template autofill is implemented and covered by Node plus browser tests.
- Fast event creation validates wedding and birthday reusable fields inline.
- Browser harness covers builder metadata and autofill render probes.
- Wedding theme selection now excludes holiday themes in the shared selector.
- The selected-theme asset panel now renders base theme assets instead of event-only overlays/templates.
- Remote README/local network notes and local-data health check updates from `origin/main` are included.

What is in progress
- Rebasing local booth setup work on top of `origin/main`.

Next steps
- Continue replaying local commits, then run tests after the rebase completes.

Known bugs/blockers
- `npm run deploy` can fail when `CLOUDFLARE_API_TOKEN` is invalid in the shell environment.

Important decisions
- Event-only assets stay editable in the event setup panel.
- The selected-theme asset panel stays theme-pure.
- Holiday themes are hidden for wedding selections instead of being remapped.
