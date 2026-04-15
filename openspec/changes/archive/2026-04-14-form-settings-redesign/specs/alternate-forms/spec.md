## MODIFIED Requirements

### Requirement: User can toggle form categories on or off
The system SHALL provide toggle controls for each form category (e.g., "Regional Forms", "Mega Evolutions", "Gigantamax") AND for each species-specific sub-group within "Other Forms" (e.g., "Rotom Forms", "Deoxys Forms", "Lycanroc Forms"). Each toggle is presented as a styled switch in a collapsible accordion header. When a category or sub-group is disabled, all its forms are excluded from the collection, list view, binder view, and stats.

#### Scenario: Disable a form category
- **WHEN** the user turns off the "Mega Evolutions" toggle switch
- **THEN** all Mega Evolution forms SHALL be removed from the collection list, binder view, and completion stats, and the accordion body SHALL be visually dimmed and non-interactive

#### Scenario: Enable a form category
- **WHEN** the user turns on the "Regional Forms" toggle switch
- **THEN** all regional variant forms SHALL appear in the collection and the accordion body SHALL become interactive

#### Scenario: Disable a species sub-group
- **WHEN** the user turns off the "Rotom Forms" toggle switch
- **THEN** all Rotom alternate forms (Heat, Wash, Frost, Fan, Mow) SHALL be removed from the collection

#### Scenario: Default state
- **WHEN** the application loads for the first time (no saved preferences)
- **THEN** all form categories and sub-groups SHALL be enabled by default

### Requirement: Form settings use accordion layout
The system SHALL present form settings as collapsible accordion sections. Each section has a header showing the category icon, name, form count, a toggle switch, and an expand/collapse chevron. Clicking the header expands or collapses the section to reveal individual form rows.

#### Scenario: Expand a category
- **WHEN** the user clicks on a collapsed category header
- **THEN** the section SHALL expand with a smooth animation to reveal individual form toggles

#### Scenario: Collapse a category
- **WHEN** the user clicks on an expanded category header
- **THEN** the section SHALL collapse with a smooth animation

#### Scenario: Toggle switch does not trigger expand
- **WHEN** the user clicks the toggle switch on a category header
- **THEN** the category's enabled state SHALL change but the accordion SHALL NOT expand or collapse

### Requirement: Individual forms shown as compact rows with mini-toggles
Each individual form within an expanded category SHALL be displayed as a compact row showing the Pokedex number, Pokemon name, form name, and a mini-toggle switch.

#### Scenario: Form row content
- **WHEN** a category is expanded
- **THEN** each form row SHALL display the Pokedex number (e.g., "#479"), the Pokemon name, the form name in muted text (e.g., "(Heat)"), and a mini-toggle switch

#### Scenario: Toggle an individual form
- **WHEN** the user clicks a form row or its mini-toggle
- **THEN** the form's included state SHALL toggle

### Requirement: "Other Forms" split into species sub-groups
The "Other Forms" category SHALL be split into species-specific sub-groups where a species has 2 or more alternate forms. Each sub-group SHALL have its own accordion section with a category-level toggle. Remaining forms with only 1 alternate form SHALL appear in an "Other Misc. Forms" catch-all group.

#### Scenario: Species sub-groups displayed
- **WHEN** the user opens form settings
- **THEN** they SHALL see separate accordion sections for Rotom Forms, Deoxys Forms, Lycanroc Forms, Oricorio Forms, Necrozma Forms, Urshifu Forms, Calyrex Forms, and others, each with their own toggle

#### Scenario: Section divider
- **WHEN** form settings are displayed
- **THEN** a visual divider labeled "Other Form Groups" SHALL separate the main categories (Regional, Mega, Gigantamax) from the species sub-groups

### Requirement: Disabled category dims form rows
When a category toggle is turned off, the accordion body for that category SHALL be visually dimmed and form rows SHALL be non-interactive (pointer events disabled).

#### Scenario: Disabled category appearance
- **WHEN** the "Gigantamax" toggle is off
- **THEN** the accordion body SHALL appear dimmed/faded and individual form toggles SHALL not be clickable

#### Scenario: Re-enabling restores interactivity
- **WHEN** the user turns the "Gigantamax" toggle back on
- **THEN** the accordion body SHALL return to normal appearance and form toggles SHALL be clickable

### Requirement: User can toggle individual alternate forms
The system SHALL allow the user to include or exclude individual alternate forms beyond the category-level toggle, for fine-grained control over which forms are in the collection.

#### Scenario: Exclude a single form
- **WHEN** the user excludes Alolan Raichu while "Regional Forms" category is enabled
- **THEN** Alolan Raichu is removed from the collection but other regional forms remain

#### Scenario: Form excluded by category cannot be individually included
- **WHEN** the "Mega Evolutions" category is disabled
- **THEN** individual mega forms SHALL NOT be available for individual inclusion (category toggle takes precedence)

### Requirement: Form preferences persist across sessions
The system SHALL save form category toggles (including sub-group toggles) and individual form exclusions in localStorage.

#### Scenario: Preferences survive reload
- **WHEN** the user disables "Rotom Forms" and reloads the page
- **THEN** Rotom forms SHALL still be excluded

### Requirement: Base forms cannot be excluded
The system SHALL NOT allow users to exclude base/default forms. Only alternate forms (where `isDefault` is false) can be toggled.

#### Scenario: Base form always visible
- **WHEN** the user views the form settings
- **THEN** base forms SHALL NOT appear in the form settings modal

### Requirement: Export and import include form preferences
The system's export/import functionality SHALL include form category, sub-group, and individual form preferences alongside caught state, so that restoring a backup fully restores the user's collection configuration.

#### Scenario: Export includes form preferences
- **WHEN** the user exports their data
- **THEN** the exported JSON SHALL contain caught state, category preferences, and sub-group preferences

#### Scenario: Import restores form preferences
- **WHEN** the user imports a backup file
- **THEN** form preferences SHALL be restored along with caught state
