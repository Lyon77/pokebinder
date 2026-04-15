## Why

There is no easy, personal way to track Pokedex completion progress across all Pokemon — including alternate forms — while also planning a physical binder layout. Existing tools are either bloated with competitive features, require accounts, or ignore the physical collector's workflow. A lightweight, static GitHub Pages app would let users track their collection privately in-browser, configure which forms to include, and visualize their binder pages — all with zero backend dependencies.

## What Changes

- Build a new static single-page application deployable to GitHub Pages
- Include a complete dataset of all 1025 base Pokemon plus their alternate forms (regional variants, megas, Gigantamax, etc.) sourced from PokeAPI
- Allow users to toggle which alternate forms are included in their collection
- Allow users to mark individual Pokemon/forms as caught/completed with persistent local storage
- Display dual numbering: National Pokedex number and sequential collection position number
- Provide a binder view that renders Pokemon in a configurable grid layout (e.g., 3x3 or 3x4 per page) mimicking physical binder sleeve pages
- Provide real-time search by name or number
- Provide generation-based filtering (Gen I through Gen IX)
- Display completion statistics: overall percentage, per-generation counts and percentages
- Responsive design for desktop and mobile use

## Capabilities

### New Capabilities
- `pokemon-data`: Static dataset of all 1025 base Pokemon plus alternate forms, including number, name, form name, generation, and type information sourced from PokeAPI
- `alternate-forms`: User-configurable inclusion/exclusion of alternate Pokemon forms (regional variants, megas, Gigantamax, etc.) with persistent preferences
- `collection-numbering`: Dual numbering system showing both National Pokedex number and sequential position within the user's active collection
- `binder-view`: Paginated grid view mimicking physical card binder pages with configurable layout (e.g., 3x3, 3x4 sleeves per page)
- `completion-tracking`: Mark/unmark Pokemon as caught with browser localStorage persistence, bulk operations, and import/export
- `search-and-filter`: Real-time search by name/number and multi-select generation filtering
- `completion-stats`: Dashboard showing overall completion percentage, per-generation breakdowns, and progress bars (totals adjust based on active form selections)
- `static-site`: GitHub Pages deployment with responsive single-page app shell

### Modified Capabilities

_None — this is a greenfield project._

## Impact

- **New code**: Entire frontend application (HTML, CSS, JavaScript)
- **Dependencies**: PokeAPI (build-time or bundled data), GitHub Pages for hosting
- **Data size**: Larger dataset than base 1025 due to alternate forms (~1500–2000+ entries total); bundled JSON will be bigger but still manageable
- **No backend**: All state stored in browser localStorage — no server, database, or auth required
- **Deployment**: GitHub Actions workflow for building and deploying to GitHub Pages
