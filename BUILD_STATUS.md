Current goal
- Fix the share screen tap-to-exit behavior and lower the Love It review panel.

What is done
- Kept the prior QR/countdown fix in the worktree.
- Added reserved magenta marker support for overlay/template images without explicit `photoSlots`.
- Marker pixels are made transparent in the foreground image and their bounds become runtime photo slots.
- Live preview re-renders with detected slots after marker processing.
- Aligned the older spot-mask path to the same reserved marker color.
- Added regression assertions for marker detection wiring.
- Verified `npm test` passes.
- Added `scripts/beauty/` modules for tracking, masks, smoothing, teeth, under-eye, blemish, tone, lighting, presets, settings, and the engine.
- Made beauty settings part of the existing filter definitions instead of adding guest controls.
- Capture now lazy-loads the beauty engine and applies the selected filter's beauty config before auto-enhancement.
- Added a regression assertion that beauty stays filter-configured and not guest-adjustable.
- Verified `npm test` passes after beauty wiring.
- Verified `node --check scripts/beauty/*.mjs` passes.
- Renamed beauty modules to the target structure: `tracker.mjs`, `engine.mjs`, `teeth.mjs`, and `index.mjs`.
- Moved filter beauty configuration into `presets.mjs` with `beauty` and `lighting` objects.
- Verified renamed beauty modules with `node --check scripts/beauty/*.mjs`.
- Verified the full suite with `npm test`.
- Added `DECEMBERBOOTH_IDENTITY.md` to capture the product mission, event adaptability, simple guest flow, polished default photos, reliability, and modular growth direction.
- Linked `AGENTS.md` to the product identity so future changes preserve the same direction.
- Converted `scripts/beauty/opencv.mjs` from a placeholder list into a browser-safe optional OpenCV utility module.
- Added regression coverage for the identity doc link, preset normalization contract, and optional OpenCV helper module.
- Verified beauty modules with `node --check scripts/beauty/*.mjs`.
- Verified browser-module app syntax with `node --input-type=module --check < scripts/app.js`.
- Verified the full suite with `npm test`.
- Added a live preview canvas as the displayed camera surface while keeping the raw video as the hidden camera source.
- Added `processCanvasThroughImagingPipeline()` for filter, beauty, lighting, auto-enhance, green screen, and AI-mask processing.
- The live preview loop now renders processed frames into `livePreviewCanvas`.
- Slotted overlay previews use the processed canvas stream when available.
- Capture now freezes `getCurrentProcessedFrameCanvas()` instead of redrawing a separate capture-only image path.
- Final print skips duplicate auto-enhancement when the frame already came from the live imaging pipeline.
- Beauty presets now include `lighting.sharpness`, applied inside the lighting pass.
- Added regression checks that block the old CSS-filter live preview path.
- Added a focused browser smoke test for booth test mode confirming the processed preview canvas is rendered, raw video is hidden, and capture reaches a final PNG from that path.
- Verified the focused browser smoke with `npm run test:browser -- --grep "processed live preview canvas"`.
- Added an output-surface trace for the finalized processed frame and resolved share URL.
- Proved preview, upload input, local gallery, QR, print, download, production gallery, and email payload routing consume the same finalized artifact/share URL path.
- Added regression coverage for output-surface routing and extended the browser smoke to inspect the live capture trace.
- Verified `node --input-type=module --check < scripts/app.js`, `npm test`, and the focused browser smoke pass.
- Changed final/share screen clicks so only interactive controls stop propagation; tapping the photo or empty share space exits the screen.
- Lowered the final review/action column so the Love It panel is not pinned too high.
- Added browser coverage that clicks the final photo and verifies the share screen closes.
- Verified `node --input-type=module --check < scripts/app.js`, `npm test`, and `npm run test:browser -- --grep "processed live preview canvas"` pass.

What is in progress
- Nothing active.

Next steps
- Tune per-filter beauty and lighting values from real booth captures.
- Integrate OpenCV helpers into specific beauty passes only when the simpler canvas implementation is not enough.
- Deploy when ready.

Known bugs/blockers
- None currently known.

Important decisions
- Use `#FF00FF` magenta as the Canva reserved photo marker.
- Explicit manifest `photoSlots` still take priority over marker detection.
- Keep beauty modular under `scripts/beauty/` and expose it to `app.js` through `index.mjs`.
- Existing filter choices remain the configuration surface; guests do not get beauty adjustment controls.
- `presets.mjs` is the source of truth for guest-visible filter presets.
- Project-level decisions should support operator bookings, smoother live-event operations, or better guest outcomes.
- OpenCV stays optional and lazy-loaded so imaging experiments do not make the booth fragile by default.
- The raw video element is a camera source only; displayed still-photo preview should come from the processed live preview canvas.
- Output surfaces should consume either the finalized processed image data URL or the remote URL uploaded from that same finalized image, never a separate render.
