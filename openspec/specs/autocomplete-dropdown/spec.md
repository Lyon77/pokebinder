## ADDED Requirements

### Requirement: Autocomplete dropdown appears when user types in search input
The system SHALL display a dropdown below the search input showing Pokemon that match the typed text. The dropdown SHALL appear after a debounce period (150ms) when the input contains one or more characters, and SHALL be hidden when the input is empty.

#### Scenario: Dropdown appears on input
- **WHEN** the user types "char" in the search input
- **THEN** a dropdown SHALL appear below the search input showing Pokemon whose names or Pokedex numbers match "char"

#### Scenario: Dropdown hidden on empty input
- **WHEN** the user clears the search input
- **THEN** the dropdown SHALL be hidden

### Requirement: Dropdown matches by name and Pokedex number
The dropdown SHALL match against Pokemon names (including form names) using case-insensitive substring matching, and against Pokedex numbers using starts-with matching. Both base names and form names SHALL be searchable.

#### Scenario: Match by name substring
- **WHEN** the user types "pika"
- **THEN** the dropdown SHALL include Pikachu and any alternate forms with "pika" in their name

#### Scenario: Match by form name
- **WHEN** the user types "mega"
- **THEN** the dropdown SHALL include all Pokemon with "Mega" in their form name (if Mega forms are enabled)

#### Scenario: Match by Pokedex number
- **WHEN** the user types "25"
- **THEN** the dropdown SHALL include Pokemon #25 (Pikachu) and any Pokemon whose Pokedex number starts with "25" (e.g., #250, #251)

#### Scenario: Matching is case-insensitive
- **WHEN** the user types "CHAR"
- **THEN** the dropdown SHALL show the same results as typing "char"

### Requirement: Dropdown results are capped at 10
The dropdown SHALL display at most 10 matching results. Results SHALL be shown in collection order (the order they appear in the full collection).

#### Scenario: More than 10 matches
- **WHEN** the user types "a" which matches more than 10 Pokemon
- **THEN** the dropdown SHALL display only the first 10 matches in collection order

#### Scenario: Fewer than 10 matches
- **WHEN** the user types "zygarde" which matches 3 Pokemon
- **THEN** the dropdown SHALL display all 3 matches

### Requirement: Dropdown shows caught/uncaught status
Each result in the dropdown SHALL visually indicate whether the Pokemon is caught or uncaught. Caught Pokemon SHALL be visually distinct from uncaught Pokemon (e.g., different background color or check indicator).

#### Scenario: Caught Pokemon in dropdown
- **WHEN** Charmander is marked as caught and the user types "char"
- **THEN** the Charmander entry in the dropdown SHALL display with caught highlighting

#### Scenario: Uncaught Pokemon in dropdown
- **WHEN** Charmeleon is not marked as caught and the user types "char"
- **THEN** the Charmeleon entry in the dropdown SHALL display without caught highlighting

### Requirement: Each dropdown result displays Pokemon info
Each dropdown result SHALL display the Pokemon's Pokedex number, name, and form name (if it is an alternate form).

#### Scenario: Base form result display
- **WHEN** Pikachu appears in the dropdown
- **THEN** the result SHALL show "#25 Pikachu"

#### Scenario: Alternate form result display
- **WHEN** Alolan Vulpix appears in the dropdown
- **THEN** the result SHALL show "#37 Vulpix (Alolan)"

### Requirement: Keyboard navigation in dropdown
The user SHALL be able to navigate dropdown results using the keyboard. Arrow Down SHALL move the active highlight to the next result, Arrow Up SHALL move it to the previous result. Navigation SHALL wrap around (past last goes to first, before first goes to last). Enter SHALL select the currently highlighted result. Escape SHALL dismiss the dropdown and clear the search text.

#### Scenario: Arrow down navigation
- **WHEN** the dropdown is open and the user presses Arrow Down
- **THEN** the next result SHALL become the active (highlighted) result

#### Scenario: Arrow up navigation
- **WHEN** the dropdown is open and the user presses Arrow Up
- **THEN** the previous result SHALL become the active (highlighted) result

#### Scenario: Wrap around at bottom
- **WHEN** the last result is active and the user presses Arrow Down
- **THEN** the first result SHALL become active

#### Scenario: Wrap around at top
- **WHEN** the first result is active and the user presses Arrow Up
- **THEN** the last result SHALL become active

#### Scenario: Enter selects active result
- **WHEN** a result is active and the user presses Enter
- **THEN** the system SHALL navigate to that Pokemon and dismiss the dropdown

#### Scenario: Escape dismisses dropdown
- **WHEN** the dropdown is open and the user presses Escape
- **THEN** the dropdown SHALL be dismissed and the search input SHALL be cleared

### Requirement: Clicking outside dismisses dropdown
The dropdown SHALL be dismissed when the user clicks anywhere outside the search input and dropdown area.

#### Scenario: Click outside dismisses
- **WHEN** the dropdown is open and the user clicks on the list/binder view area
- **THEN** the dropdown SHALL be dismissed

### Requirement: Selecting a result clears search and dismisses dropdown
After a result is selected (by click or Enter), the search input text SHALL be cleared and the dropdown SHALL be dismissed.

#### Scenario: Selection clears state
- **WHEN** the user selects "Charmander" from the dropdown
- **THEN** the search input SHALL be empty and the dropdown SHALL be hidden
