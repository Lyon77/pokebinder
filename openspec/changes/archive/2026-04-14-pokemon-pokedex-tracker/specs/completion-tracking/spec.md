## ADDED Requirements

### Requirement: User can mark a Pokemon as caught
The system SHALL allow the user to toggle any Pokemon (base or alternate form) between caught and uncaught states by clicking/tapping a checkbox or the Pokemon's row/slot.

#### Scenario: Mark a Pokemon as caught
- **WHEN** the user clicks the checkbox for an uncaught Pokemon
- **THEN** the Pokemon is marked as caught and the checkbox displays a filled/checked state

#### Scenario: Unmark a Pokemon
- **WHEN** the user clicks the checkbox for a caught Pokemon
- **THEN** the Pokemon is marked as uncaught and the checkbox displays an empty/unchecked state

#### Scenario: Toggle from binder view
- **WHEN** the user clicks a binder slot
- **THEN** the caught status for that Pokemon SHALL toggle and both list and binder views SHALL reflect the change

### Requirement: Caught state persists across sessions
The system SHALL persist all caught/uncaught states in browser localStorage using the unique `formId` as the key, so that data survives page reloads and browser restarts.

#### Scenario: State survives reload
- **WHEN** the user marks Pikachu as caught and reloads the page
- **THEN** Pikachu SHALL still appear as caught

#### Scenario: State survives browser restart
- **WHEN** the user closes and reopens the browser
- **THEN** all previously caught Pokemon SHALL still appear as caught (subject to browser localStorage policies)

#### Scenario: Alternate form caught state is independent
- **WHEN** the user marks Alolan Vulpix as caught but not base Vulpix
- **THEN** Alolan Vulpix SHALL appear caught and base Vulpix SHALL appear uncaught

### Requirement: User can export their data
The system SHALL provide an export button that downloads the current caught state, form preferences, and binder layout as a JSON file.

#### Scenario: Export data
- **WHEN** the user clicks the "Export" button
- **THEN** a JSON file containing caught formIds, form preferences, and binder layout is downloaded

### Requirement: User can import previously exported data
The system SHALL provide an import mechanism that restores all state from a previously exported JSON file.

#### Scenario: Import data
- **WHEN** the user selects a valid exported JSON file via the import control
- **THEN** the caught state, form preferences, and binder layout are restored and the UI updates immediately

#### Scenario: Import invalid file
- **WHEN** the user selects a file that is not valid export JSON
- **THEN** the system SHALL display an error message and not modify the current state

### Requirement: User can reset all progress
The system SHALL provide a "Reset All" action that clears all caught state, with a confirmation prompt to prevent accidental data loss. Form preferences and binder layout are NOT reset.

#### Scenario: Reset with confirmation
- **WHEN** the user clicks "Reset All"
- **THEN** the system SHALL display a confirmation dialog before clearing any data

#### Scenario: Confirmed reset
- **WHEN** the user confirms the reset action
- **THEN** all Pokemon are marked as uncaught; form preferences and binder layout remain unchanged
