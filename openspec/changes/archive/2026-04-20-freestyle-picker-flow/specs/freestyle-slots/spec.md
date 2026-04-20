## MODIFIED Requirements

### Requirement: Freestyle empty slot interaction
Clicking an empty Freestyle slot SHALL open the card picker in Pokemon-search mode, allowing the user to search for any Pokemon, select a card, and choose whether the card is owned or a placeholder (want) before saving.

#### Scenario: Add card to empty slot as placeholder
- **WHEN** the user clicks an empty Freestyle slot, searches for Charizard, selects a card, leaves the "Placeholder" radio selected, and clicks Save
- **THEN** the slot stores the card data and displays in the want state (greyed out), and is NOT added to the caught set

#### Scenario: Add card to empty slot as owned
- **WHEN** the user clicks an empty Freestyle slot, searches for Charizard, selects a card, chooses the "Owned" radio, and clicks Save
- **THEN** the slot stores the card data, is added to the caught set, and displays as owned (full color, checkmark, green border)

#### Scenario: Cancel without saving
- **WHEN** the user opens the picker for an empty slot, selects a card, and closes the modal without clicking Save
- **THEN** the slot remains empty and the caught set is unchanged

### Requirement: Freestyle filled slot interaction
Clicking a filled Freestyle slot SHALL present a context menu with options to change the card or remove the card. Changing the card SHALL reopen the card picker in cards mode for the slot's current Pokemon, with the current card pre-selected and the Want/Owned radio reflecting the current caught state.

#### Scenario: Change card opens in cards mode for current Pokemon
- **WHEN** the user clicks a filled Freestyle slot containing a Charizard card and selects "Change card"
- **THEN** the card picker opens directly to the cards list for Charizard (skipping Pokemon search), the existing card is highlighted as selected, and the Want/Owned radio reflects the slot's current owned state

#### Scenario: Change card with Back navigation to pick a different Pokemon
- **WHEN** the user clicks "Change card" on a filled slot and then clicks the Back button in the picker header
- **THEN** the picker transitions to Pokemon-search mode with an empty filter input, discarding any in-progress selection

#### Scenario: Flip owned/want via picker
- **WHEN** the user clicks "Change card" on an owned slot, makes no card change, switches the radio to "Placeholder", and clicks Save
- **THEN** the slot remains assigned to the same card but is removed from the caught set and displays as want

#### Scenario: Remove card
- **WHEN** the user clicks a filled Freestyle slot and selects "Remove"
- **THEN** the slot returns to empty state and any caught entry is removed

### Requirement: Freestyle slot persistence
Freestyle slot data SHALL be stored as an ordered array in the collection record. Each entry is either null (empty) or an object containing `cardId`, `name`, `number`, `setName`, `setYear`, `rarity`, and `imageSmall`.

#### Scenario: Persist slot assignments
- **WHEN** the user assigns cards to slots 0, 2, and 5 of a Freestyle collection
- **THEN** the `slots` array has card data at indices 0, 2, and 5 with null at all other positions

### Requirement: Freestyle page count
A Freestyle collection SHALL have a fixed number of pages determined at creation time. The total slot count is `pageCount * slotsPerPage` (derived from the layout).

#### Scenario: Page count determines slot count
- **WHEN** a Freestyle collection is created with 10 pages and 3x3 layout
- **THEN** the collection has 90 slots (10 * 9)

## ADDED Requirements

### Requirement: Freestyle card picker owned/want selector
When the active collection is Freestyle, the card picker SHALL display a Want/Owned radio selector that appears whenever a card is selected. The selector's initial value SHALL be "Placeholder" for a new slot and SHALL reflect the slot's current caught state when editing a filled slot. Saving the picker SHALL apply both the card assignment and the caught state atomically.

#### Scenario: Radio hidden before card selection
- **WHEN** the Freestyle picker is open but no card has been selected yet
- **THEN** the Want/Owned radio is hidden

#### Scenario: Radio appears on selection
- **WHEN** the user clicks a card in the grid
- **THEN** the Want/Owned radio appears with "Placeholder" selected by default (for new slots)

#### Scenario: Radio pre-fills from existing caught state
- **WHEN** the user opens the picker for a filled slot that is in the caught set
- **THEN** the radio's "Owned" option is pre-selected

### Requirement: Freestyle card picker Enter-in-search behavior
When the Freestyle card picker is in Pokemon-search mode and the filter input is focused, pressing Enter SHALL select a Pokemon using the following rule: if an item in the results grid is focused, click it; otherwise click the first item in the results grid; if there are no results, do nothing. Any pending search debounce SHALL be flushed synchronously before the selection is attempted, so that typing followed by an immediate Enter still finds matches.

#### Scenario: Enter selects first match when no item focused
- **WHEN** the user types "char" in Pokemon search and presses Enter while the filter input remains focused
- **THEN** the picker navigates to cards mode for the first matching Pokemon (e.g., Charizard)

#### Scenario: Enter selects focused match when arrow-navigated
- **WHEN** the user types "char", presses ArrowDown to focus the second match, then presses Enter
- **THEN** the picker navigates to cards mode for that focused Pokemon, not the first match

#### Scenario: Enter before debounce fires still works
- **WHEN** the user types "charizard" and presses Enter within 150 ms (before the input debounce elapses)
- **THEN** the search is flushed and the picker navigates to cards mode for Charizard

#### Scenario: Enter with no matches is a no-op
- **WHEN** the user types a query that matches no Pokemon and presses Enter
- **THEN** the picker remains in Pokemon-search mode with no state change

### Requirement: Freestyle card picker Back navigation
When the Freestyle card picker is in cards mode, the picker header SHALL display a Back button. Clicking Back SHALL return the picker to Pokemon-search mode with an empty filter, discarding any in-progress card selection. The Back button SHALL NOT be displayed in Pokemon-search mode.

#### Scenario: Back returns to Pokemon search with empty filter
- **WHEN** the user is in cards mode for Charizard and clicks the Back button
- **THEN** the picker transitions to Pokemon-search mode, the filter input is cleared, and the filter input is focused

#### Scenario: Back discards in-progress selection
- **WHEN** the user has selected a card in cards mode but not yet saved, then clicks Back
- **THEN** the selection is cleared; navigating forward again shows no card selected

#### Scenario: Back hidden in Pokemon-search mode
- **WHEN** the picker is in Pokemon-search mode
- **THEN** the Back button is not visible

## REMOVED Requirements

### Requirement: Mark as owned via slot menu
**Reason**: Replaced by the Want/Owned radio selector in the card picker. Flipping owned/want is now expressed during the card-picker save flow instead of the slot context menu.

**Migration**: No data migration needed. Users who previously flipped state via the slot menu now do so via "Change card" → radio → Save.

### Requirement: Toggle owned back to want via slot menu
**Reason**: Replaced by the Want/Owned radio selector in the card picker. The slot context menu no longer carries an owned/want toggle.

**Migration**: No data migration needed.
