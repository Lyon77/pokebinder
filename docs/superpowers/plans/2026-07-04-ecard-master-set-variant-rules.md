# e-Card Master-Set Variant Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Aquapolis and Skyridge master-set variants while preserving the existing rules for every other set.

**Architecture:** Keep variant decisions centralized in `js/variant-rules.js`. Distinguish the API's `Rare Secret` rarity from other special rarities, then apply narrow `ecard2` and `ecard3` rules inside the existing early-reverse era branch. Existing collections continue to adopt new slot IDs only through the current Refresh slots workflow.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js 24 built-in test runner, Markdown/OpenSpec, Git.

---

## File map

- Create `test/variant-rules.test.mjs`: focused behavior tests for set, rarity, and finish combinations.
- Modify `js/variant-rules.js`: recognize `Rare Secret` and apply Aquapolis/Skyridge-specific early-reverse rules.
- Modify `openspec/specs/master-set-slots/spec.md`: document the four corrected combinations.
- Modify `README.md`: replace the stale TCGPlayer-price description with deterministic rule behavior.

Do not modify or amend the user-authored `6aa3b12 Remove override` commit. Never stage `Inventario_Pokemon_ENG.csv`, `japan-hokkaido-trip-may-2026.pdf`, or `pokemon_lot.csv`; they are pre-existing user files outside this plan.

### Task 1: Add regression coverage and correct variant derivation

**Files:**
- Create: `test/variant-rules.test.mjs`
- Modify: `js/variant-rules.js`

- [ ] **Step 1: Write the failing behavior tests**

Create `test/variant-rules.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { variantsForCard } from '../js/variant-rules.js';

function makeCard(id, setId, releaseDate, rarity) {
  return {
    id,
    rarity,
    set: { id: setId, releaseDate },
  };
}

const cases = [
  {
    name: 'Aquapolis Rare Holo is holofoil only',
    card: makeCard('ecard2-H1', 'ecard2', '2003/01/15', 'Rare Holo'),
    expected: ['holofoil'],
  },
  {
    name: 'Aquapolis Rare Secret is holofoil only',
    card: makeCard('ecard2-148', 'ecard2', '2003/01/15', 'Rare Secret'),
    expected: ['holofoil'],
  },
  {
    name: 'Skyridge Rare Holo is holofoil only',
    card: makeCard('ecard3-H1', 'ecard3', '2003/05/12', 'Rare Holo'),
    expected: ['holofoil'],
  },
  {
    name: 'Skyridge Rare Secret has holofoil and reverse holofoil variants',
    card: makeCard('ecard3-145', 'ecard3', '2003/05/12', 'Rare Secret'),
    expected: ['holofoil', 'reverseHolofoil'],
  },
  {
    name: 'Expedition Rare Holo keeps both foil variants',
    card: makeCard('ecard1-1', 'ecard1', '2002/09/15', 'Rare Holo'),
    expected: ['holofoil', 'reverseHolofoil'],
  },
  {
    name: 'modern Rare Secret stays holofoil only',
    card: makeCard('swsh12pt5-160', 'swsh12pt5', '2023/01/20', 'Rare Secret'),
    expected: ['holofoil'],
  },
];

for (const { name, card, expected } of cases) {
  test(name, () => {
    assert.deepEqual(variantsForCard(card), expected);
  });
}
```

- [ ] **Step 2: Run the tests and verify the current rules fail for the intended reasons**

Run:

```bash
node --test test/variant-rules.test.mjs
```

Expected: 6 tests run; Aquapolis `Rare Holo`, Skyridge `Rare Holo`, and Skyridge `Rare Secret` fail with variant-array mismatches. The other 3 tests pass.

- [ ] **Step 3: Implement the minimal set-and-rarity rules**

In `js/variant-rules.js`, update the era comment to:

```js
// Era cutoffs by ISO release date.
// - preReverse: pre-Legendary Collection (no reverse foils)
// - earlyReverse: LC + e-Card era. Common/Uncommon/Rare have reverse foils;
//   Rare Holo and Rare Secret finishes include set-specific exceptions below.
// - modern: EX onwards (reverse foils on Common/Uncommon/Rare AND Rare Holo)
```

Replace `rarityCategory` with:

```js
function rarityCategory(rarity) {
  switch (rarity) {
    case 'Common':      return 'common';
    case 'Uncommon':    return 'uncommon';
    case 'Rare':        return 'rare';
    case 'Rare Holo':   return 'rareHolo';
    case 'Rare Secret': return 'rareSecret';
    default:            return 'special'; // EX, GX, V, Ultra, Promo, etc.
  }
}
```

Replace `variantsForEra` with:

```js
function variantsForEra(era, category, setId) {
  if (era === 'preReverse') {
    const has1stEd = FIRST_ED_SETS.has(setId);
    if (category === 'rareHolo' || category === 'rareSecret' || category === 'special') {
      return has1stEd ? ['1stEditionHolofoil', 'holofoil'] : ['holofoil'];
    }
    return has1stEd ? ['1stEditionNormal', 'normal'] : ['normal'];
  }

  if (era === 'earlyReverse') {
    if (setId === 'ecard2' && (category === 'rareHolo' || category === 'rareSecret')) {
      return ['holofoil'];
    }
    if (setId === 'ecard3') {
      if (category === 'rareHolo') return ['holofoil'];
      if (category === 'rareSecret') return ['holofoil', 'reverseHolofoil'];
    }
    if (category === 'rareSecret' || category === 'special') return ['holofoil'];
    if (category === 'rareHolo') return ['holofoil', 'reverseHolofoil'];
    return ['normal', 'reverseHolofoil'];
  }

  if (category === 'rareSecret' || category === 'special') return ['holofoil'];
  if (category === 'rareHolo') return ['holofoil', 'reverseHolofoil'];
  return ['normal', 'reverseHolofoil'];
}
```

- [ ] **Step 4: Run the focused tests and verify green**

Run:

```bash
node --test test/variant-rules.test.mjs
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Check JavaScript syntax**

Run:

```bash
node --check js/variant-rules.js
node --check test/variant-rules.test.mjs
```

Expected: both commands exit 0 with no output.

- [ ] **Step 6: Commit the tested rule correction**

Run:

```bash
git add js/variant-rules.js test/variant-rules.test.mjs
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: correct Aquapolis and Skyridge variants"
```

Expected staged names: only `js/variant-rules.js` and `test/variant-rules.test.mjs`.

### Task 2: Align user and capability documentation

**Files:**
- Modify: `openspec/specs/master-set-slots/spec.md`
- Modify: `README.md`

- [ ] **Step 1: Replace the stale e-Card scenario with the four exact combinations**

In `openspec/specs/master-set-slots/spec.md`, replace the existing `e-Card era Rare Holo` scenario with:

```markdown
#### Scenario: Aquapolis Rare Holo
- **WHEN** a card has rarity `"Rare Holo"` and set ID `ecard2`
- **THEN** one slot is created: `{cardId}:holofoil`

#### Scenario: Aquapolis Crystal secret rare
- **WHEN** a card has rarity `"Rare Secret"` and set ID `ecard2`
- **THEN** one slot is created: `{cardId}:holofoil`

#### Scenario: Skyridge Rare Holo
- **WHEN** a card has rarity `"Rare Holo"` and set ID `ecard3`
- **THEN** one slot is created: `{cardId}:holofoil`

#### Scenario: Skyridge Crystal secret rare
- **WHEN** a card has rarity `"Rare Secret"` and set ID `ecard3`
- **THEN** two slots are created: `{cardId}:holofoil` and `{cardId}:reverseHolofoil`
```

- [ ] **Step 2: Correct the README master-set description**

In `README.md`, replace the Master Set bullet with:

```markdown
- **Master Set** — one slot per card variant across one or more TCG sets. Variants (normal, reverse-holo, holo, 1st-edition, etc.) are derived from deterministic set release-date and card-rarity rules, with per-card overrides for known exceptions.
```

- [ ] **Step 3: Verify the documented matrix and stale wording**

Run:

```bash
rg -n "Aquapolis Rare Holo|Aquapolis Crystal|Skyridge Rare Holo|Skyridge Crystal" openspec/specs/master-set-slots/spec.md
rg -n "tcgplayer\.prices data|deterministic set release-date" README.md
```

Expected: four OpenSpec scenario headings, one deterministic-rules README match, and no stale README match.

- [ ] **Step 4: Check documentation whitespace**

Run:

```bash
git diff --check -- README.md openspec/specs/master-set-slots/spec.md
```

Expected: exit 0 with no output.

- [ ] **Step 5: Commit only the related documentation**

Run:

```bash
git add README.md openspec/specs/master-set-slots/spec.md
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: clarify e-card master-set variants"
```

Expected staged names: only `README.md` and `openspec/specs/master-set-slots/spec.md`.

### Task 3: Verify and deliver

**Files:**
- Verify only; no source files change.

- [ ] **Step 1: Run the complete available automated test suite**

Run:

```bash
node --test test/variant-rules.test.mjs
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 2: Re-run syntax validation**

Run:

```bash
node --check js/variant-rules.js
node --check test/variant-rules.test.mjs
```

Expected: both commands exit 0 with no output.

- [ ] **Step 3: Check all branch changes for whitespace errors**

Run:

```bash
git diff --check origin/main...HEAD
```

Expected: exit 0 with no output.

- [ ] **Step 4: Audit branch commits and preserve user-owned changes**

Run:

```bash
git log --oneline origin/main..HEAD
git status --short --branch
```

Expected: the user-authored `Remove override` commit plus the design, plan, rule/test, and documentation commits are ahead of `origin/main`. The working tree still shows only the three unrelated untracked files.

- [ ] **Step 5: Push `main`**

Run:

```bash
git push origin main
```

Expected: exit 0 and `main -> main`.

- [ ] **Step 6: Verify the remote branch matches local HEAD**

Run:

```bash
git rev-parse HEAD
git ls-remote --exit-code origin refs/heads/main
```

Expected: the local and remote commit hashes are identical.
