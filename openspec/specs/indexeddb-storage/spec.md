## ADDED Requirements

### Requirement: IndexedDB database initialization
The system SHALL create an IndexedDB database named "pokebinder" with version 1 on first access. The database SHALL contain two object stores: "collections" (keyPath: "id") and "tcg-cache" (keyPath: "name").

#### Scenario: First load creates database
- **WHEN** the app loads and no "pokebinder" database exists
- **THEN** the database is created with both object stores

#### Scenario: Subsequent loads reuse existing database
- **WHEN** the app loads and the "pokebinder" database already exists at version 1
- **THEN** the existing database is opened without modification

### Requirement: Collection persistence via IndexedDB
The system SHALL read and write collection records to the "collections" object store. Each record SHALL contain: id (string), name (string), caught (string array), cardSelections (object), disabledCategories (string array), excludedForms (string array), and books (array).

#### Scenario: Save collection record
- **WHEN** a mutation occurs (toggle caught, select card, change settings)
- **THEN** the active collection's full record is written to the "collections" object store

#### Scenario: Load collection record at startup
- **WHEN** the app initializes
- **THEN** the active collection record is read from IndexedDB and used to populate in-memory state

### Requirement: TCG cache persistence via IndexedDB
The system SHALL read and write TCG card search results to the "tcg-cache" object store. Each record SHALL contain: name (string, lowercase), cards (array of card objects), and ts (number, milliseconds since epoch at write time).

#### Scenario: Cache card search results
- **WHEN** a TCG API fetch completes successfully for a pokemon name
- **THEN** the results are stored in the "tcg-cache" object store with the current timestamp

#### Scenario: Read cached card search results
- **WHEN** the card picker opens for a pokemon
- **THEN** the system checks IndexedDB for a cached result before making an API call

### Requirement: Settings remain in localStorage
The system SHALL continue to store view state (currentView, binderViewIndex, selectedBookIndex), global settings (binderLayout, binderFlow), and sync credentials (PAT, Gist ID) in localStorage.

#### Scenario: Layout change persists in localStorage
- **WHEN** the user changes the binder layout
- **THEN** the setting is written to localStorage, not IndexedDB

### Requirement: Legacy localStorage cleanup
The system SHALL remove all `tcg-cache-*` keys and the `pokedex-tracker` key from localStorage on startup.

#### Scenario: Old cache keys are cleaned up
- **WHEN** the app initializes
- **THEN** all localStorage keys matching `tcg-cache-*` and the `pokedex-tracker` key are removed

#### Scenario: Non-collection keys are preserved
- **WHEN** localStorage cleanup runs
- **THEN** keys for view state, sync credentials, and settings are NOT removed
