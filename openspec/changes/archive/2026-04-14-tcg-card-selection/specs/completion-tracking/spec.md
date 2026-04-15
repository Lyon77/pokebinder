## MODIFIED Requirements

### Requirement: User can export their data
The system SHALL allow the user to export all tracked data as a JSON file. The export SHALL include caught Pokemon, form preferences, binder layout, book configuration, and card selections.

#### Scenario: Export includes card selections
- **WHEN** the user exports their data
- **THEN** the JSON file SHALL include all card selections (formId to card data mappings)

### Requirement: User can import previously exported data
The system SHALL allow the user to import a previously exported JSON file. The import SHALL restore caught Pokemon, form preferences, binder layout, book configuration, and card selections. Legacy files without card selection data SHALL import successfully with no card selections.

#### Scenario: Import with card selections
- **WHEN** the user imports a file containing card selections
- **THEN** the card selections SHALL be restored

#### Scenario: Import legacy file without card selections
- **WHEN** the user imports a file that does not contain card selections
- **THEN** the import SHALL succeed with no card selections (empty map)
