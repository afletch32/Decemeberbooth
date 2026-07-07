# Agent Instructions

- Keep changes small and preserve the existing vanilla HTML/CSS/JS stack.
- Build toward the product direction in `DECEMBERBOOTH_IDENTITY.md`: versatile event personalization, polished photos by default, simple guest flow, and reliable operator tools.
- Use double quotes in JavaScript.
- Update `BUILD_STATUS.md` after meaningful repo changes.
- Keep overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep overlay-maker layout geometry canonical by layout class.
- Keep new capabilities modular so weddings, schools, corporate events, sports teams, holidays, and future event types share one application.
- Keep tests runnable with `npm test`.
- Deploy with `npm run deploy` or `node tools/deploy.js`; it uses `wrangler pages deploy . --project-name decemeberbooth`.
- Do not deploy from inside Cloudflare Pages builds (`CF_PAGES` exits early by design).
