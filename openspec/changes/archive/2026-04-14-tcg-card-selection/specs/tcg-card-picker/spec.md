## ADDED Requirements

### Requirement: Card picker modal opens from binder slot
Each binder slot SHALL display a card picker button. Clicking the button SHALL open a modal showing all available English TCG cards for that Pokemon.

#### Scenario: Open card picker
- **WHEN** the user clicks the card picker button on the Bulbasaur binder slot
- **THEN** a modal SHALL open displaying all English TCG cards for Bulbasaur

#### Scenario: Card picker button visible on slot
- **WHEN** the user hovers over a binder slot
- **THEN** a card picker button SHALL be visible on the slot

### Requirement: Card picker displays cards in an image grid
The card picker modal SHALL display cards as a scrollable grid of card images with set name, card number, and rarity below each image.

#### Scenario: Card grid display
- **WHEN** the card picker opens for Bulbasaur
- **THEN** all English Bulbasaur TCG cards SHALL be displayed as images in a grid, ordered by set release date

#### Scenario: Card info shown below image
- **WHEN** a card is displayed in the grid
- **THEN** the card number, set name, set year, and rarity SHALL be shown below the card image

### Requirement: Card picker has text filter
The card picker SHALL include a text input that filters cards by matching against set name, card number, and rarity using case-insensitive substring matching.

#### Scenario: Filter by card number
- **WHEN** the user types "1/73" in the filter input
- **THEN** only cards with "1/73" in their card number SHALL be shown

#### Scenario: Filter by set name
- **WHEN** the user types "base set" in the filter input
- **THEN** only cards from sets containing "base set" in their name SHALL be shown

#### Scenario: Filter by rarity
- **WHEN** the user types "rare" in the filter input
- **THEN** only cards with "rare" in their rarity SHALL be shown

### Requirement: User can select a card
The user SHALL be able to click a card in the grid to select it. The selected card SHALL be visually highlighted. Clicking "Save" SHALL confirm the selection and close the modal.

#### Scenario: Select and save a card
- **WHEN** the user clicks a card and then clicks "Save"
- **THEN** that card SHALL be assigned to the Pokemon and the modal SHALL close

#### Scenario: Selected card highlighted
- **WHEN** a card is selected in the grid
- **THEN** it SHALL display a distinct border/highlight to indicate selection

### Requirement: User can clear a card selection
The card picker SHALL include a "Clear" button that removes the current card assignment for that Pokemon.

#### Scenario: Clear card selection
- **WHEN** the user clicks "Clear" in the card picker
- **THEN** the card assignment for that Pokemon SHALL be removed and the binder slot SHALL revert to the default text-only appearance

### Requirement: Card picker shows loading state
While cards are being fetched from the API, the modal SHALL display a loading indicator.

#### Scenario: Loading cards
- **WHEN** the card picker opens for a Pokemon whose cards are not yet cached
- **THEN** a loading indicator SHALL be shown until the cards are fetched

#### Scenario: Cached cards load instantly
- **WHEN** the card picker opens for a Pokemon whose cards are already cached
- **THEN** the cards SHALL be displayed immediately with no loading indicator
