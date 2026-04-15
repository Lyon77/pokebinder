## Why

The binder tracks which Pokemon you have, but not which specific physical TCG card you're using in each slot. Users want to associate a real card (e.g., "Base Set 44/102 Bulbasaur") with each Pokemon, bridging the gap between digital tracking and their physical binder.

## What Changes

- Add a card picker button to each binder slot that opens a modal showing all English TCG cards for that Pokemon
- Card data fetched on demand from the Pokemon TCG API (pokemontcg.io), cached in localStorage for offline use
- Card picker modal displays card images in a grid, with a text filter that matches against set name, card number, and rarity
- After selecting a card, the binder slot displays the card image as its background (Option B design) with name/set info overlaid
- Card selections are per-Pokemon (shared across all books) and persisted in localStorage
- Users can clear a card selection to return to the default slot view
- Slots without a card assigned retain the current text-only appearance

## Capabilities

### New Capabilities
- `tcg-card-picker`: Modal UI for browsing and selecting TCG cards for a Pokemon, with image grid, text filter (set, number, rarity), and select/clear actions
- `tcg-card-api`: Integration with the Pokemon TCG API — on-demand fetching by Pokemon name, response caching in localStorage
- `tcg-card-display`: Binder slot display mode when a card is assigned — card image background with overlaid numbers, name, and set info

### Modified Capabilities
- `binder-view`: Each binder slot gains a card picker button; slots with assigned cards render with the card image background
- `completion-tracking`: Export/import includes card selections; card selection data persists in localStorage

## Impact

- **js/binder.js**: Add card picker button to slot rendering; render card-image slots when a card is assigned
- **js/app.js**: Wire card picker modal open/close, handle card selection/clear, pass card selections to binder renderer
- **js/storage.js**: Add `cardSelections` map (formId → card data) to state, include in save/load/export/import
- **css/styles.css**: Card picker modal styles, card-image slot styles (background-image, gradient overlay)
- **index.html**: Add card picker modal markup
- New file **js/tcg-api.js**: Fetch cards from pokemontcg.io, cache in localStorage
