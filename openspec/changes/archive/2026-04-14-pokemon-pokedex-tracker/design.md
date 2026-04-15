## Context

This is a greenfield project — there is no existing codebase. The goal is a static single-page application hosted on GitHub Pages that lets users track Pokemon collection completion, including alternate forms (regional variants, megas, Gigantamax, etc.). Users can configure which forms to include, view their collection in a binder-style grid layout mimicking physical card binder pages, and see dual numbering (Pokedex number + collection position). All data persistence is client-side via localStorage. There is no backend, authentication, or database.

## Goals / Non-Goals

**Goals:**
- Deliver a fast, responsive single-page app that works on desktop and mobile
- Support all 1025 base Pokemon plus all alternate forms from PokeAPI
- Let users choose which alternate forms to include in their collection
- Show dual numbering: National Pokedex # and collection position #
- Provide a binder view with configurable grid layout (3x3, 3x4, etc.) mimicking physical sleeve pages
- Provide instant search and generation filtering with no perceptible lag
- Show clear completion statistics that adjust based on active form selections
- Persist state entirely in the browser with no account required
- Deploy automatically via GitHub Pages

**Non-Goals:**
- Competitive/social features (leaderboards, sharing, trading)
- Server-side storage or user accounts
- Card images or high-res artwork (text/sprite-based to keep assets small)
- Mobile native app (PWA upgrade can come later)
- Drag-and-drop reordering of cards in the binder (ordered by collection number)

## Decisions

### 1. Vanilla HTML/CSS/JS vs. Framework

**Decision:** Use vanilla HTML, CSS, and JavaScript — no framework.

**Rationale:** The app is a single page with a filterable list, a grid view, and local state. A framework adds build complexity, bundle size, and deployment friction. The binder view is a CSS Grid layout with pagination logic — manageable without a framework.

**Alternatives considered:**
- React/Vue/Svelte — adds build step and framework overhead for what's still a single-view app
- Astro — good for static sites but adds a build pipeline for little gain here

### 2. Pokemon Data Source

**Decision:** Bundle a static JSON file (`pokemon.json`) containing all base Pokemon AND their alternate forms, pre-generated from PokeAPI at development time.

**Rationale:** PokeAPI's `/api/v2/pokemon?limit=10000` endpoint returns all forms. A build-time script fetches species and form data, producing a single JSON file. This loads instantly and works offline. The dataset will be larger (~1500–2000+ entries) but still well under 1MB as JSON.

**Data structure per entry:**
```json
{
  "id": 25,
  "name": "Pikachu",
  "formName": null,
  "formId": "pikachu",
  "generation": 1,
  "types": ["electric"],
  "isDefault": true
}
```
For alternate forms:
```json
{
  "id": 25,
  "name": "Pikachu",
  "formName": "Alolan",
  "formId": "pikachu-alola",
  "generation": 1,
  "types": ["electric", "psychic"],
  "isDefault": false
}
```

Each entry has a unique `formId` string for identification. The `id` field is the National Pokedex number (shared across forms of the same species). `isDefault` distinguishes the base form.

**Alternatives considered:**
- Runtime PokeAPI fetch — too slow, rate-limited
- Only base forms — user explicitly wants alternate forms

### 3. Alternate Form Selection

**Decision:** Users toggle form categories on/off (e.g., "Regional Forms", "Mega Evolutions", "Gigantamax") rather than toggling individual forms one by one. Individual form toggling is also possible for fine-tuning. Preferences persist in localStorage.

**Rationale:** There are hundreds of alternate forms. Category toggles give quick control; individual toggles allow fine-tuning. The collection list and binder view dynamically rebuild when forms are added/removed.

### 4. Collection Numbering

**Decision:** Each Pokemon in the active collection gets two displayed numbers:
1. **Pokedex #** — the National Pokedex number (e.g., #25 for all Pikachu forms)
2. **Collection #** — a sequential 1-based position number within the user's current collection, ordered by Pokedex number then form order

**Rationale:** The collection number tells the user exactly which binder page and slot a card belongs in. If the user has a 3x3 binder, collection #10 is page 2 slot 1. Recalculated dynamically when forms are added/removed.

### 5. Binder View

**Decision:** A paginated grid view where each "page" renders as a CSS Grid matching the user's chosen binder layout (e.g., 3 columns x 3 rows = 9 slots per page, or 3x4 = 12). Users select the layout from a dropdown. Pages are navigable with prev/next controls and display the page number.

**Rationale:** This directly maps to a physical binder — page N in the app = page N in the physical binder. Each slot shows the collection #, Pokedex #, Pokemon name, and caught status. Empty pages at the end are not rendered.

### 6. State Persistence

**Decision:** Use `localStorage` with a JSON structure storing caught state by `formId` and form preferences.

**Data format:**
```json
{
  "version": 2,
  "caught": ["bulbasaur", "pikachu", "pikachu-alola", ...],
  "disabledForms": ["mega", "gmax"],
  "binderLayout": "3x3"
}
```

Using `formId` strings (not numeric IDs) avoids collisions between forms of the same species. The `disabledForms` array stores which form categories are excluded. `binderLayout` persists the user's preferred grid size.

**Alternatives considered:**
- IndexedDB — overkill for this data size
- Numeric IDs only — can't distinguish between forms of the same Pokemon

### 7. Search and Filter Implementation

**Decision:** Client-side filtering with event-driven re-rendering. Debounced text input filters by name/number substring match. Generation filter uses multi-select toggle buttons. Filters apply to both the list view and the binder view.

**Rationale:** With ~2000 items in memory, client-side filtering is instant. Search matches against both the Pokemon name and form name.

### 8. Deployment

**Decision:** GitHub Actions workflow that deploys static files to GitHub Pages on push to `main`.

**Rationale:** GitHub Pages serves static files directly. No build step needed since we're using vanilla JS.

## Risks / Trade-offs

- **localStorage can be cleared by users** → Export/import feature for backup. Using `formId` strings means imports remain valid even if the dataset is regenerated with different ordering.
- **~2000 DOM nodes could be slow on low-end devices** → The binder view only renders one page at a time (~9–12 nodes). The list view uses CSS-based hiding for filtered items. Virtualized scrolling can be added later if needed.
- **Alternate form data from PokeAPI may be inconsistent** → The data generation script must normalize form names and filter out cosmetic-only forms (e.g., Unown letters) vs. meaningful forms (e.g., Alolan variants). Document the classification logic in the script.
- **Collection numbering changes when forms are toggled** → This is expected and by design. The UI should clearly communicate that adding/removing forms shifts collection numbers. Binder page assignments update accordingly.
- **Bundled data becomes stale** → The JSON generation script is documented and re-runnable.
