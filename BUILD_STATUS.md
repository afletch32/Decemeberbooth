Current goal
- Make the guest booth feel like an attraction while keeping the existing capture, asset, share, and print contracts stable.

What is done
- Implemented Cloudinary transformation support, including UI selection and integration with upload logic.
- Welcome now has ambient motion, event-logo drift, tap-anywhere copy, and theme-aware host language.
- Experience selection uses large Photo / Photo Strip cards with lifted touch/hover motion.
- Camera and countdown states use host-style prompts, a 3-2-1-SMILE beat, and tiny generated sound cues after guest interaction.
- Final preview opens on an emotional review gate with LOVE IT / Retake; LOVE IT briefly changes to Awesome before revealing save/print.
- QR/save and print copy now sells the memory/keepsake instead of software or paper.
- Goodbye has a short thank-you celebration with confetti-style motion.
- Cloudinary share uploads now prefer Media Flow derived URLs from the `eager` response before falling back to the base `secure_url`, so QR/share and print can use the enhanced asset URL automatically.
- Public booth search/favorite controls remain removed; admin Asset Library still owns search, sorting, favorites, and recents.
- Added photo filter effects (Original, Warm Glow, Cool Breeze, Vintage, Noir, Vivid, Soft Dream, Dramatic) with live video preview and baked canvas export.
- Filter picker UI section added to booth options panel with styled thumb previews.
- Green Screen Removal toggle removed from admin panel (AI Background Removal kept).
- "Green Screen BGs" section renamed to "Photo Backgrounds" in booth options.
- Filter resets to Original on retake / hideFinal.
- Full node suite passed: `npm test` (102 tests).
- Rendered smoke passed for welcome-to-capture and desktop/mobile finalizing visibility.
- Targeted Cloudinary parser tests passed: `npm test -- cloudinary-utils.test.js`.

What is in progress
- None.

Next steps
- None.

Known bugs/blockers
- None known.

Important decisions
- Keep the vanilla HTML/CSS/JS stack and existing Cloudflare Pages deployment path.
- Keep the attraction layer as copy, motion, sound cues, and state transitions only.
- Do not change overlay rendering, capture composition, share uploads, print queue contracts, or admin asset state.
- Resolve Cloudinary share URLs by preferring the first valid `eager` URL produced by preset-driven Media Flow, then falling back to the upload response `secure_url`.
- Generate tiny sound cues with Web Audio after guest interaction; do not add audio files.
- Photo filter effects use CSS filters for live preview and canvas pixel manipulation for final export.
