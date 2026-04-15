## ADDED Requirements

### Requirement: User can create named books
The system SHALL allow the user to create named books, each assigned a set of generations. A book groups Pokemon from its assigned generations into a separate binder.

#### Scenario: Create a book
- **WHEN** the user adds a new book named "Kanto & Johto" with generations 1 and 2
- **THEN** the book SHALL appear in the book selector and contain all Pokemon from Gen I and Gen II (including active alternate forms)

#### Scenario: Book name
- **WHEN** the user creates a book
- **THEN** the user SHALL provide a name for the book (free text)

### Requirement: All generations must be assigned to a book
The system SHALL enforce that every generation (1–9) is assigned to exactly one book. The book settings UI SHALL show which generations are unassigned and prevent saving until all are assigned.

#### Scenario: Unassigned generation warning
- **WHEN** the user has not assigned Gen V to any book
- **THEN** the book settings SHALL indicate Gen V is unassigned and not allow the configuration to be saved

#### Scenario: Generation cannot be in multiple books
- **WHEN** Gen I is already assigned to "Book 1"
- **THEN** Gen I SHALL NOT be available for assignment to another book

### Requirement: User can edit and delete books
The system SHALL allow the user to rename books, change their generation assignments, and delete books.

#### Scenario: Edit a book
- **WHEN** the user changes "Book 1" generations from [1, 2] to [1, 2, 3]
- **THEN** the binder view for "Book 1" SHALL update to include Gen III Pokemon

#### Scenario: Delete a book
- **WHEN** the user deletes a book
- **THEN** its generations become unassigned and must be reassigned to other books before saving

### Requirement: Default book for new users
The system SHALL create a default book named "All Pokemon" containing all generations (1–9) when no book configuration exists in localStorage.

#### Scenario: First load
- **WHEN** the application loads with no saved book configuration
- **THEN** a single book named "All Pokemon" with generations [1,2,3,4,5,6,7,8,9] SHALL be created

### Requirement: Book configuration persists
The system SHALL save book configuration (names and generation assignments) in localStorage.

#### Scenario: Books survive reload
- **WHEN** the user configures books and reloads the page
- **THEN** the book configuration SHALL be restored

### Requirement: Book configuration included in export/import
The system's export/import SHALL include book configuration alongside caught state and form preferences.

#### Scenario: Export includes books
- **WHEN** the user exports data
- **THEN** the exported JSON SHALL include the books array

#### Scenario: Import restores books
- **WHEN** the user imports a backup with book configuration
- **THEN** the books SHALL be restored
