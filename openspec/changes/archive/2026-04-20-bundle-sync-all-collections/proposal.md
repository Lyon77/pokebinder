## Why

The current sync system only pushes the active collection's state to the configured Gist. This has two consequences: (1) creating, renaming (non-active), or deleting collections never reach the remote, so multi-device users see divergent collection lists; and (2) switching the active collection on one device eventually overwrites the remote copy of whatever was there before, silently losing data.

In parallel, the Gist payload is larger than it needs to be. It is pretty-printed JSON with redundant card metadata (name, setName, setYear, rarity, imageSmall) stored on every card selection and freestyle slot — all of which are derivable from `cardId` via the TCG cache that already exists in IndexedDB. Cards can be rehydrated locally, so the remote copy is effectively paying for data it doesn't need to hold.

This change bundles every collection into a single Gist file, shrinks the payload substantially, and adds a one-shot auto-migration so existing users don't have to re-init sync.

## What Changes

- **Bundle schema v2** — the Gist stores one file `collection.json` whose content is `{ v: 2, settings: {...}, collections: [{...}, ...] }`. Every collection the user owns is included, not just the active one.
- **Sync-on-any-collection-change** — creating, renaming, or deleting any collection (not just edits to the active one) triggers `scheduleSave(bundle)`. `saveCollection()` and `deleteCollection()` are extended to serialize-and-push the bundle.
- **Pull reconciliation** — when a pull returns a bundle, the local IndexedDB is updated to match: collections present in the bundle are upserted; collections absent from the bundle are deleted locally. Last-write-wins; no tombstones.
- **Compact JSON** — `JSON.stringify` is called without the `null, 2` indent argument. Worth ~35% size reduction alone.
- **Default omission** — fields with well-known defaults are omitted from the serialized form: `layout: "3x3"`, `generations: [1..9]`, empty arrays (`disabledCategories`, `excludedForms`, `books` when equal to the default). On load, missing fields fall back to their defaults.
- **Strip derivable card fields** — in the gist, each card entry stores only the minimum needed to rehydrate it: pokedex `cardSelections` becomes `{ formId → cardId }`, freestyle `slots` becomes an array of `cardId | null`, master set `slotList` becomes an array of `{ cardId, variant }`. The TCG cache in IndexedDB (and the TCG API as fallback) supplies `name`, `number`, `setName`, `setYear`, `rarity`, `imageSmall` on hydration.
- **Key abbreviation** — verbose field names in the gist are shortened to single/double-letter keys (`caught` → `cg`, `books` → `b`, `cardSelections` → `cs`, `disabledCategories` → `dc`, `excludedForms` → `ef`, `slotList` → `sl`, `slots` → `sl`, `generations` → `g`, `layout` → `l`, `pageCount` → `pc`, `sets` → `s`). Local IndexedDB records keep their original keys — abbreviation is serialization-only.
- **Legacy format auto-migration on load** — when a pull returns v1 data (a single collection record without `v` or `collections` fields), the loader wraps it into a v2 bundle containing that one collection and saves the migrated bundle back to the Gist on the next mutation. Users do not need to re-init sync.
- **Spinner placeholders for un-rehydrated cards** — when state briefly holds a stripped card (post-pull, cache miss, fetch in flight), the binder slot renders a spinner placeholder. Once the TCG fetch resolves, the slot re-renders with the image.
- **Per-device active collection** — `activeId` stays in localStorage only. Switching active on Device A does not affect Device B.

## Capabilities

### Modified Capabilities
- `collection-model`: Sync format, push-all-collections behavior, pull reconciliation, default-omission, card-field stripping, legacy v1 migration, and per-device active collection are all requirements here.

## Impact

- **`js/sync.js`**: `scheduleSave(data)` already takes an arbitrary payload — no API change, just the callers pass a bundle instead of a single-collection serialization. `cancelPendingSave`, debounce, rate-limit, and polling logic unchanged.
- **`js/storage.js`**: New `serializeBundle(state, allCollections)` / `deserializeBundle(bundle)` / `rehydrateCards(bundle)` helpers. `saveState(state)` stops calling the single-collection serializer and instead builds a full bundle. `loadFromGist` output is passed through bundle-detection + legacy migration.
- **`js/db.js`**: `reconcileBundleToIDB(bundle)` — upsert collections in bundle, delete IDB collections not present in bundle. Called by the remote-change handler.
- **`js/app.js`**: Create/rename/delete handlers now need to invoke a sync push after their IDB write (currently they skip sync entirely). The remote-change handler switches from "replace active state" to "reconcile IDB + reload active state if still present".
- **`js/binder.js`** (and related renderers): handle slots whose card object has only `cardId` (render spinner placeholder, attach rehydration hook). Minor UI addition only — doesn't change layout.
- **`js/tcg-api.js`**: expose a `hydrateCards(cardIds)` batch fetch that consults the cache first and fetches any misses, used by the post-pull rehydration flow.
- **No IndexedDB schema change**. IDB records continue to store full card metadata for fast rendering; the compact form is for the Gist payload only.
- **TCG API load on first pull** — a new device pulling a bundle for the first time will issue N fetches for Pokemon whose cards are not yet cached. We already do this lazily in the picker; here it happens eagerly at bundle load. Pagination cache hits for subsequent loads.
