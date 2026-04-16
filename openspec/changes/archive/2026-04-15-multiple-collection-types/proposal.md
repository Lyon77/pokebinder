## Why

The app currently supports only one collection type — a Pokedex tracker where each slot is a Pokemon form. Users want to track different kinds of card collections: completing every card variant in a TCG set (master sets), collecting specific generations, and building custom freestyle binders. The IndexedDB storage migration already laid the foundation for a collection-aware data model; this change builds on it to support multiple collection types.

## What Changes

- **BREAKING**: Add a `type` field to collection records (`"pokedex"`, `"master"`, `"freestyle"`). Existing default collection becomes type `"pokedex"`.
- Add **Pokedex** collection type with generation selection at creation time (replaces the current implicit "all gens" assumption). The current Living Dex behavior is a Pokedex with all 9 gens selected.
- Add **Master Set** collection type where slots are card variants derived from the TCG API. Each card's `tcgplayer.prices` keys determine which variant slots exist (normal, reverseHolofoil, holofoil, etc.). Multiple TCG sets can be included in one collection, analogous to how Pokedex uses generations. Slots are pre-populated with card images; owned/want states replace owned/empty.
- Add **Freestyle** collection type where the user defines a fixed number of pages and fills slots manually with any card from any set. Slots have three states: empty, want (card assigned but not owned, shown greyed), and owned.
- Add collection **creation flow** as a modal with type picker, then type-specific configuration (gen selection for Pokedex, set search for Master Set, page count for Freestyle). Page layout (3x3, 3x4, 4x3, 4x4) is chosen per collection at creation.
- Add collection **switching** via a dropdown from the header title (click collection name to see dropdown with all collections and "+ New Collection").
- Add **set search** using the TCG API `/v2/sets` endpoint for Master Set creation.
- Add greyed-out card rendering for "want" state (card assigned but not owned) using CSS grayscale + opacity.
- Add variant badge rendering on Master Set binder slots (e.g., "REV HOLO" label).

## Capabilities

### New Capabilities
- `collection-types`: Defines the three collection types (pokedex, master, freestyle), their slot models, and their state machines (which slot states each type supports).
- `collection-creation`: The creation modal flow — type picker, type-specific config, set search for master sets, page layout selection.
- `collection-switching`: Dropdown-based collection switcher from the header title, active collection tracking, collection deletion.
- `master-set-slots`: Fetching a TCG set's full card list, deriving variant slots from `tcgplayer.prices` keys, caching the slot list in IndexedDB, variant badge rendering.
- `freestyle-slots`: User-defined slot management — empty slots, card assignment from any set, want/owned toggling, fixed page count.
- `slot-states`: The visual rendering of slot states across all types — owned (full color + checkmark), want (greyed out), empty (dashed border + prompt).

### Modified Capabilities
- `collection-model`: Collection records gain a `type` field and type-specific config. The `caught` set and `cardSelections` map are reinterpreted per type. Master Set adds a `slotList` field. Freestyle adds a `slots` field.
- `binder-books`: Books now work with TCG sets (for Master Set) in addition to generations (for Pokedex). The book settings modal adapts to show sets or gens based on collection type.
- `binder-view`: Slot rendering changes to support three visual states (owned/want/empty) and variant badges. The card picker behavior varies by type.

## Impact

- **`js/storage.js`**: Collection record schema gains `type`, `config`, `slotList` (master), `slots` (freestyle) fields. Creation/loading logic branches by type.
- **`js/db.js`**: No schema changes needed — the `collections` object store already stores arbitrary records.
- **`js/app.js`**: Major changes — collection switcher UI, creation modal, type-aware rendering, type-aware card picker behavior. This is the largest affected file.
- **`js/binder.js`**: Slot rendering adds want state (greyed), variant badges, empty state for freestyle.
- **`js/collection.js`**: `buildCollection` needs to handle master set slot lists and freestyle slot lists in addition to Pokemon forms.
- **`js/tcg-api.js`**: Add set search endpoint (`/v2/sets`), add full-set card fetch with variant expansion.
- **`js/render.js`**: List view may need adaptation or may be hidden for non-Pokedex types.
- **`index.html`**: New HTML for collection dropdown, creation modal, variant badges.
- **`css/styles.css`**: Greyed slot styling, variant badges, dropdown menu, creation modal, type cards.
- **TCG API**: New endpoint usage — `/v2/sets` for set search, `/v2/cards?q=set.id:X` for full set fetch with `tcgplayer` data.
