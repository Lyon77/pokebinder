## Why

The app currently uses a generic dark theme with no Pokemon-specific visual identity. Restyling with the Pokedex device aesthetic gives it a recognizable, immersive feel — like using an actual Pokedex.

## What Changes

- Restyle the entire app with a Pokedex device theme: red device frame, LED indicators, green/cyan terminal-style accents, monospace/sci-fi fonts (Orbitron for headings, Roboto Mono for body)
- Color palette: red device shell, dark blue-black screen background, green scan bar, blue/red LED accent colors
- Sticky header styled as the Pokedex screen header with device-like borders
- Progress bar styled as a scan bar
- Binder slots and list rows use the Pokedex screen aesthetic (dark backgrounds, glowing borders on caught)
- List view: align dex numbers and Pokemon names into fixed-width columns so they line up vertically across all rows
- Buttons styled with terminal/device look (subtle borders, monospace text)
- Remove mockup files

## Capabilities

### New Capabilities
_(none — this is a visual restyling only)_

### Modified Capabilities
_(no spec-level behavior changes — purely CSS/font/color changes)_

## Impact

- **css/styles.css**: Full color palette swap, font changes, border/radius adjustments, device frame styling, list column alignment
- **index.html**: Add Google Fonts links (Orbitron, Roboto Mono), add LED indicator elements to header, add Pokedex device frame wrapper
- **js/render.js**: May need minor adjustments for list row structure to support fixed-width columns
