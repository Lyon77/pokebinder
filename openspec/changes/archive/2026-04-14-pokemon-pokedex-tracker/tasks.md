## 1. Project Setup

- [x] 1.1 Create project directory structure (`index.html`, `css/`, `js/`, `data/`, `scripts/`)
- [x] 1.2 Create base `index.html` with semantic layout sections (header, stats, controls, view toggle, list container, binder container)
- [x] 1.3 Create GitHub Actions workflow for deploying to GitHub Pages on push to `main`

## 2. Pokemon Data

- [x] 2.1 Write a data generation script (`scripts/generate-data.js`) that fetches all Pokemon species and forms from PokeAPI, outputs `data/pokemon.json` with id, name, formName, formId, generation, types, isDefault, and formCategory
- [x] 2.2 Categorize alternate forms into categories: "regional", "mega", "gmax", "other"
- [x] 2.3 Run the script and commit the generated `pokemon.json` dataset
- [x] 2.4 Verify dataset completeness (all 1025 base Pokemon present, alternate forms included, correct generation boundaries, accurate names)

## 3. Core UI Shell

- [x] 3.1 Create `css/styles.css` with responsive layout (mobile-first, grid for desktop)
- [x] 3.2 Implement the header section with app title
- [x] 3.3 Implement the search input control
- [x] 3.4 Implement generation filter toggle buttons (Gen I through Gen IX)
- [x] 3.5 Implement the view toggle (list view / binder view switch)
- [x] 3.6 Implement the scrollable Pokemon list container
- [x] 3.7 Implement the binder view container with page navigation controls

## 4. Pokemon List Rendering

- [x] 4.1 Write `js/data.js` to load and parse `pokemon.json`
- [x] 4.2 Write `js/collection.js` to compute the active collection (apply form preferences, assign collection numbers, sort by Pokedex number then form order)
- [x] 4.3 Write `js/render.js` to render Pokemon as list items with checkbox, dual numbers (Pokedex # and collection #), name, form name, and type badges
- [x] 4.4 Style individual Pokemon list items (row layout, type colors, checkbox, dual number display with visual distinction)

## 5. Alternate Form Management

- [x] 5.1 Implement form category toggle controls UI (Regional, Mega, Gigantamax, Other)
- [x] 5.2 Implement individual form toggle within enabled categories
- [x] 5.3 Persist form preferences (category toggles and individual exclusions) in localStorage
- [x] 5.4 Wire form toggles to rebuild the active collection and re-render list/binder/stats
- [x] 5.5 Ensure base forms are always included and cannot be toggled off

## 6. Binder View

- [x] 6.1 Implement binder layout selector dropdown (3x3, 3x4, and any additional sizes)
- [x] 6.2 Implement binder page rendering as a CSS Grid matching the selected layout
- [x] 6.3 Implement binder slot content: collection #, Pokedex #, name (with form name), caught indicator
- [x] 6.4 Implement page navigation (previous/next buttons, current page / total pages display)
- [x] 6.5 Handle partial last page with empty placeholder slots
- [x] 6.6 Wire binder slots to toggle caught state on click
- [x] 6.7 Persist binder layout preference in localStorage

## 7. Completion Tracking

- [x] 7.1 Write `js/storage.js` with localStorage read/write for caught state (by formId), form preferences, and binder layout
- [x] 7.2 Wire checkbox/slot toggle to update caught state in localStorage
- [x] 7.3 On page load, restore all state from localStorage (caught, form prefs, binder layout)
- [x] 7.4 Implement export button that downloads caught state + form preferences + binder layout as JSON
- [x] 7.5 Implement import control that restores all state from uploaded JSON, with validation
- [x] 7.6 Implement "Reset All" button with confirmation dialog (resets caught state only, preserves form prefs and layout)

## 8. Search and Filter

- [x] 8.1 Implement real-time search filtering by name and form name (case-insensitive substring match)
- [x] 8.2 Implement search filtering by Pokedex number
- [x] 8.3 Implement generation filter toggles (multi-select, show/hide by generation)
- [x] 8.4 Combine search and generation filters with AND logic
- [x] 8.5 Apply filters to both list view and binder view
- [x] 8.6 Handle edge cases: empty search restores all, no generation selected shows all

## 9. Completion Stats

- [x] 9.1 Write `js/stats.js` to calculate overall caught count and percentage against active collection total
- [x] 9.2 Calculate per-generation caught counts and percentages (totals adjust with form preferences)
- [x] 9.3 Render stats dashboard with overall progress bar and per-generation breakdown bars
- [x] 9.4 Wire stats to update immediately on every caught state change and form preference change

## 10. Polish and Verification

- [x] 10.1 Test responsive layout at 320px, 375px, 768px, and 1440px viewports
- [x] 10.2 Verify all 1025 base Pokemon render correctly with accurate data
- [x] 10.3 Verify alternate forms appear correctly with proper categorization
- [x] 10.4 Test collection numbering recalculates correctly when toggling forms
- [x] 10.5 Test binder view pagination, layout switching, and slot interaction
- [x] 10.6 Test localStorage persistence across page reloads (caught state, form prefs, binder layout)
- [x] 10.7 Test export/import round-trip (export, clear, import, verify all state restored)
- [x] 10.8 Test combined search + generation filter behavior in both views
- [x] 10.9 Verify page loads and becomes interactive within 2 seconds
