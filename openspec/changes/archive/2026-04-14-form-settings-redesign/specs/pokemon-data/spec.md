## MODIFIED Requirements

### Requirement: Alternate forms are categorized
Each alternate form SHALL be assigned a `formCategory` string (e.g., "regional", "mega", "gmax", "other") to enable category-based toggling. Additionally, forms with `formCategory` of "other" that belong to a species with 2 or more alternate "other" forms SHALL have a `formSubCategory` string identifying the species group (e.g., "rotom", "deoxys", "lycanroc"). Forms without a meaningful sub-group SHALL have `formSubCategory` set to `null`.

#### Scenario: Form category assignment
- **WHEN** Mega Charizard X is accessed
- **THEN** its `formCategory` SHALL be "mega" and `formSubCategory` SHALL be `null`

#### Scenario: Regional variant category
- **WHEN** Galarian Ponyta is accessed
- **THEN** its `formCategory` SHALL be "regional" and `formSubCategory` SHALL be `null`

#### Scenario: Sub-category for species group
- **WHEN** Rotom (Heat) is accessed
- **THEN** its `formCategory` SHALL be "other" and `formSubCategory` SHALL be "rotom"

#### Scenario: Single alternate form has no sub-category
- **WHEN** an "other" form belongs to a species with only 1 alternate form
- **THEN** its `formSubCategory` SHALL be `null`
