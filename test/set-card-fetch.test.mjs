import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchSetCards } from '../js/tcg-api.js';

test('set fetch requires every reported card before returning a list', async () => {
  const originalFetch = globalThis.fetch;
  const page = (data, totalCount) => ({
    ok: true,
    json: async () => ({ data, totalCount }),
  });

  try {
    for (const response of [
      { ok: false, status: 500 },
      page([], 30),
      page([{ id: 'me55c-1' }], 30),
      page(undefined, 30),
    ]) {
      globalThis.fetch = async () => response;
      const result = await fetchSetCards('me55c');
      assert.deepEqual(result.cards, []);
      assert.ok(result.error);
    }

    const firstPage = Array.from({ length: 250 }, (_, i) => ({ id: `example-${i + 1}` }));
    let requestedPages = [];
    globalThis.fetch = async url => {
      requestedPages.push(new URL(url).searchParams.get('page'));
      return requestedPages.length === 1
        ? page(firstPage, 251)
        : page([{ id: 'example-251' }], 251);
    };
    const complete = await fetchSetCards('example');
    assert.equal(complete.error, undefined);
    assert.equal(complete.cards.length, 251);
    assert.deepEqual(requestedPages, ['1', '2']);

    requestedPages = [];
    globalThis.fetch = async url => {
      requestedPages.push(new URL(url).searchParams.get('page'));
      return requestedPages.length === 1
        ? page(firstPage, 251)
        : { ok: false, status: 500 };
    };
    const failedSecondPage = await fetchSetCards('example');
    assert.deepEqual(failedSecondPage.cards, []);
    assert.match(failedSecondPage.error, /500/);

    requestedPages = [];
    globalThis.fetch = async url => {
      requestedPages.push(new URL(url).searchParams.get('page'));
      return requestedPages.length === 1
        ? page(firstPage, 251)
        : page([{ id: 'example-251' }], 250);
    };
    const changedCount = await fetchSetCards('example');
    assert.deepEqual(changedCount.cards, []);
    assert.match(changedCount.error, /count changed/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
