## MODIFIED Requirements

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
