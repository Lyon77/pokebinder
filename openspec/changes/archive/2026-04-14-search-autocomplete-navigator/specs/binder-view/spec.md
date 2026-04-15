## ADDED Requirements

### Requirement: Binder view supports external navigation to a specific Pokemon
The binder view SHALL accept a navigation request to jump to the page containing a specific Pokemon (identified by form ID). Upon receiving the request, the binder SHALL calculate the target page, render it, and apply a highlight pulse to the target slot.

#### Scenario: Navigate to Pokemon by form ID
- **WHEN** the system requests navigation to a Pokemon with form ID "charmeleon" in a 3x3 binder layout
- **THEN** the binder SHALL calculate the page containing that Pokemon, render the page, and highlight the slot

#### Scenario: Page calculation for navigation
- **WHEN** navigation is requested for a Pokemon at collection index 50 with a 4x4 layout (16 per page)
- **THEN** the binder SHALL display page 4 (index 50 / 16 = page 3, zero-indexed, displayed as page 4)
