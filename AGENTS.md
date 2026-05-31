# Agent Instructions

- Keep changes small and preserve the existing vanilla HTML/CSS/JS stack.
- Use double quotes in JavaScript.
- Update `BUILD_STATUS.md` after meaningful repo changes.
- Keep overlay rendering slot-based: background, photo slots, foreground, optional logo.
- Keep overlay-maker layout geometry canonical by layout class.
- Keep tests runnable with `npm test`.
- Deploy with `npm run deploy` or `node tools/deploy.js`; it uses `wrangler pages deploy . --project-name decemeberbooth`.
- Do not deploy from inside Cloudflare Pages builds (`CF_PAGES` exits early by design).
