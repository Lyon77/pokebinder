## ADDED Requirements

### Requirement: Dataset contains all 1025 base Pokemon
The system SHALL include a bundled JSON dataset containing all 1025 base Pokemon entries (National Pokedex #1 through #1025). Each entry SHALL include: national Pokedex number, name, a unique form identifier, generation number (1–9), primary/secondary type(s), and a flag indicating it is the default form.

#### Scenario: Base dataset completeness
- **WHEN** the application loads
- **THEN** all 1025 base Pokemon from Generation I through Generation IX are available in the dataset with `isDefault: true`

#### Scenario: Base entry data structure
- **WHEN** a base Pokemon entry is accessed
- **THEN** it SHALL contain `id` (number), `name` (string), `formName` (null for base), `formId` (unique string), `generation` (number 1–9), `types` (array of 1–2 type strings), `isDefault` (true), and `formCategory` (null for base)

### Requirement: Dataset contains alternate Pokemon forms
The system SHALL include alternate forms for Pokemon that have them, including but not limited to: regional variants (Alolan, Galarian, Hisuian, Paldean), Mega Evolutions, Gigantamax forms, and other significant form variants (e.g., Deoxys forms, Rotom forms, Lycanroc forms). Each alternate form SHALL share the base Pokemon's `id` (Pokedex number) but have a unique `formId`.

#### Scenario: Alternate form data structure
- **WHEN** an alternate form entry is accessed (e.g., Alolan Vulpix)
- **THEN** it SHALL contain `id` (37), `name` ("Vulpix"), `formName` ("Alolan"), `formId` ("vulpix-alola"), `generation` (1), `types` (["ice"]), `isDefault` (false), and `formCategory` ("regional")

#### Scenario: Multiple forms per species
- **WHEN** a species with multiple forms is queried (e.g., Deoxys)
- **THEN** the dataset SHALL contain one entry per form, each with a unique `formId`

### Requirement: Alternate forms are categorized
Each alternate form SHALL be assigned a `formCategory` string (e.g., "regional", "mega", "gmax", "other") to enable category-based toggling.

#### Scenario: Form category assignment
- **WHEN** Mega Charizard X is accessed
- **THEN** its `formCategory` SHALL be "mega"

#### Scenario: Regional variant category
- **WHEN** Galarian Ponyta is accessed
- **THEN** its `formCategory` SHALL be "regional"

### Requirement: Pokemon names and numbers are accurate
The system SHALL use official English Pokemon names and National Pokedex numbers consistent with PokeAPI data.

#### Scenario: Name accuracy
- **WHEN** a user views Pokemon #25
- **THEN** it SHALL display as "Pikachu"

#### Scenario: Generation accuracy
- **WHEN** a user views Pokemon #906 (Sprigatito)
- **THEN** it SHALL be assigned to Generation 9

### Requirement: Generation ranges are correctly defined
The system SHALL define generation boundaries as: Gen I (#1–151), Gen II (#152–251), Gen III (#252–386), Gen IV (#387–493), Gen V (#494–649), Gen VI (#650–721), Gen VII (#722–809), Gen VIII (#810–905), Gen IX (#906–1025).

#### Scenario: Generation boundary correctness
- **WHEN** Pokemon #151 (Mew) is displayed
- **THEN** it SHALL belong to Generation 1

#### Scenario: Cross-generation boundary
- **WHEN** Pokemon #152 (Chikorita) is displayed
- **THEN** it SHALL belong to Generation 2
