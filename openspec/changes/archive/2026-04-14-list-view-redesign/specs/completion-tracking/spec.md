## MODIFIED Requirements

### Requirement: User can mark a Pokemon as caught
The system SHALL allow the user to toggle any Pokemon (base or alternate form) between caught and uncaught states by clicking/tapping anywhere on the Pokemon's row in the list view.

#### Scenario: Mark a Pokemon as caught via row click
- **WHEN** the user clicks anywhere on an uncaught Pokemon's row in list view
- **THEN** the Pokemon is marked as caught and the row's dot indicator fills with green

#### Scenario: Unmark a Pokemon via row click
- **WHEN** the user clicks anywhere on a caught Pokemon's row in list view
- **THEN** the Pokemon is marked as uncaught and the row's dot indicator becomes hollow

#### Scenario: Caught visual indicator
- **WHEN** a Pokemon is caught
- **THEN** the row SHALL display a filled green dot, a green-tinted background, and the dot indicator SHALL be clearly distinguishable from the uncaught hollow dot

#### Scenario: Uncaught visual indicator
- **WHEN** a Pokemon is uncaught
- **THEN** the row SHALL display a hollow dot with a border matching the theme
