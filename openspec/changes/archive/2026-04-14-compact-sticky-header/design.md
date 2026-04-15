## Context

The Pokedex Tracker currently has three separate top sections — header, stats, and controls — each with their own padding, borders, and backgrounds. Together they consume ~315px before any Pokemon content. As the user scrolls, these sections scroll away, losing access to search and view controls.

The mockup B2 design was validated: a single sticky container with compact spacing, where per-gen stats are collapsible.

## Goals / Non-Goals

**Goals:**
- Reduce vertical space consumed by header/stats/controls to ~100px (collapsed state)
- Keep controls always accessible via sticky positioning
- Allow per-gen stats to expand on demand without losing scroll position
- Maintain all existing functionality (export, import, reset, form settings, view toggle, search)

**Non-Goals:**
- Changing the Pokemon list/binder rendering
- Modifying the autocomplete search behavior
- Redesigning the form settings modal
- Adding responsive breakpoints for mobile sidebar (keep single-column layout)

## Decisions

### 1. Single sticky container wrapping all top chrome

Merge the `<header>`, stats `<section>`, and controls `<section>` into one `<div class="sticky-header">` with `position: sticky; top: 0; z-index: 30`. This is simpler than multiple sticky elements and avoids stacking context issues.

**Why not `position: fixed`**: Fixed removes the element from flow, requiring manual padding on the main content. Sticky keeps flow intact and only pins when scrolled past.

### 2. Three internal rows within the sticky header

- **Row 1 (header-row)**: Title + Export/Import/Reset buttons
- **Row 2 (stats-bar)**: Overall caught count + progress bar + expand chevron (clickable to toggle gen stats)
- **Row 3 (controls-row)**: Search input + Form Settings + List/Binder toggle

Each row uses flexbox with compact padding (~0.3-0.4rem vertical). This matches the validated mockup B2 layout.

### 3. Per-gen stats as a collapsible panel

The gen stats panel sits between the stats bar and the controls row. It's hidden by default (`display: none`) and toggled via a click handler on the stats bar. A CSS chevron rotates to indicate open/closed state.

**Why hidden by default**: The primary goal is reducing space. Users who want gen stats can expand them on demand. The overall bar already shows total progress at a glance.

### 4. Reduce all padding and font sizes in the header

- Header padding: `1rem` → `0.4rem 0.75rem`
- Title: `1.4rem` → `1rem`
- Buttons: `0.4rem 0.8rem` padding → `0.3rem 0.6rem`, font `0.85rem` → `0.75rem`
- Progress bar height: `10px` → `6px`
- Stats font: `1rem` → `0.8rem`
- Search input padding: `0.5rem 0.75rem` → `0.3rem 0.6rem`

These values match the mockup B2 and keep everything legible while saving significant vertical space.

## Risks / Trade-offs

**Search dropdown z-index** → The sticky header has `z-index: 30`. The search dropdown already uses `z-index: 50`, so it will render above the header correctly. No change needed.

**Binder controls in sticky header** → The binder prev/next/page-info controls are inside the controls section. They need to remain within the sticky header so they're always accessible in binder view.

**Scroll-to-top button** → The existing scroll-to-top button at `z-index: 40` will sit above the sticky header and below the search dropdown. No conflicts.
