## Context

The Pokedex Tracker is a static vanilla JS app with no backend. Data is stored in localStorage. The binder view shows Pokemon in a card-sleeve grid. Users want to track which specific physical TCG card they're using in each slot.

The Pokemon TCG API (pokemontcg.io v2) provides card data including images, set info, card numbers, and rarity for all English cards. It's free with no API key required.

## Goals / Non-Goals

**Goals:**
- Let users associate a specific TCG card with each Pokemon
- Show the card image in the binder slot when assigned
- Fetch card data on demand and cache it for offline use
- Keep the app functional offline after initial card data is cached

**Non-Goals:**
- Tracking multiple cards per Pokemon (only one active card per Pokemon)
- Supporting non-English cards
- Pre-bundling all TCG card data (too large — ~15,000+ cards)
- Adding TCG-specific features like deck building or card values

## Decisions

### 1. On-demand fetch with localStorage cache

When the user opens the card picker for a Pokemon, fetch all cards matching that Pokemon's name from the TCG API. Cache the full response in localStorage keyed by Pokemon name. Subsequent opens use the cache. Cache has no expiry — users can manually refresh if needed.

**API endpoint**: `https://api.pokemontcg.io/v2/cards?q=name:"${name}"&orderBy=set.releaseDate`

**Why not pre-fetch**: With ~1000 unique Pokemon names, pre-fetching would be thousands of API calls and megabytes of data. On-demand keeps it fast and lightweight.

### 2. Card selections stored as a flat map in state

Add `cardSelections` to the persisted state: `{ [formId]: { cardId, name, number, setName, setYear, imageUrl } }`. This is a plain object (not a Map) for JSON serialization simplicity.

Card selections are keyed by `formId`, so a Pokemon shares its card selection across all books. This matches user expectations — "my Bulbasaur card" is the same regardless of which book it appears in.

### 3. Card image as slot background (Option B)

When a card is assigned, the binder slot renders the card's small image (from the TCG API `images.small` URL, ~245x342px) as `background-image`. A gradient overlay at the bottom preserves readability of the Pokemon name and set info. The slot numbers stay at the top with a semi-transparent background.

Slots without a card assigned keep the current text-only appearance.

### 4. Card picker modal with single text filter

The modal displays all cached cards for a Pokemon in a scrollable image grid. A single text input filters against set name, card number, and rarity (case-insensitive substring match). No separate dropdown filters.

Click a card to select it. Click "Save" to confirm. Click "Clear" to remove the current assignment. The footer shows the currently selected card.

### 5. New module js/tcg-api.js

Encapsulates all TCG API interaction:
- `fetchCardsForPokemon(name)` — returns cached cards or fetches from API
- `getCachedCards(name)` — returns cached data or null
- Cache key: `tcg-cache-${name.toLowerCase()}`

Keeping API logic separate from app.js maintains the existing module pattern.

## Risks / Trade-offs

**API availability** → If pokemontcg.io is down, the picker will fail to load cards for uncached Pokemon. Mitigated by caching — once a Pokemon's cards are fetched, they work offline forever.

**localStorage size limits** → Each Pokemon's card list is ~5-20KB. With ~200 Pokemon cached, that's ~2-4MB. localStorage limit is typically 5-10MB. Combined with existing state, this should be fine. If it becomes an issue, could switch to IndexedDB later.

**Card images are external URLs** → The card images load from `images.pokemontcg.io`. If the CDN is down, slots will show a broken image. Could add a fallback to show the text-only slot if the image fails to load.

**API rate limits** → The free tier has no hard rate limit but asks for reasonable usage. Caching ensures each Pokemon is only fetched once.
