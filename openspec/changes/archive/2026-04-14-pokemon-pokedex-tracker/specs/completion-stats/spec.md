## ADDED Requirements

### Requirement: Display overall completion percentage
The system SHALL display the total number of caught Pokemon out of the active collection total and the corresponding percentage, updated in real-time. The total adjusts based on which forms are included in the collection.

#### Scenario: Initial state
- **WHEN** the user has caught 0 Pokemon and the active collection has 1500 entries
- **THEN** the stats SHALL display "0 / 1500 (0%)"

#### Scenario: Partial completion
- **WHEN** the user has caught 151 Pokemon out of 1500 active entries
- **THEN** the stats SHALL display "151 / 1500" and the percentage

#### Scenario: Full completion
- **WHEN** the user has caught all Pokemon in the active collection
- **THEN** the stats SHALL display the total as "N / N (100%)"

#### Scenario: Total adjusts when forms change
- **WHEN** the user disables "Mega Evolutions" (removing 48 entries)
- **THEN** the total SHALL decrease by 48 and the percentage SHALL recalculate

### Requirement: Display per-generation completion breakdown
The system SHALL display completion counts and percentages for each generation (Gen I through Gen IX), showing caught vs. total for that generation. Totals per generation adjust based on active form selections.

#### Scenario: Per-generation stats
- **WHEN** the user has caught 100 out of 170 Gen I entries (151 base + 19 alternate forms)
- **THEN** the Gen I row SHALL display "100 / 170" and the corresponding percentage

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
