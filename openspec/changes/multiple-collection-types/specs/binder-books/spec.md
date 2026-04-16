## MODIFIED Requirements

### Requirement: User can create named books
The system SHALL allow the user to create named books. For Pokedex collections, each book is assigned a set of generations. For Master Set collections, each book is assigned a set of TCG set IDs. A book groups slots from its assigned sources into a separate binder section.

#### Scenario: Create a Pokedex book
- **WHEN** the user adds a new book named "Kanto & Johto" with generations 1 and 2 in a Pokedex collection
- **THEN** the book SHALL appear in the book selector and contain all Pokemon from Gen I and Gen II

#### Scenario: Create a Master Set book
- **WHEN** the user adds a new book named "Crown Zenith" with set "swsh12pt5" in a Master Set collection
- **THEN** the book SHALL contain all card variant slots from that set

#### Scenario: Book name
- **WHEN** the user creates a book
- **THEN** the user SHALL provide a name for the book (free text)

### Requirement: All sources must be assigned to a book
The system SHALL enforce that every generation (for Pokedex) or every set (for Master Set) is assigned to exactly one book. The book settings UI SHALL show which sources are unassigned.

#### Scenario: Unassigned generation warning
- **WHEN** the user has not assigned Gen V to any book in a Pokedex collection
- **THEN** the book settings SHALL indicate Gen V is unassigned

#### Scenario: Unassigned set warning
- **WHEN** the user has not assigned "Crown Zenith" to any book in a Master Set collection
- **THEN** the book settings SHALL indicate it is unassigned

#### Scenario: Source cannot be in multiple books
- **WHEN** Gen I is already assigned to "Book 1"
- **THEN** Gen I SHALL NOT be available for assignment to another book

### Requirement: Book settings adapts to collection type
The book settings modal SHALL detect the active collection's type and display the appropriate source chips. Pokedex shows generation chips (Gen I through Gen IX, filtered to collection's selected generations). Master Set shows TCG set chips (based on collection's selected sets). Freestyle collections SHALL NOT have book settings.

#### Scenario: Pokedex book settings
- **WHEN** the user opens book settings for a Pokedex collection with generations [1, 2, 3]
- **THEN** the modal shows draggable chips for Gen I, Gen II, Gen III

#### Scenario: Master Set book settings
- **WHEN** the user opens book settings for a Master Set collection with sets ["swsh12pt5", "sv3pt5"]
- **THEN** the modal shows draggable chips for "Crown Zenith" and "Pokemon 151"

#### Scenario: Freestyle hides book settings
- **WHEN** the active collection is Freestyle
- **THEN** the Books button is hidden or disabled
