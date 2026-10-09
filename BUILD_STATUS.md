# Build status

- Current goal: Correctly restore the theme/admin UI changes and reduce lag in the live camera preview, then commit and deploy in meaningful segments.
- Done: Added bundled Halloween background videos and fixed local preview paths; repaired theme controls, selected asset group lists, selected theme overflow, and overlay picker wiring in the working tree.
- In progress: Print mode visibility and camera preview performance changes need to be recovered and validated. Local commits `01cbef9`, `dba223b`, and `857899d` contain malformed intermediate hunks and need forward corrective commits.
- Next steps: Restore the missing print and preview code, validate each complete source snapshot, then deploy from committed files only.
- Known bugs/blockers: Current working tree `npm test` has 2 failures because print-price visibility and preview-performance implementation are absent; deployment is blocked until fixed. Five unreferenced sound files remain untracked and must stay outside the release.
- Important decisions: Keep the existing vanilla app architecture and preserve full-resolution capture processing. Do not deploy a broken intermediate snapshot.
- Verification: Admin/theme source syntax passes. Camera-preview browser check passed (1/1) earlier; full suite currently 265/267 before the latest staging adjustments.
- Release: No new production deployment yet; existing production remains `https://decemeberbooth.pages.dev`.
