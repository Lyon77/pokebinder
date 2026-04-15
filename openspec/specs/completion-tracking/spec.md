## ADDED Requirements

### Requirement: User can mark a Pokemon as caught
The system SHALL allow the user to toggle any Pokemon (base or alternate form) between caught and uncaught states by clicking/tapping anywhere on the Pokemon's row in the list view.

#### Scenario: Mark a Pokemon as caught via row click
- **WHEN** the user clicks anywhere on an uncaught Pokemon's row in list view
- **THEN** the Pokemon is marked as caught and the row's dot indicator fills with green

#### Scenario: Unmark a Pokemon via row click
- **WHEN** the user clicks anywhere on a caught Pokemon's row in list view
- **THEN** the Pokemon is marked as uncaught and the row's dot indicator becomes hollow

#### Scenario: Caught visual indicator
- **WHEN** a Pokemon is caught
- **THEN** the row SHALL display a filled green dot, a green-tinted background, and the dot indicator SHALL be clearly distinguishable from the uncaught hollow dot

#### Scenario: Uncaught visual indicator
- **WHEN** a Pokemon is uncaught
- **THEN** the row SHALL display a hollow dot with a border matching the theme

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
The system SHALL provide an export button that downloads the current caught state, form preferences, binder layout, and book configuration as a JSON file.

#### Scenario: Export includes book configuration
- **WHEN** the user clicks "Export"
- **THEN** the exported JSON SHALL contain the `books` array alongside caught state, form preferences, and binder layout

### Requirement: User can import previously exported data
The system SHALL restore book configuration from imported data. If the imported file has no book configuration, the default single book is used.

#### Scenario: Import with books
- **WHEN** the user imports a file containing book configuration
- **THEN** the books SHALL be restored and the binder view SHALL reflect them

#### Scenario: Import without books (legacy file)
- **WHEN** the user imports a file with no `books` field
- **THEN** the default "All Pokemon" book SHALL be used

### Requirement: User can reset all progress
The system SHALL provide a "Reset All" action that clears all caught state, with a confirmation prompt to prevent accidental data loss. Form preferences and binder layout are NOT reset.

#### Scenario: Reset with confirmation
- **WHEN** the user clicks "Reset All"
- **THEN** the system SHALL display a confirmation dialog before clearing any data

#### Scenario: Confirmed reset
- **WHEN** the user confirms the reset action
- **THEN** all Pokemon are marked as uncaught; form preferences and binder layout remain unchanged
