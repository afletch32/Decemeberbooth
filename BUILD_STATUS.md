Current goal
- Fix booth asset picker sorting, selection stability, search, and persisted favorites/recent assets.

What is done
- Added picker search, 24-item initial rendering, and Show More controls for overlay/template options.
- Added localStorage-backed asset picker favorites and recents.
- Sorted picker assets by favorites, recents, current theme assets, then filename/category label.
- Kept folder manifests in the catalog while avoiding manifest-first dominance in the picker.
- Preserved selection behavior so overlay/template clicks update selected state, preview, and confirm flow without re-rendering or reordering the list.
- Added static coverage for search, favorites/recents, Show More, scroll preservation wiring, and sorted getter use.
- Verified locally with `npm test` and targeted Playwright smoke checks for sorting, search, recents, and favorite persistence.

What is in progress
- None.

Next steps
- None.

Known bugs/blockers
- Queueing requires a public final image URL, so offline/local-only final images are not shared until the existing upload path has produced one.
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Keep setup buttons exported through the existing `window` assignment because `index.html` uses inline handlers.
- Keep the new parser test in `npm test` so a future unterminated app module fails before deployment.
