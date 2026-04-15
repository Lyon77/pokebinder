## MODIFIED Requirements

### Requirement: Both numbers are visually distinct
The system SHALL display the collection position number as an accent-colored pill badge and the National Pokedex number as a muted pill badge. Both pills are displayed inline on the same line within each list row.

#### Scenario: Pill badge display
- **WHEN** a Pokemon entry is displayed in the list view
- **THEN** the collection number SHALL appear as a small rounded badge with accent background and white text (e.g., `#28`), and the Pokedex number SHALL appear as a small rounded badge with muted background and muted text (e.g., `18`)

#### Scenario: Numbers are compact
- **WHEN** viewing the 3-column list layout
- **THEN** the pill badges SHALL be compact enough to fit alongside the Pokemon name without causing overflow

### Requirement: Type information is not shown in list view
The list view SHALL NOT display Pokemon type badges. Type information is omitted to keep the layout compact for the 3-column grid.

#### Scenario: No type badges
- **WHEN** a Pokemon is rendered in list view
- **THEN** no type badges (fire, water, grass, etc.) SHALL be displayed
