## ADDED Requirements

### Requirement: Binder slot shows card image when assigned
When a card is assigned to a Pokemon, the binder slot SHALL display the card's image as the slot background. The Pokemon name, set info, and slot numbers SHALL be overlaid on the image with a gradient for readability.

#### Scenario: Card image displayed
- **WHEN** Bulbasaur has "Base Set 44/102" assigned
- **THEN** the Bulbasaur binder slot SHALL show the card image as background with "Bulbasaur" and "Base Set 44/102" overlaid at the bottom

#### Scenario: Numbers remain visible
- **WHEN** a card image is displayed in a slot
- **THEN** the book position number and Pokedex number SHALL remain visible at the top of the slot with a semi-transparent background

### Requirement: Slots without cards keep default appearance
Binder slots without a card assignment SHALL retain the current text-only appearance with no visual changes.

#### Scenario: No card assigned
- **WHEN** a Pokemon has no card assigned
- **THEN** the binder slot SHALL display the standard text-only layout (numbers, name, caught indicator)

### Requirement: Card image fallback on load error
If a card image fails to load (broken URL, CDN down), the slot SHALL fall back to the default text-only appearance.

#### Scenario: Image load failure
- **WHEN** a card image URL fails to load
- **THEN** the binder slot SHALL display the standard text-only layout instead of a broken image
