Current goal
- Fix duplicate rows in the Asset Library without renaming existing assets.

What is done
- Added canonical asset-library URL keys so `/assets/foo.png`, `assets/foo.png`, query strings, and hash variants collapse to one row per category.
- Preserved existing custom asset IDs so old rename/tag/delete actions still work.
- Applied the same dedupe behavior in browser state, the local Express API, and the Cloudflare Pages asset function.
- Added regression coverage for URL-variant dedupe and production function guards.
- Verified with `npm test`.

What is in progress
- None.

Next steps
- None.

Known bugs/blockers
- Queueing requires a public final image URL, so offline/local-only final images are not shared until the existing upload path has produced one.
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Do not rename existing asset files; normalize identity at the asset-library layer to avoid breaking theme defaults, manifests, or stored metadata.
