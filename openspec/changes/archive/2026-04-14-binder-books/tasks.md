## 1. Storage & Data Layer

- [x] 1.1 Add `books` array to localStorage state in `js/storage.js` (default: single book "All Pokemon" with gens 1-9)
- [x] 1.2 Add `loadState()` migration: if `books` field missing, create default book
- [x] 1.3 Add `saveBooks(state, books)`, `addBook(state, name, gens)`, `updateBook(state, index, name, gens)`, `removeBook(state, index)` functions
- [x] 1.4 Update `exportState()` to include `books` in exported JSON
- [x] 1.5 Update `importState()` to restore `books` from imported JSON (fallback to default if missing)

## 2. Per-Book Collection Building

- [x] 2.1 Write `buildBookCollection(fullCollection, bookGenerations)` in `js/collection.js` that filters by generation set and assigns sequential book numbers starting at 1
- [x] 2.2 Verify book numbers recalculate when form preferences change

## 3. Dual-Page Spread Rendering

- [x] 3.1 Refactor `js/binder.js` to render views instead of pages: compute view list from total pages (view 0 = page 1 single, view 1 = pages 2-3 spread, etc.)
- [x] 3.2 Add `renderBinderView()` that renders either a single `.binder-grid` (for single-page views) or two `.binder-grid` elements inside a `.binder-spread` flex container (for spreads)
- [x] 3.3 Update slots to show book position number and Dex # instead of global collection #
- [x] 3.4 Update page info to show "Page 1 of N" for single views and "Pages 2–3 of N" for spreads
- [x] 3.5 Update prev/next to step through views, disable at boundaries

## 4. CSS for Dual-Page Spreads

- [x] 4.1 Add `.binder-spread` flex container style (two grids side by side, gap between them)
- [x] 4.2 Add visual "spine" or gap between left and right pages in a spread
- [x] 4.3 On mobile (<600px), collapse spreads to single-page navigation (hide one grid)

## 5. Book Selector UI

- [x] 5.1 Add book selector (dropdown or tab bar) to binder controls in `index.html`
- [x] 5.2 Render book selector options from `state.books` in `js/app.js`
- [x] 5.3 Wire book selector change to rebuild the book collection and re-render binder
- [x] 5.4 Persist selected book index across view switches (list ↔ binder)

## 6. Book Settings Modal

- [x] 6.1 Add "Book Settings" button next to "Form Settings" in `index.html`
- [x] 6.2 Add book settings modal HTML structure (same styling as form settings modal)
- [x] 6.3 Render book list with name, assigned gens, edit/delete controls
- [x] 6.4 Implement "Add Book" form: name input + generation multi-select (only show unassigned gens)
- [x] 6.5 Implement edit book: rename + change generation assignments
- [x] 6.6 Implement delete book: unassign gens, show warning
- [x] 6.7 Show unassigned generations prominently; disable save/close until all gens are assigned
- [x] 6.8 Wire save to update storage and rebuild binder

## 7. Wiring & Integration

- [x] 7.1 Update `js/app.js` init to load books from state, set default if missing
- [x] 7.2 Wire binder view to use selected book's collection instead of global collection
- [x] 7.3 Ensure form preference changes rebuild the current book's collection
- [x] 7.4 Ensure export/import round-trip preserves book configuration

## 8. Verification

- [x] 8.1 Verify default "All Pokemon" book works on fresh load (backward compat)
- [x] 8.2 Verify creating multiple books splits the binder correctly
- [x] 8.3 Verify per-book numbering starts at 1 for each book
- [x] 8.4 Verify dual-page spread: first view single, middle views spread, last view can be single
- [x] 8.5 Verify spread collapses to single-page on mobile (<600px)
- [x] 8.6 Verify all gens must be assigned (can't save with unassigned)
- [x] 8.7 Verify book config persists across reload
- [x] 8.8 Verify export/import with and without book configuration
- [x] 8.9 Verify all JS files pass syntax check
