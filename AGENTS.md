# Agent Instructions

- Keep changes small and preserve the existing vanilla HTML/CSS/JS stack.
- Build toward the product direction in `DECEMBERBOOTH_IDENTITY.md`: versatile event personalization, polished photos by default, simple guest flow, and reliable operator tools.
- Use double quotes in JavaScript.
- Update `BUILD_STATUS.md` after meaningful repo changes.
- Keep overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep overlay-maker layout geometry canonical by layout class.
- Keep new capabilities modular so weddings, schools, corporate events, sports teams, holidays, and future event types share one application.
- Keep `/api/gallery` as the public gallery source and preserve stable `/share/{captureId}` links.
- Keep guest pages mobile-first, bounded, and theme-aware; do not introduce a second photo store.
- Validate UI changes with `npm test` plus a rendered browser check when available.
