import { getCachedCards, cacheCards, getAllCachedCards } from './db.js';
import { variantsForCard, ensureOverridesLoaded } from './variant-rules.js';
import {
  buildMasterSlotId,
  numberVariantsForCard,
  setDisplayNumberVariant,
} from './master-slots.js';

const VARIANT_ORDER = ['normal', 'holofoil', '1stEditionNormal', '1stEditionHolofoil', 'reverseHolofoil', 'default'];

const VARIANT_LABELS = {
  normal: 'Normal',
  reverseHolofoil: 'Rev. Holo',
  holofoil: 'Holo',
  '1stEditionHolofoil': '1st Ed. Holo',
  '1stEditionNormal': '1st Ed.',
  default: '',
};

function getVariantLabel(variant) {
  return VARIANT_LABELS[variant] || variant;
}

function parseCard(raw) {
  const num = raw.number || '';
  const setTotal = raw.set ? (raw.set.printedTotal || raw.set.total || '') : '';
  return {
    cardId: raw.id,
    name: raw.name,
    number: setTotal ? `${num}/${setTotal}` : num,
    setName: raw.set ? raw.set.name : '',
    setId: raw.set ? raw.set.id : '',
    setYear: raw.set && raw.set.releaseDate ? raw.set.releaseDate.slice(0, 4) : '',
    rarity: raw.rarity || '',
    imageSmall: raw.images ? raw.images.small : '',
  };
}

function normalizeTcgName(name) {
  return String(name || '').replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
}

// The API currently returns a server error for exact Farfetch'd/Sirfetch'd
// phrase queries. Their prefixes are unique Pokemon names and return the same
// intended card sets without sending an apostrophe through the Lucene parser.
function apostrophePokemonPrefixQuery(name) {
  const match = normalizeTcgName(name).match(/^(Farfetch|Sirfetch)'d$/i);
  return match ? `name:${match[1]}*` : null;
}

// pokemontcg.io stores Nidoran cards inconsistently — most are "Nidoran ♀" (with
// a space) but a few (e.g. Team Rocket's) are "Nidoran♀". Lucene phrase matching
// distinguishes these, so query both forms when the name contains ♀ or ♂.
function buildNameQuery(name) {
  const normalized = normalizeTcgName(name);
  const prefixQuery = apostrophePokemonPrefixQuery(normalized);
  if (prefixQuery) return prefixQuery;
  if (!/[♀♂]/.test(normalized)) return `name:"${normalized}"`;
  const spaced = normalized.replace(/\s*([♀♂])/, ' $1');
  const unspaced = normalized.replace(/\s*([♀♂])/, '$1');
  if (spaced === unspaced) return `name:"${normalized}"`;
  return `name:"${unspaced}" OR name:"${spaced}"`;
}

async function fetchCardsForPokemon(name, { skipCache = false } = {}) {
  if (!skipCache) {
    try {
      const cached = await getCachedCards(name);
      if (Array.isArray(cached) && cached.length > 0) return { cards: cached };
    } catch { /* ignore cache errors */ }
  }

  try {
    const nameQuery = buildNameQuery(name);
    const pageSize = apostrophePokemonPrefixQuery(name) ? 100 : 250;
    const q = encodeURIComponent(nameQuery);
    const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=set.releaseDate&pageSize=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const cards = (json.data || []).map(parseCard);
    if (cards.length > 0) {
      try { await cacheCards(name, cards); } catch { /* ignore cache errors */ }
    }
    return { cards };
  } catch (err) {
    return { cards: [], error: err.message };
  }
}

function escapeLucenePhrase(value) {
  return String(value || '').replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1');
}

function scanNumberVariants(value) {
  const numerator = String(value || '').split('/')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!numerator) return [];
  const withoutZeros = numerator.replace(/^([A-Z]*?)0+(\d)/, '$1$2');
  const numericSuffix = numerator.match(/(\d+[A-Z]?)$/)?.[1] || '';
  const compactNumeric = numericSuffix.replace(/^0+(?=\d)/, '');
  return [...new Set([numerator, withoutZeros, numericSuffix, compactNumeric].filter(Boolean))];
}

async function fetchScanResponse(url) {
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch(url);
    if (response.ok) return response;
    const transient = response.status === 429 || response.status >= 500;
    if (!transient || attempt === 1) break;
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`API error: ${response?.status || 'network failure'}`);
}

async function searchCardsByScanHints({ names = [], collectorNumbers = [], combineNameAndNumber = false } = {}) {
  const numberTerms = collectorNumbers
    .flatMap(scanNumberVariants)
    .slice(0, 4)
    .map(number => `number:"${escapeLucenePhrase(number)}"`);

  const usableNames = names
    .map(name => String(name || '').replace(/\s+/g, ' ').trim())
    .filter(name => name.length >= 2 && name.length <= 40)
    .slice(0, 3);

  let query = '';
  if (numberTerms.length > 0) {
    const numberQuery = numberTerms.length === 1 ? numberTerms[0] : `(${numberTerms.join(' OR ')})`;
    if (combineNameAndNumber && usableNames.length > 0) {
      const nameTerms = usableNames.map(name => (
        apostrophePokemonPrefixQuery(name)
        || `name:"${escapeLucenePhrase(normalizeTcgName(name))}"`
      ));
      const nameQuery = nameTerms.length === 1 ? nameTerms[0] : `(${nameTerms.join(' OR ')})`;
      query = `${numberQuery} AND ${nameQuery}`;
    } else {
      query = numberQuery;
    }
  } else if (usableNames.length > 0) {
    const nameTerms = usableNames.map(name => (
      apostrophePokemonPrefixQuery(name)
      || `name:"${escapeLucenePhrase(normalizeTcgName(name))}"`
    ));
    query = nameTerms.length === 1 ? nameTerms[0] : `(${nameTerms.join(' OR ')})`;
  }

  if (!query) return { cards: [] };

  try {
    const q = encodeURIComponent(query);
    const pageSize = usableNames.some(name => apostrophePokemonPrefixQuery(name)) ? 100 : 250;
    const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=-set.releaseDate&pageSize=${pageSize}`;
    const res = await fetchScanResponse(url);
    const json = await res.json();
    return { cards: (json.data || []).map(parseCard) };
  } catch (err) {
    return { cards: [], error: err.message };
  }
}

async function fetchSets(query) {
  try {
    const q = encodeURIComponent(`name:"*${query}*"`);
    const url = `https://api.pokemontcg.io/v2/sets?q=${q}&orderBy=-releaseDate&pageSize=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    return {
      sets: (json.data || []).map(s => ({
        id: s.id,
        name: s.name,
        releaseDate: s.releaseDate || '',
        year: s.releaseDate ? s.releaseDate.slice(0, 4) : '',
        total: s.total || 0,
        printedTotal: s.printedTotal || 0,
      })),
    };
  } catch (err) {
    return { sets: [], error: err.message };
  }
}

async function fetchSetCards(setId) {
  const allCards = [];
  let page = 1;
  const pageSize = 250;
  let expectedTotal = null;

  try {
    while (true) {
      const q = encodeURIComponent(`set.id:${setId}`);
      const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=number&pageSize=${pageSize}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const cards = json.data;
      const total = json.totalCount;
      if (!Array.isArray(cards) || !Number.isInteger(total) || total <= 0 || cards.length === 0) {
        throw new Error('API returned no complete card list');
      }
      if (expectedTotal === null) expectedTotal = total;
      if (total !== expectedTotal) throw new Error('API card count changed between pages');
      allCards.push(...cards);
      if (allCards.length === expectedTotal) break;
      if (allCards.length > expectedTotal || cards.length < pageSize) {
        throw new Error(`API returned only ${allCards.length} of ${expectedTotal} cards`);
      }
      page++;
    }
    return { cards: allCards };
  } catch (err) {
    return { cards: [], error: err.message };
  }
}

function expandVariants(rawCards) {
  const slots = [];
  for (const raw of rawCards) {
    const card = parseCard(raw);
    const variants = variantsForCard(raw);
    const numberVariants = numberVariantsForCard(raw);
    const cardNumbers = numberVariants.length > 0 ? numberVariants : [null];

    if (variants && variants.length > 0) {
      variants.sort((a, b) => {
        const ai = VARIANT_ORDER.indexOf(a);
        const bi = VARIANT_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }

    for (const numberVariant of cardNumbers) {
      for (const variant of variants && variants.length > 0 ? variants : ['default']) {
        slots.push({
          ...card,
          ...(numberVariant ? {
            numberVariant,
            number: setDisplayNumberVariant(card.number, numberVariant),
          } : {}),
          slotId: buildMasterSlotId(card.cardId, variant, numberVariant),
          variant,
          rawNumber: raw.number || '',
        });
      }
    }
  }

  // Parse card number into [prefix, numeric] for sorting
  // "1" → ["", 1], "H1" → ["H", 1], "TG1" → ["TG", 1], "SH5" → ["SH", 5]
  function parseCardNum(raw) {
    const match = (raw || '').match(/^([A-Za-z]*)(\d+)$/);
    if (!match) return [raw || '', 0];
    return [match[1].toUpperCase(), parseInt(match[2], 10)];
  }

  // Sort: pure numeric first, then prefixed groups alphabetically, then numeric within group, then variant
  slots.sort((a, b) => {
    const [prefA, numA] = parseCardNum(a.rawNumber);
    const [prefB, numB] = parseCardNum(b.rawNumber);
    // Pure numeric (empty prefix) sorts before any prefix
    if (prefA !== prefB) {
      if (!prefA) return -1;
      if (!prefB) return 1;
      return prefA.localeCompare(prefB);
    }
    if (numA !== numB) return numA - numB;
    if (a.numberVariant !== b.numberVariant) {
      if (!a.numberVariant) return -1;
      if (!b.numberVariant) return 1;
      return a.numberVariant.localeCompare(b.numberVariant);
    }
    const vi = (v) => { const i = VARIANT_ORDER.indexOf(v); return i === -1 ? 99 : i; };
    return vi(a.variant) - vi(b.variant);
  });

  // Remove rawNumber — only needed for sorting, not storage
  for (const slot of slots) delete slot.rawNumber;

  return slots;
}

async function hydrateCards(cardIds, { localCards, networkIds } = {}) {
  const result = new Map();
  if (!Array.isArray(cardIds) || cardIds.length === 0) return result;

  const unique = [...new Set(cardIds.filter(Boolean))];
  const remaining = new Set(unique);

  // Local collection records hold the full card metadata already — prefer them
  // over the name-keyed cache and the network. A card is considered usable if
  // it carries `imageSmall`; stub entries ({ cardId } only) fall through.
  if (localCards instanceof Map) {
    for (const id of unique) {
      const card = localCards.get(id);
      if (card && card.imageSmall) {
        result.set(id, card);
        remaining.delete(id);
      }
    }
  }

  if (remaining.size === 0) return result;

  try {
    const allCached = await getAllCachedCards();
    for (const card of allCached) {
      if (remaining.has(card.cardId)) {
        result.set(card.cardId, card);
        remaining.delete(card.cardId);
      }
    }
  } catch { /* cache unavailable, proceed to API */ }

  if (remaining.size === 0) return result;

  // When networkIds is provided, only cards in that allowlist are eligible for
  // the network fallback. Anything else that couldn't be resolved locally is
  // left unresolved — the caller will render it as a stub placeholder and fill
  // it in via a follow-up pass without the networkIds restriction.
  const allowNetwork = Array.isArray(networkIds) ? new Set(networkIds) : null;
  const missing = [...remaining].filter(id => !allowNetwork || allowNetwork.has(id));
  if (missing.length === 0) return result;

  const batchSize = 40;
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const q = encodeURIComponent(batch.map(id => `id:"${id}"`).join(' OR '));
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=${q}&pageSize=250`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      for (const raw of (json.data || [])) {
        const card = parseCard(raw);
        result.set(card.cardId, card);
      }
      // NOTE: we intentionally do NOT write these into the pokemon-name
      // TCG cache. That cache holds the "all cards for this Pokemon" list
      // populated by fetchCardsForPokemon; writing partial id-hydrated
      // results here would poison it with a subset of cards.
    } catch { /* ignore batch errors; remaining cards stay unhydrated */ }
  }

  return result;
}

export { fetchCardsForPokemon, searchCardsByScanHints, fetchSets, fetchSetCards, expandVariants, getVariantLabel, hydrateCards, ensureOverridesLoaded, VARIANT_LABELS };
