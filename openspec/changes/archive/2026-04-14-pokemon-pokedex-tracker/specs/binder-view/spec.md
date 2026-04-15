## ADDED Requirements

### Requirement: Binder view displays Pokemon in a paginated grid
The system SHALL provide a binder view that renders Pokemon in a grid layout mimicking physical card binder sleeve pages. Each page displays a fixed number of slots determined by the configured layout (e.g., 3x3 = 9 slots, 3x4 = 12 slots per page).

#### Scenario: Default binder page
- **WHEN** the user opens the binder view with a 3x3 layout
- **THEN** the first page SHALL display collection entries #1 through #9 in a 3-column, 3-row grid

#### Scenario: Binder page pagination
- **WHEN** the user navigates to page 2 with a 3x3 layout
- **THEN** the page SHALL display collection entries #10 through #18

### Requirement: User can configure binder layout
The system SHALL provide a layout selector allowing the user to choose the grid dimensions for binder pages. Options SHALL include at minimum: 3x3 (9 slots) and 3x4 (12 slots).

#### Scenario: Change layout to 3x4
- **WHEN** the user selects "3x4" from the layout selector
- **THEN** each binder page SHALL display 12 slots in a 3-column, 4-row grid and page assignments SHALL recalculate

#### Scenario: Layout preference persists
- **WHEN** the user selects a layout and reloads the page
- **THEN** the previously selected layout SHALL be restored

### Requirement: Binder pages are navigable
The system SHALL provide previous/next page controls and display the current page number and total page count.

#### Scenario: Navigate to next page
- **WHEN** the user clicks "Next" on page 1
- **THEN** the binder SHALL display page 2

#### Scenario: Page count display
- **WHEN** the collection has 1025 entries and the layout is 3x3
- **THEN** the total page count SHALL be 114 (ceil(1025/9)) and SHALL display as "Page 1 of 114"

#### Scenario: Cannot navigate past last page
- **WHEN** the user is on the last page
- **THEN** the "Next" control SHALL be disabled

#### Scenario: Cannot navigate before first page
- **WHEN** the user is on page 1
- **THEN** the "Previous" control SHALL be disabled

### Requirement: Each binder slot shows Pokemon info
Each slot in the binder grid SHALL display: the collection position number, the National Pokedex number, the Pokemon name (and form name if alternate), and the caught status (visual indicator).

#### Scenario: Binder slot content
- **WHEN** a binder slot displays Alolan Vulpix at collection position #42
- **THEN** the slot SHALL show collection #42, Dex #37, "Vulpix (Alolan)", and a caught/uncaught indicator

#### Scenario: User can toggle caught from binder view
- **WHEN** the user clicks a binder slot
- **THEN** the caught status for that Pokemon SHALL toggle (same as list view)

### Requirement: Binder view reflects active collection
The binder view SHALL only display Pokemon that are in the active collection (respecting form preferences). When forms are added or removed, binder pages and slot assignments SHALL update.

#### Scenario: Forms excluded from binder
- **WHEN** "Mega Evolutions" category is disabled
- **THEN** the binder view SHALL not contain any Mega Evolution forms and page count SHALL adjust

### Requirement: Binder view is usable on mobile
The binder grid SHALL scale to fit the viewport width on mobile devices. On narrow screens, the grid columns SHALL shrink proportionally so the full grid row is visible without horizontal scrolling. Touch targets (binder slots) SHALL be large enough for tap interaction.

#### Scenario: Mobile binder view
- **WHEN** the viewport is 375px wide and the layout is 3x3
- **THEN** the 3-column grid SHALL fit within the viewport width and each slot SHALL be tappable

#### Scenario: Mobile page navigation
- **WHEN** the user is on mobile in binder view
- **THEN** previous/next controls and page indicator SHALL be accessible and tappable

### Requirement: Last binder page may be partially filled
If the total number of collection entries does not evenly divide by the slots-per-page, the last page SHALL display the remaining entries with empty slots shown as blank/placeholder.

#### Scenario: Partial last page
- **WHEN** the collection has 1027 entries and the layout is 3x3 (9 per page)
- **THEN** the last page (page 115) SHALL show 2 filled slots and 7 empty placeholder slots
