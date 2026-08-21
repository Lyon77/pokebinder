import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractCollectorNumbers,
  extractScanHints,
  hasClearScanLeader,
  normalizeCollectorNumber,
  rankCardCandidates,
  resolveCreateWorker,
  visualResultToScanHints,
} from '../js/card-scanner.js';
import { fetchCardsForPokemon, searchCardsByScanHints } from '../js/tcg-api.js';
import {
  DEFAULT_ROTATION_FAST_PATH_THRESHOLD,
  shouldCheckRotatedMatch,
} from '../vendor/collectorvision/lib/rotation-policy.mjs';

function card(cardId, name, number, setName = 'Example Set', setYear = '2024') {
  return { cardId, name, number, setName, setYear, rarity: '', imageSmall: '' };
}

test('adaptive rotation skips strong upright matches and preserves uncertain fallback', () => {
  assert.equal(DEFAULT_ROTATION_FAST_PATH_THRESHOLD, 0.75);
  assert.equal(shouldCheckRotatedMatch(0.82), false);
  assert.equal(shouldCheckRotatedMatch(0.75), false);
  assert.equal(shouldCheckRotatedMatch(0.749), true);
  assert.equal(shouldCheckRotatedMatch(Number.NaN), true);
  assert.equal(shouldCheckRotatedMatch(0.2, false), false);
});

test('resolves Tesseract createWorker from CDN and native ESM module shapes', () => {
  const nativeWorker = () => 'native';
  const cdnWorker = () => 'cdn';
  assert.equal(resolveCreateWorker({ createWorker: nativeWorker }), nativeWorker);
  assert.equal(resolveCreateWorker({ default: { createWorker: cdnWorker } }), cdnWorker);
  assert.throws(() => resolveCreateWorker({ default: {} }), /did not provide createWorker/);
});

test('collector number parsing tolerates common formats and OCR spacing', () => {
  assert.deepEqual(extractCollectorNumbers('025 / 198'), ['025/198']);
  assert.deepEqual(extractCollectorNumbers('TG05/TG30'), ['TG05/TG30']);
  assert.deepEqual(extractCollectorNumbers('H12 / H32'), ['H12/H32']);
  assert.deepEqual(extractCollectorNumbers('25 of 102'), ['25/102']);
  assert.deepEqual(extractCollectorNumbers('SM29'), ['SM29']);
  assert.deepEqual(extractCollectorNumbers('SWSH 042'), ['SWSH042']);
  assert.equal(normalizeCollectorNumber(' 050a / 147 '), '050A/147');
});

test('hint extraction finds a Pokemon name despite nearby card text', () => {
  const hints = extractScanHints('BASIC\nCharizard ex 330 HP\nBurning Darkness\n125 / 197', {
    pokemonNames: ['Bulbasaur', 'Charizard', 'Pikachu'],
  });

  assert.equal(hints.names[0], 'Charizard');
  assert.deepEqual(hints.collectorNumbers, ['125/197']);
});

test('hint extraction recognizes a near-match Pokemon token inside a noisy title line', () => {
  const hints = extractScanHints('i Sprigatit or .70@\nLeafage\nCED013/195', {
    pokemonNames: ['Sprigatito'],
  });
  assert.equal(hints.names[0], 'Sprigatito');
  assert.deepEqual(hints.collectorNumbers, ['CED013/195']);
});

test('visual catalog results become exact lookup hints without printing suffixes', () => {
  assert.deepEqual(visualResultToScanHints({
    cardId: '129894',
    cardName: 'Mimikyu - SM29',
    collectorNumber: 'SM29',
    setName: 'SM Promos',
    score: 0.91,
  }), {
    names: ['Mimikyu'],
    collectorNumbers: ['SM29'],
    setTokens: ['promos'],
    normalizedText: 'mimikyu sm promos sm29',
    visualScore: 0.91,
    visualProductId: '129894',
  });
});

test('exact collector number and name outrank name-only candidates', () => {
  const hints = extractScanHints('Charizard ex\nObsidian Flames\n125/197', {
    pokemonNames: ['Charizard'],
  });
  const ranked = rankCardCandidates(hints, [
    card('sv3-125', 'Charizard ex', '125/197', 'Obsidian Flames'),
    card('other-125', 'Pikachu', '125/200', 'Other Set'),
    card('sv3-006', 'Charizard ex', '006/197', 'Obsidian Flames'),
  ]);

  assert.equal(ranked[0].card.cardId, 'sv3-125');
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[0].reasons.includes('collector number'));
  assert.ok(ranked[0].reasons.includes('card name'));
});

test('ranking treats padded and unpadded collector numbers as equivalent', () => {
  const ranked = rankCardCandidates({
    names: ['Pikachu'],
    collectorNumbers: ['025/198'],
    setTokens: [],
    normalizedText: 'pikachu 025 198',
  }, [card('set-25', 'Pikachu', '25/198')]);
  assert.ok(ranked[0].reasons.includes('collector number'));
});

test('ranking tolerates a set mark fused to a numeric collector number', () => {
  const hints = extractScanHints('Sprigatito\nCED013/195', { pokemonNames: ['Sprigatito'] });
  const ranked = rankCardCandidates(hints, [
    card('sv1-13', 'Sprigatito', '13/198', 'Scarlet & Violet'),
  ]);
  assert.equal(ranked[0].card.cardId, 'sv1-13');
  assert.ok(ranked[0].score >= 0.8);
});

test('ranking supports Trainer cards, removes duplicates, and caps results', () => {
  const hints = extractScanHints("TRAINER\nProfessor's Research\n189/202");
  const cards = [
    card('swsh1-189', "Professor's Research", '189/202', 'Sword & Shield'),
    card('swsh1-189', "Professor's Research", '189/202', 'Sword & Shield'),
    ...Array.from({ length: 20 }, (_, index) => (
      card(`set-${index}`, `Trainer ${index}`, '189/202', `Set ${index}`)
    )),
  ];
  const ranked = rankCardCandidates(hints, cards);

  assert.equal(ranked[0].card.cardId, 'swsh1-189');
  assert.equal(new Set(ranked.map(result => result.card.cardId)).size, ranked.length);
  assert.equal(ranked.length, 12);
});

test('ranking returns no result when hints do not overlap candidates', () => {
  const ranked = rankCardCandidates(
    { names: ['Charizard'], collectorNumbers: [], setTokens: [], normalizedText: 'charizard' },
    [card('base1-2', 'Blastoise', '2/102')],
  );
  assert.deepEqual(ranked, []);
});

test('only a strong, separated result is safe to preselect', () => {
  assert.equal(hasClearScanLeader([{ score: 0.9 }, { score: 0.7 }]), true);
  assert.equal(hasClearScanLeader([{ score: 0.9 }, { score: 0.84 }]), false);
  assert.equal(hasClearScanLeader([{ score: 0.7 }]), false);
  assert.equal(hasClearScanLeader([]), false);
});

test('ranking accepts an exact Energy card result', () => {
  const hints = extractScanHints('ENERGY\nBasic Fire Energy\n002/002');
  const ranked = rankCardCandidates(hints, [
    card('energy-2', 'Basic Fire Energy', '002/002', 'Energy Pack'),
  ]);
  assert.equal(ranked[0].card.cardId, 'energy-2');
});

test('scan lookup prefers collector numbers and returns picker card objects', async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return {
          data: [{
            id: 'sv3-125',
            name: 'Charizard ex',
            number: '125',
            rarity: 'Double Rare',
            images: { small: 'https://example.test/sv3-125.png' },
            set: {
              id: 'sv3',
              name: 'Obsidian Flames',
              printedTotal: 197,
              releaseDate: '2023/08/11',
            },
          }],
        };
      },
    };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await searchCardsByScanHints({
    names: ['Wrong OCR name'],
    collectorNumbers: ['125/197'],
  });

  assert.match(decodeURIComponent(requestedUrl), /number:"125"/);
  assert.doesNotMatch(decodeURIComponent(requestedUrl), /Wrong OCR name/);
  assert.deepEqual(result.cards[0], {
    cardId: 'sv3-125',
    name: 'Charizard ex',
    number: '125/197',
    setName: 'Obsidian Flames',
    setId: 'sv3',
    setYear: '2023',
    rarity: 'Double Rare',
    imageSmall: 'https://example.test/sv3-125.png',
  });
});

test('visual lookup combines collector number and name', async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return { ok: true, async json() { return { data: [] }; } };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await searchCardsByScanHints({
    names: ['Lugia'],
    collectorNumbers: ['009/111'],
    combineNameAndNumber: true,
  });

  const query = decodeURIComponent(new URL(requestedUrl).searchParams.get('q'));
  assert.match(query, /number:"009"/);
  assert.match(query, /name:"Lugia"/);
  assert.match(query, / AND /);
});

test('Farfetch’d manual and scanner lookups avoid apostrophes in API queries', async (t) => {
  const originalFetch = globalThis.fetch;
  const queries = [];
  const pageSizes = [];
  globalThis.fetch = async (url) => {
    const requested = new URL(String(url));
    queries.push(decodeURIComponent(requested.searchParams.get('q')));
    pageSizes.push(requested.searchParams.get('pageSize'));
    return { ok: true, async json() { return { data: [] }; } };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await fetchCardsForPokemon('Farfetch’d', { skipCache: true });
  await searchCardsByScanHints({ names: ['Farfetch\'d'] });
  await searchCardsByScanHints({ names: ['Sirfetch’d'] });

  assert.deepEqual(queries, [
    'name:Farfetch*',
    'name:Farfetch*',
    'name:Sirfetch*',
  ]);
  assert.deepEqual(pageSizes, ['100', '100', '100']);
});

test('scan lookup retries one transient API failure', async (t) => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) return { ok: false, status: 500 };
    return { ok: true, async json() { return { data: [] }; } };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await searchCardsByScanHints({ collectorNumbers: ['4/102'] });
  assert.equal(attempts, 2);
  assert.deepEqual(result.cards, []);
});
