# Agent Instructions

- Use double quotes for JavaScript string literals to match the existing style.
- Keep tests runnable via `npm test` and add or update tests when changing behavior.
- Prefer small, focused helpers in tests to avoid duplication.

## Current Handoff

- Current branch: `main`
- Latest commit for this task: `9c375f4` (`Update overlay template builder`)
- `npm test` passed before the commit.
- `npm run deploy` failed because Wrangler authentication is misconfigured in the shell environment.
- Current blocker: `CLOUDFLARE_API_TOKEN` appears invalid or malformed; `npx wrangler whoami` returned `Invalid format for Authorization header`.
- Next step: set a valid Cloudflare API token or clear the bad token and re-authenticate Wrangler, then rerun `npm run deploy`.
