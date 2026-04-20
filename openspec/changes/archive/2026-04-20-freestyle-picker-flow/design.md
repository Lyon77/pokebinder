## Context

The card picker is a single modal in `js/app.js` that services three collection types. It internally tracks a `pickerMode` variable (`'pokemon-search'` vs `'cards'`) and branches its rendering, filter, and save behavior on that mode plus the active collection's `state.type`. Navigation between modes today is one-way — entering cards mode is final until the modal is closed and re-opened.

This change keeps the picker as one modal but adds an explicit bi-directional transition and makes the Freestyle save intent richer (card + owned flag instead of just card).

## Goals / Non-Goals

**Goals:**
- Pressing Enter in Pokemon search reliably selects a Pokemon (focused if any, else first match).
- Return path from cards mode to Pokemon search without closing the modal.
- Owned vs placeholder is a single decision at save time, not a follow-up interaction.
- "Change card" lands in the most likely intent (different card, same Pokemon) while leaving "different Pokemon" reachable via Back.

**Non-Goals:**
- Any change to Pokedex picker behavior.
- Preserving the Pokemon-search query when navigating Back (explicitly rejected — query is cleared).
- Keyboard navigation improvements beyond the Enter fix (ArrowUp/Down/Left/Right stay as today).
- Visual highlight of a "first match" before Enter (Enter just selects it — no new UI state).

## Decisions

### 1. Enter-in-search resolution

```
Enter pressed while cardPickerFilter focused AND pickerMode === 'pokemon-search':
  1. If the filter debounce has a pending timer, flush it synchronously
     (run the search now so items are rendered).
  2. If document.activeElement is a .card-picker-item, click it.
  3. Else click the first .card-picker-item in the grid.
  4. If there are no matches, do nothing.
```

The flush happens by clearing `pickerFilterTimer` and invoking the same render logic inline. The existing 150 ms debounce still applies to keystrokes; Enter short-circuits it.

**Why not highlight the first match visually?** Adds state management with no product benefit — the user's mental model is "I typed enough, hit Enter, first result wins."

**Why not Ctrl+Enter or some other combo?** The user already expects Enter to work from their prior commit (`179755f`). This extends that intent to always pick a Pokemon when at least one match exists.

### 2. Back navigation

The card-picker header (the `.card-picker-header` row in `index.html`) gains a Back button that is visible whenever `state.type === 'freestyle' && pickerMode === 'cards'` — regardless of whether the user reached cards mode via Pokemon search or via a direct "Change card" entry. Keeping Back always available in Freestyle cards mode means the user can always swap Pokemon without closing the modal.

Clicking Back:
1. Clears `pickerSelectedCard` and `pickerCurrentName`.
2. Clears the filter input.
3. Sets `pickerMode = 'pokemon-search'`.
4. Restores the Pokemon-search empty state in the grid.
5. Focuses the filter input.

Note: clicking Back does NOT persist any in-progress selection. If the user selected a card and hit Back, the selection is discarded.

### 3. Want / Owned radio

A new `.picker-intent` block sits between the card grid and the Save/Clear row. It is visible only when `state.type === 'freestyle'` and `pickerSelectedCard` is non-null. Two radio buttons:

```
( ) Placeholder — I want this card but don't have it yet
( ) Owned       — I have this card
```

`pickerOwnedIntent` is a new module-level variable, reset to `false` on open, set to the slot's current `caught.has(slotId)` state when opening a filled slot. Changing the radio updates the variable only; Save commits it.

```
Save handler for freestyle:
  if pickerSelectedCard:
    setFreestyleSlot(state, idx, pickerSelectedCard)
    if pickerOwnedIntent: state.caught.add(String(idx))
    else:                 state.caught.delete(String(idx))
    saveState(state) [already called inside setFreestyleSlot]
    rebuildCollection()
  else:
    (no selection → do nothing, close modal)
```

**Default for new selections:** `pickerOwnedIntent = false` (Want). Matches the common Freestyle mental model ("I'm planning my binder, not inventorying what I have right now").

**Why a radio, not a toggle/checkbox?** Two clear named states with no ambiguity. A checkbox labeled "Owned" works too, but the radio pair surfaces "Placeholder" as an explicit first-class choice, which is the term the user used in the conversation.

### 4. Removing the owned/want menu item

`index.html` has a `<li data-action="toggle-owned">` item in the Freestyle slot menu. It's removed. The menu's remaining items are:

```
Change card
Remove
```

The `toggle-owned` click handler in `freestyleMenu.addEventListener('click', ...)` is removed along with the DOM item. The `openFreestyleMenu` function no longer needs to compute `isCaught` to set the toggle label.

Users who want to flip owned/want on an existing slot now go through: click slot → "Change card" → radio → Save. This is 3 clicks (vs 2 today for the menu toggle), but the user prefers a single source of truth; this was an explicit trade-off they confirmed.

### 5. "Change card" opens in cards mode

`openCardPicker(formId, pokemonName)` already loads cards directly when `pokemonName` is truthy. The `change-card` menu action currently calls `openCardPicker(slotId, '')` which routes to Pokemon search. We change it to read the slot's existing card's Pokemon name and pass it through:

```
case 'change-card':
  const slotIdx = parseInt(freestyleMenuSlotId, 10);
  const existingSlot = state.slots[slotIdx];
  const pokemonName = existingSlot ? existingSlot.name : '';
  openCardPicker(freestyleMenuSlotId, pokemonName);
```

Note: Freestyle card records store `name` at top level (we can see this from the slot rendering and the spec). If a record exists but is missing `name` (unlikely), fall back to empty string → Pokemon search.

`openCardPicker` also needs to pre-select the existing card and set `pickerOwnedIntent` to match `caught.has(slotId)`. Add a branch at the top of `openCardPicker`:

```
if (state.type === 'freestyle') {
  const slotIdx = parseInt(formId, 10);
  const existing = state.slots?.[slotIdx];
  if (existing) {
    pickerSelectedCard = existing;
    pickerOwnedIntent = state.caught.has(String(slotIdx));
  } else {
    pickerOwnedIntent = false;
  }
}
```

The Back button is still reachable from this state, so the user can swap Pokemon entirely if they want.

### 6. State machine summary

```
                        ┌───────────────┐
                        │ (closed)      │
                        └───────┬───────┘
                                │ click empty slot
                                ▼
                        ┌───────────────┐ ◀── click Back
                        │ pokemon-search│
                        │ filter focused│
                        └───────┬───────┘
                                │ Enter (focused or first) / click match
                                ▼
  click "Change card" ──▶┌───────────────┐
  (with existing card)   │ cards-mode    │
                         │ radio visible │
                         │ once selected │
                         └───────┬───────┘
                                 │ Save (card + ownedIntent) / Clear / X
                                 ▼
                         ┌───────────────┐
                         │ (closed)      │
                         └───────────────┘
```

## Risks / Trade-offs

**3-click owned flip vs current 2-click** → Removing the menu item costs one click for users doing bulk owned/want toggling. The user explicitly chose single source of truth over the shortcut. If bulk toggling emerges as a real pain later, a Shift+click shortcut on the slot is a cheap follow-up.

**Back discards selection** → If a user selects a card, realizes they want a different Pokemon, and hits Back, their selection is gone. Safer than silent persistence — otherwise the user might think they saved. An alternative (confirm dialog on discard) adds friction without meaningful safety.

**"Change card" assumes `existingSlot.name` is set** → Existing persisted slots may pre-date a rename of the field. The fallback to empty → Pokemon search handles any malformed records gracefully.

**Enter flush re-runs the async Pokemon search synchronously** → The Pokemon name search is local (in-memory filter over `getAllPokemon`), not an API call. Flushing the debounce is cheap (single-digit ms).

**Radio default of Want for new slots** → If most users end up immediately switching to Owned, we've just added a step. If usage data ever suggests this, flipping the default is a one-line change. For v1, Want preserves the current default behavior and makes Owned an explicit action.

## Open Questions

None remaining — all four open questions surfaced in explore mode were answered before capture.
