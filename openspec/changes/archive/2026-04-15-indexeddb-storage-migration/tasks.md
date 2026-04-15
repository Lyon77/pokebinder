## 1. IndexedDB Foundation

- [x] 1.1 Create `js/db.js` — thin IndexedDB wrapper that opens the "pokebinder" database (version 1) with "collections" and "tcg-cache" object stores, and exposes async helpers: `getCollection(id)`, `saveCollection(record)`, `getCachedCards(name)`, `cacheCards(name, cards)`, `clearExpiredCache()`
- [x] 1.2 Add 7-day TTL check to `getCachedCards` — return null if `Date.now() - record.ts > 7 * 86400000`

## 2. TCG Cache Migration

- [x] 2.1 Rewrite `js/tcg-api.js` to use `db.js` instead of localStorage — `getCachedCards` and `cacheCards` become async, `fetchCardsForPokemon` already async so callers unchanged
- [x] 2.2 Add refresh button to card picker in `js/app.js` — button next to card count, calls `fetchCardsForPokemon` with a `skipCache` flag, shows loading state, updates grid on completion
- [x] 2.3 Add `skipCache` parameter to `fetchCardsForPokemon` in `js/tcg-api.js` — when true, bypass cache read and always fetch from API, then overwrite cache entry

## 3. Collection-Aware Storage

- [x] 3.1 Rewrite `js/storage.js` — replace localStorage read/write with `db.js` calls. `loadState` becomes async and reads from the "collections" store. `saveState` becomes async and writes only the active collection record. Add `loadActiveCollection()` and `saveActiveCollection()`. Keep `serializeState` and `loadStateFromData` for sync compatibility.
- [x] 3.2 Create default "Living Dex" collection on first load — in `loadState`, if no collection exists in IndexedDB, create and save the default record with id "living-dex", name "Living Dex", empty caught/cardSelections/disabledCategories/excludedForms, and default books

## 4. App Integration

- [x] 4.1 Update `js/app.js` init flow — `loadState` is now async, ensure `await` at startup. Move `state = loadState()` to `state = await loadState()`
- [x] 4.2 Update all `saveState` call sites in `js/app.js` — add `await` or fire-and-forget as appropriate for each mutation handler (toggleCaught, setCardSelection, clearCardSelection, saveBooks, toggleCategory, toggleExcludedForm, etc.)
- [x] 4.3 Move global settings (binderLayout, binderFlow) to localStorage — extract from collection record, read/write via dedicated `loadSettings`/`saveSettings` functions in storage.js using a `pokebinder-settings` localStorage key

## 5. Sync Adaptation

- [x] 5.1 Update `js/sync.js` Gist payload — `saveToGist` and `loadFromGist` work with the collection-aware record shape (include id and name fields alongside caught, cardSelections, etc.)
- [x] 5.2 Update `serializeState` and `loadStateFromData` in `js/storage.js` — serialize/deserialize to/from the new collection-aware format for sync round-trips
- [x] 5.3 Update remote change callback in `js/app.js` — when Gist data arrives, load it into the active collection record and save to IndexedDB

## 6. Cleanup

- [x] 6.1 Add localStorage cleanup to init — remove all `tcg-cache-*` keys and the `pokedex-tracker` key from localStorage on startup
- [x] 6.2 Verify end-to-end — confirm caught toggle, card selection, binder navigation, settings changes, and Gist sync all work with the new storage layer
