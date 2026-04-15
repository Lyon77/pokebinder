## Why

A single binder can't physically hold all 1288+ Pokemon. Real collectors split their collection across multiple binders organized by generation. The current binder view is a flat paginated grid with no concept of separate books, making it impossible to plan physical binder layouts. Adding a books system with dual-page spreads (like opening a real binder) and per-book numbering gives users an accurate digital representation of their physical collection.

## What Changes

- Introduce a "books" system where users create named books and assign generations to each book
- All generations must be assigned to a book (enforced in the UI)
- Each book has its own numbering starting at 1, so book slot numbers map directly to physical binder positions
- Binder view shows a book selector to switch between books
- First page of each book renders as a single page; subsequent pages render as dual-page spreads (left + right side by side); last page can be single if odd
- Navigation steps through views (single or spread), not individual pages
- Binder layout (3x3, 3x4, etc.) remains a global setting
- List view is unchanged — continues to show Dex # and Global Collection #
- Binder slots show Book # and Dex # (not global collection #)
- Book configuration persists in localStorage and is included in export/import

## Capabilities

### New Capabilities
- `binder-books`: User-configurable books that group generations into separate binders, with per-book numbering, book selector, and book settings management

### Modified Capabilities
- `binder-view`: Page rendering changes from single-page pagination to dual-page spreads (first page single, then spreads, last can be single); navigation steps through views; slots show Book # instead of Global Collection #
- `collection-numbering`: Binder view uses per-book numbering (restarts at 1 per book) while list view retains global collection numbering
- `completion-tracking`: Export/import includes book configuration
- `completion-stats`: Stats could optionally show per-book breakdown (in addition to per-generation)

## Impact

- **New code**: `js/books.js` (book management, per-book collection building, book numbering)
- **Modified code**: `js/binder.js` (dual-page spread rendering, view-based navigation), `js/app.js` (book selector UI, book settings modal), `js/storage.js` (book config persistence), `css/styles.css` (dual-page layout, book selector, book settings)
- **Modified HTML**: `index.html` (book selector in binder controls, book settings modal)
- **Storage format**: Add `books` array to localStorage state (name, assigned generations per book)
- **No breaking changes**: Existing state without books defaults to a single book containing all generations
