## ADDED Requirements

### Requirement: Fetch TCG cards from Pokemon TCG API
The system SHALL fetch English TCG card data from the Pokemon TCG API (pokemontcg.io v2) when the user opens the card picker for a Pokemon whose cards are not yet cached.

#### Scenario: Fetch cards for a Pokemon
- **WHEN** the user opens the card picker for Bulbasaur and no cached data exists
- **THEN** the system SHALL fetch cards from the API matching the name "Bulbasaur" and display them

#### Scenario: API returns card data
- **WHEN** the API responds with card data
- **THEN** each card SHALL include at minimum: card ID, name, card number, set name, set release date, rarity, and small image URL

### Requirement: Cache fetched card data in localStorage
The system SHALL cache all fetched card data in localStorage keyed by Pokemon name. Subsequent requests for the same Pokemon SHALL use the cached data.

#### Scenario: Cards are cached after fetch
- **WHEN** cards for Bulbasaur are fetched from the API
- **THEN** the response SHALL be cached in localStorage so future opens do not require an API call

#### Scenario: Cached cards used on subsequent opens
- **WHEN** the user opens the card picker for Bulbasaur a second time
- **THEN** the cached data SHALL be used and no API call SHALL be made

### Requirement: Handle API errors gracefully
If the API fetch fails (network error, API down), the system SHALL display an error message in the modal and allow the user to retry or close.

#### Scenario: Network error
- **WHEN** the API fetch fails due to a network error
- **THEN** the modal SHALL display an error message with a retry option
