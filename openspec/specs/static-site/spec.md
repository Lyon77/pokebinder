## ADDED Requirements

### Requirement: Application is a single-page static site
The system SHALL be implemented as a single-page application using only static files (HTML, CSS, JavaScript, JSON) with no server-side processing required.

#### Scenario: Static file serving
- **WHEN** the application files are served by any static file server (including GitHub Pages)
- **THEN** the application SHALL be fully functional

### Requirement: Application is deployable to GitHub Pages
The system SHALL include a GitHub Actions workflow that automatically deploys the application to GitHub Pages on push to the `main` branch.

#### Scenario: Automatic deployment
- **WHEN** a commit is pushed to the `main` branch
- **THEN** GitHub Actions SHALL deploy the latest static files to GitHub Pages

### Requirement: Application is responsive
The system SHALL render correctly on viewports from 320px (mobile) to 1920px (desktop) wide, using a responsive layout.

#### Scenario: Mobile layout
- **WHEN** the viewport is 375px wide (typical mobile)
- **THEN** the Pokemon list, search bar, filters, and stats SHALL be usable without horizontal scrolling

#### Scenario: Desktop layout
- **WHEN** the viewport is 1440px wide
- **THEN** the layout SHALL make effective use of available space (e.g., grid layout for the Pokemon list)

### Requirement: Application loads fast
The system SHALL load and become interactive within 2 seconds on a standard broadband connection, given that all assets are static and bundled.

#### Scenario: Initial page load
- **WHEN** a user visits the application URL for the first time
- **THEN** the full Pokemon list and UI controls SHALL be rendered and interactive within 2 seconds

### Requirement: Application supports list and binder views
The system SHALL provide two views: a list view (default) showing all Pokemon in a scrollable list, and a binder view showing Pokemon in a paginated grid. The user SHALL be able to switch between views.

#### Scenario: View toggle
- **WHEN** the user clicks the binder view toggle
- **THEN** the main content area SHALL switch from list view to binder view (or vice versa)

### Requirement: Application has a clear visual layout
The system SHALL present a header with the app title and stats summary, a controls section with search/generation/form filters, a view toggle, and the main content area (list or binder).

#### Scenario: Layout structure
- **WHEN** the application loads
- **THEN** the user SHALL see (from top to bottom): a header/title area, completion stats, search/filter/form controls, view toggle, and the Pokemon list or binder view
