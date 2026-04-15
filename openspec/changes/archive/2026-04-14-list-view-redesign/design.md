## Context

The list view is rendered by `renderListView()` in `js/render.js`. Each row is a `.pokemon-row` div containing a checkbox, stacked numbers, name, and type badges, laid out via `grid-template-columns: 28px 85px 1fr auto`. The CSS lives in `css/styles.css` under the `/* ---- List View ---- */` section. The user chose the "minimal dots + pill badges" design from the mockup exploration (`mockups/list-numbering-options.html`, Option C).

## Goals / Non-Goals

**Goals:**
- 3-column grid layout on desktop to reduce scrolling
- Minimal dot indicator replacing the checkbox
- Pill badges for collection # (accent) and Dex # (muted)
- Full row clickable to toggle caught state
- Remove type badges from list view
- Responsive: 1 column on mobile (<600px), 2 columns on tablet (600-900px), 3 on desktop

**Non-Goals:**
- Changing the binder view (separate feature)
- Changing the caught state logic or storage format
- Adding type info back in any other form

## Decisions

### 1. Row layout

**Decision:** Each row uses `display: flex` with: dot (10px circle), number pills area, and name. No grid needed per row since the elements are simple and flexible.

**Rationale:** Flex is simpler than grid for a 3-element row. The dot and pills are fixed-width, name takes remaining space with `text-overflow: ellipsis`.

### 2. 3-column grid

**Decision:** `.pokemon-list` becomes a CSS Grid with `grid-template-columns: repeat(3, 1fr)`. Rows separated by border-bottom and border-right. Responsive via media queries: 1 column below 600px, 2 columns at 600-900px, 3 columns above 900px.

### 3. Pill badges for numbers

**Decision:** Collection # rendered as `<span class="col-badge">#N</span>` with accent background, Dex # as `<span class="dex-badge">N</span>` with muted surface background. Both are small rounded rectangles inline.

### 4. Row click handler

**Decision:** The click handler moves from the checkbox `change` event to the row's `click` event. The checkbox element is removed entirely. The dot's visual state is toggled via the `.caught` class on the parent row.

## Risks / Trade-offs

- **Long names with form labels may truncate** → `text-overflow: ellipsis` handles this gracefully. Users can see the full name in the binder view or search.
- **3 columns on smaller desktops (900-1100px) may feel tight** → The 2-column breakpoint at 600-900px provides a middle ground. Can adjust breakpoints later if needed.
