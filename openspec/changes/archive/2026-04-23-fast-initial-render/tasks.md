## 1. Expose pending-change signal from sync

- [x] 1.1 Add `hasPendingLocalChange()` in `js/sync.js` that returns `!!(saveTimer || pendingJson !== null)`
- [x] 1.2 Export `hasPendingLocalChange` from `js/sync.js`

## 2. Hydrate from local IndexedDB before TCG cache/API

- [x] 2.1 Extend `hydrateCards(cardIds, options)` in `js/tcg-api.js` to accept an optional `localCards` `Map<cardId, card>` in `options`; if provided, resolve from it before reading the name-keyed cache
- [x] 2.2 In `js/storage.js`, update `rehydrateBundle()` to build a `localCards` map by walking `getAllCollectionsFull()` and extracting `{cardId → card}` from pokedex `cardSelections`, master `slotList`, and freestyle `slots`; pass it to `hydrateCards`
- [x] 2.3 Preserve the existing "do not write id-hydrated results into the name cache" comment and behavior in `hydrateCards`

## 3. Guard reconcile against pending local edits

- [x] 3.1 Import `hasPendingLocalChange` in `js/storage.js` and short-circuit at the top of `reconcileBundleToIDB()` when it returns true (return `false` for `hadLocalOnly`)
- [x] 3.2 In `js/app.js`, at the top of `handleRemoteData()`, skip the `state = await loadState()` reassignment when `hasPendingLocalChange()` is true; still return the normal `{ handled, needsMigrationPush }` shape
- [x] 3.3 In the `visibilitychange` handler in `js/app.js`, short-circuit when `hasPendingLocalChange()` is true (mirrors the guard already in `pollForChanges`)

## 4. Render-first init

- [x] 4.1 Extract the init-time render tail of `init()` into a helper `renderAll()` covering `binderLayoutSelect.value`, `binderFlowCheck.checked`, `updateSyncButton()`, `updateTypeAwareControls()`, `rebuildCollection()`, and the `switchView(...)` branch
- [x] 4.2 Move `renderAll()` invocation in `init()` to immediately after `loadState()` + `loadPokemonData()`, before any gist work
- [x] 4.3 Convert the `if (isSyncConfigured())` block into a fire-and-forget `reconcileFromGist()` call that wraps the existing gist fetch, `handleRemoteData` handling, migration push, and `setLastSavedJson` logic
- [x] 4.4 Inside `reconcileFromGist()`, call `renderAll()` again when `handleRemoteData` returns `{ handled: true, ... }`; do not re-render when `handled: false`
- [x] 4.5 Move `startPolling(30000)` into the `reconcileFromGist()` path so it schedules after the initial gist attempt rather than on the synchronous init path

## 5. Manual verification

- [ ] 5.1 With sync configured and collections populated, refresh and confirm first paint occurs within ~100ms and no pokemontcg.io requests are issued in DevTools Network
- [ ] 5.2 With sync configured, refresh and immediately toggle a caught state before background reconcile completes; after reconcile finishes, confirm the toggle persists in both the UI and (after debounce) the pushed gist
- [ ] 5.3 Refresh with sync misconfigured (invalid PAT) and confirm init completes, the local-state view renders, and the sync status surfaces the error
- [ ] 5.4 In an incognito window with sync configured for the first time (no local collections yet), confirm the living-dex default renders immediately and the gist's collections appear after reconcile without blocking first paint
