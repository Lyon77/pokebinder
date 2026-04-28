# Master Set per-set progress breakdown

## Goal

When a Master Set collection is active, expanding the stats bar should show one progress bar per constituent TCG set, mirroring the per-generation breakdown that Pokedex collections already have.

## Behavior

- Stats bar header continues to show overall caught / total / percent for the whole collection.
- Clicking the bar (existing chevron toggle) expands a breakdown panel.
- Breakdown is a flat list of every TCG set in the active collection, regardless of which book is currently selected.
- Each row shows: set name, a thin progress bar, and the percent caught for that set.
- Sets are listed in the order they appear in `state.sets` (matches binder order).
- Counts come from the active collection's slot list and caught set, so bars update live as slots are toggled.

## Implementation

All changes are in `js/stats.js` and `js/app.js`. No HTML or CSS changes — the existing `.stats-gen-row` / `.stats-generations` markup is reused as-is.

### `js/stats.js`

Add two exports:

```js
function computeMasterStats(collection, caughtSet, setOrder) {
  // Returns { overall: { total, caught }, bySet: [{ setId, setName, total, caught }, ...] }
  // overall counts every slot. bySet groups by slot.setId, ordered by setOrder.
}

function renderMasterStats(overallTextEl, overallBarEl, breakdownContainer, stats) {
  // Identical overall update to renderStats. Renders one .stats-gen-row per
  // entry in stats.bySet using the existing markup.
}
```

`formatPercent` is reused.

### `js/app.js`

`updateStats()` branches per type:

- `pokedex` → existing `computeStats` + `renderStats` path.
- `master` → new `computeMasterStats(collection, state.caught, state.sets)` + `renderMasterStats(...)`.
- `freestyle` → existing inline path; unchanged behavior.

The import line at the top adds `computeMasterStats, renderMasterStats`.

## Edge cases

- **Slot without `setId`** (shouldn't happen for master sets, but guarded): contributes to overall total/caught but not to any per-set row.
- **Set with zero slots**: cannot occur — sets without slots wouldn't appear in `state.slotList` — but the renderer naturally omits such rows because the breakdown is built from slot data.
- **Empty collection**: overall renders as `0 / 0 (0%)`, breakdown panel is empty.

## Out of scope

- Per-book breakdowns.
- Progress indicators in the collection-switcher dropdown.
- Sorting controls or alternate orderings (release date, alphabetical).
