# Build status

- Current goal: Replace whole-frame Halloween background motion with drifting fog over a stationary scene.
- Done: Two 8-second H.264/yuv420p/30fps muted loops at 1200×1800 and 1800×1200. Only fog moves across the lower scene. Updated built-in paths, saved-theme/event migrations, and cache identifiers; custom uploads are preserved. Added a reproducible fog renderer.
- In progress: Commit, push, and deploy the correction; verify production files.
- Next steps: Confirm the live theme uses both fog loops.
- Known bugs/blockers: Physical guest-device camera/print/share flow remains unverified.
- Important decisions: Keep approved artwork stationary and use new filenames to avoid replaying the old camera-motion clips. Existing idle/CTA artwork remains fixed.
- Verification: `npm test` 285/285 pass; browser theme selection and playback of both full-size clips passed with no page errors (external CDNs stubbed). Frame differences: stationary upper half <0.04/255, fog >4/255, loop boundary <0.27/255. Both clips <0.6 MB. `git diff --check` clean.
- Release: Pending production deployment.

## Previous wedding work

- Current goal: Create and release the Eucalyptus wedding theme for custom wedding events.
- Done: Generated the portrait/landscape background, welcome, photo-choice, and Thank You art; created transparent portrait/landscape photo overlays and a three-photo strip. Connected the assets to the dynamic couple-name/date wedding theme and moved paths into one `assets/themes/eucalyptus-wedding/` folder. Updated the built-in asset manifest and app cache versions.
- In progress: Run the test suite and rendered wedding setup flow, then publish.
- Next steps: Confirm all art loads at production dimensions and transparent photo slots remain clear; release the completed theme.
- Known bugs/blockers: A real guest-device camera/print/share run remains unverified.
- Important decisions: Wedding events remain their own themes, use the event's couple names and date, and have portrait and landscape art. Art is grouped in the theme's single folder.
- Verification: Pending this change's automated and rendered checks.
- Release: Pending.

## Existing production records

- Cloudflare Pages project: `decemeberbooth`; production URL: `https://decemeberbooth.pages.dev/`.
- Event print price uses the shared event record; default is $3.00 USD. No live purchase was made.
- PR #20 artwork loading fallback was merged previously; physical iPad behavior remains unverified.
