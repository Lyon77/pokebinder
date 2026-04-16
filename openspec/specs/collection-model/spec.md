## MODIFIED Requirements

### Requirement: Collection-aware data model
The system SHALL organize collection data into independent collection records. Each collection SHALL have a unique string ID, a display name, a `type` field (`"pokedex"`, `"master"`, or `"freestyle"`), a `layout` field, a caught set, and a books array. Type-specific fields: Pokedex collections store `generations`, `cardSelections`, `disabledCategories`, `excludedForms`. Master Set collections store `sets`, `slotList`. Freestyle collections store `pageCount`, `slots`.

#### Scenario: Collections are independent
- **WHEN** a card is marked as caught in one collection
- **THEN** the caught state of other collections is not affected

#### Scenario: Collection record structure
- **WHEN** a collection record is stored
- **THEN** it SHALL contain at minimum: id (string), name (string), type (string), layout (string), caught (string array), books (array of book objects), plus type-specific fields

### Requirement: Default collection on first load
The system SHALL create a default Pokedex collection with id "living-dex", name "Living Dex", type "pokedex", all generations selected, layout "3x3", and default books when no collections exist in IndexedDB.

#### Scenario: First ever load
- **WHEN** the app loads and IndexedDB has no collection records
- **THEN** a "Living Dex" Pokedex collection is created and set as active

#### Scenario: Subsequent load with existing collection
- **WHEN** the app loads and IndexedDB has at least one collection record
- **THEN** the previously active collection is loaded without creating a new default

### Requirement: Active collection selection
The system SHALL track which collection is currently active via localStorage. All UI interactions SHALL operate on the active collection. The header SHALL display the active collection's name.

#### Scenario: App loads with one collection
- **WHEN** the app starts and there is one collection in IndexedDB
- **THEN** that collection is set as the active collection

#### Scenario: Mutations apply to active collection only
- **WHEN** the user toggles a caught state or picks a card
- **THEN** the change is persisted to the active collection record in IndexedDB

### Requirement: Sync operates on active collection
The system SHALL sync the active collection's data to the configured GitHub Gist. The sync payload SHALL include the collection type, ID, name, and all type-specific fields.

#### Scenario: Push to Gist
- **WHEN** a mutation triggers a sync save
- **THEN** the active collection's full record is serialized and uploaded to the Gist as collection.json

#### Scenario: Pull from Gist
- **WHEN** remote data is received from the Gist
- **THEN** the data is loaded into the active collection, replacing its current state
