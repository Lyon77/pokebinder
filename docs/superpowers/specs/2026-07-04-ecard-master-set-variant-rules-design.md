# e-Card master-set variant correction

## Goal

Correct master-set slot generation for Aquapolis and Skyridge so their H-series holofoils and Crystal secret rares match the finishes that were actually printed, without changing Expedition, Legendary Collection, or later sets.

## Required behavior

Variant derivation uses the Pokemon TCG API's existing set IDs and rarity values:

| Set | API rarity | Master-set variants |
| --- | --- | --- |
| Aquapolis (`ecard2`) | `Rare Holo` | `holofoil` |
| Aquapolis (`ecard2`) | `Rare Secret` | `holofoil` |
| Skyridge (`ecard3`) | `Rare Holo` | `holofoil` |
| Skyridge (`ecard3`) | `Rare Secret` | `holofoil`, `reverseHolofoil` |

Common, Uncommon, and Rare behavior in both sets remains unchanged. Expedition and all other sets retain their current behavior.

## Implementation approach

Update `js/variant-rules.js` with targeted set-and-rarity handling inside the existing deterministic variant derivation. The rarity categorizer will distinguish `Rare Secret` from the generic `special` category. The early-reverse rule will then apply the four combinations above before falling back to its existing generic behavior.

This keeps the decision in the central rules module and avoids per-card overrides. It also prevents a broad early-era change from affecting Expedition or Legendary Collection.

`data/variant-overrides.json` is not part of this change. Its existing uncommitted working-tree modification must remain untouched and excluded from every commit.

## Data flow and existing collections

New master sets and sets added to an existing master collection use the corrected rule the next time their cards are expanded.

Existing cached master-set slot lists do not migrate automatically. The user applies the correction through the existing **Refresh slots** action, which re-fetches the set cards, computes the new slot IDs, displays the added/removed and owned-but-removed counts, and replaces the slot list only after confirmation.

For the affected H-series and Crystal cards, Refresh slots will make these changes:

- Aquapolis: remove the reverse-holo slot from each `Rare Holo`; its `Rare Secret` Crystal cards remain holo-only.
- Skyridge: remove the reverse-holo slot from each `Rare Holo` and add one to each `Rare Secret` Crystal card.

No new error-handling path is needed. Fetch failures and refresh confirmation continue to use the existing behavior.

## Tests

Add a focused Node test file for `variantsForCard`. Follow a red-green cycle: first prove that current behavior fails the corrected expectations, then make the smallest rule change that passes.

The regression matrix will cover:

- Aquapolis `Rare Holo` is holo-only.
- Aquapolis `Rare Secret` is holo-only.
- Skyridge `Rare Holo` is holo-only.
- Skyridge `Rare Secret` has holo and reverse-holo variants.
- Expedition `Rare Holo` remains `holofoil` plus `reverseHolofoil`.
- A modern `Rare Secret` remains `holofoil` only.

Run the focused test directly with Node, then run syntax checks for every changed JavaScript file.

## Documentation

Update `openspec/specs/master-set-slots/spec.md` with separate scenarios for the four Aquapolis and Skyridge combinations. Update the README's stale statement that variants come from TCGPlayer prices so it reflects the current deterministic set-and-rarity rules.

## Delivery

Commit only the design, implementation, tests, and directly related documentation. Do not include unrelated untracked files or the pre-existing `data/variant-overrides.json` modification. Push the resulting commits to `origin/main` using the supplied GitHub credential without writing the credential into repository files or commit metadata.

## Out of scope

- Automatic migration of cached master-set slot lists.
- Changes to the Refresh slots UI or confirmation behavior.
- Reclassification of any set other than Aquapolis and Skyridge.
- Cleanup of unrelated variant overrides or working-tree files.
