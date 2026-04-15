# Pokedex Tracker

A static single-page app for tracking your Pokemon collection across all 1025 base Pokemon plus 263 alternate forms (regional variants, Mega Evolutions, Gigantamax, and more). Built with vanilla HTML/CSS/JS — no frameworks, no backend, no account required.

All data is stored in your browser's localStorage.

## Features

- **Full Pokedex** — 1288 entries covering base forms and alternates (Alolan, Galarian, Hisuian, Paldean, Mega, Gigantamax, etc.)
- **Binder View** — paginated grid mimicking physical card binder pages with configurable layouts (3x3, 3x4, 4x3, 4x4)
- **Dual Numbering** — each entry shows both its National Pokedex number and its sequential collection position for easy binder placement
- **Form Management** — toggle entire form categories (Regional, Mega, Gigantamax, Other) or individual forms to customize your collection
- **Search & Filter** — real-time search by name, form name, or Pokedex number; multi-select generation filters (Gen I–IX)
- **Completion Stats** — overall and per-generation progress bars that update in real-time
- **Export/Import** — back up and restore your progress as a JSON file
- **Responsive** — works on mobile and desktop

## Running Locally

Serve the repo root with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

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
  app.js                Entry point — wires everything together
  data.js               Loads pokemon.json
  collection.js         Builds active collection, assigns numbering
  render.js             List view rendering
  binder.js             Binder view rendering
  stats.js              Completion stats
  storage.js            localStorage operations, export/import
data/
  pokemon.json          1288 Pokemon entries (generated)
scripts/
  generate-data.js      PokeAPI data generation script
```
