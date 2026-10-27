# Agent Instructions

- Keep changes small and preserve the existing vanilla HTML/CSS/JS stack.
- Build toward the product direction in `DECEMBERBOOTH_IDENTITY.md`: versatile event personalization, polished photos by default, simple guest flow, and reliable operator tools.
- Use double quotes in JavaScript.
- Keep `scripts/app.js` as a composition root under 500 lines; put feature behavior in focused ES modules under `scripts/app/` with shared state and services passed through an explicit runtime context.
- Keep application styles in ordered files under `styles/`; `index.html` remains static markup under 1,500 lines. Split a feature module before it exceeds 2,000 lines.
- Add every new app module and application stylesheet to the service-worker shell precache and bump `APP_SHELL_CACHE` when the shell changes.
- Update `BUILD_STATUS.md` after meaningful repo changes.
- Keep overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep overlay-maker layout geometry canonical by layout class.
- Keep new capabilities modular so weddings, schools, corporate events, sports teams, holidays, and future event types share one application.
- Keep `/api/gallery` as the public gallery source and preserve stable `/share/{captureId}` links.
- Keep guest pages mobile-first, bounded, and theme-aware; do not introduce a second photo store.
- Validate UI changes with `npm test` plus a rendered browser check when available.
- For every code change, run the relevant checks, commit the scoped files, push the active branch, deploy the committed release to production, and verify the live result. Preserve unrelated working-tree files; never stage them as part of the release.
