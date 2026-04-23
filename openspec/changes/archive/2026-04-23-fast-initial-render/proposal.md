## Why

On page refresh with sync configured, the app takes ~29 seconds to show the user's real collection. During that window a misleading HTML default ("POKEDEX TRACKER" header, empty list view) is on screen even though the local IndexedDB already contains the user's full, correct state. The latency is not the gist fetch itself — it is `hydrateCards()` serially refetching card metadata from pokemontcg.io on every load, despite that metadata already being stored in local collection records. If the user edits anything during that 29s window (via the dropdown workaround), the reconcile that runs at t≈29s silently overwrites those edits.

## What Changes

- **Render immediately from local state on init.** `init()` paints the UI from IndexedDB as soon as `loadState()` and `loadPokemonData()` complete, without awaiting the gist fetch. The gist fetch + reconcile run as a background task that re-renders only if reconciliation actually produced changes.
- **`hydrateCards` consults local IndexedDB before the TCG API.** The function walks the user's own collection records to build a `cardId → card` map first, uses that to satisfy lookups, then falls back to the existing name-keyed TCG cache, and only then to pokemontcg.io. Same-device refresh resolves all hydration lookups locally and makes zero external requests.
- **Reconcile skips when local changes are pending.** `reconcileBundleToIDB` and `handleRemoteData`'s state-reload check `saveTimer`/`pendingJson` from the sync layer before writing. If a local save is queued or in-flight, the reconcile's writes and the in-memory state reload are skipped — the pending local push is the newer truth. This mirrors the guard already used in `pollForChanges`.

## Capabilities

### New Capabilities
- `initial-render`: How and when the app paints its first meaningful UI on page load. Covers the ordering of local-state rendering vs. remote sync work.

### Modified Capabilities
- `collection-model`: Two requirements change. "Pull rehydrates stripped card fields" — the lookup order now puts local IndexedDB collection records ahead of the name-keyed TCG cache and the TCG API. "Sync operates on all collections" — the pull-reconciliation step MUST NOT overwrite local IndexedDB records (nor reload in-memory state from IDB) while a local save is pending.

## Impact

- **`js/app.js`** — `init()` reorganized: local-state render happens before the gist fetch; gist reconciliation runs as a background task and re-renders only on actual changes. The existing `visibilitychange` handler gains the same pending-changes guard.
- **`js/tcg-api.js`** — `hydrateCards()` gains an optional `localCards` parameter (a `Map<cardId, card>`). When provided, it is consulted before the name-keyed cache and before any fetch. Keeps the existing "do not write id-hydrated results into the name cache" invariant from commit `58fa47f`.
- **`js/storage.js`** — `rehydrateBundle()` builds a `localCards` map by walking every collection record from `getAllCollectionsFull()` and extracting `{cardId → card}` from `cardSelections`/`slotList`/`slots`, then passes it to `hydrateCards()`. `reconcileBundleToIDB()` and `handleRemoteData()` check the sync layer's pending-save signal and short-circuit if a local save is queued.
- **`js/sync.js`** — expose a read-only `hasPendingLocalChange()` helper (returns true if `saveTimer` or `pendingJson` is set) for consumers outside the sync module to consult.
- **User-facing behavior** — first paint on refresh drops from ~29s to ~50ms on same-device use. Cross-device refresh still sees the local state immediately, with any genuinely-new cards filling in when hydration (now near-instant for cached cards, still network-bound for truly unknown ones) completes. No user-facing API or data format changes.
