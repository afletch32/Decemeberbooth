Current goal
- Repair canonical Asset Library discovery and single-select background behavior.

What is done
- Added paid-print setup settings stored locally on the booth: mode, price/copy, payment QR or link, event slug, and staff queue URL copy.
- Added a guest final-screen payment panel that does not expose printing or staff actions.
- Added shared `GET/POST/PATCH/DELETE /api/print-queue` APIs using the existing Cloudflare Pages `THEMES_KV` binding, with matching local-development routes.
- Added `staff-print.html`: auto-refreshing staff queue, manual paid/printed/remove actions, and a 4x6 browser print-only document.
- Added optional server-side `PRINT_QUEUE_STAFF_TOKEN` protection for staff mutations; the token is entered at runtime and is not embedded in frontend code.
- Added a No payment required setting: included prints queue as `ready` / `not_required`, staff can print immediately, and the guest sees an included-print message without a payment QR.
- Added folder-manifest backgrounds, overlays, and templates to canonical Asset Library discovery; stale session selections are ignored, backgrounds are single-select, and overlays/templates remain multi-select.

What is in progress
- None.

Next steps
- Verify the Asset Library in the browser with folder-manifest-only themes when performing the next visual QA pass.

Known bugs/blockers
- Queueing requires a public final image URL, so offline/local-only final images are not shared until the existing upload path has produced one.
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.

Important decisions
- The booth can only create waiting-payment queue items; it never contains a print action.
- When no payment is required, the booth creates ready queue items but still never exposes print controls.
- Payment is manual only: no payment processor, webhook, or automatic verification is included.
- `npm test` passes with 90/90 tests; local browser verification confirmed unpaid items cannot print, Mark Paid enables Print, included items print immediately without Mark Paid, and Mark Printed updates queue status.
