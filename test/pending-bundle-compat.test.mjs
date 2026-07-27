import test from 'node:test';
import assert from 'node:assert/strict';

import { selectPendingBundleForFlush } from '../js/bundle-compat.js';

function bundleJson(version, overrides = {}) {
  return JSON.stringify({
    v: version,
    activeId: 'aquapolis',
    settings: { binderHeaders: true },
    collections: [{
      id: 'aquapolis',
      name: 'Aquapolis',
      type: 'master',
      cg: [],
      s: ['ecard2'],
      sl: [{ c: 'ecard2-50', v: 'normal' }],
    }],
    ...overrides,
  });
}

test('equivalent v2 pending state is upgraded and flushed as current v3 JSON', async () => {
  const stashedV2 = bundleJson(2);
  const currentV3 = bundleJson(3);
  const localValues = new Map([
    ['pokebinder-sync-pat', 'test-token'],
    ['pokebinder-sync-gist-id', 'test-gist'],
    ['pokebinder-sync-pending-bundle', JSON.stringify({
      bundle: stashedV2,
      ts: Date.now(),
    })],
  ]);
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

  let pushedContent = null;
  globalThis.fetch = async (_url, options) => {
    pushedContent = JSON.parse(options.body).files['collection.json'].content;
    return {
      ok: true,
      headers: { get() { return null; } },
    };
  };

  const { flushStashedPending, setSyncConfig } = await import('../js/sync.js');
  setSyncConfig('test-token', 'test-gist');
  assert.equal(await flushStashedPending(currentV3), true);
  assert.equal(pushedContent, currentV3);
  assert.equal(JSON.parse(pushedContent).v, 3);
  assert.equal(localStorage.getItem('pokebinder-sync-pending-bundle'), null);
});

test('an exact valid v3 match remains selected', () => {
  const currentV3 = bundleJson(3);
  assert.equal(selectPendingBundleForFlush(currentV3, currentV3), currentV3);
});

test('a genuinely divergent payload is rejected', () => {
  const stashedV2 = bundleJson(2);
  const currentV3 = bundleJson(3, { activeId: 'different' });
  assert.equal(selectPendingBundleForFlush(stashedV2, currentV3), null);
});

test('malformed pending or current JSON is rejected', () => {
  assert.equal(selectPendingBundleForFlush('{bad json', bundleJson(3)), null);
  assert.equal(selectPendingBundleForFlush(bundleJson(2), '{bad json'), null);
  assert.equal(selectPendingBundleForFlush(bundleJson(2), ''), null);
});

test('unsupported pending or current versions are rejected', () => {
  assert.equal(selectPendingBundleForFlush(bundleJson(1), bundleJson(3)), null);
  assert.equal(selectPendingBundleForFlush(bundleJson(2), bundleJson(4)), null);
});
