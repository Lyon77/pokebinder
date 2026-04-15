## MODIFIED Requirements

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

### Requirement: Book selector in binder view
The system SHALL provide a book selector (dropdown or tab bar) above the binder grid that allows the user to switch between books. The binder content updates to show the selected book's collection.

#### Scenario: Switch book
- **WHEN** the user selects "Kanto & Johto" from the book selector
- **THEN** the binder SHALL display only Pokemon from that book's generations, with book-specific numbering starting at 1

#### Scenario: Book selector shows all books
- **WHEN** the user opens the book selector
- **THEN** all configured books SHALL be listed by name in their configured order

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

### Requirement: Dual-page spread collapses on mobile
On viewports below 600px, the binder view SHALL fall back to single-page navigation (no spreads) to fit the screen.

#### Scenario: Mobile single-page
- **WHEN** the viewport is 375px wide
- **THEN** the binder SHALL display one page at a time with standard prev/next navigation

### Requirement: Each binder slot shows Pokemon info
Each slot in the binder grid SHALL display: the book position number, the National Pokedex number, the Pokemon name (and form name if alternate), and the caught status.

#### Scenario: Binder slot content
- **WHEN** a binder slot displays Pikachu at book position #25
- **THEN** the slot SHALL show book #25, Dex #25, "Pikachu", and a caught/uncaught indicator
