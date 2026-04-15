## ADDED Requirements

### Requirement: Each Pokemon displays its National Pokedex number
The system SHALL display the National Pokedex number for every Pokemon entry. Alternate forms SHALL display the same Pokedex number as their base form.

#### Scenario: Base form Pokedex number
- **WHEN** Bulbasaur is displayed
- **THEN** its Pokedex number SHALL show as #1

#### Scenario: Alternate form Pokedex number
- **WHEN** Alolan Vulpix is displayed
- **THEN** its Pokedex number SHALL show as #37 (same as base Vulpix)

### Requirement: Each Pokemon displays its collection position number
The system SHALL assign and display a sequential 1-based collection position number to every Pokemon in the active collection. The collection is ordered by National Pokedex number, with alternate forms appearing immediately after their base form.

#### Scenario: Collection numbering with base forms only
- **WHEN** no alternate forms are enabled
- **THEN** collection numbers SHALL match Pokedex numbers (#1 = collection #1, #2 = collection #2, etc.)

#### Scenario: Collection numbering with alternate forms
- **WHEN** Alolan forms are enabled and there are 3 Alolan forms for Pokemon before #25
- **THEN** Pikachu's collection number SHALL be greater than 25 (shifted by the inserted alternate forms)

#### Scenario: Collection numbers are sequential with no gaps
- **WHEN** viewing the full collection
- **THEN** collection numbers SHALL be sequential from 1 to N where N is the total number of entries in the active collection

### Requirement: Collection numbers recalculate when forms change
The system SHALL recalculate all collection position numbers when the user enables or disables form categories or individual forms.

#### Scenario: Recalculation on form toggle
- **WHEN** the user disables "Mega Evolutions"
- **THEN** all collection numbers SHALL be recalculated to remove gaps, and the binder view SHALL update accordingly

### Requirement: Both numbers are visually distinct
The system SHALL visually distinguish the Pokedex number from the collection number so they are not confused (e.g., different labels, positions, or styling).

#### Scenario: Visual distinction
- **WHEN** a Pokemon entry is displayed
- **THEN** the Pokedex number and collection number SHALL be displayed with different labels or visual treatments (e.g., "Dex #25" and "Col #28")
