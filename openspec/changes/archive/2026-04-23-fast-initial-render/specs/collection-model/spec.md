## MODIFIED Requirements

### Requirement: Sync operates on all collections
The system SHALL sync the full set of collections (not only the active one) to the configured GitHub Gist as a single bundle file. Create, rename, and delete operations on any collection SHALL trigger a bundle push. Pull operations SHALL reconcile the remote bundle with local IndexedDB — upserting collections present in the bundle and removing local collections absent from it — EXCEPT that reconcile SHALL skip its IndexedDB writes and in-memory state reload when a local save is pending (save timer active or unflushed bundle queued). A pending local save is the newer source of truth and will propagate to the remote; reconciling stale gist data over it would silently lose the user's unsaved changes.

#### Scenario: Create pushes new collection
- **WHEN** the user creates a new collection on Device A with sync configured
- **THEN** a bundle push is scheduled containing all collections including the new one, and on next poll Device B's IndexedDB contains the new collection

#### Scenario: Delete pushes removal
- **WHEN** the user deletes a collection on Device A with sync configured
- **THEN** a bundle push is scheduled omitting the deleted collection, and on next poll Device B removes that collection from its IndexedDB

#### Scenario: Rename non-active pushes change
- **WHEN** the user renames a non-active collection from the switcher dropdown
- **THEN** a bundle push is scheduled reflecting the new name, and Device B sees the new name after polling

#### Scenario: Edit active collection pushes bundle
- **WHEN** the user toggles a caught state on the active collection
- **THEN** the push payload is a full bundle of all collections, not a single-collection serialization

#### Scenario: Reconcile skips when a local save is pending
- **WHEN** `reconcileBundleToIDB` runs and a local save timer is active or a local push is queued but not yet flushed
- **THEN** no rehydrated records are written to IndexedDB and any in-memory `state = await loadState()` reload is skipped

#### Scenario: Init-time reconcile respects mid-init user edit
- **WHEN** the user edits a caught state between first paint and the background reconcile's write phase
- **THEN** the edit is not overwritten by the reconcile — the edit's scheduled push becomes the next gist state

### Requirement: Pull rehydrates stripped card fields
When a bundle is pulled from the Gist, the system SHALL rehydrate each card reference by looking up its full metadata. Lookups SHALL consult the local IndexedDB collection records first (building a `cardId → card` map from every collection's `cardSelections`, `slotList`, and `slots`), then the name-keyed TCG cache, then the TCG API. Rehydrated cards SHALL be written to IndexedDB in their full-metadata form. Cards that cannot be rehydrated (offline + all caches miss) SHALL remain as stubs and be rendered as spinner placeholders in the UI until rehydration succeeds. The id-hydrated results from this path SHALL NOT be written into the name-keyed TCG cache.

#### Scenario: Local IDB hit rehydration
- **WHEN** a pulled bundle contains a `cardId` that already exists with full metadata in any local IndexedDB collection record
- **THEN** the card is rehydrated from that local record without an API call and without consulting the name-keyed cache

#### Scenario: Same-device refresh makes zero external requests
- **WHEN** a returning user refreshes the page and the pulled bundle's cards are all already present in local IndexedDB collections
- **THEN** `hydrateCards` issues no requests to pokemontcg.io

#### Scenario: Name-cache hit rehydration
- **WHEN** a pulled bundle contains a `cardId` not present in local IndexedDB collections but present in the name-keyed TCG cache
- **THEN** the card is rehydrated from the name cache without an API call

#### Scenario: API fallback rehydration
- **WHEN** a pulled bundle contains a `cardId` not present in any local source
- **THEN** the system fetches the card metadata from the TCG API and completes rehydration

#### Scenario: Rehydration failure leaves stub
- **WHEN** a pulled card's metadata cannot be fetched (offline, API error) and no local source has it
- **THEN** the state retains the card as `{ cardId }` and the binder renders a spinner placeholder for that slot

#### Scenario: Id-hydrated results do not poison name cache
- **WHEN** `hydrateCards` resolves a card via the API fallback
- **THEN** the result is not written to the name-keyed TCG cache (which only holds full per-pokemon result lists from `fetchCardsForPokemon`)
