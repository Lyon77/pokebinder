## Why

The current form settings modal uses plain HTML checkboxes in a flat list, which is hard to scan and visually inconsistent with the rest of the app. The "Other Forms" category is a single bucket of 78 items with no way to quickly toggle related groups (e.g., all Rotom forms). A redesigned modal with accordion sections, toggle switches, and granular sub-categories will make the form settings faster to use and visually polished.

## What Changes

- Replace the form settings modal UI with an accordion-based layout: each category is a collapsible section with a header toggle switch and expandable form rows
- Break the "Other Forms" category into species-specific sub-groups (Rotom Forms, Deoxys Forms, Lycanroc Forms, Oricorio Forms, Necrozma Forms, Urshifu Forms, Calyrex Forms, etc.) plus a remaining "Other Misc." catch-all
- Replace raw HTML checkboxes with styled toggle switches (category level) and mini-toggles (individual form level)
- Show Pokedex number on each form row for quick identification
- Disabling a category visually dims and locks its form rows
- Add a "Other Form Groups" section divider between the main categories and the species-specific sub-groups

## Capabilities

### New Capabilities

_None — this is a UI redesign of existing functionality._

### Modified Capabilities

- `alternate-forms`: The form category toggle UI is changing from flat checkboxes to accordion sections with toggle switches. The "Other Forms" category is being split into granular species-specific sub-groups, each with its own category-level toggle.
- `pokemon-data`: Adding a `formSubCategory` field to the dataset so "other" forms can be grouped by species (e.g., "rotom", "deoxys", "lycanroc")

## Impact

- **Modified code**: `js/app.js` (form settings modal rendering), `css/styles.css` (new accordion and toggle styles), `index.html` (modal structure)
- **Modified data**: `data/pokemon.json` needs a `formSubCategory` field for "other" category forms; `scripts/generate-data.js` updated to populate it
- **Modified storage**: `js/storage.js` needs to support sub-category toggles in `disabledCategories`
- **No breaking changes**: All existing form preference data in localStorage remains valid; new sub-categories default to enabled
