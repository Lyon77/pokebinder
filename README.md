# Pokebinder

A static single-page app for tracking TCG binder collections. Supports three collection types — a full Pokedex tracker, TCG master-set completion trackers, and freestyle binders where any card can go in any slot. Built with vanilla HTML/CSS/JS — no frameworks, no backend, no account required.

Collections and card-picker state live in your browser's IndexedDB. Optional cross-device sync is available via a personal GitHub Gist (bring your own token).

## Collection Types

- **Pokedex** — one slot per Pokemon across selected generations. Covers 1288 entries: 1025 base forms plus 263 alternates (Alolan, Galarian, Hisuian, Paldean, Mega, Gigantamax, and more). Optionally assign a specific TCG card to any Pokemon slot.
- **Master Set** — one slot per card variant across one or more TCG sets. Variants (normal, reverse-holo, holo, 1st-edition, etc.) are derived from deterministic set release-date and card-rarity rules, with per-card overrides for known exceptions.
- **Freestyle** — user-defined number of pages, fill each slot with any TCG card from any set. Slots can be marked as "want" (placeholder) or "owned".

Each collection has its own layout (3x3, 3x4, 4x3, 4x4), its own caught/want state, and its own books (sub-divisions).

## Features

- **Multiple collections** — create, rename, and switch between collections from the header dropdown. Delete collections from the same dropdown.
- **Binder view** — paginated grid mimicking physical card binder pages. Dual-page spread on wide viewports, single-page on mobile. Navigable via arrow keys.
- **List view** (Pokedex only) — traditional table view with per-generation headers and keyboard navigation.
- **Books** — divide a collection into sub-binders (e.g., Kanto & Johto; Hoenn & Sinnoh). Each book renumbers within itself.
- **Dual numbering** — every entry shows both its National Pokedex number (or card number, for master sets) and its sequential collection position.
- **Form management** (Pokedex) — toggle entire form categories (Regional, Mega, Gigantamax, Other) or individual forms to customize which alternates are included.
- **Search & filter** — real-time search by name, form, or number. Multi-select generation filters (Gen I–IX) plus autocomplete.
- **TCG card picker** — click any slot to attach a specific TCG card. Search any Pokemon, browse cards from any set, filter by set name, card number, or rarity. The picker caches fetched cards in IndexedDB so re-opening is instant.
- **Completion stats** — overall and per-generation progress that updates in real-time as you toggle caught state.
- **Cloud sync** (optional) — one-way setup: create a private GitHub Gist, generate a personal access token with the `gist` scope, and paste both into the sync dialog. All collections sync as a single compact bundle. Edits on one device appear on others within 30 s. Creating or deleting collections propagates too.
- **Export / import** — back up and restore all collections as a JSON file. Works offline; no account required.
- **Responsive** — works on mobile and desktop.

## Running Locally

Serve the repo root with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

## Cross-Device Sync Setup

Sync uses a single GitHub Gist to hold a compact bundle of all your collections.

1. Create a new secret Gist at [gist.github.com](https://gist.github.com) with any placeholder content in a file named `collection.json`.
2. Copy the Gist ID from the URL (the part after your username).
3. Generate a personal access token at [github.com/settings/tokens](https://github.com/settings/tokens) with only the `gist` scope.
4. In the app, click the sync icon in the header, paste the token and Gist ID, and save.

The app pushes changes ~5 seconds after any edit and polls for remote changes every 30 seconds. Card metadata (names, images, rarity) is stripped from the sync payload — it's rehydrated locally from the TCG cache, or re-fetched from the Pokemon TCG API on a fresh device.

The sync is last-write-wins — if you edit the same collection on two devices concurrently, the later push wins.

## Regenerating Pokemon Data

The bundled `data/pokemon.json` was generated from [PokeAPI](https://pokeapi.co). To regenerate it (e.g., when new Pokemon are added):

```bash
node scripts/generate-data.js
```

This fetches all species and form data from the API and writes `data/pokemon.json`. It takes a few minutes due to API rate limits.

## Deployment

Pushing to `main` automatically deploys to GitHub Pages via the included GitHub Actions workflow (`.github/workflows/deploy.yml`).

## Project Structure

```
index.html              Main page
css/styles.css          Styles (dark theme, responsive)
js/
  app.js                Entry point — wires everything together, handles
                        all UI events, modals, and picker flow
  data.js               Loads pokemon.json
  collection.js         Builds the active collection's slot list for
                        each type; assigns numbering
  render.js             List view rendering
  binder.js             Binder view rendering (Pokedex, Master, Freestyle)
  stats.js              Completion stats computation
  db.js                 IndexedDB wrapper — collection records and
                        TCG card cache
  storage.js            State <-> record serialization, bundle (v2)
                        serialization for sync, legacy v1 migration,
                        rehydration of stripped card data
  sync.js               GitHub Gist sync — debounced push, polling pull,
                        rate-limit handling
  tcg-api.js            Pokemon TCG API client — card fetch, set search,
                        variant expansion, batched card hydration
data/
  pokemon.json          1288 Pokemon entries (generated)
scripts/
  generate-data.js      PokeAPI data generation script
openspec/
  specs/                Current capability specs (spec-driven workflow)
  changes/archive/      Archived change proposals
```

Change proposals for new work live under `openspec/changes/` and are moved to `openspec/changes/archive/` once implemented. See the proposals there for the "why" behind recent architecture decisions (IndexedDB migration, multi-collection types, bundle sync).
