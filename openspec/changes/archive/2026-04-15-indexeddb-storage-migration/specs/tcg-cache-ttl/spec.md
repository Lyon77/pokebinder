## ADDED Requirements

### Requirement: 7-day TTL on cached TCG results
The system SHALL treat cached TCG card search results as expired if they are older than 7 days. Expired entries SHALL be ignored on read (returning null), causing a fresh API fetch.

#### Scenario: Cache hit within TTL
- **WHEN** the card picker opens for a pokemon whose cached result has a timestamp less than 7 days old
- **THEN** the cached results are returned without making an API call

#### Scenario: Cache miss due to TTL expiry
- **WHEN** the card picker opens for a pokemon whose cached result has a timestamp more than 7 days old
- **THEN** the cached result is ignored, a fresh API call is made, and the new results replace the expired cache entry

#### Scenario: No cached entry exists
- **WHEN** the card picker opens for a pokemon with no cached result
- **THEN** an API call is made and the results are cached with the current timestamp

### Requirement: Manual refresh button in card picker
The card picker SHALL display a refresh button that allows the user to force re-fetch card results from the TCG API, bypassing the cache regardless of TTL.

#### Scenario: User clicks refresh with valid API response
- **WHEN** the user clicks the refresh button in the card picker
- **THEN** a fresh API call is made, the card picker grid is updated with new results, and the cache entry is overwritten with the new data and current timestamp

#### Scenario: User clicks refresh with API error
- **WHEN** the user clicks the refresh button and the API returns an error
- **THEN** the existing card grid remains visible and an error message is displayed

#### Scenario: Refresh button shows loading state
- **WHEN** the user clicks the refresh button
- **THEN** the button indicates a loading state until the API call completes
