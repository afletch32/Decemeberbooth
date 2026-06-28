Current goal
- Keep the captured photo visible between countdown and final sharing without exposing an empty template frame.

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
- Added an operator-only Start Booth Fullscreen control that uses browser fullscreen to maximize the kiosk view; the booth itself still exposes no kiosk or print controls to guests.

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
- Fixed Asset Library manifest coverage and theme-switch selection state so built-in assets that exist on disk appear in the library, case-sensitive asset paths match deployed URLs, and session-only selections do not leak into another selected theme's summary counts.
