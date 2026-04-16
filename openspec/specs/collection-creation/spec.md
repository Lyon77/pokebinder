## ADDED Requirements

### Requirement: Collection creation modal
The system SHALL provide a modal for creating new collections, accessible from the collection switcher dropdown's "+ New Collection" option. The modal SHALL have a two-step flow: type selection, then type-specific configuration.

#### Scenario: Open creation modal
- **WHEN** the user clicks "+ New Collection" in the collection dropdown
- **THEN** a modal appears with a name field and three type cards (Pokedex, Master Set, Freestyle)

#### Scenario: Type selection
- **WHEN** the user clicks a type card
- **THEN** the card is highlighted as selected and the modal advances to type-specific configuration

### Requirement: Pokedex creation config
The Pokedex creation step SHALL display a generation grid (Gen I through Gen IX) with checkboxes and a page layout selector (3x3, 3x4, 4x3, 4x4).

#### Scenario: Select generations
- **WHEN** the user checks Gen I and Gen II
- **THEN** the collection will be created with `generations: [1, 2]`

#### Scenario: No generations selected
- **WHEN** the user has not checked any generation and clicks Create
- **THEN** the Create button SHALL be disabled or an error is shown

### Requirement: Master Set creation config
The Master Set creation step SHALL display a set search input that queries the TCG API `/v2/sets` endpoint, a results list with Add buttons, a selected sets list with Remove buttons showing card/slot counts, and a page layout selector.

#### Scenario: Search for sets
- **WHEN** the user types "Crown" in the set search input
- **THEN** the system queries the TCG API and displays matching sets with name, year, and card count

#### Scenario: Add a set
- **WHEN** the user clicks Add on "Crown Zenith"
- **THEN** the system fetches all cards in that set, expands variants, and adds it to the selected sets list showing the total slot count

#### Scenario: Remove a set
- **WHEN** the user clicks the remove button on a selected set
- **THEN** the set is removed from the selected list

#### Scenario: No sets selected
- **WHEN** the user has not added any sets and clicks Create
- **THEN** the Create button SHALL be disabled or an error is shown

### Requirement: Freestyle creation config
The Freestyle creation step SHALL display a page layout selector and a page count input.

#### Scenario: Set page count
- **WHEN** the user enters 8 pages with a 3x3 layout
- **THEN** the display shows "= 72 slots" and the collection will be created with 72 null slots

### Requirement: Page layout selection
The creation modal SHALL display visual layout options (3x3, 3x4, 4x3, 4x4) as clickable cards showing a mini grid preview.

#### Scenario: Select layout
- **WHEN** the user clicks the 4x3 layout card
- **THEN** that layout is highlighted and will be stored in the collection's `layout` field

### Requirement: Create button saves collection
The Create button SHALL save the new collection to IndexedDB, set it as active, and close the modal. The UI SHALL refresh to show the new collection.

#### Scenario: Create Pokedex collection
- **WHEN** the user fills in name "Kanto Dex", selects Pokedex type, checks Gen I, selects 3x3 layout, and clicks Create
- **THEN** a new collection record is saved to IndexedDB with the specified config, it becomes the active collection, and the binder shows Gen I Pokemon

#### Scenario: Create Master Set collection
- **WHEN** the user creates a Master Set with Crown Zenith and 151
- **THEN** the collection record includes the expanded slotList for both sets and the binder shows all variant slots
