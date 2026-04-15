## ADDED Requirements

### Requirement: User can search Pokemon by name
The system SHALL provide a text input that filters the displayed Pokemon list in real-time as the user types. The search SHALL match against Pokemon names and form names using case-insensitive substring matching.

#### Scenario: Search by partial name
- **WHEN** the user types "char" in the search box
- **THEN** Pokemon whose names contain "char" (Charmander, Charmeleon, Charizard, and their alternate forms) SHALL be displayed and all others hidden

#### Scenario: Search by form name
- **WHEN** the user types "alolan"
- **THEN** all Pokemon with "Alolan" in their form name SHALL be displayed

#### Scenario: Search is case-insensitive
- **WHEN** the user types "PIKA"
- **THEN** Pikachu and its alternate forms SHALL be displayed

#### Scenario: Empty search shows all
- **WHEN** the user clears the search box
- **THEN** all Pokemon (subject to active generation and form filters) SHALL be displayed

### Requirement: User can search Pokemon by number
The system SHALL allow searching by Pokedex number. Typing a number SHALL match Pokemon whose Pokedex number starts with or equals that number.

#### Scenario: Search by exact number
- **WHEN** the user types "25" in the search box
- **THEN** Pokemon #25 (Pikachu) and all its forms SHALL be displayed, along with any Pokemon whose number starts with "25" (e.g., #250, #251)

### Requirement: User can filter by generation
The system SHALL provide toggle buttons for each generation (Gen I through Gen IX). The user can select one or more generations to display only Pokemon from those generations.

#### Scenario: Single generation filter
- **WHEN** the user selects only "Gen I"
- **THEN** only Pokemon from Gen I (base forms and active alternate forms) SHALL be displayed

#### Scenario: Multiple generation filter
- **WHEN** the user selects "Gen I" and "Gen III"
- **THEN** only Pokemon from Gen I and Gen III SHALL be displayed

#### Scenario: No generation selected shows all
- **WHEN** no generation filter buttons are active (or all are active)
- **THEN** all Pokemon in the active collection SHALL be displayed

### Requirement: Search and filter combine with AND logic
The system SHALL apply search text and generation filters simultaneously. A Pokemon is displayed only if it matches both the search text AND the active generation filter(s).

#### Scenario: Combined search and filter
- **WHEN** the user types "char" and selects "Gen I"
- **THEN** only Charmander, Charmeleon, Charizard, and their Gen I forms SHALL be displayed (not Charcadet from Gen IX)

### Requirement: Filters apply to both list and binder views
The system SHALL apply search and generation filters to whichever view is currently active (list or binder).

#### Scenario: Filter in binder view
- **WHEN** the user applies a generation filter while in binder view
- **THEN** the binder SHALL only display Pokemon matching the filter and page count SHALL adjust
