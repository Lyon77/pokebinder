## ADDED Requirements

### Requirement: Freestyle empty slot interaction
Clicking an empty Freestyle slot SHALL open the card picker, allowing the user to search for any Pokemon and select any card from any set.

#### Scenario: Add card to empty slot
- **WHEN** the user clicks an empty Freestyle slot and selects a Charizard card from Base Set
- **THEN** the slot stores the card data and displays in the "want" state (greyed out)

### Requirement: Freestyle filled slot interaction
Clicking a filled Freestyle slot SHALL present options to: toggle owned/want state, change the card (reopen card picker), or remove the card (return slot to empty).

#### Scenario: Mark as owned
- **WHEN** the user clicks a want (greyed) Freestyle slot and selects "Mark owned"
- **THEN** the slot becomes owned (full color, checkmark, added to caught set)

#### Scenario: Change card
- **WHEN** the user clicks a filled Freestyle slot and selects "Change card"
- **THEN** the card picker opens and the user can select a different card for that slot

#### Scenario: Remove card
- **WHEN** the user clicks a filled Freestyle slot and selects "Remove"
- **THEN** the slot returns to empty state and any caught entry is removed

#### Scenario: Toggle owned back to want
- **WHEN** the user clicks an owned Freestyle slot and selects "Mark as want"
- **THEN** the slot becomes want (greyed, removed from caught set) but the card remains assigned

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
