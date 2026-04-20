## 1. Serialization primitives

- [x] 1.1 Add `compactCollection(record)` to `js/storage.js` — accepts a full collection record (IDB shape) and returns a gist-ready object: short keys, stripped card fields, default values omitted.
- [x] 1.2 Add `expandCollection(compact)` inverse — accepts a compact gist object and returns a full record shape (original keys, defaults filled in). Card fields that cannot be rehydrated yet remain as `{ cardId }` / `{ cardId, variant }` stubs.
- [x] 1.3 Add `serializeBundle(activeId, settings, collections)` — returns `{ v: 2, activeId, settings, collections: [compactCollection(c)...] }` and `JSON.stringify` with NO indent argument.
- [x] 1.4 Add `parseBundle(jsonString)` — parses and returns the bundle object, throwing on invalid JSON or missing required fields.
- [x] 1.5 Add default-omission helpers: skip `layout` when `"3x3"`, `generations` when equal to all 9, `disabledCategories`/`excludedForms` when empty, `books` when deep-equal to the default `[{ generations: [1..9] }]`. Expansion restores these defaults on load.

## 2. Card stripping + rehydration

- [x] 2.1 In `compactCollection`, transform `cardSelections`:
  - Pokedex: `{ formId → card }` → `{ formId → cardId }`
  - Master `slotList`: `[{ cardId, variant, ... }]` → `[{ c: cardId, v: variant }]`
  - Freestyle `slots`: `[null|card]` → `[null|cardId]`
- [x] 2.2 Add `hydrateCards(cardIds)` to `js/tcg-api.js` — batches cardIds into `q=id:a OR id:b OR ...` requests (pageSize 250), first consulting the IDB card cache (`getCachedCards`-style), returning `Map<cardId, cardObject>`. Caches fetched results into IDB.
- [x] 2.3 Add `rehydrateCollection(compact)` to `js/storage.js` — calls `hydrateCards` for every `cardId` in the collection (cardSelections values, slotList entries, freestyle slots), merges the full metadata back into the compact structure, and returns a full-shape record.
- [x] 2.4 Rehydration failure handling: if `hydrateCards` cannot resolve a cardId (network failure + cache miss), leave the card as a stub `{ cardId }` / `{ cardId, variant }`. Do not throw.

## 3. Bundle push

- [x] 3.1 Add `pushBundle()` to `js/storage.js` — reads all collections via `getAllCollections` (extend it to return FULL records, not just `{id,name,type}`), reads `activeId` from localStorage, reads `binderFlow` setting, calls `scheduleSave(serializeBundle(...))`.
- [x] 3.2 Replace the `scheduleSave(serializeState(state))` call inside `saveState` with `pushBundle()`. All existing callers of `saveState` now drive bundle pushes.
- [x] 3.3 Modify `saveCollection(record)` in `js/db.js` (or add a wrapper in `js/storage.js`) to trigger `pushBundle()` after the IDB write, but only if sync is configured. This covers the creation flow and non-active rename.
- [x] 3.4 Modify `deleteCollection(id)` similarly — after IDB delete, trigger `pushBundle()`.
- [x] 3.5 Ensure `saveStateLocal` (used in remote-change handler to avoid echo-push) continues to bypass sync. The remote-change handler must not trigger a push while applying a pulled bundle.

## 4. Bundle pull + reconciliation

- [x] 4.1 Replace the `setRemoteChangeCallback(data => ...)` body in `js/app.js`. New flow:
  1. Detect v2 (`data.v === 2`) vs v1 (fallback).
  2. If v1: call `migrateV1ToV2(data)` (task 5.1).
  3. For each collection in `bundle.collections`, call `rehydrateCollection` — parallelize across collections.
  4. Call `reconcileBundleToIDB(bundle)`.
  5. Determine new active collection (localStorage → bundle.activeId → first remaining → default).
  6. Reload state via `loadState()`, `rebuildCollection()`.
- [x] 4.2 Add `reconcileBundleToIDB(bundle)` to `js/db.js`:
  - For each collection in `bundle.collections`: `saveCollection(record)` (upsert). Use a `{ skipSync: true }` flag so this doesn't re-trigger a push.
  - Read all existing collection IDs from IDB; for any ID NOT in `bundle.collections`, call the underlying IDB delete (not the `deleteCollection` wrapper, to avoid sync push).
- [x] 4.3 Update `loadFromGist()` / initial-load flow in `js/app.js` to apply the same bundle-pull path on first page load, not only on polled-change.

## 5. Legacy v1 migration

- [x] 5.1 Add `migrateV1ToV2(v1)` to `js/storage.js`:
  - Return `{ v: 2, activeId: v1.id, settings: { binderFlow: v1.binderFlow || 'page' }, collections: [compactCollection(v1)] }`.
  - The compact step also strips card fields from the legacy data — we DON'T rehydrate here, that happens in the pull path.
- [x] 5.2 On first-load-after-deploy, if the migration activates, union with local IDB collections that aren't already in the migrated bundle (to avoid losing local-only collections). Push the unioned bundle on the first save.

## 6. UI placeholder for un-rehydrated cards

- [x] 6.1 In `js/binder.js` slot rendering, detect card objects that have `cardId` but no `imageSmall` (or no `name`). Render a spinner placeholder: `<div class="slot-rehydrating"><div class="spinner"></div></div>`.
- [x] 6.2 Add `.slot-rehydrating` + `.spinner` CSS in `css/styles.css`. Keep it visually congruent with the existing slot look (dashed border, same aspect ratio).
- [x] 6.3 After post-pull rehydration completes (task 4.1 step 3), re-render affected slots. This is already triggered by `rebuildCollection` in step 6 of 4.1 — confirm no additional wiring needed.
- [x] 6.4 If hydration failed for a specific card (still a stub in state), provide a retry affordance: click the slot → re-run `hydrateCards([cardId])` → re-render.

## 7. Active collection handling

- [x] 7.1 Confirm localStorage `activeCollectionId` is not written from the pull path. Any write should come from explicit user action (collection switcher).
- [x] 7.2 On first-ever app load (empty localStorage), after pull, select active via: localStorage → bundle.activeId → first collection in IDB → default ("living-dex").
- [x] 7.3 Verify `activeId` is correctly written into the bundle at push time (read from localStorage at serialize time).

## 8. Verification

- [x] 8.1 **Fresh install, no sync:** App works exactly as before. Bundle format is unused until sync is configured.
- [x] 8.2 **Sync configured, single collection:** Push produces a v2 bundle. Pull on a second device reproduces the same collection.
- [x] 8.3 **Create collection on Device A:** Next save triggers a push; Device B polls and receives the new collection; Device B's IDB contains both collections without user action.
- [x] 8.4 **Delete collection on Device A:** Device B polls and removes the deleted collection from IDB. If Device B's active was the deleted one, it switches to the next remaining collection.
- [x] 8.5 **Rename non-active on Device A:** Device B sees the rename on next poll.
- [x] 8.6 **Legacy v1 gist on first load:** App migrates to v2 in memory, operates normally. First save writes v2 to the gist. Subsequent loads go through the fast path.
- [x] 8.7 **Local IDB has a collection not in the v1 gist** (legacy edge): that collection is preserved and included in the first v2 push.
- [x] 8.8 **Spinner placeholder visible post-pull:** In a simulated slow-network test (throttle in DevTools), open the app on a device with no TCG cache; verify slots show spinners and fill in as fetches complete.
- [x] 8.9 **Payload size measurement:** For a realistic collection (pokedex, 300 caught, 20 card selections), compare pre-change gist bytes vs post-change. Target: ~50%+ reduction.
- [x] 8.10 **Per-device active:** Switch active on Device A; Device B remains on its own active collection after next poll.
- [x] 8.11 **Rate-limit behavior unchanged:** Rapidly create several collections and verify the 5 s debounce still coalesces them into a single push.
- [x] 8.12 **Round-trip fidelity:** Push a bundle, read it back from the gist, deserialize, rehydrate, and compare against the original state. All non-card fields should be byte-identical; card fields should rehydrate to the same objects (assuming cache hits).
