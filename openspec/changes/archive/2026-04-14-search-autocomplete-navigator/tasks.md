## 1. Remove Generation Filters

- [x] 1.1 Remove gen filter button row (`#gen-filters`, `.filter-row`) from `index.html`
- [x] 1.2 Remove `activeGenerations` state, `renderGenFilters()`, and gen filter event listeners from `js/app.js`
- [x] 1.3 Remove `filterCollection()` from `js/collection.js` and its import in `js/app.js`
- [x] 1.4 Remove the `filtered` array — all view rendering uses `collection` directly
- [x] 1.5 Remove gen filter CSS styles (`.gen-filters`, `.btn-gen`) from `css/styles.css`

## 2. Autocomplete Dropdown UI

- [x] 2.1 Add dropdown container `<div id="search-dropdown">` as a sibling after the search input in `index.html`
- [x] 2.2 Add CSS for the dropdown: absolute positioning below search input, z-index, max-height with scroll, result item styles, caught/uncaught highlighting, active (keyboard-selected) item style
- [x] 2.3 Add CSS highlight pulse animation (`@keyframes`) for binder slot targeting

## 3. Autocomplete Logic

- [x] 3.1 Implement search matching function: takes query + collection, returns first 10 matches (case-insensitive substring on name/formName, starts-with on Pokedex number)
- [x] 3.2 Replace the search input handler in `js/app.js`: on input (debounced 150ms), compute matches and render dropdown results showing Pokedex number, name, form name, and caught status
- [x] 3.3 Implement click handler on dropdown results to trigger navigation and dismiss

## 4. Keyboard Navigation

- [x] 4.1 Track `activeIndex` state for the dropdown (-1 = none selected)
- [x] 4.2 Add keydown listener on search input: Arrow Down/Up to move activeIndex (wrapping), Enter to select active result, Escape to dismiss and clear
- [x] 4.3 Apply `.active` class to the currently highlighted dropdown result and ensure it scrolls into view within the dropdown

## 5. Dismiss Behavior

- [x] 5.1 Add click-outside listener to dismiss the dropdown when clicking outside the search input and dropdown area
- [x] 5.2 On selection (click or Enter): clear search input text, hide dropdown, navigate to target

## 6. Navigation on Selection

- [x] 6.1 In list view: find the target row by `data-form-id` and call `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [x] 6.2 In binder view: compute target page from Pokemon's index in `collection` and current layout's `perPage`, set `binderPage`, re-render binder
- [x] 6.3 In binder view: after re-render, find the target slot by `data-form-id`, add the highlight pulse CSS class, remove it on `animationend`

## 7. Wiring and Cleanup

- [x] 7.1 Update `refilter()` → remove it; `renderCurrentView()` always uses full `collection`
- [x] 7.2 Ensure `rebuildCollection()` triggers a full re-render of the current view (no filter step)
- [x] 7.3 Verify completion stats still compute against the full collection (no regression)
- [x] 7.4 Test end-to-end: type search → see dropdown with caught highlighting → select → list scrolls / binder jumps with pulse → dropdown dismisses and input clears
