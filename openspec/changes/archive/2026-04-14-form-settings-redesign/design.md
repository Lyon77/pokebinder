## Context

The form settings modal currently renders using `renderFormSettings()` in `js/app.js`, which builds raw checkboxes inside `#form-categories` and `#form-individual` divs. The modal HTML lives in `index.html`. Styling is in `css/styles.css` under the `.modal`, `.form-category-row`, `.form-toggle`, and `.form-individual-*` selectors. The user explored mockups and chose a design combining Option C's compact rows with Option A's accordion expand/collapse, plus granular "Other" sub-groups.

## Goals / Non-Goals

**Goals:**
- Replace the form settings UI with the accordion + mini-toggle design from the approved mockup (`mockups/form-settings-v2.html`)
- Break "Other Forms" into species-specific sub-groups (Rotom, Deoxys, Lycanroc, etc.)
- Add `formSubCategory` to the dataset for grouping "other" forms
- Keep all existing functionality (category toggle, individual toggle, persistence, disabled state)

**Non-Goals:**
- Changing form toggle _behavior_ (the logic in `storage.js` stays the same)
- Adding new form categories from PokeAPI that aren't already in the dataset
- Changing the data generation script's PokeAPI fetching logic

## Decisions

### 1. Sub-category field in dataset

**Decision:** Add a `formSubCategory` field to each "other" category form in `pokemon.json`. The value is a species-based group name (e.g., `"rotom"`, `"deoxys"`, `"lycanroc"`). Forms that don't have a meaningful species group get `null` and fall into the "Other Misc." catch-all.

**Rationale:** This keeps grouping logic out of the UI code. The data script assigns sub-categories based on species ID — all forms sharing the same species ID with 2+ alternate forms get a sub-category.

**Alternatives considered:**
- Group dynamically in the UI by species ID — duplicates logic, harder to customize labels

### 2. Sub-categories as first-class categories in storage

**Decision:** Sub-categories (e.g., `"rotom"`, `"deoxys"`) are stored in `disabledCategories` alongside the main categories (`"regional"`, `"mega"`, `"gmax"`). No storage format change needed.

**Rationale:** The existing `disabledCategories` Set already accepts arbitrary strings. Adding `"rotom"` to it works identically to adding `"gmax"`. The collection builder in `collection.js` already checks `state.disabledCategories.has(p.formCategory)` — it just needs to also check `formSubCategory`.

### 3. Accordion HTML structure

**Decision:** Replace the modal body content with accordion groups rendered dynamically by `renderFormSettings()`. Each group is a `.cat-group` div with a clickable `.cat-header` (toggle switch + chevron) and a collapsible `.cat-body` containing `.form-row` elements with mini-toggles. CSS handles the expand/collapse animation via `max-height` transition.

**Rationale:** Matches the approved mockup. No JS animation library needed — CSS `max-height` transition is simple and performant.

### 4. Section divider for "Other Form Groups"

**Decision:** A small text divider separates the main categories (Regional, Mega, Gigantamax) from the species-specific sub-groups. This provides visual hierarchy.

## Risks / Trade-offs

- **Sub-category assignment is heuristic** → Some species with only 1 alternate form will go into "Other Misc." rather than getting their own group. This is acceptable — the user can still toggle them individually.
- **Accordion max-height animation** → Using a large `max-height` (2000px) for the transition means the animation speed isn't perfectly proportional to content height. Acceptable trade-off for simplicity.
