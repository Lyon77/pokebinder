## Why

The header, stats, and controls sections consume roughly 315px of vertical space before any Pokemon content is visible. On a typical laptop screen this is nearly half the viewport. The controls (search, view toggle, form settings) need to remain accessible while scrolling, but the current layout wastes space with generous padding and always-visible per-generation stats.

## What Changes

- Make the entire header/stats/controls area sticky so it overlays the top of the list as the user scrolls — controls are always in view
- Compact the header: reduce padding, shrink title, tighten button spacing
- Collapse per-generation stats behind a clickable overall progress bar (click to expand/collapse)
- Merge the controls row (search, form settings, view toggle) into a single compact line
- The Pokemon list scrolls underneath the sticky header

## Capabilities

### New Capabilities
- `sticky-header`: Sticky overlay header that stays at the top of the viewport, containing the title, action buttons, collapsible stats, and controls in a compact layout

### Modified Capabilities
- `completion-stats`: Per-generation stats become collapsible (hidden by default, toggled by clicking the overall progress bar). Overall stats remain always visible but in a more compact format.

## Impact

- **index.html**: Restructure header, stats, and controls into a single sticky container; remove separate `<section>` boundaries
- **css/styles.css**: Add `position: sticky` to header, reduce padding/margins across header/stats/controls, add collapsible gen-stats styles, remove old section-specific styles
- **js/app.js**: Add toggle behavior for per-gen stats expand/collapse
- **js/stats.js**: No logic changes, but rendering adjusts to the new collapsed container
