## ADDED Requirements

### Requirement: Binder view renders slot states visually
The binder view SHALL render each slot according to its state: owned (full color card, green border, checkmark), want (greyed card image), or empty (dashed border with prompt). The visual treatment is applied via CSS classes on the slot element.

#### Scenario: Owned slot in binder
- **WHEN** a slot has a card and is in the caught set
- **THEN** the binder slot shows the card image at full color with green border and checkmark

#### Scenario: Want slot in binder
- **WHEN** a slot has a card but is NOT in the caught set
- **THEN** the binder slot shows the card image with grayscale filter and reduced opacity

#### Scenario: Empty slot in binder
- **WHEN** a slot has no card assigned
- **THEN** the binder slot shows a dashed border and a contextual prompt

### Requirement: Binder slot click behavior varies by collection type
The click handler on binder slots SHALL vary based on the active collection's type.

#### Scenario: Pokedex slot click
- **WHEN** the user clicks a Pokedex binder slot
- **THEN** the card picker opens for that Pokemon (same as current behavior)

#### Scenario: Master Set slot click
- **WHEN** the user clicks a Master Set binder slot
- **THEN** the slot's owned state toggles (no card picker)

#### Scenario: Freestyle empty slot click
- **WHEN** the user clicks an empty Freestyle slot
- **THEN** the card picker opens to search for any card

#### Scenario: Freestyle filled slot click
- **WHEN** the user clicks a filled Freestyle slot
- **THEN** a context menu or action sheet appears with options: toggle owned/want, change card, remove card

### Requirement: Type-specific controls visibility
Certain binder controls SHALL be shown or hidden based on the collection type. The Forms button and list view SHALL only appear for Pokedex collections. The Books button SHALL appear for Pokedex and Master Set but not Freestyle.

#### Scenario: Pokedex controls
- **WHEN** the active collection is type Pokedex
- **THEN** Forms button, Books button, and List/Binder toggle are all visible

#### Scenario: Master Set controls
- **WHEN** the active collection is type Master Set
- **THEN** Books button is visible; Forms button and List view toggle are hidden

#### Scenario: Freestyle controls
- **WHEN** the active collection is type Freestyle
- **THEN** Forms button, Books button, and List view toggle are hidden
