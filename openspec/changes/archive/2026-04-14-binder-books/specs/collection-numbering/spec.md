## MODIFIED Requirements

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
