## 1. Data Layer Changes

- [x] 1.1 Update `scripts/generate-data.js` to assign `formSubCategory` for "other" forms: group by species where a species has 2+ "other" alternate forms (e.g., "rotom", "deoxys", "lycanroc", "oricorio", "necrozma", "urshifu", "calyrex"), set to `null` for single-form species
- [x] 1.2 Regenerate `data/pokemon.json` with the new `formSubCategory` field
- [x] 1.3 Verify sub-category assignments (Rotom has 5 forms under "rotom", Deoxys has 3 under "deoxys", etc.)

## 2. Collection Logic Updates

- [x] 2.1 Update `js/data.js` to expose a `getFormSubCategories()` function and sub-category label map
- [x] 2.2 Update `js/collection.js` `buildCollection()` to also check `formSubCategory` against `disabledCategories` when filtering "other" forms
- [x] 2.3 Verify: disabling sub-category "rotom" removes all Rotom forms; disabling parent "other" still disables all "other" forms regardless of sub-category

## 3. Modal HTML Structure

- [x] 3.1 Update `index.html` modal body: replace `#form-categories` and `#form-individual` with a single `#form-settings-body` container
- [x] 3.2 Remove old `.form-category-row`, `.form-toggle`, `.form-individual-group`, `.form-individual-item` CSS classes

## 4. Accordion + Toggle CSS

- [x] 4.1 Add `.cat-group`, `.cat-header`, `.cat-header-left`, `.cat-header-right`, `.cat-chevron` styles
- [x] 4.2 Add `.cat-body` with `max-height` transition for smooth expand/collapse
- [x] 4.3 Add `.cat-icon` styles with color-coded backgrounds per category
- [x] 4.4 Add `.toggle-switch` and `.mini-toggle` styled switch CSS (replacing raw checkboxes)
- [x] 4.5 Add `.form-row` compact row styles with `.form-dex` and `.form-name-sub`
- [x] 4.6 Add `.cat-group.disabled` styles (dimmed body, pointer-events disabled)
- [x] 4.7 Add `.section-divider` style for the "Other Form Groups" separator

## 5. Form Settings Rendering

- [x] 5.1 Rewrite `renderFormSettings()` in `js/app.js` to build accordion groups: main categories (Regional, Mega, Gigantamax), section divider, then species sub-groups, then Other Misc. catch-all
- [x] 5.2 Each accordion header: icon, category name, count badge, toggle switch, chevron
- [x] 5.3 Each form row: Pokedex number, Pokemon name, form name (muted), mini-toggle
- [x] 5.4 Wire accordion header click to expand/collapse (toggle `.open` class)
- [x] 5.5 Wire toggle switch click to enable/disable category (toggle `.disabled` class, update storage, rebuild collection)
- [x] 5.6 Wire form row click to toggle individual form (update storage, rebuild collection)
- [x] 5.7 Wire category toggle to also toggle all child mini-toggles on/off visually

## 6. Verification

- [x] 6.1 Verify accordion expand/collapse animation works smoothly
- [x] 6.2 Verify disabling a category dims rows and prevents interaction
- [x] 6.3 Verify sub-group toggles (e.g., "Rotom Forms") work independently from main "Other" category
- [x] 6.4 Verify form preferences persist across page reload (including new sub-categories)
- [x] 6.5 Verify export/import preserves sub-category preferences
- [x] 6.6 Verify collection numbers and stats recalculate when sub-groups are toggled
- [x] 6.7 Verify modal is usable on mobile (375px viewport)
