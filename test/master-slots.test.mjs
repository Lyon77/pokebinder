import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compactMasterSlot,
  expandCompactMasterSlot,
  hydrateMasterSlot,
  numberVariantsForCard,
} from '../js/master-slots.js';
import { expandVariants } from '../js/tcg-api.js';

function makeCard(id, number, {
  name = id,
  setId = 'ecard2',
  releaseDate = '2003/01/15',
  rarity = 'Common',
  printedTotal = 147,
} = {}) {
  return {
    id,
    name,
    number,
    rarity,
    images: { small: `https://example.test/${id}.png` },
    set: {
      id: setId,
      name: setId,
      releaseDate,
      printedTotal,
    },
  };
}

test('only the four canonical Aquapolis records receive a/b collector numbers', () => {
  const canonical = new Map([
    ['ecard2-50', '50'],
    ['ecard2-74', '74'],
    ['ecard2-95', '95'],
    ['ecard2-103', '103'],
  ]);
  for (const [id, number] of canonical) {
    assert.deepEqual(numberVariantsForCard({ id }), ['a', 'b'], id);
    const slots = expandVariants([makeCard(id, number)]);
    assert.deepEqual(
      [...new Set(slots.map(slot => slot.number))],
      [`${number}a/147`, `${number}b/147`],
      id,
    );
  }

  for (const id of [
    'ecard2-87',
    'ecard2-114',
    'ecard1-50',
    'ecard1-74',
    'ecard3-50',
    'ecard3-74',
  ]) {
    assert.deepEqual(numberVariantsForCard({ id }), [], id);
  }
});

test('Aquapolis a/b identities replace the unsuffixed card and cross with every finish', () => {
  const slots = expandVariants([
    makeCard('ecard2-50', '50', { name: 'Golduck', rarity: 'Uncommon' }),
  ]);

  assert.deepEqual(
    slots.map(({ slotId, number, numberVariant, variant }) => ({
      slotId,
      number,
      numberVariant,
      variant,
    })),
    [
      {
        slotId: 'ecard2-50:a:normal',
        number: '50a/147',
        numberVariant: 'a',
        variant: 'normal',
      },
      {
        slotId: 'ecard2-50:a:reverseHolofoil',
        number: '50a/147',
        numberVariant: 'a',
        variant: 'reverseHolofoil',
      },
      {
        slotId: 'ecard2-50:b:normal',
        number: '50b/147',
        numberVariant: 'b',
        variant: 'normal',
      },
      {
        slotId: 'ecard2-50:b:reverseHolofoil',
        number: '50b/147',
        numberVariant: 'b',
        variant: 'reverseHolofoil',
      },
    ],
  );
  assert.equal(slots.some(slot => slot.slotId === 'ecard2-50:normal'), false);
});

test('number variants sort by collector number, then letter, then finish', () => {
  const slots = expandVariants([
    makeCard('ecard2-51', '51', { rarity: 'Uncommon' }),
    makeCard('ecard2-50', '50', { rarity: 'Uncommon' }),
  ]);

  assert.deepEqual(
    slots.map(slot => slot.slotId),
    [
      'ecard2-50:a:normal',
      'ecard2-50:a:reverseHolofoil',
      'ecard2-50:b:normal',
      'ecard2-50:b:reverseHolofoil',
      'ecard2-51:normal',
      'ecard2-51:reverseHolofoil',
    ],
  );
});

test('unaffected prefixed collector numbers retain numeric group ordering and slot IDs', () => {
  const options = {
    setId: 'example',
    releaseDate: '2024/01/01',
    rarity: 'Rare Secret',
    printedTotal: 100,
  };
  const slots = expandVariants([
    makeCard('example-h2', 'H2', options),
    makeCard('example-tg1', 'TG1', options),
    makeCard('example-10', '10', options),
    makeCard('example-h1', 'H1', options),
  ]);

  assert.deepEqual(
    slots.map(slot => [slot.number, slot.slotId]),
    [
      ['10/100', 'example-10:holofoil'],
      ['H1/100', 'example-h1:holofoil'],
      ['H2/100', 'example-h2:holofoil'],
      ['TG1/100', 'example-tg1:holofoil'],
    ],
  );
});

test('compact master slots preserve number variants and legacy entries remain compatible', () => {
  const compact = compactMasterSlot({
    cardId: 'ecard2-50',
    variant: 'reverseHolofoil',
    numberVariant: 'b',
  });
  assert.deepEqual(compact, { c: 'ecard2-50', v: 'reverseHolofoil', n: 'b' });
  assert.deepEqual(expandCompactMasterSlot(compact), {
    cardId: 'ecard2-50',
    variant: 'reverseHolofoil',
    slotId: 'ecard2-50:b:reverseHolofoil',
    numberVariant: 'b',
  });

  assert.deepEqual(expandCompactMasterSlot({
    c: 'ecard2-50',
    v: 'reverseHolofoil',
  }), {
    cardId: 'ecard2-50',
    variant: 'reverseHolofoil',
    slotId: 'ecard2-50:reverseHolofoil',
  });
});

test('compact number variants accept only canonical a/b suffixes', () => {
  assert.deepEqual(expandCompactMasterSlot({
    c: 'ecard2-50',
    v: 'normal',
    n: 'arbitrary',
  }), {
    cardId: 'ecard2-50',
    variant: 'normal',
    slotId: 'ecard2-50:normal',
  });
  assert.deepEqual(compactMasterSlot({
    cardId: 'ecard2-50',
    variant: 'normal',
    numberVariant: 'A',
  }), {
    c: 'ecard2-50',
    v: 'normal',
  });
  assert.deepEqual(expandCompactMasterSlot({
    c: 'ecard1-50',
    v: 'normal',
    n: 'a',
  }), {
    cardId: 'ecard1-50',
    variant: 'normal',
    slotId: 'ecard1-50:normal',
  });
});

test('cold hydration reconstructs the same b identity from metadata already suffixed a', () => {
  const hydrated = hydrateMasterSlot({
    cardId: 'ecard2-50',
    variant: 'normal',
    numberVariant: 'b',
  }, {
    cardId: 'ecard2-50',
    name: 'Golduck',
    number: '50a/147',
    numberVariant: 'a',
    imageSmall: 'https://example.test/ecard2-50.png',
  });

  assert.equal(hydrated.cardId, 'ecard2-50');
  assert.equal(hydrated.number, '50b/147');
  assert.equal(hydrated.numberVariant, 'b');
  assert.equal(hydrated.slotId, 'ecard2-50:b:normal');
});

test('cold hydration of a legacy compact entry keeps its unsuffixed identity', () => {
  const hydrated = hydrateMasterSlot({
    cardId: 'ecard2-50',
    variant: 'normal',
  }, {
    cardId: 'ecard2-50',
    number: '50a/147',
    numberVariant: 'a',
    imageSmall: 'https://example.test/ecard2-50.png',
  });

  assert.equal(hydrated.number, '50/147');
  assert.equal('numberVariant' in hydrated, false);
  assert.equal(hydrated.slotId, 'ecard2-50:normal');
});
