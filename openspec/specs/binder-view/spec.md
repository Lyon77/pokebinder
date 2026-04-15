## ADDED Requirements

### Requirement: Binder view displays Pokemon in a paginated grid
The system SHALL provide a binder view that renders Pokemon from the currently selected book. The first page renders as a single page. Subsequent pages render as dual-page spreads (left and right pages side by side). The last view can be a single page if the total page count is even.

#### Scenario: First page (single)
- **WHEN** the user opens the binder view on view 1
- **THEN** a single binder page SHALL be displayed (e.g., 9 slots for 3x3 layout)

#### Scenario: Spread view
- **WHEN** the user navigates to view 2
- **THEN** two binder pages SHALL be displayed side by side (left page and right page)

#### Scenario: Last view single page
- **WHEN** the total page count is even (e.g., 6 pages)
- **THEN** the last view SHALL display page 6 as a single page

#### Scenario: Last view spread
- **WHEN** the total page count is odd (e.g., 7 pages)
- **THEN** the last view SHALL display pages 6 and 7 as a spread

### Requirement: User can configure binder layout
The system SHALL provide a layout selector allowing the user to choose the grid dimensions for binder pages. Options SHALL include at minimum: 3x3 (9 slots) and 3x4 (12 slots).

#### Scenario: Change layout to 3x4
- **WHEN** the user selects "3x4" from the layout selector
- **THEN** each binder page SHALL display 12 slots in a 3-column, 4-row grid and page assignments SHALL recalculate

#### Scenario: Layout preference persists
- **WHEN** the user selects a layout and reloads the page
- **THEN** the previously selected layout SHALL be restored

### Requirement: Binder pages are navigable
The system SHALL provide previous/next controls that step through views (single pages or spreads), and display the current page information.

#### Scenario: Navigate through views
- **WHEN** the user clicks "Next" from the first view (page 1)
- **THEN** the binder SHALL display the spread of pages 2 and 3

#### Scenario: Page info display
- **WHEN** viewing a spread of pages 4 and 5
- **THEN** the page info SHALL display "Pages 4–5 of 12" (or similar)

#### Scenario: Single page info
- **WHEN** viewing the first page
- **THEN** the page info SHALL display "Page 1 of 12"

### Requirement: Each binder slot shows Pokemon info
Each slot in the binder grid SHALL display: the book position number, the National Pokedex number, the Pokemon name (and form name if alternate), and the caught status.

#### Scenario: Binder slot content
- **WHEN** a binder slot displays Pikachu at book position #25
- **THEN** the slot SHALL show book #25, Dex #25, "Pikachu", and a caught/uncaught indicator

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

### Requirement: Binder view supports external navigation to a specific Pokemon
The binder view SHALL accept a navigation request to jump to the page containing a specific Pokemon (identified by form ID). Upon receiving the request, the binder SHALL calculate the target page, render it, and apply a highlight pulse to the target slot.

#### Scenario: Navigate to Pokemon by form ID
- **WHEN** the system requests navigation to a Pokemon with form ID "charmeleon" in a 3x3 binder layout
- **THEN** the binder SHALL calculate the page containing that Pokemon, render the page, and highlight the slot

#### Scenario: Page calculation for navigation
- **WHEN** navigation is requested for a Pokemon at collection index 50 with a 4x4 layout (16 per page)
- **THEN** the binder SHALL display page 4 (index 50 / 16 = page 3, zero-indexed, displayed as page 4)

### Requirement: Book selector in binder view
The system SHALL provide a book selector (dropdown or tab bar) above the binder grid that allows the user to switch between books. The binder content updates to show the selected book's collection.

#### Scenario: Switch book
- **WHEN** the user selects "Kanto & Johto" from the book selector
- **THEN** the binder SHALL display only Pokemon from that book's generations, with book-specific numbering starting at 1

#### Scenario: Book selector shows all books
- **WHEN** the user opens the book selector
- **THEN** all configured books SHALL be listed by name in their configured order

### Requirement: Dual-page spread collapses on mobile
On viewports below 600px, the binder view SHALL fall back to single-page navigation (no spreads) to fit the screen.

#### Scenario: Mobile single-page
- **WHEN** the viewport is 375px wide
- **THEN** the binder SHALL display one page at a time with standard prev/next navigation
