## ADDED Requirements

### Requirement: User can toggle form categories on or off
The system SHALL provide toggle controls for each form category (e.g., "Regional Forms", "Mega Evolutions", "Gigantamax", "Other Forms"). When a category is disabled, all forms in that category are excluded from the collection, list view, binder view, and stats.

#### Scenario: Disable a form category
- **WHEN** the user disables "Mega Evolutions"
- **THEN** all Mega Evolution forms SHALL be removed from the collection list, binder view, and completion stats, and collection numbers SHALL be recalculated

#### Scenario: Enable a form category
- **WHEN** the user enables "Regional Forms"
- **THEN** all regional variant forms SHALL appear in the collection list, binder view, and completion stats, and collection numbers SHALL be recalculated

#### Scenario: Default state
- **WHEN** the application loads for the first time (no saved preferences)
- **THEN** all form categories SHALL be enabled by default

### Requirement: User can toggle individual alternate forms
The system SHALL allow the user to include or exclude individual alternate forms beyond the category-level toggle, for fine-grained control over which forms are in the collection.

#### Scenario: Exclude a single form
- **WHEN** the user excludes Alolan Raichu while "Regional Forms" category is enabled
- **THEN** Alolan Raichu is removed from the collection but other regional forms remain

#### Scenario: Form excluded by category cannot be individually included
- **WHEN** the "Mega Evolutions" category is disabled
- **THEN** individual mega forms SHALL NOT be available for individual inclusion (category toggle takes precedence)

### Requirement: Form preferences persist across sessions
The system SHALL save form category toggles and individual form exclusions in localStorage.

#### Scenario: Preferences survive reload
- **WHEN** the user disables "Gigantamax" forms and reloads the page
- **THEN** Gigantamax forms SHALL still be excluded

### Requirement: Base forms cannot be excluded
The system SHALL NOT allow users to exclude base/default forms. Only alternate forms (where `isDefault` is false) can be toggled.

#### Scenario: Base form always visible
- **WHEN** the user views the form settings
- **THEN** base forms (e.g., standard Pikachu) SHALL NOT have a toggle and SHALL always be included

### Requirement: Export and import include form preferences
The system's export/import functionality SHALL include form category and individual form preferences alongside caught state, so that restoring a backup fully restores the user's collection configuration.

#### Scenario: Export includes form preferences
- **WHEN** the user exports their data
- **THEN** the exported JSON SHALL contain both caught state and form preferences

#### Scenario: Import restores form preferences
- **WHEN** the user imports a backup file
- **THEN** form preferences SHALL be restored along with caught state
