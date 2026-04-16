## ADDED Requirements

### Requirement: Collection dropdown switcher
The system SHALL replace the static header title with a clickable collection name that opens a dropdown menu listing all collections. The dropdown SHALL show each collection's name and type badge, a checkmark next to the active collection, and a "+ New Collection" option.

#### Scenario: Open dropdown
- **WHEN** the user clicks the collection name in the header
- **THEN** a dropdown appears listing all collections from IndexedDB with their type badges

#### Scenario: Switch collection
- **WHEN** the user clicks a different collection in the dropdown
- **THEN** that collection becomes active, the active ID is saved to localStorage, the UI refreshes to show the new collection's binder/stats, and the dropdown closes

#### Scenario: Active collection indicator
- **WHEN** the dropdown is open
- **THEN** the currently active collection has a checkmark next to it

#### Scenario: New collection shortcut
- **WHEN** the user clicks "+ New Collection" in the dropdown
- **THEN** the collection creation modal opens

### Requirement: Collection deletion
The dropdown SHALL provide a way to delete collections. The user MUST confirm before deletion. The last remaining collection SHALL NOT be deletable.

#### Scenario: Delete a collection
- **WHEN** the user triggers delete on a non-active collection and confirms
- **THEN** the collection is removed from IndexedDB and disappears from the dropdown

#### Scenario: Delete active collection
- **WHEN** the user deletes the active collection and confirms
- **THEN** the collection is removed and the first remaining collection becomes active

#### Scenario: Cannot delete last collection
- **WHEN** only one collection exists
- **THEN** the delete option is hidden or disabled

### Requirement: Active collection persists across sessions
The system SHALL store the active collection ID in localStorage. On app load, the system SHALL restore the last active collection.

#### Scenario: Reload preserves active collection
- **WHEN** the user is viewing "Crown Zenith" and reloads the page
- **THEN** "Crown Zenith" is loaded as the active collection
