Current goal
- Add the countdown length option and switch the pre-capture beat to Flash.

What is done
- Added a stored 5 second countdown option in Capture Modes.
- Changed the pre-capture text from SMILE to Flash.
- Updated the capture flow so the flash trigger happens before the still frame is frozen.
- Verified with `npm test` (113 tests).

What is in progress
- None.

Next steps
- Commit and push the countdown update.

Known bugs/blockers
- None identified yet.

Important decisions
- Keep the change limited to settings, countdown timing, and copy.
- Preserve the existing capture, overlay, and share contracts.
