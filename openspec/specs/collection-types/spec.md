## ADDED Requirements

### Requirement: Three collection types
The system SHALL support three collection types: `pokedex`, `master`, and `freestyle`. Each collection record SHALL have a `type` field indicating its type.

#### Scenario: Pokedex type
- **WHEN** a collection has type `pokedex`
- **THEN** its slots are derived from `pokemon.json` filtered by the collection's `generations` array, and each slot represents a Pokemon form identified by `formId`

#### Scenario: Master Set type
- **WHEN** a collection has type `master`
- **THEN** its slots are derived from a cached `slotList` of TCG card variants, and each slot is identified by `{cardId}:{variant}`

#### Scenario: Freestyle type
- **WHEN** a collection has type `freestyle`
- **THEN** its slots are a fixed-length array where each entry is either null (empty) or card data, identified by array index

### Requirement: Pokedex collection configuration
A Pokedex collection SHALL store a `generations` array specifying which generations (1-9) are included. It SHALL also store `disabledCategories`, `excludedForms`, and `cardSelections` for form preferences and card display choices.

#### Scenario: Generation-scoped Pokedex
- **WHEN** a Pokedex collection has `generations: [1, 2]`
- **THEN** only Pokemon from Gen I and Gen II appear as slots in the binder

### Requirement: Master Set collection configuration
A Master Set collection SHALL store a `sets` array of TCG set IDs and a `slotList` array of expanded card variant records. Each slot record SHALL contain: `slotId`, `cardId`, `variant`, `name`, `number`, `setId`, `setName`, `rarity`, and `imageSmall`.

#### Scenario: Multiple sets in one collection
- **WHEN** a Master Set collection has `sets: ["swsh12pt5", "sv3pt5"]`
- **THEN** the `slotList` contains variant slots from both Crown Zenith and Pokemon 151

### Requirement: Freestyle collection configuration
A Freestyle collection SHALL store a `pageCount` and a `slots` array of length `pageCount * slotsPerPage`. Each slot entry is either null (empty) or an object with card data (`cardId`, `name`, `number`, `setName`, `imageSmall`).

#### Scenario: Freestyle with 8 pages of 3x3
- **WHEN** a Freestyle collection has `pageCount: 8` and `layout: "3x3"`
- **THEN** the `slots` array has length 72

### Requirement: Per-collection page layout
Each collection SHALL store a `layout` field (`"3x3"`, `"3x4"`, `"4x3"`, or `"4x4"`) that determines the binder page grid dimensions for that collection.

#### Scenario: Collection-specific layout
- **WHEN** the user switches from a Pokedex collection with layout "3x3" to a Master Set with layout "4x3"
- **THEN** the binder grid changes from 3 columns / 3 rows to 4 columns / 3 rows

### Requirement: Slot states per type
Pokedex slots SHALL support two states: empty (no card assigned) and owned (card assigned). Master Set slots SHALL support two states: want (not in caught set) and owned (in caught set). Freestyle slots SHALL support three states: empty (no card assigned), want (card assigned, not in caught set), and owned (card assigned, in caught set).

#### Scenario: Pokedex has no want state
- **WHEN** a user assigns a card to a Pokedex slot
- **THEN** the slot is automatically marked as owned (added to caught set)

#### Scenario: Master Set has no empty state
- **WHEN** a Master Set collection is created
- **THEN** every slot already has a card pre-assigned from the TCG API data

#### Scenario: Freestyle supports all three states
- **WHEN** a user assigns a card to a Freestyle slot without marking it owned
- **THEN** the slot displays in the "want" state (greyed out)
