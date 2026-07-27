import test from 'node:test';
import assert from 'node:assert/strict';

const localValues = new Map();
globalThis.localStorage = {
  getItem(key) {
    return localValues.has(key) ? localValues.get(key) : null;
  },
  setItem(key, value) {
    localValues.set(key, String(value));
  },
  removeItem(key) {
    localValues.delete(key);
  },
};
globalThis.window = { addEventListener() {} };

const { buildBundle, parseBundle } = await import('../js/storage.js');

test('new compact bundle writes use v3 and retain number identity', () => {
  const bundle = buildBundle('aquapolis', { binderHeaders: true }, [{
    id: 'aquapolis',
    name: 'Aquapolis',
    type: 'master',
    caught: [],
    sets: ['ecard2'],
    slotList: [{
      cardId: 'ecard2-50',
      variant: 'normal',
      numberVariant: 'a',
    }],
  }]);

  assert.equal(bundle.v, 3);
  assert.deepEqual(bundle.collections[0].sl, [{
    c: 'ecard2-50',
    v: 'normal',
    n: 'a',
  }]);
  assert.equal(parseBundle(bundle).v, 3);
});

test('legacy v2 compact bundles remain readable', () => {
  const legacy = {
    v: 2,
    activeId: 'legacy',
    settings: { binderHeaders: false },
    collections: [{
      id: 'legacy',
      name: 'Legacy',
      type: 'master',
      sl: [{ c: 'ecard2-50', v: 'normal' }],
    }],
  };

  assert.deepEqual(parseBundle(legacy), legacy);
});

test('unknown bundle versions are rejected', () => {
  for (const version of [1, 4, '3', undefined, null]) {
    assert.equal(parseBundle({ v: version, collections: [] }), null);
  }
});
