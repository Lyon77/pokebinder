## Context

Pokebinder currently supports a single collection type (Pokedex) where slots are Pokemon forms. The recent IndexedDB migration introduced a collection-aware data model with `id` and `name` fields, but all collections still assume the Pokedex slot model. Users want to track master sets (every card variant in a TCG set) and build freestyle binders (any card, any order).

The app is a static site (no backend, no build step) using vanilla JS modules, IndexedDB for collection/cache storage, and the Pokemon TCG API for card data.

## Goals / Non-Goals

**Goals:**
- Support three collection types: Pokedex, Master Set, Freestyle
- Unified collection creation and switching UX
- Master Set variant slots derived from TCG API `tcgplayer.prices` keys
- Multiple TCG sets per Master Set collection (analogous to generations in Pokedex)
- Per-collection page layout (3x3, 3x4, 4x3, 4x4)
- Visual distinction between owned, want, and empty slot states

**Non-Goals:**
- Drag-and-drop reordering of freestyle slots (add/remove only for v1)
- Collection renaming or editing after creation (future enhancement)
- Multi-collection sync (only active collection syncs, same as today)
- Merging or duplicating collections
- Filtering/sorting within master set binders (e.g., by rarity)

## Decisions

### 1. Collection record schema per type

Each collection record in IndexedDB's `collections` store gains a `type` field and type-specific fields:

```
Common fields (all types):
  id: string
  name: string
  type: "pokedex" | "master" | "freestyle"
  caught: string[]           // slot IDs that are owned
  books: object[]            // book definitions
  layout: string             // "3x3", "3x4", "4x3", "4x4"

Pokedex-specific:
  generations: number[]      // which gens are included [1,2,3]
  cardSelections: {}         // formId → card data (optional card display)
  disabledCategories: []     // form category toggles
  excludedForms: []          // individual form exclusions

Master Set-specific:
  sets: string[]             // TCG set IDs ["swsh12pt5", "sv3pt5"]
  slotList: object[]         // cached card+variant data from API
  cardSelections: {}         // not used (slots already have card data)

Freestyle-specific:
  pageCount: number          // user-defined number of pages
  slots: object[]            // ordered array, each null or card data
  cardSelections: {}         // not used (card data lives in slots array)
```

**Rationale**: Keeping type-specific fields at the top level (not nested in a `config` object) keeps the read/write paths simple. The `caught` set and `books` array are shared across all types, providing a consistent interface for the binder renderer.

**Alternative considered**: A single `slots[]` array for all types. Rejected because Pokedex slots are derived from `pokemon.json` at runtime (no need to cache), while Master Set slots must be cached (derived from API). Keeping them separate avoids storing 1000+ Pokemon entries in IndexedDB unnecessarily.

### 2. Slot ID scheme

Each slot needs a unique identifier within its collection for the `caught` set:

- **Pokedex**: `formId` (e.g., `"bulbasaur"`, `"pikachu-alola"`) — same as today
- **Master Set**: `"{cardId}:{variant}"` (e.g., `"swsh12pt5-1:normal"`, `"swsh12pt5-1:reverseHolofoil"`)
- **Freestyle**: array index as string (e.g., `"0"`, `"1"`, `"2"`) — position-based

**Rationale**: Pokedex and Master Set slots have natural identities. Freestyle slots are position-based because the user defines their order and there's no external identity.

### 3. Master Set variant expansion

When the user adds a TCG set to a Master Set collection, we fetch all cards via `/v2/cards?q=set.id:X&pageSize=250` and expand each card into variant slots based on `tcgplayer.prices` keys:

```
Card: { id: "swsh12pt5-1", name: "Oddish", tcgplayer: { prices: { normal: {...}, reverseHolofoil: {...} } } }
  → Slot 1: { cardId: "swsh12pt5-1", variant: "normal", slotId: "swsh12pt5-1:normal", ... }
  → Slot 2: { cardId: "swsh12pt5-1", variant: "reverseHolofoil", slotId: "swsh12pt5-1:reverseHolofoil", ... }
```

If a card has no `tcgplayer.prices` data (some older/non-English cards), fall back to a single slot with variant `"default"`.

The variant display names: `normal` → "Normal", `reverseHolofoil` → "Rev. Holo", `holofoil` → "Holo", `1stEditionHolofoil` → "1st Ed. Holo", `1stEditionNormal` → "1st Ed.".

The expanded `slotList` is stored in the collection record in IndexedDB so it doesn't need to be re-fetched on every load.

### 4. Books for Master Set

Master Set books use the same structure as Pokedex books but reference set IDs instead of generation numbers:

```
Pokedex: books = [{ generations: [1, 2, 3] }, { generations: [4, 5, 6] }]
Master:  books = [{ sets: ["swsh12pt5"] }, { sets: ["sv3pt5"] }]
```

The book settings modal detects the collection type and shows either generation chips or set chips for drag-and-drop assignment.

### 5. Collection switcher: dropdown from title

The header title becomes clickable. Clicking opens a dropdown listing all collections with their type badge, a checkmark on the active one, and a "+ New Collection" option at the bottom.

The dropdown reads all collection records from IndexedDB on open (lightweight — just `id`, `name`, `type` from each record). Selecting a collection sets it as active, saves the active ID to localStorage, and reloads the UI.

### 6. Collection creation modal: two-step flow

Step 1: Name + type selection (three type cards). Step 2: Type-specific config. Both steps in one modal (step 2 replaces step 1 content, with a back button).

For Master Set, the set search queries `/v2/sets?q=name:X` and displays results with card counts. Adding a set triggers a full card fetch to compute variant slot counts before creation.

### 7. Slot state rendering

The binder renderer checks two things per slot: whether a card is assigned, and whether it's in the `caught` set.

```
                  card assigned?    in caught set?    visual
Pokedex EMPTY:    no                no                dashed border, Pokemon name, "tap to pick"
Pokedex OWNED:    yes               yes (auto)        full color card image, green border, ✓

Master WANT:      yes (always)      no                greyed card image (grayscale + 40% opacity)
Master OWNED:     yes (always)      yes               full color card image, green border, ✓

Free EMPTY:       no                no                dashed border, "+" icon, "Add card"
Free WANT:        yes               no                greyed card image
Free OWNED:       yes               yes               full color card image, green border, ✓
```

CSS implementation: `.slot.want .slot-img { filter: grayscale(1); opacity: 0.4; }`. The variant badge is a positioned overlay: `.slot-variant-badge { position: absolute; top: 4px; left: 4px; }`.

### 8. Type-aware card picker

- **Pokedex**: Same as today — click slot, search for Pokemon cards, select one. Auto-marks as owned.
- **Master Set**: Click slot toggles owned/want. No card picker needed — the card is pre-assigned.
- **Freestyle**: Click empty slot opens card picker (search any Pokemon). Click filled slot opens a submenu: toggle owned/want, change card, remove card.

### 9. Page layout per collection

Layout (3x3, 3x4, etc.) moves from global settings to the collection record. The layout selector in the binder controls updates the active collection's `layout` field. On collection switch, the layout updates to match the new collection.

The global `pokebinder-settings` localStorage key loses `binderLayout` — it only retains `binderFlow`.

## Risks / Trade-offs

**TCG API rate limiting for Master Set creation** → Fetching a full set (250 cards) plus variant expansion could be slow. Mitigation: show a progress indicator during creation, cache the expanded slotList in IndexedDB so it's only fetched once.

**Large slotList in IndexedDB** → A master set with 2 TCG sets could have 500+ slot records. Each slot is ~200 bytes, so ~100 KB total. Well within IndexedDB limits but larger than a Pokedex record. Mitigation: acceptable, no action needed.

**TCG API pagination** → Some large sets may exceed 250 cards per page. The API supports pagination (`page` param). Mitigation: implement pagination in the set fetch, loop until all cards are retrieved.

**Freestyle slot management UX** → Without drag-and-drop reordering, users can only add to slots and remove. This may feel limiting. Mitigation: acceptable for v1, reordering is a natural follow-up.

**No collection editing after creation** → Users can't rename or change a Pokedex's generations or a Master Set's sets after creation. Mitigation: deletion and recreation is the workaround for v1.
