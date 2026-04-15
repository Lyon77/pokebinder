## ADDED Requirements

### Requirement: Selecting a Pokemon in list view scrolls to its row
When the user selects a Pokemon from the autocomplete dropdown while in list view, the system SHALL smooth-scroll the list to the selected Pokemon's row, centering it in the viewport.

#### Scenario: Scroll to Pokemon in list view
- **WHEN** the user selects "Charmeleon" from the dropdown while in list view
- **THEN** the list SHALL smooth-scroll until the Charmeleon row is centered in the viewport

#### Scenario: Pokemon already visible in list view
- **WHEN** the user selects a Pokemon that is already visible in the viewport
- **THEN** the list SHALL still smooth-scroll to center that Pokemon's row

### Requirement: Selecting a Pokemon in binder view jumps to its page
When the user selects a Pokemon from the autocomplete dropdown while in binder view, the system SHALL navigate to the binder page containing that Pokemon.

#### Scenario: Jump to binder page
- **WHEN** the user selects "Lucario" from the dropdown while in binder view with a 3x3 layout, and Lucario is at collection position #500
- **THEN** the binder SHALL display page 56 (ceil(500/9)) which contains Lucario's slot

#### Scenario: Pokemon on current binder page
- **WHEN** the user selects a Pokemon that is already on the currently displayed binder page
- **THEN** the binder SHALL remain on the current page

### Requirement: Binder view highlights target slot after navigation
After navigating to a binder page via search selection, the system SHALL apply a brief highlight pulse animation to the target Pokemon's slot so the user can visually locate it.

#### Scenario: Highlight pulse on target slot
- **WHEN** the binder navigates to a page after the user selects a Pokemon from the dropdown
- **THEN** the target slot SHALL display a brief highlight animation (approximately 600ms) that fades out

#### Scenario: Highlight does not persist
- **WHEN** the highlight animation on a binder slot completes
- **THEN** the slot SHALL return to its normal visual state with no residual styling

### Requirement: Main views always display the full collection
Both list view and binder view SHALL always display the complete active collection (all Pokemon respecting form settings). Search selection navigates within the full collection; it SHALL NOT filter or hide any entries.

#### Scenario: List shows all Pokemon after search
- **WHEN** the user selects a Pokemon from the dropdown and the list scrolls to it
- **THEN** all other Pokemon in the collection SHALL remain visible in the list

#### Scenario: Binder shows all Pokemon after search
- **WHEN** the user selects a Pokemon from the dropdown and the binder jumps to a page
- **THEN** all binder pages SHALL remain accessible and contain their full set of Pokemon
