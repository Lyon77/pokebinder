## ADDED Requirements

### Requirement: Display overall completion percentage
The system SHALL continue to display overall completion stats across the entire active collection, unchanged. Book-specific stats are not required in this change.

#### Scenario: Stats are global
- **WHEN** the user has multiple books configured
- **THEN** the overall stats and per-generation stats SHALL reflect the entire collection, not filtered by the currently selected book

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

### Requirement: Display visual progress indicators
The system SHALL display a progress bar for overall completion and for each generation's completion.

#### Scenario: Progress bar reflects percentage
- **WHEN** the user has caught 50% of Gen I entries
- **THEN** the Gen I progress bar SHALL be filled to approximately 50%

#### Scenario: Progress bar updates in real-time
- **WHEN** the user marks a new Pokemon as caught
- **THEN** the relevant progress bars (overall and that Pokemon's generation) SHALL update immediately without page reload

### Requirement: Stats update immediately on state change
The system SHALL recalculate and re-render all completion statistics immediately when a Pokemon's caught state changes or when form preferences change, without requiring a page refresh.

#### Scenario: Real-time update on catch
- **WHEN** the user marks Bulbasaur as caught
- **THEN** the overall count, overall percentage, Gen I count, Gen I percentage, and both progress bars SHALL update within the same interaction

#### Scenario: Stats update on form toggle
- **WHEN** the user disables a form category
- **THEN** all totals, percentages, and progress bars SHALL recalculate immediately
