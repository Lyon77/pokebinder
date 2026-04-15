## 1. Restructure HTML

- [x] 1.1 Wrap header, stats, and controls into a single `<div class="sticky-header">` in `index.html`
- [x] 1.2 Restructure stats section: overall stats bar as a clickable row with chevron, per-gen stats as a collapsible panel hidden by default
- [x] 1.3 Merge controls into a single row: search input + Form Settings button + List/Binder toggle + binder controls

## 2. CSS Changes

- [x] 2.1 Add `position: sticky; top: 0; z-index: 30` to `.sticky-header`
- [x] 2.2 Compact all header spacing: reduce padding to `0.3-0.4rem` vertical, shrink title to `1rem`, shrink buttons to `0.75rem` font
- [x] 2.3 Style the clickable stats bar: flex row with overall count, slim progress bar (6px), and chevron indicator
- [x] 2.4 Style the collapsible gen-stats panel: `display: none` by default, grid layout for gen rows with compact spacing
- [x] 2.5 Style the merged controls row: search input flex-grows, buttons sit alongside
- [x] 2.6 Remove old separate section styles (`.stats-section`, `.controls-section` padding/borders) that are now redundant

## 3. JavaScript Wiring

- [x] 3.1 Add click handler on stats bar to toggle gen-stats panel visibility and rotate the chevron
- [x] 3.2 Update DOM refs if element IDs or structure changed
- [x] 3.3 Verify search dropdown still renders correctly within the sticky header (z-index 50 above z-index 30)

## 4. Cleanup and Verification

- [x] 4.1 Remove mockup HTML files (`mockup-*.html`)
- [x] 4.2 Verify binder controls (layout select, prev/next, page info) appear correctly within the sticky header when in binder view
- [x] 4.3 Verify form settings modal renders above the sticky header
- [x] 4.4 Test scroll behavior: header stays pinned, list scrolls underneath, no content hidden behind header on initial load
