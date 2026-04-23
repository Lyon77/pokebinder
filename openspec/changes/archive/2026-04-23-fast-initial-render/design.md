## Context

`init()` in `js/app.js` currently sequences every startup step behind a single `await` chain that includes `loadFromGist()` and, transitively, `hydrateCards()`. The hydration path fetches card metadata from pokemontcg.io in serial batches of 40 IDs, rate-limited by that API, and its results are intentionally not cached (commit `58fa47f` — avoiding name-cache poisoning). The combined wait routinely exceeds 25 seconds for users with a few hundred cards across collections.

During this window the HTML default (`POKEDEX TRACKER` title, visible empty list view) is painted by the browser and stays on screen. Clicking the collection dropdown runs a parallel IDB read that renders the user's real state in milliseconds — proving the data needed for first paint is already local. After the hydration path completes, `reconcileBundleToIDB` writes the rehydrated records back to IDB and `handleRemoteData` reassigns the in-memory `state` via `loadState()`. These writes are unconditional and can clobber mutations the user made during the window.

## Goals / Non-Goals

**Goals:**
- First meaningful paint on page refresh occurs within ~100ms of JS starting, using local IndexedDB as the source of truth.
- For users whose collection cards are already in local IndexedDB (the common case), reconcile makes zero external API calls.
- User mutations made during the window between first paint and reconcile completion are never silently overwritten.
- No change to the gist payload format, the IndexedDB schema, or any user-facing sync behavior.

**Non-Goals:**
- Not adding a new ID-keyed persistent card cache. The existing collection records are already sufficient.
- Not changing the rate at which the gist is polled (30s remains).
- Not addressing cross-device `activeId` propagation (the earlier analysis's "Issue B"). That requires a separate design conversation about conflict policy.
- Not restructuring render to tolerate stub records (cardId without metadata). Stub rendering via spinner placeholders already exists in the binder and is unchanged.

## Decisions

### Decision: Render-first with optional re-render after reconcile

`init()` splits into a synchronous-until-render phase and a background reconcile phase. The render phase runs through `loadState()` → `loadPokemonData()` → a new `renderAll()` helper. The reconcile phase fires as a non-awaited task: fetch gist, handle remote data, and call `renderAll()` again only if reconciliation actually handled new data (the existing `result.handled` signal).

**Alternatives considered:**
- *Skeleton loader.* Paints a neutral "loading…" surface first, then swaps to real content when reconcile completes. Rejected because it imposes a loading state on the common case (same-device refresh) where the local state is already correct. Net UX regression for most loads.
- *Defer gist fetch entirely to visibility/poll events.* Cleanest possible init, but defers legitimate cross-device updates by up to 30 seconds after load. The user's complaint is latency-to-first-paint, not gist pulling, so keeping the pull and just unblocking the paint is the minimal intervention.

### Decision: Hydration consults local IndexedDB before the TCG cache and API

`hydrateCards(cardIds, { localCards })` accepts an optional `localCards` map. Callers that have already loaded IDB (specifically `rehydrateBundle`) build this map by walking `getAllCollectionsFull()` and extracting `{cardId → card}` entries from `cardSelections` (pokedex), `slotList` (master), and `slots` (freestyle). Inside `hydrateCards`, lookups satisfied by `localCards` are marked resolved before the name-cache read and before any network call.

The name-cache read and the pokemontcg.io fallback remain unchanged. The "do not write id-hydrated results into the name cache" invariant from `58fa47f` is preserved — we are only changing the lookup order, not the write behavior.

**Alternatives considered:**
- *New ID-keyed cache store.* Add a `tcg-cards-by-id` IndexedDB store that `hydrateCards` writes to. Cleaner in the long run, but adds a new store, new invalidation semantics, and a migration. Not needed when the data already exists in the collection records themselves.
- *Scan name-cache for every card.* The flat scan at `getAllCachedCards()` already does this for the name cache. The limitation is that the name-cache is populated only when the user opens the picker for a given pokemon, so many cards in older collections are never covered. Local collection records cover 100% of cards the user has ever added.

### Decision: Reconcile short-circuits on any pending local change

Export a `hasPendingLocalChange()` function from `js/sync.js` that returns `!!(saveTimer || pendingJson !== null)`. `reconcileBundleToIDB` and `handleRemoteData` (and the `visibilitychange` handler) check this before writing to IDB or reassigning in-memory state. If true, the reconcile yields — the user's pending push is the newer truth and will propagate to the gist; there is no useful reconcile work to do.

**Alternatives considered:**
- *Per-collection dirty bits.* Track which specific collection records the user mutated and skip only those. More precise, but every mutation path in the app touches the active collection, so the "any change" and "this collection changed" sets are nearly identical in practice.
- *Generation counter with write-time check.* Capture a generation at reconcile start; abort writes if the user has mutated since. Handles races mid-reconcile but the reconcile's write phase is now measured in milliseconds post-Move 2, making this unnecessary precision.
- *Merge-at-reconcile.* Three-way merge local, last-pushed, and remote records. Significant complexity for a flow that is already "last-write-wins" per the existing spec.

### Decision: Re-render unconditionally after a handled reconcile

When `handleRemoteData` returns `{ handled: true, ... }`, call `renderAll()` again. The re-render is idempotent — it rebuilds from the current `state` — and is cheap enough that any visible blink is imperceptible. Skipping the second render when nothing changed would require diffing the reconciled records against the pre-reconcile snapshot; not worth the code.

This matches the existing behavior in `setRemoteChangeCallback` (the polling-driven path), keeping the two code paths symmetric.

## Risks / Trade-offs

- **[Brief double-render on refresh when reconcile brings genuine changes]** → The second render replaces the first. Idempotent. Perceived only on cross-device updates, where the content change is itself the signal the user wants.
- **[`hasPendingLocalChange()` couples `sync.js` internals to callers]** → Expose only the boolean; do not export `saveTimer` or `pendingJson` themselves. The check is already the pattern used by `pollForChanges`; this extracts it.
- **[Local hydration relies on IDB collection records being consistent with `cardId`]** → Today every full record stores cards with their original `cardId` (card selections, slotList, slots). The new `rehydrateBundle` step reads the IDB records *before* the reconcile overwrites them, so the data source is exactly what was last persisted. If a record happens to be in stub form (`{ cardId }` without `imageSmall`), the local map entry will also be a stub, which is harmless — the downstream `applyHydrationToRecord` only replaces entries missing `imageSmall`, so a stub-for-stub replacement is a no-op.
- **[`init()` now has a fire-and-forget background task]** → The task is wrapped in `try/catch`; any error emits sync status and logs, exactly like today. The polling timer (`startPolling`) is scheduled inside the same background flow so it does not start before sync is initialized.
- **[Users without sync see no change]** → The `isSyncConfigured()` branch is untouched. Init for unsynced users is already fast.
