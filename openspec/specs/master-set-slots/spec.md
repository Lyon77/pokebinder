## ADDED Requirements

### Requirement: Set search via TCG API
The system SHALL query the TCG API `/v2/sets` endpoint to search for sets by name. Results SHALL display the set name, release year, and total card count.

#### Scenario: Search by name
- **WHEN** the user types "Crown" in the set search input
- **THEN** the system fetches sets matching that name and displays them as selectable results

#### Scenario: No results
- **WHEN** the user searches for a non-existent set name
- **THEN** the results area shows "No sets found"

### Requirement: Full set card fetch with variant expansion
When a set is added to a Master Set collection, the system SHALL fetch all cards in that set via `/v2/cards?q=set.id:X` (handling pagination for sets larger than 250 cards) and expand each card into variant slots based on the `tcgplayer.prices` keys.

#### Scenario: Variant expansion from tcgplayer prices
- **WHEN** a card has `tcgplayer.prices` keys `["normal", "reverseHolofoil"]`
- **THEN** two slots are created: `{cardId}:normal` and `{cardId}:reverseHolofoil`

#### Scenario: Card without tcgplayer data
- **WHEN** a card has no `tcgplayer` field or empty `prices`
- **THEN** one slot is created with variant `"default"`

#### Scenario: Pagination for large sets
- **WHEN** a set has more than 250 cards
- **THEN** the system fetches additional pages until all cards are retrieved

### Requirement: Slot list caching
The expanded slot list for a Master Set collection SHALL be stored in the collection's `slotList` field in IndexedDB. The slot list SHALL NOT be re-fetched from the API on subsequent loads.

#### Scenario: Load cached slot list
- **WHEN** the app loads a Master Set collection that already has a slotList
- **THEN** the slotList is read from IndexedDB without making API calls

### Requirement: Variant display names
The system SHALL map variant keys to human-readable labels: `normal` → "Normal", `reverseHolofoil` → "Rev. Holo", `holofoil` → "Holo", `1stEditionHolofoil` → "1st Ed. Holo", `1stEditionNormal` → "1st Ed.", `default` → "".

#### Scenario: Variant badge on binder slot
- **WHEN** a binder slot represents a `reverseHolofoil` variant
- **THEN** the slot displays a "REV HOLO" badge overlay

#### Scenario: No badge for single-variant cards
- **WHEN** a card has only one variant (e.g., Ultra Rare with only `holofoil`)
- **THEN** no variant badge is displayed

### Requirement: Master Set slot ordering
Slots within a Master Set book SHALL be ordered by card number (numeric sort), then by variant (normal before reverseHolofoil before holofoil).

#### Scenario: Slot order
- **WHEN** a Master Set book contains Crown Zenith
- **THEN** slots appear as: #1 Normal, #1 Rev. Holo, #2 Normal, #2 Rev. Holo, ..., #160 Holo

### Requirement: Master Set click behavior
Clicking a Master Set binder slot SHALL toggle its owned state (add/remove from caught set). No card picker is shown — the card is pre-assigned.

#### Scenario: Toggle owned
- **WHEN** the user clicks a want (greyed) Master Set slot
- **THEN** the slot becomes owned (full color, checkmark, added to caught set)

#### Scenario: Toggle back to want
- **WHEN** the user clicks an owned Master Set slot
- **THEN** the slot becomes want (greyed, removed from caught set)
