## MODIFIED Requirements

### Requirement: Sync operates on all collections
The system SHALL sync the full set of collections (not only the active one) to the configured GitHub Gist as a single bundle file. Create, rename, and delete operations on any collection SHALL trigger a bundle push. Pull operations SHALL reconcile the remote bundle with local IndexedDB — upserting collections present in the bundle and removing local collections absent from it.

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

### Requirement: Sync payload uses compact bundle schema v2
The sync payload SHALL be a single JSON object with schema version `v: 2`, a top-level `activeId` hint, a `settings` object, and a `collections` array. The JSON SHALL NOT be pretty-printed. Each collection entry SHALL use abbreviated keys (`cg` for caught, `b` for books, `cs` for cardSelections, `dc` for disabledCategories, `ef` for excludedForms, `sl` for slotList or slots, `pc` for pageCount, `s` for sets, `l` for layout, `g` for generations). Default values SHALL be omitted (`layout: "3x3"`, `generations: [1..9]`, empty arrays, default books).

#### Scenario: Payload shape
- **WHEN** the sync system serializes state for push
- **THEN** the serialized JSON has top-level keys `v`, `activeId`, `settings`, `collections`, with `v: 2`

#### Scenario: Compact JSON
- **WHEN** the sync payload is produced
- **THEN** the JSON has no indentation or newlines (result of `JSON.stringify(payload)` with no space argument)

#### Scenario: Default values omitted
- **WHEN** a Pokedex collection is serialized with `layout: "3x3"` and all 9 generations
- **THEN** neither `l` nor `g` appears in the collection's compact form

### Requirement: Sync payload strips derivable card fields
Each card reference in the sync payload SHALL contain only the minimum data needed to rehydrate the full card from the TCG cache or API. Pokedex `cardSelections` SHALL map `formId → cardId` (string). Freestyle `slots` SHALL be an array whose entries are `null` or a `cardId` string. Master `slotList` SHALL be an array of `{ c: cardId, v: variant }` entries.

#### Scenario: Pokedex card selection stripped
- **WHEN** a Pokedex has `cardSelections: { pikachu: { cardId: "base1-58", name: "Pikachu", setName: "Base", imageSmall: "..." } }`
- **THEN** the serialized form has `cs: { pikachu: "base1-58" }`

#### Scenario: Freestyle slots stripped
- **WHEN** a Freestyle slot holds a Charizard card with full metadata
- **THEN** the serialized form stores only the `cardId` string at that slot position

#### Scenario: Master slot list stripped
- **WHEN** a Master Set `slotList` contains a Charizard reverse-holo slot with full metadata
- **THEN** the serialized form stores `{ c: "swsh12pt5-1", v: "reverseHolofoil" }` at that position

### Requirement: Pull rehydrates stripped card fields
When a bundle is pulled from the Gist, the system SHALL rehydrate each card reference by looking up its full metadata. Lookups SHALL check the local TCG cache first; cache misses SHALL fall back to the TCG API. Rehydrated cards SHALL be written to IndexedDB in their full-metadata form. Cards that cannot be rehydrated (offline + cache miss) SHALL remain as stubs and be rendered as spinner placeholders in the UI until rehydration succeeds.

#### Scenario: Cache hit rehydration
- **WHEN** a pulled bundle contains a `cardId` that exists in the TCG cache
- **THEN** the card is rehydrated from the cache without an API call

#### Scenario: Cache miss rehydration
- **WHEN** a pulled bundle contains a `cardId` that is not cached
- **THEN** the system fetches the card metadata from the TCG API, caches it, and completes rehydration

#### Scenario: Rehydration failure leaves stub
- **WHEN** a pulled card's metadata cannot be fetched (offline, API error)
- **THEN** the state retains the card as `{ cardId }` and the binder renders a spinner placeholder for that slot

### Requirement: Legacy v1 payload auto-migration
When a pull returns a payload without the `v` field (a legacy single-collection record), the system SHALL migrate it to a v2 bundle containing that one collection, union it with any local collections not present in the legacy payload, and schedule a v2 bundle push.

#### Scenario: Legacy load
- **WHEN** a device pulls a v1 payload on first load after this change ships
- **THEN** the app operates normally using the migrated v2 bundle in memory, and the next mutation pushes the v2 bundle to the Gist

#### Scenario: Legacy + extra local collections
- **WHEN** the Gist holds a v1 payload for Collection A and local IndexedDB also holds Collection B (created before sync was configured)
- **THEN** the migrated bundle contains both A and B, and the next push preserves both remotely

### Requirement: Active collection is per-device
The `activeCollectionId` SHALL be stored in localStorage and SHALL NOT be synchronized across devices. The bundle MAY include an `activeId` hint that SHALL be used only when localStorage has no active ID set (first-ever-load on a new device).

#### Scenario: Switch active does not propagate
- **WHEN** the user switches to a different collection on Device A
- **THEN** Device B's active collection remains unchanged after its next poll

#### Scenario: First-ever load uses bundle activeId hint
- **WHEN** a new device loads the app with empty localStorage and a pulled bundle has `activeId: "mst-svi"`
- **THEN** Device B sets active to "mst-svi" on initial load

#### Scenario: Bundle activeId points to missing collection
- **WHEN** a new device loads a bundle whose `activeId` references a collection not present in the bundle's `collections` array
- **THEN** the device falls back to the first collection in the bundle or the default Living Dex if the bundle is empty
