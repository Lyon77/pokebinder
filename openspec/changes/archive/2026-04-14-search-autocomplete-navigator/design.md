## Context

The Pokedex Tracker is a static vanilla JS single-page app. The current search input feeds into a `filterCollection()` pipeline that hides non-matching Pokemon from the list and binder views. Generation filter buttons provide additional filtering. Both views render only the filtered subset.

The user wants search to become a navigation tool — type to find, select to jump — while the main view always shows the full collection. Generation filters are no longer needed.

## Goals / Non-Goals

**Goals:**
- Replace search-as-filter with an autocomplete dropdown that navigates to a selected Pokemon
- Remove generation filter UI and logic entirely
- Maintain smooth, responsive UX (dropdown appears instantly as user types)
- Keep the app fully static with no new dependencies

**Non-Goals:**
- Adding fuzzy/approximate matching (exact substring matching is sufficient)
- Changing the caught/uncaught toggle mechanism
- Modifying completion stats behavior (stats continue to operate on the full collection)
- Adding any build tools or dependencies — remains vanilla JS

## Decisions

### 1. Autocomplete dropdown as a sibling element to the search input

The dropdown will be a `<div>` positioned absolutely below the search input, rendered into the existing `.search-row` container. Results are rebuilt on each input event (debounced at 150ms, matching current behavior).

**Why not a `<datalist>`**: Native datalist doesn't support custom styling (caught/uncaught highlighting), keyboard navigation control, or capping visible results. A custom dropdown gives full control.

### 2. Match against the full collection, not a filtered subset

Since generation filters are being removed, the dropdown always searches the full `collection` array (which already respects form settings). The matching logic reuses the same rules as today: case-insensitive substring on name/formName, starts-with on Pokedex number.

**Why not match against a separate index**: The collection is ~1300 items. Linear scan with string matching is effectively instant — no need for a search index.

### 3. List view: render full collection, scroll to target

Currently `renderListView()` receives the filtered subset. After this change, it always receives the full `collection`. On selection from the dropdown, find the target row by `data-form-id` and call `scrollIntoView({ behavior: 'smooth', block: 'center' })`.

**Why `block: 'center'`**: Centering the target in the viewport makes it immediately visible without needing a highlight pulse — the smooth scroll animation draws the user's eye naturally.

### 4. Binder view: compute target page, re-render, then pulse

On selection, calculate `targetPage = Math.floor(targetIndex / perPage)`, set `binderPage = targetPage`, re-render the binder, then apply a CSS animation class to the target slot. The pulse is a brief background-color flash (e.g., 600ms ease-out).

**Why a CSS animation vs. JS animation**: CSS animations are simpler, GPU-accelerated, and self-cleaning (the `animationend` event removes the class). No timer management needed.

### 5. Keyboard navigation with active index tracking

The dropdown tracks an `activeIndex` (initially -1, meaning nothing highlighted). Arrow down/up increment/decrement and wrap. Enter selects the active item. Escape clears and dismisses. The active item gets a visual `.active` class for a hover-like highlight.

**Why wrap instead of stop at bounds**: Wrapping feels more fluid for a short list (max 10 items). Users can cycle through without hitting a dead end.

### 6. Remove generation filters completely

Remove: the `activeGenerations` Set, the `renderGenFilters()` function, the gen filter buttons in HTML, related CSS. The `filterCollection()` function in `collection.js` is removed entirely. Completion stats already compute against the full collection independently, so they are unaffected.

## Risks / Trade-offs

**Full list rendering performance** → The list view will always render all ~1300 rows. Currently it only renders the filtered subset. This is a one-time DOM build on load; tested performance with vanilla DOM fragments at this scale is well within acceptable range. If it becomes an issue, virtual scrolling could be added later (non-goal for now).

**Loss of generation filtering** → Users who relied on gen filters lose that capability. This is an intentional simplification — the user has confirmed gen filters are not needed.

**Dropdown z-index conflicts** → The dropdown needs to overlay the list/binder content. Using `position: absolute` within the search row and a reasonable `z-index` should be sufficient given the flat DOM structure.
