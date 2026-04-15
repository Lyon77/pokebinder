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
The system SHALL display the collection position number as an accent-colored pill badge and the National Pokedex number as a muted pill badge. Both pills are displayed inline on the same line within each list row.

#### Scenario: Pill badge display
- **WHEN** a Pokemon entry is displayed in the list view
- **THEN** the collection number SHALL appear as a small rounded badge with accent background and white text (e.g., `#28`), and the Pokedex number SHALL appear as a small rounded badge with muted background and muted text (e.g., `18`)

#### Scenario: Numbers are compact
- **WHEN** viewing the 3-column list layout
- **THEN** the pill badges SHALL be compact enough to fit alongside the Pokemon name without causing overflow

### Requirement: Binder view uses per-book numbering
In the binder view, each Pokemon SHALL display a book position number that is sequential within the current book (starting at 1). This number restarts for each book and represents the physical slot position in that binder.

#### Scenario: Book numbering restarts per book
- **WHEN** Book 1 has Gen I (151 base Pokemon) and Book 2 has Gen II
- **THEN** Book 2's first Pokemon (Chikorita) SHALL have book position #1, not #152

#### Scenario: Book number reflects form preferences
- **WHEN** the user disables Mega Evolutions and views a book
- **THEN** the book position numbers SHALL recalculate to be sequential without gaps

### Requirement: List view retains global collection numbering
The list view SHALL continue to display the global sequential collection number (across all Pokemon in the active collection) and the National Pokedex number, unchanged from current behavior.

#### Scenario: List view unaffected by books
- **WHEN** the user has configured multiple books
- **THEN** the list view SHALL still show global collection # and Dex #, not book-specific numbers

### Requirement: Type information is not shown in list view
The list view SHALL NOT display Pokemon type badges. Type information is omitted to keep the layout compact for the 3-column grid.

#### Scenario: No type badges
- **WHEN** a Pokemon is rendered in list view
- **THEN** no type badges (fire, water, grass, etc.) SHALL be displayed
