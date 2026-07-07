Current goal
- Fix final thank-you/save flow so the rendered QR code remains visible.

What is done
- Found that the QR canvas rendered, but the Love It click bubbled to the final-preview backdrop and immediately closed/reset the QR panel.
- Stopped clicks inside the final preview content from closing the preview.
- Added a regression assertion covering the stopped propagation.
- Browser-checked the QA final preview: after tapping Love It, the QR panel remains visible and the canvas contains QR pixels.
- Verified `npm test` passes.

What is in progress
- Nothing active.

Next steps
- Deploy when ready.

Known bugs/blockers
- None currently known.

Important decisions
- Keep backdrop click-to-close behavior, but only for clicks outside the final preview content.
- Leave QR upload/share URL handling unchanged.
