Current goal
- Fix the asset library theme-category filter so school/holiday assets show up.

What is done
- Removed background/overlay/template entries from the asset library category dropdown.
- Updated the asset-library regression test to match the trimmed dropdown options.
- Confirmed `node --test server.test.js` still passes on its own.
- Expanded asset-library category inference to read theme keys, tags, folders, and URLs.
- Fixed theme-category inference so nested school and holiday assets are filtered correctly.
- Updated the asset-library regression test to cover the category inference path.
- Verified with `npm test -- asset-upload.test.js`.
- Verified with `npm test -- asset-upload.test.js`.

What is in progress
- None.

Next steps
- Run the tests again and verify the asset-library filter stays clean.

Known bugs/blockers
- The aggregate `npm test` run still hits the existing Node test-runner deserialization error in `server.test.js`, but the file passes when run directly.

Important decisions
- Keep asset types on the pills and theme categories in the dropdown.
- Preserve the existing asset storage and filtering contracts.
