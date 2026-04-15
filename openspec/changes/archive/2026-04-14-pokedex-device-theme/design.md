## Context

Pure visual restyling — no logic changes. The mockup at `mockups/style-3-pokedex-device.html` is the reference.

## Goals / Non-Goals

**Goals:**
- Apply Pokedex device theme across all UI elements
- Align list view columns for clean vertical alignment
- Keep all existing functionality working identically

**Non-Goals:**
- Changing any JavaScript logic or data handling
- Adding new features
- Changing the layout structure (sticky header, sidebar, etc.)

## Decisions

### 1. Color palette via CSS custom properties

Replace all `--var` values in `:root`. No need to touch JS since all colors reference CSS variables.

Key mappings:
- `--bg`: `#0a1628` (dark screen)
- `--surface`: `#0f1e38` (slightly lighter screen)
- `--surface-alt`: `#162840`
- `--accent`: `#ff3333` (red LED)
- `--caught-border`: `#00ff44` (green LED)
- `--border`: `#1a3050`
- `--text`: `#e0e0e0`
- `--text-muted`: `#557788`

### 2. Fonts

Load Orbitron (headings) and Roboto Mono (body) from Google Fonts. Apply via CSS — no JS changes needed.

### 3. Device frame

Wrap the `<body>` content in a device frame with the red top bar and LED indicators. This is an HTML change to `index.html` but doesn't affect any JS DOM queries since all existing IDs remain.

### 4. List column alignment

Change `.pokemon-row` from flex to grid with fixed column widths: `grid-template-columns: 14px 44px 44px 1fr`. This ensures the dot, collection badge, dex badge, and name all align vertically across rows.

## Risks / Trade-offs

**Font loading** — External Google Fonts adds a network dependency. Fallback fonts (monospace, sans-serif) ensure the app is still usable if fonts fail to load.
