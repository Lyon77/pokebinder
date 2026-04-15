## Why

The current list view uses a single-column layout with a checkbox, stacked numbers, name, and type badges per row. With 1288 entries, scrolling through a single column is slow. Most of the horizontal screen space is wasted, and the type badges add visual noise without helping the core task of tracking collection progress.

## What Changes

- Switch the list view from a single-column layout to a 3-column CSS Grid (responsive: 1 column on mobile)
- Replace the checkbox with a minimal dot indicator for caught status (filled green = caught, hollow = uncaught)
- Make the entire row clickable to toggle caught state (instead of only the checkbox)
- Replace the stacked number display with pill badges: accent pill for collection #, muted pill for Dex #
- Remove type badges entirely from the list view
- Remove the standalone checkbox element

## Capabilities

### New Capabilities

_None — this is a UI redesign of existing list view._

### Modified Capabilities

- `completion-tracking`: The caught toggle mechanism changes from checkbox-only to full-row click with dot indicator
- `collection-numbering`: The visual presentation of dual numbers changes from stacked text to pill badges

## Impact

- **Modified code**: `js/render.js` (row rendering, remove type badges, add dot + pills, row click handler), `css/styles.css` (3-column grid, dot styles, pill badge styles, remove checkbox/type styles, responsive breakpoints)
- **No data changes**: Pokemon data and storage format are unchanged
- **No breaking changes**: Caught state logic and localStorage format remain the same
