Current goal
- Fix photobooth printing so the booth can run on an iPad while a separate phone or MacBook handles staff printing.

What is done
- Staff print queue page exists at `staff-print.html` and reads the shared `/api/print-queue` records newest first by event.
- Print queue records now include id, event ID, public image URL, created timestamp, quantity, `paymentStatus`, and `printStatus`.
- Still-photo and strip prints enqueue only remote Cloudinary image URLs; local `/share/{id}.png` service-worker cache is fallback only.
- Live/video captures do not show the print panel and do not enqueue print records.
- Staff actions are Open/Print, Mark Printed, Reprint, and Void.
- Upload/queue failures are surfaced in the booth share status and toast instead of only logging to the console.
- Verified with `npm test`.

What is in progress
- None.

Next steps
- None.

Known bugs/blockers
- Printing opens the browser/system print dialog or AirPrint sheet; silent printing is intentionally unsupported.
- Offline captures remain queued locally until Cloudinary upload succeeds; they do not enter the cross-device print queue until a public URL exists.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Use existing Cloudinary upload plus existing KV/local JSON queue storage; do not add a new backend.
- Keep service-worker `/share` image cache as offline fallback, not the main print source.
- Use `paymentStatus: unpaid | paid | comped` and `printStatus: new | printed | reprint | void`; old stored queue statuses are normalized on read.
