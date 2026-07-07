# DecemberBooth Project Identity

DecemberBooth is a browser-based photo booth platform for live events. The product should help operators book more events, run events more smoothly, and deliver a better guest experience.

## Product Direction

- Support many event types from one adaptable app: weddings, birthdays, schools, proms, sports teams, corporate events, fundraisers, festivals, holidays, brand activations, pet events, baby showers, graduations, galas, and future event formats.
- Make every event feel tailored through themes, colors, branding, logos, overlays, templates, welcome screens, music, animations, creative filters, AI effects, and seasonal experiences.
- Keep guest flow simple: touch, smile, receive photo.
- Put complexity in operator tools, not the guest interface.
- Make polished photo quality the default with automatic, professional image enhancement.
- Prioritize live-event reliability over flashy features.
- Grow through modular systems so new media features extend the app instead of replacing it.

## Architecture Bias

- Preserve the vanilla HTML/CSS/JS stack unless a change is explicitly requested.
- Prefer static-first, direct routes, and cloud-synced shared state where cross-device use matters.
- Keep user-facing choices simple while letting presets, themes, and operator configuration carry the complexity.
- Add modules around stable boundaries: imaging, overlays, assets, capture flow, storage, sync, and operator UI.
- Before implementing a feature, ask whether it helps operators book more events, run events more smoothly, or create a better guest experience.
