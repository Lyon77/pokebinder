## MODIFIED Requirements

### Requirement: Display per-generation completion breakdown
The system SHALL display completion counts and percentages for each generation (Gen I through Gen IX), showing caught vs. total for that generation. Totals per generation adjust based on active form selections. The per-generation breakdown SHALL be hidden by default and toggled visible by clicking the overall stats bar.

#### Scenario: Per-generation stats hidden by default
- **WHEN** the page loads
- **THEN** the per-generation stats SHALL be hidden, showing only the overall progress bar and count

#### Scenario: Expand per-generation stats
- **WHEN** the user clicks the overall stats bar
- **THEN** the per-generation breakdown SHALL expand and become visible

#### Scenario: Collapse per-generation stats
- **WHEN** the per-generation breakdown is visible and the user clicks the overall stats bar
- **THEN** the per-generation breakdown SHALL collapse and be hidden

#### Scenario: Visual expand indicator
- **WHEN** the overall stats bar is displayed
- **THEN** a chevron indicator SHALL show the current expand/collapse state (pointing right when collapsed, rotated when expanded)

#### Scenario: Per-generation stats content
- **WHEN** the user has caught 100 out of 170 Gen I entries
- **THEN** the Gen I row SHALL display the generation label, a progress bar, and a percentage

#### Scenario: Generation with no catches
- **WHEN** the user has caught 0 Pokemon from Gen V
- **THEN** the Gen V row SHALL display "0 / [Gen V total] (0%)"
