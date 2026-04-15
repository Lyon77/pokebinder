## Why

The app stores all state — collection data, TCG card search cache, and settings — in localStorage as a single JSON blob. This doesn't scale: the TCG cache grows unboundedly and will exhaust the ~5 MB localStorage quota after browsing ~250 Pokemon, silently breaking caching. Every mutation (toggling one checkbox) serializes the entire state (~280 KB at full capacity). The current single-collection model also can't support future collection types (set master binders, Pokemon-specific collections) without a structural change to how data is organized and persisted.

## What Changes

- **BREAKING**: Replace localStorage-based persistence with IndexedDB for collection data and TCG cache. Existing localStorage data will not be migrated.
- **BREAKING**: Restructure state around a collection-aware model where each collection has its own `caught`, `cardSelections`, and `books`, identified by a unique ID.
- Move TCG card search cache to a dedicated IndexedDB object store with a 7-day TTL.
- Add a manual refresh button to the card picker to re-fetch stale TCG results on demand.
- Keep lightweight/sync-config data (settings, view state, sync credentials) in localStorage.
- Clean up old `tcg-cache-*` localStorage keys on startup.

## Capabilities

### New Capabilities
- `indexeddb-storage`: IndexedDB-backed persistence layer with two object stores — one for collections, one for TCG cache. Replaces the localStorage single-blob approach.
- `tcg-cache-ttl`: 7-day TTL for cached TCG card search results with a manual refresh button in the card picker.
- `collection-model`: Collection-aware data model where each collection is an independent unit with its own caught set, card selections, and books. A default "Living Dex" collection is created on first load.

### Modified Capabilities
- None. The existing specs describe UI behaviors that are unaffected by the storage layer change.

## Impact

- **`js/storage.js`**: Major rewrite. Becomes async (IndexedDB is async). All current consumers that call `loadState`/`saveState` synchronously will need to adapt.
- **`js/tcg-api.js`**: Rewrite cache functions to use IndexedDB. `getCachedCards` becomes async (already called from async context).
- **`js/sync.js`**: Must adapt to the new collection-based state shape. Gist sync payload changes from flat state to collection-aware format.
- **`js/app.js`**: Init flow becomes async-aware. Card picker gains a refresh button. All `saveState` call sites update to new API.
- **`js/collection.js`**, **`js/binder.js`**, **`js/render.js`**, **`js/stats.js`**: Minimal or no changes — these operate on in-memory data structures, not storage directly.
- **No new dependencies**: IndexedDB is a native browser API.
