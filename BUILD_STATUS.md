Current goal
- Keep post-capture preview frozen and hide frame chooser UI during capture/finalizing on desktop and mobile.

What is done
- Added paid-print setup settings stored locally on the booth: mode, price/copy, payment QR or link, event slug, and staff queue URL copy.
- Added a guest final-screen payment panel that does not expose printing or staff actions.
- Added shared `GET/POST/PATCH/DELETE /api/print-queue` APIs using the existing Cloudflare Pages `THEMES_KV` binding, with matching local-development routes.
- Added `staff-print.html`: auto-refreshing staff queue, manual paid/printed/remove actions, and a 4x6 browser print-only document.
- Added optional server-side `PRINT_QUEUE_STAFF_TOKEN` protection for staff mutations; the token is entered at runtime and is not embedded in frontend code.
- Added a No payment required setting: included prints queue as `ready` / `not_required`, staff can print immediately, and the guest sees an included-print message without a payment QR.
- Added folder-manifest backgrounds, overlays, and templates to canonical Asset Library discovery; stale session selections are ignored, backgrounds are single-select, and overlays/templates remain multi-select.
- Kept strip preview layers cleared after the final countdown capture until the completed strip reaches `showFinal()`, preventing the empty template frame from flashing during upload.
- Added a finalizing state for single-photo and strip capture that displays the fully composed final image (photo plus selected frame) while upload completes, without exposing a partial or empty live-overlay frame; expanded the live/countdown camera width on wide displays.
- Added URL-based overlay/template manifest asset resolution so simple filenames, root paths, full URLs, data/blob URLs, and relative shared-library paths resolve correctly.
- Hardened welcome launch overlay selection to use `getOverlayList(activeTheme || {})` and select the first real photo overlay tile after the No Overlay tile.
- Preserved the frozen post-capture still until final/share preview replaces it and hid frame settings during countdown, finalizing, and share states on desktop and mobile.

What is in progress
- None.

Next steps
- Verify the strip capture-to-share transition with a permitted camera or the existing fake-camera browser test setup.

Known bugs/blockers
- Queueing requires a public final image URL, so offline/local-only final images are not shared until the existing upload path has produced one.
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.

Important decisions
- The booth can only create waiting-payment queue items; it never contains a print action.
- When no payment is required, the booth creates ready queue items but still never exposes print controls.
- Payment is manual only: no payment processor, webhook, or automatic verification is included.
- `npm test` passes with 93/93 tests; focused countdown sizing and viewport browser smokes pass. The full parallel browser suite currently has unrelated setup/asset smoke failures that need separate triage.
- `npm test` passes with 98/98 tests after the shared asset manifest path fix.
- Mapped and tightened the mobile guest photo flow: live-photo mode now honors the Live Photo Capture toggle, still-photo becomes the fallback when live is disabled, and the live button is hidden when unavailable.
- Froze the captured frame immediately after countdown for both classic video preview and slot-based overlay previews while the final image/upload is prepared.
- Aligned final single-photo character rendering with the same event/session character resolver used by the live preview, avoiding direct theme-only character lookup during export.
- Restored the operator-only fullscreen launch button and expanded live/countdown desktop camera width expected by setup-screen coverage so the full `npm test` suite passes again.
- Removed the character feature across the main booth stack, including theme/event data handling, export rendering, asset ingestion, and the remaining setup UI hooks.
