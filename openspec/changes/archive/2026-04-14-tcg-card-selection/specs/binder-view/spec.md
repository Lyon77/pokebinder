## ADDED Requirements

### Requirement: Binder slots include card picker trigger
Each filled binder slot SHALL include a button or interactive element that opens the card picker modal for that Pokemon. The button SHALL be unobtrusive and not interfere with the caught toggle interaction.

#### Scenario: Card picker button on slot
- **WHEN** the user views a binder page
- **THEN** each filled slot SHALL have a card picker button visible on hover

#### Scenario: Card picker does not interfere with caught toggle
- **WHEN** the user clicks the main area of a binder slot
- **THEN** the caught status SHALL toggle as before (the card picker only opens via its dedicated button)
