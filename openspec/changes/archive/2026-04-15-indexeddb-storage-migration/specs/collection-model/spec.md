## ADDED Requirements

### Requirement: Collection-aware data model
The system SHALL organize collection data into independent collection records. Each collection SHALL have a unique string ID, a display name, and its own caught set, cardSelections map, disabledCategories, excludedForms, and books array.

#### Scenario: Collections are independent
- **WHEN** a card is marked as caught in one collection
- **THEN** the caught state of other collections is not affected

#### Scenario: Collection record structure
- **WHEN** a collection record is stored
- **THEN** it SHALL contain: id (string), name (string), caught (string array), cardSelections (object mapping formId to card data), disabledCategories (string array), excludedForms (string array), books (array of book objects)

### Requirement: Default collection on first load
The system SHALL create a default collection with id "living-dex" and name "Living Dex" when no collections exist in IndexedDB. The default collection SHALL have an empty caught set, empty cardSelections, empty disabledCategories, empty excludedForms, and one book containing all generations (1-9).

#### Scenario: First ever load
- **WHEN** the app loads and IndexedDB has no collection records
- **THEN** a "Living Dex" collection is created and set as active

#### Scenario: Subsequent load with existing collection
- **WHEN** the app loads and IndexedDB has at least one collection record
- **THEN** the previously active collection is loaded without creating a new default

### Requirement: Active collection selection
The system SHALL track which collection is currently active. All UI interactions (toggling caught, picking cards, viewing binder) SHALL operate on the active collection.

#### Scenario: App loads with one collection
- **WHEN** the app starts and there is one collection in IndexedDB
- **THEN** that collection is set as the active collection

#### Scenario: Mutations apply to active collection only
- **WHEN** the user toggles a caught state or picks a card
- **THEN** the change is persisted to the active collection record in IndexedDB

### Requirement: Sync operates on active collection
The system SHALL sync the active collection's data to the configured GitHub Gist. The sync payload SHALL include the collection ID and name alongside the existing caught, cardSelections, and settings fields.

#### Scenario: Push to Gist
- **WHEN** a mutation triggers a sync save
- **THEN** the active collection's full record is serialized and uploaded to the Gist as collection.json

#### Scenario: Pull from Gist
- **WHEN** remote data is received from the Gist
- **THEN** the data is loaded into the active collection, replacing its current state
