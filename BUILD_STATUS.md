# Build Status

## Current focus
Improve the template / overlay builder UX so templates are easier to style, preview, save, and reuse.

## Next step: template styling controls
Add selected-overlay controls for:

- text color
- border color
- font size
- font family
- text alignment
- border width
- border radius
- background color
- opacity

### Expected behavior
- Controls live in the existing selected-overlay settings panel.
- Irrelevant controls are hidden by overlay type.
- Preview updates immediately while editing.
- Save/reload preserves all styling values.
- Export/render output matches the live preview.
- Old saved templates continue working through safe defaults.

### Recommended fields
- `textColor`
- `fontSize`
- `fontFamily`
- `textAlign`
- `borderColor`
- `borderWidth`
- `borderRadius`
- `backgroundColor`
- `opacity`

### Suggested defaults
- `textColor`: existing value or `#fff`
- `fontSize`: existing value or `32`
- `fontFamily`: existing/default sans-serif
- `textAlign`: `center`
- `borderColor`: existing value or `#fff`
- `borderWidth`: `0`
- `borderRadius`: `0`
- `backgroundColor`: `transparent`
- `opacity`: `1`

### Keep this targeted
Do not add heavy dependencies, rewrite the builder, change API routes unless required, or break saved templates.

## QA checklist
- Select a text overlay.
- Change text color and font size.
- Save, reload, and verify values persist.
- Select a border/frame overlay.
- Change border color, width, and radius.
- Save, reload, and verify values persist.
- Change opacity/background if supported by overlay type.
- Export/render final output and confirm it matches preview.
