## ADDED Requirements

### Requirement: Owned slot rendering
An owned slot SHALL display the card image at full color with a green border and a checkmark badge in the top-right corner.

#### Scenario: Owned slot visual
- **WHEN** a slot has a card assigned and is in the caught set
- **THEN** the slot shows the card image with no filters, a green (`--caught-border`) border, and a "✓" badge

### Requirement: Want slot rendering
A want slot SHALL display the card image in greyscale at reduced opacity, with no green border and no checkmark. This indicates the user wants the card but does not own it.

#### Scenario: Want slot visual
- **WHEN** a slot has a card assigned but is NOT in the caught set
- **THEN** the slot shows the card image with CSS `filter: grayscale(1); opacity: 0.4` and a standard border

### Requirement: Empty slot rendering
An empty slot SHALL display with a dashed border and a centered prompt. For Pokedex, the prompt shows the Pokemon name and "Tap to pick card". For Freestyle, the prompt shows a "+" icon and "Add card".

#### Scenario: Pokedex empty slot
- **WHEN** a Pokedex slot has no card assigned
- **THEN** the slot shows a dashed border, the Pokemon name, and "Tap to pick card"

#### Scenario: Freestyle empty slot
- **WHEN** a Freestyle slot has no card assigned
- **THEN** the slot shows a dashed border, a "+" icon, and "Add card"

### Requirement: Variant badge overlay
Master Set slots with a variant other than the first variant for that card SHALL display a variant badge in the top-left corner showing the variant label (e.g., "REV HOLO", "1ST ED.").

#### Scenario: Reverse holo badge
- **WHEN** a Master Set slot has variant `reverseHolofoil`
- **THEN** a "REV HOLO" badge is shown in the top-left of the slot

#### Scenario: Owned variant badge
- **WHEN** a Master Set slot with a variant badge is owned
- **THEN** the badge background changes to green (`--caught-border`)

#### Scenario: Want variant badge
- **WHEN** a Master Set slot with a variant badge is in the want state
- **THEN** the badge has a dark semi-transparent background
