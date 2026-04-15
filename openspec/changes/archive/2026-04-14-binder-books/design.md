## Context

The current binder view (`js/binder.js`) renders a flat paginated grid of the entire active collection. Navigation is prev/next through single pages. The binder layout is stored as a string like "3x3" in localStorage. The collection is built by `buildCollection()` in `js/collection.js` which filters by form preferences and assigns a global sequential collection number.

The user wants to split the collection into named books by generation, with per-book numbering, a book selector, and dual-page spread rendering.

## Goals / Non-Goals

**Goals:**
- Named books that group generations, with all gens required to be in a book
- Per-book numbering (1-based, restarts per book) for binder slot placement
- Book selector in binder view to switch between books
- Dual-page spread layout: page 1 single, then left+right spreads, last can be single
- Navigation steps through views (not individual pages)
- Book config persisted in localStorage and included in export/import
- Backward compatible: no books configured = single default book with all gens

**Non-Goals:**
- Per-book binder layout (stays global)
- Drag-and-drop reordering of Pokemon within a book
- Custom ordering beyond generation assignment
- Book cover/title pages (just the grid)

## Decisions

### 1. Book data structure

**Decision:** Books stored as an array in localStorage state:
```json
{
  "books": [
    { "name": "Kanto & Johto", "generations": [1, 2] },
    { "name": "Hoenn to Sinnoh", "generations": [3, 4] },
    { "name": "Modern", "generations": [5, 6, 7, 8, 9] }
  ]
}
```

**Rationale:** Simple, serializable, preserves order. Generation assignment is by number (1-9). The array order is the display order of books in the selector.

### 2. Default state (no books configured)

**Decision:** If `books` is empty or missing, create a single default book named "All Pokemon" with generations [1,2,3,4,5,6,7,8,9]. This ensures backward compatibility.

**Rationale:** Existing users with saved state won't see a broken binder view. The migration is seamless.

### 3. Per-book collection building

**Decision:** A new function `buildBookCollection(state, bookGenerations)` filters the global collection by the book's generation set, then reassigns sequential book numbers starting at 1.

**Rationale:** Reuses the existing collection building (form filtering etc.) and just slices by generation. Book numbers are computed on the fly — not stored — so they update automatically when forms are toggled.

### 4. Dual-page spread rendering

**Decision:** The binder view renders "views" instead of individual pages:
- View 0: Page 1 only (single)
- View 1: Page 2 (left) + Page 3 (right)
- View 2: Page 4 (left) + Page 5 (right)
- ...
- Last view: single page if total pages is even, spread if odd

The HTML structure for a spread is two `.binder-grid` elements side by side inside a `.binder-spread` flex container. A single-page view has one `.binder-grid` centered.

**Rationale:** Mimics opening a physical binder. The CSS is straightforward — flex container with two grid children. Each grid uses the same layout (3x3, etc.).

### 5. View-based navigation

**Decision:** Prev/Next buttons step through views. Page info shows "View 1 of N" or "Page 1" / "Pages 2-3" / "Pages 4-5" etc. for clarity.

### 6. Book selector UI

**Decision:** A dropdown/tab bar above the binder grid showing book names. Selecting a book switches the binder content to that book's collection.

### 7. Book settings UI

**Decision:** A "Book Settings" button (next to the existing "Form Settings" button) opens a modal where users can:
- Add a new book (name + generation multi-select)
- Edit existing books (rename, change gens)
- Delete books (gens become unassigned, must be reassigned)
- See which gens are unassigned (validation: all must be assigned)

The modal reuses the same styling as the form settings modal.

## Risks / Trade-offs

- **Book config adds complexity to storage** → Mitigated by the default "All Pokemon" book for backward compat. Export/import handles the new field.
- **Dual-page spread on mobile** → On narrow screens (<600px), spreads collapse to single-page navigation (same as current behavior). The spread is a desktop feature.
- **Per-book numbering changes when forms are toggled** → Same behavior as current global numbering, just scoped to the book. Users already expect this.
