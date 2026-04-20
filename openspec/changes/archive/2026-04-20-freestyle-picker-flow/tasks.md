## 1. HTML & CSS

- [x] 1.1 Add a Back button element to the card-picker header in `index.html` (e.g., `<button id="card-picker-back" class="btn-icon" hidden>← Back</button>`), positioned to the left of the name label.
- [x] 1.2 Add a `.picker-intent` block below `#card-picker-grid` and above the Save/Clear footer in `index.html` containing a radio group with two options: Placeholder (value `want`) and Owned (value `owned`). Mark the block `hidden` by default.
- [x] 1.3 Remove the `<li data-action="toggle-owned">` item from the Freestyle slot menu (`#freestyle-slot-menu`) in `index.html`.
- [x] 1.4 Add CSS for `#card-picker-back` (back-button styling) and `.picker-intent` (radio group layout) in `css/styles.css`. Match the existing picker footer visual language.

## 2. Picker state

- [x] 2.1 Add module-level `pickerOwnedIntent = false` in `js/app.js` near the other `picker*` globals. Reset to `false` in `closeCardPicker`.
- [x] 2.2 In `openCardPicker`, after the existing pokedex branch, add a Freestyle branch that pre-selects the existing slot card (if any) and initializes `pickerOwnedIntent` from `state.caught.has(String(slotIdx))`. If no existing card, leave `pickerOwnedIntent = false`.
- [x] 2.3 Add `updatePickerIntent()` helper that toggles the `.picker-intent` block's visibility based on `state.type === 'freestyle' && pickerSelectedCard` and sets the correct radio as checked from `pickerOwnedIntent`.
- [x] 2.4 Call `updatePickerIntent()` from `updatePickerFooter()` (or adjacent to it) so the block stays in sync with selection changes.

## 3. Enter in Pokemon search

- [x] 3.1 Extract the debounced search logic out of the `cardPickerFilter` input-event setTimeout callback into a standalone function (e.g., `runPickerSearch()`) so it can be invoked synchronously. The `input` handler continues to schedule it with 150 ms debounce; Enter can call it directly.
- [x] 3.2 Replace the body of the `cardPickerFilter` keydown handler for `Enter && pickerMode === 'pokemon-search'`:
  - `clearTimeout(pickerFilterTimer)`
  - `runPickerSearch()` synchronously (awaits the getAllPokemon import, then renders)
  - After render: if `document.activeElement` is a `.card-picker-item`, click it; else click the first `.card-picker-item`; else no-op.
- [x] 3.3 Verify the ArrowDown-from-filter handler still focuses the first result (no regression).

## 4. Back navigation

- [x] 4.1 Wire a click listener on `#card-picker-back` that resets to Pokemon-search mode: clear `pickerSelectedCard`, `pickerCurrentName`, `pickerCards`, and `pickerOwnedIntent`; clear the filter input; set `pickerMode = 'pokemon-search'`; restore the empty-state grid and placeholder; call `updatePickerFooter()`; focus the filter input.
- [x] 4.2 Update `updatePickerFooter()` (or a new helper) to toggle `#card-picker-back` visibility: shown when `state.type === 'freestyle' && pickerMode === 'cards'`, otherwise hidden.
- [x] 4.3 Ensure Escape still closes the entire modal (not just backs out) — unchanged behavior.

## 5. "Change card" opens cards mode

- [x] 5.1 In the Freestyle slot-menu click handler for `action === 'change-card'`, read the slot's current card via `state.slots[idx]` and pass its `name` as the second arg to `openCardPicker(slotId, existing?.name || '')`. Falls through naturally to cards-mode loading when name is present, or Pokemon-search when empty.
- [x] 5.2 Verify that when entering cards mode via this path, the existing card is highlighted as selected (from task 2.2) and the Want/Owned radio reflects the stored caught state.

## 6. Save handler update

- [x] 6.1 In `cardPickerSave.addEventListener('click', ...)` for `state.type === 'freestyle'`:
  - If `pickerSelectedCard`: call `setFreestyleSlot(state, idx, pickerSelectedCard)`, then update `state.caught` based on `pickerOwnedIntent`:
    - `if (pickerOwnedIntent) state.caught.add(String(idx)); else state.caught.delete(String(idx));`
    - Call `saveState(state)` after the caught update (or rely on `setFreestyleSlot`'s internal save if both mutations go through it — pick one path, not both).
  - If no selection: close without saving (current behavior preserved).
- [x] 6.2 Confirm `rebuildCollection()` runs after the save so the slot re-renders with the correct owned/want visual state.

## 7. Remove menu item wiring

- [x] 7.1 Remove the `toggle-owned` branch from the `freestyleMenu` click handler in `js/app.js`.
- [x] 7.2 Remove the `isCaught` / toggleItem.textContent computation from `openFreestyleMenu` (it's no longer needed once the item is gone).
- [x] 7.3 Verify the remaining two menu items (Change card, Remove) work as expected and the menu still closes on click-outside.

## 8. Verification

- [x] 8.1 Pokemon search → type 3 chars → hit Enter → cards for the first-matching Pokemon load.
- [x] 8.2 Pokemon search → type → ArrowDown → ArrowRight → Enter → cards for the focused Pokemon load (not the first).
- [x] 8.3 Pokemon search → type → Enter immediately (faster than 150 ms) → cards still load (debounce flushed).
- [x] 8.4 Cards mode → Back button → Pokemon search with empty filter, focus returned to input.
- [x] 8.5 Select a card → radio appears → select "Owned" → Save → slot renders as owned (full color, checkmark).
- [x] 8.6 Select a card → leave radio at "Placeholder" → Save → slot renders as want (greyed).
- [x] 8.7 Click an owned filled slot → Change card → picker opens in cards mode for same Pokemon → existing card is highlighted → radio shows Owned.
- [x] 8.8 Click a want filled slot → Change card → picker opens in cards mode → radio shows Placeholder.
- [x] 8.9 Filled slot menu no longer contains a "Mark owned"/"Mark as want" item.
- [x] 8.10 Change the radio from Owned to Placeholder on a filled slot without changing the card → Save → slot becomes want.
- [x] 8.11 Escape still closes the picker from either mode.
- [x] 8.12 Sync behavior unchanged — saving a freestyle slot via picker still triggers the debounced sync push.
