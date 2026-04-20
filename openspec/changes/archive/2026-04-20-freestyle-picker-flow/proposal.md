## Why

The Freestyle card picker has three friction points that surfaced in use:

1. Pressing **Enter** in the Pokemon-search step only selects a match when exactly one result is visible (or swallows the keystroke if typed before the 150 ms debounce renders results). In practice the user types a query, hits Enter, and perceives the keystroke as lost — then clicks away and the backdrop closes the modal.
2. Once the picker is showing cards for a Pokemon, there is **no way back to Pokemon search** without closing the entire modal and restarting.
3. When saving a card, there is **no choice between "owned" and "placeholder" (want)**. The slot always defaults to want, so marking a newly acquired card as owned requires three interactions: save → click slot → context-menu "Mark owned".

These combine to make building a Freestyle binder feel clunky. The fix is a set of targeted picker-flow changes, scoped to Freestyle collections (Pokedex flow is untouched).

## What Changes

- **Enter in Pokemon search** selects the focused match, or the first match if none is focused. The input debounce is flushed synchronously so Enter immediately after typing still works.
- **Back navigation** — the picker header gains a `← Back` affordance while in cards mode for a Freestyle slot. Clicking it returns to Pokemon search with an empty filter (the query is NOT preserved, per product decision).
- **Owned / Want selection in picker** — once a card is selected in a Freestyle picker session, a Want/Owned radio pair appears above the Save button. Saving applies both the slot card and the caught state atomically.
- **Picker preserves current state on re-open** — opening the picker for a filled Freestyle slot (via "Change card") shows the existing card as selected and the Want/Owned radio reflecting the current caught state.
- **"Change card" opens cards mode directly** — clicking "Change card" on a filled Freestyle slot opens the picker in cards mode for that Pokemon (not Pokemon search). Back is available if the user wants to swap Pokemon.
- **Remove "Mark owned"/"Mark as want" from Freestyle slot menu** — the picker becomes the single source of truth for flipping owned/want. The slot menu retains only "Change card" and "Remove".

## Capabilities

### Modified Capabilities
- `freestyle-slots`: Picker flow, slot-menu items, and state transitions for Freestyle slots change as described above.
- `binder-view`: The Freestyle filled-slot click behavior updates — the context-menu options listed drop "toggle owned/want".

## Impact

- **`js/app.js`** (card picker + Freestyle menu): the bulk of the work. Add Back button wiring, flush-on-Enter for the Pokemon-search debounce, focused-or-first selection logic, Want/Owned radio rendering + state binding, a second code path through `openCardPicker` that starts in cards mode for the slot's current Pokemon, revised save handler that sets `caught` based on the radio state.
- **`index.html`**: Back button in card-picker header; Want/Owned radio markup under the card grid; remove the `toggle-owned` item from the Freestyle slot menu.
- **`css/styles.css`**: Styling for the Back button and radio group.
- **`js/storage.js`**: No schema changes. `setFreestyleSlot` and the surrounding caught-set updates stay as they are; the picker save handler does the combined update.
- **No data migration**. Existing Freestyle slots already store card data; existing `caught` entries continue to mean "owned".
