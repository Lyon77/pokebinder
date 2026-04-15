## Context

Pokebinder is a static-site Pokemon card collection tracker. All persistent state currently lives in a single `localStorage` key (`pokedex-tracker`) as one JSON blob. TCG card search results are cached in separate `localStorage` keys (`tcg-cache-*`) with no eviction. The app syncs state to a GitHub Gist for cross-device access.

The storage layer needs to support multiple independent collections (Living Dex, set master binders, Pokemon-specific collections) and stop the TCG cache from exhausting the localStorage quota.

## Goals / Non-Goals

**Goals:**
- Move collection data and TCG cache to IndexedDB
- Structure storage around a collection-aware model (each collection is independent)
- Add TTL and manual refresh for TCG cache
- Keep settings and sync credentials in localStorage (small, synchronous access is fine)
- Clean up legacy localStorage keys

**Non-Goals:**
- Migrating existing user data (clean slate is acceptable)
- Building a collection management UI (create/rename/delete collections) — that's a separate change
- Changing the Gist sync protocol beyond adapting to the new data shape
- Per-collection settings (layout, flow stay global for now)
- Implementing new collection types (set master, Pokemon-specific) — only the storage model needs to support them

## Decisions

### 1. IndexedDB over localStorage for collection and cache data

**Choice**: Use IndexedDB with two object stores in a single database.

**Alternatives considered**:
- *Stay on localStorage with split keys*: Solves per-click serialization cost but doesn't solve the 5 MB quota problem. TCG cache and collection data still compete for space.
- *localStorage + LRU eviction for TCG cache*: Quick fix for the quota bomb but doesn't set up the collection-aware model. Would need to be redone.

**Rationale**: IndexedDB has no practical storage limit (~50 MB+), is async (non-blocking writes), and supports structured data natively. The TCG cache is a natural fit (write-heavy, read-by-key). Collections benefit from per-record storage rather than one monolithic blob.

### 2. Database schema: one database, two object stores

```
Database: "pokebinder" (version 1)

Object Store: "collections"
  keyPath: "id"
  Record shape: {
    id: string,              // e.g. "living-dex"
    name: string,            // e.g. "Living Dex"
    caught: string[],        // form IDs
    cardSelections: {},      // formId → card object
    disabledCategories: [],
    excludedForms: [],
    books: [],
  }

Object Store: "tcg-cache"
  keyPath: "name"
  Record shape: {
    name: string,            // pokemon name (lowercase)
    cards: object[],         // parsed card objects
    ts: number,              // Date.now() at write time
  }
```

**Alternatives considered**:
- *One object store per collection*: Object stores can only be created during `onupgradeneeded`, which requires bumping the database version. Creating stores dynamically per collection would force version bumps and briefly close all connections. A single `collections` store with `id` as keyPath avoids this entirely.
- *Separate databases per concern*: More isolation but unnecessary complexity. One database with two stores is the standard IndexedDB pattern.

**Rationale**: Keeps schema changes to database version upgrades. Adding a new collection is just a `put()` into the `collections` store — no schema migration needed.

### 3. Thin async wrapper over IndexedDB

The raw IndexedDB API is verbose (transactions, request events, error handling). Wrap it in a small module (`js/db.js`) that exposes:

```
openDB()                          → Promise<IDBDatabase>
getCollection(id)                 → Promise<record | null>
saveCollection(record)            → Promise<void>
getCachedCards(name)              → Promise<cards[] | null>  (returns null if expired)
cacheCards(name, cards)           → Promise<void>
clearExpiredCache()               → Promise<void>
```

**Rationale**: Isolates IndexedDB ceremony from business logic. `storage.js` and `tcg-api.js` call the wrapper instead of touching IndexedDB directly. The wrapper is ~60-80 lines, not a library.

### 4. storage.js becomes async

All `loadState`/`saveState` functions become async. The in-memory `state` object stays as the source of truth during a session — IndexedDB is read at startup and written on mutations. This means:

- `loadState()` → `await loadState()` (only called once at init)
- `saveState(state)` → `await saveState(state)` (called on every mutation)
- `init()` in app.js is already async, so the startup path is straightforward

Each save function writes only the active collection's record to IndexedDB, not the entire state. Toggling one caught checkbox writes ~18 KB (the collection record), not 280 KB.

**Alternatives considered**:
- *Debounce IndexedDB writes*: Could batch rapid mutations (e.g., user clicking fast). But IndexedDB writes are already non-blocking and fast for ~18 KB records. Premature optimization — add later if profiling shows a need.
- *Keep saveState synchronous, write to IndexedDB in background*: Would require a dual-write (memory + async flush). Adds complexity for minimal gain since the current callers are all in event handlers that can be async.

### 5. Sync adapts to collection-aware format

The Gist sync currently pushes/pulls a single `collection.json` file. With the new model, sync pushes the active collection's data as `collection.json` (same file name, new shape that includes the collection `id` and `name`). 

For this change, sync only handles the single active collection. Multi-collection sync is a future concern.

**Rationale**: Keeps the sync layer simple. The Gist format changes but the mechanism (single file, debounced save, polling) stays the same. No migration — existing Gist data is ignored on load.

### 6. Default collection on first load

On first launch (empty IndexedDB), create a default collection:

```
{
  id: "living-dex",
  name: "Living Dex",
  caught: [],
  cardSelections: {},
  disabledCategories: [],
  excludedForms: [],
  books: [{ generations: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
}
```

This matches today's behavior. The user sees the same app, just backed by IndexedDB.

### 7. TCG cache TTL: 7 days, checked on read

On `getCachedCards(name)`, check `Date.now() - record.ts > 7 * 86400000`. If expired, return null (triggers a fresh API fetch). Expired records are lazily cleaned up — no background sweep needed, though `clearExpiredCache()` is available for startup cleanup.

A refresh button in the card picker allows the user to force re-fetch regardless of TTL.

### 8. localStorage cleanup on startup

On init, remove all `tcg-cache-*` keys and the old `pokedex-tracker` key from localStorage. This reclaims space and prevents confusion. Settings keys (`pokebinder-view-state`, `pokebinder-settings`, sync config) remain in localStorage.

## Risks / Trade-offs

**IndexedDB is async, localStorage was sync** → All save/load paths become Promise-based. The app already has an async `init()` and async card picker, so this is consistent. Risk is low but every `saveState` call site in app.js needs updating.

**No data migration** → Existing users lose their collection. Acceptable per project decision, but if the app has active users with synced Gists, they'll need to re-enter their data. → Mitigation: The Gist still has their old data; they could manually re-sync in the future if a migration tool is added later.

**Browser storage eviction** → Browsers can evict IndexedDB data under storage pressure (especially in Safari). For a collection tracker, data loss would be frustrating. → Mitigation: Gist sync provides a backup. Could request persistent storage (`navigator.storage.persist()`) in the future.

**Single active collection assumption in sync** → This design only syncs one collection. If users create multiple collections and expect all to sync, they'll be surprised. → Mitigation: Document this limitation. Multi-collection sync is a separate change.
