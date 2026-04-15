## Why

The current search bar filters the displayed list/binder to only matching Pokemon, hiding everything else. This makes it hard to locate a specific Pokemon within the full collection context. Users want to search and then jump directly to a Pokemon's position in the full list or binder page, rather than viewing a filtered subset.

## What Changes

- **BREAKING**: Replace the search-as-filter behavior with an autocomplete dropdown that navigates to the selected Pokemon's position in the current view
- **BREAKING**: Remove generation filter buttons entirely (Gen I through Gen IX toggle row)
- Add autocomplete dropdown showing up to 10 matching Pokemon (by name or number) as the user types
- Dropdown results indicate caught/uncaught status with visual highlighting
- Selecting a result in list view smooth-scrolls to that Pokemon's row in the full list
- Selecting a result in binder view jumps to the page containing that Pokemon and applies a brief highlight pulse to the slot
- Keyboard navigation: arrow keys to traverse dropdown results, Enter to select, Escape to dismiss
- Clicking outside the dropdown dismisses it
- After selection: search text clears, dropdown dismisses, view navigates to target

## Capabilities

### New Capabilities
- `autocomplete-dropdown`: Typeahead dropdown UI component that matches Pokemon by name/number, shows caught status, supports keyboard navigation, and caps results at 10
- `search-navigation`: Logic to locate a Pokemon in the full collection and navigate the current view to it (smooth scroll in list view, page jump + highlight pulse in binder view)

### Modified Capabilities
- `search-and-filter`: **BREAKING** Remove all existing search-as-filter and generation filter behavior. The search input remains but its purpose changes entirely from filtering to navigation.
- `binder-view`: Add support for external navigation to a specific Pokemon's page with a highlight pulse on the target slot.

## Impact

- **js/app.js**: Remove `searchText`, `activeGenerations`, `filtered` state; remove `refilter()` pipeline; replace search input handler with autocomplete logic; wire navigation on selection
- **js/collection.js**: Remove `filterCollection()` export
- **js/render.js**: All rendering uses full `collection` instead of `filtered`; add scroll-to helper
- **js/binder.js**: Expose index-to-page calculation; add highlight pulse support
- **css/styles.css**: Add dropdown styles, highlight pulse animation; remove gen filter styles
- **index.html**: Remove gen filter row from controls section
