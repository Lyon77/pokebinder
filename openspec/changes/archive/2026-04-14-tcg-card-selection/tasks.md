## 1. Storage & State

- [x] 1.1 Add `cardSelections` (plain object, formId → card data) to state in `js/storage.js` — include in loadState, defaultState, saveState
- [x] 1.2 Add `setCardSelection(state, formId, cardData)` and `clearCardSelection(state, formId)` functions to storage.js
- [x] 1.3 Update export/import to include `cardSelections`; handle legacy imports with no card selections

## 2. TCG API Module

- [x] 2.1 Create `js/tcg-api.js` with `fetchCardsForPokemon(name)` — checks localStorage cache first, then fetches from `api.pokemontcg.io/v2/cards?q=name:"${name}"&orderBy=set.releaseDate`
- [x] 2.2 Parse API response to extract: cardId, name, number, setName, setYear (from releaseDate), rarity, imageSmall (from images.small)
- [x] 2.3 Cache parsed card list in localStorage keyed by `tcg-cache-${name.toLowerCase()}`
- [x] 2.4 Handle fetch errors — return `{ error: message }` so the modal can show an error with retry

## 3. Card Picker Modal

- [x] 3.1 Add card picker modal HTML to `index.html` — header with Pokemon name, search input, scrollable card grid area, footer with selected info + Clear/Save buttons
- [x] 3.2 Add card picker modal CSS to `css/styles.css` — modal overlay, card grid (auto-fill minmax(150px, 1fr)), card items with hover/selected states, card images, loading/error states
- [x] 3.3 Wire modal open/close in `js/app.js` — export `openCardPicker(formId, pokemonName)` function, close on backdrop click, close button, and Save
- [x] 3.4 On modal open: call `fetchCardsForPokemon`, show loading spinner, then render card grid
- [x] 3.5 Implement text filter: debounced input that filters cards by set name, card number, and rarity (case-insensitive substring)
- [x] 3.6 Implement card selection: click a card to highlight it, show selection in footer, Save persists to state, Clear removes selection

## 4. Binder Slot Integration

- [x] 4.1 Add card picker button to binder slot rendering in `js/binder.js` — small button on each filled slot, clicking opens card picker (without toggling caught)
- [x] 4.2 Pass `cardSelections` to binder rendering functions
- [x] 4.3 When a card is assigned: render slot with card image as `background-image`, gradient overlay at bottom, name + set info overlaid, numbers at top with semi-transparent background
- [x] 4.4 Add image error handling: on `onerror`, fall back to default text-only slot appearance

## 5. Cleanup

- [x] 5.1 Remove mockup files from `mockups/` folder
- [x] 5.2 Verify card picker works end-to-end: open picker → see cards → filter → select → save → slot shows card image → reopen picker shows current selection → clear works
