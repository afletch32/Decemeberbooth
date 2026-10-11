# Build status

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
