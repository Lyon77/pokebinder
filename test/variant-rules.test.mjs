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
    name: 'Aquapolis Rare Holo cards have only a holofoil variant',
    card: makeCard('ecard2-H1', 'ecard2', '2003/01/15', 'Rare Holo'),
    expected: ['holofoil'],
  },
  {
    name: 'Aquapolis Rare Secret cards have only a holofoil variant',
    card: makeCard('ecard2-148', 'ecard2', '2003/01/15', 'Rare Secret'),
    expected: ['holofoil'],
  },
  {
    name: 'Skyridge Rare Holo cards have only a holofoil variant',
    card: makeCard('ecard3-H1', 'ecard3', '2003/05/12', 'Rare Holo'),
    expected: ['holofoil'],
  },
  {
    name: 'Skyridge Rare Secret cards have holofoil and reverse holofoil variants',
    card: makeCard('ecard3-145', 'ecard3', '2003/05/12', 'Rare Secret'),
    expected: ['holofoil', 'reverseHolofoil'],
  },
  {
    name: 'Expedition Rare Holo cards have holofoil and reverse holofoil variants',
    card: makeCard('ecard1-1', 'ecard1', '2002/09/15', 'Rare Holo'),
    expected: ['holofoil', 'reverseHolofoil'],
  },
  {
    name: 'modern Rare Secret cards have only a holofoil variant',
    card: makeCard('swsh12pt5-160', 'swsh12pt5', '2023/01/20', 'Rare Secret'),
    expected: ['holofoil'],
  },
];

for (const { name, card, expected } of cases) {
  test(name, () => {
    assert.deepEqual(variantsForCard(card), expected);
  });
}
