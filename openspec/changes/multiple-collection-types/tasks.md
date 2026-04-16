## 1. Data Model Updates

- [x] 1.1 Update `js/storage.js` collection record schema — add `type`, `layout`, `generations` (pokedex), `sets`/`slotList` (master), `pageCount`/`slots` (freestyle) fields. Update `recordToState`, `stateToRecord`, `serializeState`, `loadStateFromData` to handle all three types.
- [x] 1.2 Update `defaultCollectionRecord` — set `type: "pokedex"`, `layout: "3x3"`, `generations: [1,2,3,4,5,6,7,8,9]` on the default Living Dex collection.
- [x] 1.3 Move `binderLayout` from global settings to collection `layout` field — update `loadState`, `saveState`, `setBinderLayout` to read/write from collection record instead of localStorage `pokebinder-settings`.

## 2. TCG API Enhancements

- [x] 2.1 Add `fetchSets(query)` to `js/tcg-api.js` — search `/v2/sets?q=name:X&orderBy=-releaseDate` and return parsed set objects with id, name, releaseDate, total, printedTotal.
- [x] 2.2 Add `fetchSetCards(setId)` to `js/tcg-api.js` — fetch all cards in a set with pagination (loop pages until all retrieved), return full card objects including `tcgplayer.prices`.
- [x] 2.3 Add `expandVariants(cards)` utility to `js/tcg-api.js` — takes an array of raw TCG API cards and returns an expanded slot list. Each card is expanded into slots based on `tcgplayer.prices` keys (fallback to `"default"` if no prices). Each slot has: `slotId`, `cardId`, `variant`, `name`, `number`, `setId`, `setName`, `rarity`, `imageSmall`. Sort by card number (numeric), then variant order (normal, reverseHolofoil, holofoil).
- [x] 2.4 Add variant display name map — `normal` → "Normal", `reverseHolofoil` → "Rev. Holo", `holofoil` → "Holo", `1stEditionHolofoil` → "1st Ed. Holo", `1stEditionNormal` → "1st Ed.", `default` → "".

## 3. Collection Building

- [x] 3.1 Update `js/collection.js` `buildCollection` — branch by collection type. Pokedex: filter `pokemon.json` by `state.generations` (instead of hardcoded all gens). Master Set: return `state.slotList` directly. Freestyle: return `state.slots` mapped to slot objects.
- [x] 3.2 Update `js/collection.js` `buildBookCollection` — Pokedex books filter by `generations`. Master Set books filter by `sets` (match slot's `setId`). Freestyle has no books (return full collection).
- [x] 3.3 Add `getAllCollections()` to `js/db.js` — read all collection records from IndexedDB (for the dropdown switcher). Return an array of `{id, name, type}`.

## 4. Collection Switcher UI

- [x] 4.1 Add collection dropdown HTML to `index.html` — replace static `<h1>` title with a clickable title wrapper containing the collection name, chevron, and a dropdown menu container.
- [x] 4.2 Implement dropdown open/close in `js/app.js` — click title opens dropdown, click outside or click item closes it. On open, call `getAllCollections()` and render items with name, type badge, active checkmark, and "+ New Collection" at bottom.
- [x] 4.3 Implement collection switching in `js/app.js` — clicking a dropdown item sets `activeCollectionId` in localStorage, reloads state from IndexedDB, and refreshes the full UI.
- [x] 4.4 Implement collection deletion — add delete button/icon per dropdown item, show confirm dialog, remove from IndexedDB, handle deleting the active collection (switch to first remaining), prevent deleting last collection.

## 5. Collection Creation Modal

- [x] 5.1 Add creation modal HTML to `index.html` — modal with step 1 (name + type cards) and step 2 container for type-specific config. Include gen grid, set search, layout picker, page count input.
- [x] 5.2 Implement step 1: type selection — click type card highlights it and shows the corresponding step 2 config panel. Back button returns to step 1.
- [x] 5.3 Implement step 2a: Pokedex config — gen checkboxes (Gen I-IX), layout picker (3x3, 3x4, 4x3, 4x4). Create button saves a new Pokedex collection record.
- [x] 5.4 Implement step 2b: Master Set config — set search input that calls `fetchSets`, results list with Add buttons, selected sets list showing slot counts (calls `fetchSetCards` + `expandVariants` on add), layout picker. Create button saves collection with expanded `slotList`.
- [x] 5.5 Implement step 2c: Freestyle config — layout picker, page count input with computed slot count display. Create button saves collection with null-filled `slots` array.
- [x] 5.6 Wire Create button — save new collection to IndexedDB via `saveCollection`, set as active, close modal, refresh UI.

## 6. Binder Slot Rendering

- [x] 6.1 Update `js/binder.js` `buildSlot` — accept a `collectionType` parameter. Render three visual states: owned (full color, green border, ✓), want (greyed image via CSS class), empty (dashed border, prompt text). Add `.slot-owned`, `.slot-want`, `.slot-empty` CSS classes.
- [x] 6.2 Add variant badge rendering — for Master Set slots with a variant that isn't the first for its card, render a positioned badge overlay with the variant display name. Green badge when owned, dark translucent badge when want.
- [x] 6.3 Add want/empty CSS to `css/styles.css` — `.slot.want img { filter: grayscale(1); opacity: 0.4; }`, `.slot.empty { border-style: dashed; }`, variant badge positioning and styling.

## 7. Type-Aware Click Handlers

- [x] 7.1 Update Pokedex slot click — same as current behavior (open card picker, auto-mark owned on card selection).
- [x] 7.2 Add Master Set slot click — toggle owned/want (add/remove from caught set, re-render slot). No card picker.
- [x] 7.3 Add Freestyle empty slot click — open card picker to search any Pokemon. On card selection, store card data in `slots[index]` and set as want state.
- [x] 7.4 Add Freestyle filled slot click — show context menu with options: "Mark owned" / "Mark as want" (toggle caught), "Change card" (reopen picker), "Remove" (set slot to null and remove from caught).

## 8. Type-Aware UI Controls

- [x] 8.1 Show/hide controls by type — Forms button visible only for Pokedex. Books button visible for Pokedex and Master Set. List/Binder toggle visible only for Pokedex. Force binder view for Master Set and Freestyle.
- [x] 8.2 Update stats computation — `computeStats` needs to work with all types. Pokedex: caught vs total Pokemon. Master Set: caught vs total slots. Freestyle: caught vs filled slots (not total slots).
- [x] 8.3 Update header title — display active collection name instead of static "POKEDEX TRACKER". Update on collection switch.

## 9. Book Settings Adaptation

- [x] 9.1 Update book settings modal for Pokedex — filter generation chips to only show the collection's selected generations (not all 9).
- [x] 9.2 Add Master Set book settings — show set name chips instead of generation chips. Same drag-and-drop assignment to books. Book data uses `{ sets: ["swsh12pt5"] }` instead of `{ generations: [1,2] }`.
- [x] 9.3 Hide book settings for Freestyle — disable or hide the Books button when a Freestyle collection is active.

## 10. Integration and Cleanup

- [x] 10.1 Update export/import — `exportState` and `importState` must handle the new collection fields (type, layout, type-specific data).
- [x] 10.2 Update sync serialization — `serializeState` and `loadStateFromData` include type-specific fields in the Gist payload.
- [x] 10.3 Remove mockups directory — clean up `mockups/` folder created during design exploration.
- [x] 10.4 End-to-end verification — test creating each collection type, switching between them, toggling owned/want, book settings, card picker for each type, export/import, and sync.
