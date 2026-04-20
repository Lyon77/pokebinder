## Context

Sync today: the active collection is serialized (pretty-printed, all fields) and PATCHed into a Gist file named `collection.json`. The Gist therefore holds exactly one collection. When the app polls, the response is interpreted as "what the active collection should be" and replaces the current state. Create/delete/non-active-rename operations touch IndexedDB only.

This change moves to a Gist payload that holds every collection the user owns, shrinks each collection's on-the-wire size, and makes sync reflect the full local state — adds, renames, and deletes included.

## Goals / Non-Goals

**Goals:**
- Single Gist file represents the full set of collections
- Create / rename / delete propagate across devices
- Payload is materially smaller than today (expected ~50–60% reduction for typical use)
- Legacy v1 gists load without user action
- Per-device active collection (switching active on one device does not force-switch another)

**Non-Goals:**
- Master set `slotList` remains stored on both IDB and gist (re-expanding from `sets[]` on every pull would take minutes on first load).
- gzip/base64 of the payload (lever 6 from discussion) — skipped; readability outweighs marginal additional savings.
- Conflict resolution beyond last-write-wins. Users rarely edit the same collection on two devices concurrently; if they do, the latest push wins.
- Tombstones for deletion. A collection missing from the bundle is interpreted as "deleted", not "maybe-missing".

## Decisions

### 1. Bundle schema (v2)

```json
{
  "v": 2,
  "activeId": "living-dex",
  "settings": { "binderFlow": "page" },
  "collections": [
    { "id": "living-dex", "name": "Living Dex", "type": "pokedex", "cg": [...], ... },
    { "id": "mst-svi", "name": "Scarlet & Violet", "type": "master", ... }
  ]
}
```

- `v: 2` — schema marker used by the loader to distinguish legacy (v1) from bundle (v2). v1 payloads have no `v` field and have `caught` at the top level.
- `activeId` — written by the push side (reflecting whatever is in localStorage at push time) but NOT applied by pullers. It exists as a hint for users who wipe localStorage (e.g., on a new device) — we use it to pick an initial active collection. It does not synchronize active-view across devices.
- `settings.binderFlow` — the one cross-collection preference we already sync today. Stays at the top level.
- `collections[]` — an unordered array. Each entry is a compact serialization of one collection record.

### 2. Compact serialization per collection

Each collection becomes, in the gist:

```
{ id, name, type, cg: [...], ?l, ?g (pokedex), ?cs (pokedex),
  ?dc (pokedex), ?ef (pokedex), ?s (master), ?sl (master|freestyle),
  ?pc (freestyle), ?b }
```

Where:
- `cg` = `caught` (always present, as an array)
- `l` = `layout` (omitted when default `"3x3"`)
- `g` = `generations` (omitted when default `[1,2,3,4,5,6,7,8,9]` — pokedex only)
- `cs` = `cardSelections` (pokedex only; see §3 for shape)
- `dc` = `disabledCategories` (omitted when empty)
- `ef` = `excludedForms` (omitted when empty)
- `s` = `sets` (master only, array of set IDs)
- `sl` = `slotList` (master) or `slots` (freestyle). Same key because a given collection has only one meaning for it.
- `pc` = `pageCount` (freestyle only, number)
- `b` = `books` (omitted when empty or equal to the default `[{ generations: [1..9] }]`)

Key-abbreviation is serialization-only. Local state and IndexedDB continue to use the full names. Serializer and deserializer are the only places that know about the abbreviations, keeping the rest of the code untouched.

### 3. Card field stripping

The on-the-wire shape of each card reference:

| Where | Today | In gist v2 |
|---|---|---|
| Pokedex `cardSelections` | `{ formId → { cardId, name, number, setName, setYear, rarity, imageSmall } }` | `{ formId → cardId }` |
| Freestyle `slots` | array of `null` or full card object | array of `null` or `cardId` |
| Master `slotList` | array of `{ cardId, variant, name, number, setId, setName, rarity, imageSmall }` | array of `{ c: cardId, v: variant }` |

Rehydration lookup on pull:
1. Check `js/db.js` TCG cache (populated by the existing picker flow).
2. On cache miss, call `fetchCardsForPokemon(name)` where `name` is derivable from the `cardId` via the TCG API (cardId → card metadata fetch).

The TCG API `cards` endpoint supports `q=id:<cardId>` for single-card lookups — `hydrateCards(ids)` batches these into a single `q=id:a OR id:b OR id:c` request (up to 250 cards per page). This is efficient even for large rehydration sets.

**UI contract during rehydration:** Until a card's full metadata is available, the state's card object holds only `{ cardId }` (or `{ cardId, variant }`). `js/binder.js` detects this shape and renders a spinner placeholder. When `hydrateCards` completes, the state is updated and the binder re-renders.

**What happens if hydration fails entirely (offline + cache miss)?** The card stays as `{ cardId }`. The binder shows a spinner-with-retry affordance. The user can keep using the app with those few slots as placeholders until network returns. No data is lost — the `cardId` is sufficient to rehydrate once online.

### 4. Push triggers

Every mutation that changes "which collections exist, or what's in any of them" triggers a bundle push:

- `saveState(state)` — active collection edits (already wired; change is the payload shape)
- `saveCollection(record)` — when writing a non-active collection (rename, new, first-save of a master slotList after creation)
- `deleteCollection(id)` — after IDB delete

All three converge on a single helper:

```
pushBundle() =>
  collections = await getAllCollectionsFull()
  bundle = serializeBundle(activeId, settings, collections)
  scheduleSave(bundle)
```

The existing debounce (5s) and rate-limit handling in `js/sync.js` applies unchanged.

### 5. Pull reconciliation

On `pollForChanges` / `loadFromGist` success:

```
bundle = parse(gist content)
if bundle is v1 (no `v` field):
  bundle = migrateV1ToV2(bundle)
  scheduleSave(serializeBundle(...))  // writes migrated form back on next debounce

rehydratedCollections = await hydrateAllCards(bundle.collections)
await reconcileBundleToIDB(rehydratedCollections)
  // upsert every collection from the bundle
  // delete any local collection whose id is not in the bundle

activeId = localStorage.active OR (bundle.activeId if localStorage empty)
if activeId still exists in IDB:
  state = loadState()
else:
  state = first remaining collection (or default if none)

rebuildCollection()
```

**Why rehydrate before writing to IDB?** So IDB always contains full card records for fast rendering. Stripped cards are a wire-format concern, not a local-storage concern. (See §8 for the trade-off this implies.)

### 6. Legacy v1 migration on load

A v1 payload looks like:
```
{ id, name, type, caught: [...], cardSelections: {...}, ... }
```

Detection: if the top-level object has no `v` and has a `caught` array (or a `type` field), treat it as a single v1 collection.

Migration:
```
migrateV1ToV2(v1) => {
  v: 2,
  activeId: v1.id,
  settings: { binderFlow: v1.binderFlow || 'page' },
  collections: [ compactCollection(v1) ],
}
```

The migrated bundle is used for the current session AND scheduled as the next push. After that first push, the Gist contains v2, and subsequent pulls take the fast path.

**Edge:** if the local IDB has MORE collections than the migrated bundle (e.g., a user created a second collection locally before this change shipped, so it was never in the Gist), the reconciliation in §5 would delete those local collections on pull. To avoid that on first-load-after-deploy, the migration flow includes an "IDB-merge" pass: the migrated bundle is unioned with any IDB collections not already in it, then pushed. This ensures no local data is lost during the v1→v2 transition.

### 7. Per-device active collection

`activeId` in localStorage remains the source of truth for "which collection is showing in the UI on THIS device". The bundle's `activeId` field is purely a hint used on first-ever-load (new device, empty localStorage) to pick a reasonable default. It is never applied as "switch to this collection" on a running device.

### 8. What IDB stores

IDB records continue to hold the FULL card metadata (post-rehydration). Only the gist payload is stripped. This means:
- Reading from IDB is unchanged (fast, no rehydration needed on cold start if local cache is warm).
- Writing to IDB: when pulling a v2 bundle, we rehydrate in memory, THEN upsert the full record. IDB never holds stripped records.
- Writing to gist: we always re-strip at serialize time.

The cost: in-memory state briefly holds stripped cards post-pull, pre-rehydration. The binder has to handle this transient state, which is the spinner placeholder path described in §3. This is the only UI surface that changes.

### 9. Size estimate

Current sample (50 caught + 2 cardSelections, pokedex):
- Today: 1717 bytes (pretty) / 1125 bytes (compact)
- v2 compact + stripped cards + abbreviated keys: ~700 bytes

For a Pokedex with 300 caught + 20 cardSelections:
- Today: ~8 KB pretty
- v2: ~3 KB

For a user with 5 collections (mix of pokedex + freestyle), each moderately populated:
- Today: only 1 collection synced (~3 KB)
- v2: all 5 synced, combined ~12 KB

The size grows by bundling more collections, but each individual collection shrinks enough that the total stays well under Gist file limits (100 MB per file, 1 MB displayed inline).

## Risks / Trade-offs

**First-load rehydration latency on a new device** → A user pulling a bundle on a fresh device with no TCG cache may face N API fetches. Mitigation: batch via `id:a OR id:b OR id:c` queries (up to 250 cards per request); the TCG API is fast and cached in IDB after.

**Delete propagation without tombstones** → If Device A deletes a collection, Device B will remove it on next poll. This is the user's explicit choice. Risk: if Device A's push hasn't reached the gist yet and Device B pushes an edit to that collection, Device A will receive the collection back on its next poll (effectively undelete). This is a latency window bug, not a correctness issue — last writer wins.

**Active-id-on-new-device** → When a brand-new device opens the app and pulls a bundle, localStorage has no `activeId`, so we use `bundle.activeId`. If the gist's activeId is stale (user deleted that collection on another device), we fall through to the first collection in the bundle, or the default-living-dex fallback.

**Migration happens "on next push"** → A user loads the app, sees v1 data, operates normally. The first mutation triggers a bundle push in v2 format. Until that first mutation, the Gist still holds v1 — other devices polling in that window will also receive v1 and migrate locally. Harmless.

**Spinner placeholders are a new UI state** → The binder code has to handle card objects shaped `{ cardId }` (no image, no name). On v1 data, no cards are ever in this shape. On v2, it's transient. Code path exists but is exercised infrequently after the initial hydration settles.

## Open Questions

None — all four open questions from exploration were settled.
