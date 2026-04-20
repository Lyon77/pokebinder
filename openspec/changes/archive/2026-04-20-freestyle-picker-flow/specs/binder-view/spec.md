## MODIFIED Requirements

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
- **THEN** a context menu appears with two options: "Change card" and "Remove". Flipping owned/want is handled inside the card picker (via the Want/Owned radio), not the slot menu.
