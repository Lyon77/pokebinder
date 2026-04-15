## ADDED Requirements

### Requirement: Header stays visible while scrolling
The header containing the title, action buttons, stats bar, and controls SHALL remain fixed at the top of the viewport as the user scrolls through the Pokemon list or binder view.

#### Scenario: Header stays visible on scroll
- **WHEN** the user scrolls down through the Pokemon list
- **THEN** the header SHALL remain pinned at the top of the viewport and the list content SHALL scroll underneath it

#### Scenario: Header does not overlap modal
- **WHEN** the form settings modal is open
- **THEN** the modal SHALL render above the sticky header (higher z-index)

### Requirement: Header uses compact layout
The header SHALL use reduced padding, smaller font sizes, and tighter spacing compared to the original layout to minimize vertical space consumption. The collapsed header (with per-gen stats hidden) SHALL consume no more than approximately 110px of vertical space.

#### Scenario: Compact header on load
- **WHEN** the page loads
- **THEN** the header SHALL display the title, action buttons, overall stats bar, and controls row in a compact layout occupying minimal vertical space

### Requirement: Controls row contains search, form settings, and view toggle
The controls row within the sticky header SHALL contain the search input, the Form Settings button, and the List/Binder view toggle buttons on a single line.

#### Scenario: All controls on one line
- **WHEN** the page loads on a desktop viewport
- **THEN** the search input, Form Settings button, and List/Binder toggle SHALL appear on a single row

#### Scenario: Binder controls visible in header
- **WHEN** the user switches to binder view
- **THEN** the binder layout selector and prev/next page navigation SHALL appear within the sticky header controls area
