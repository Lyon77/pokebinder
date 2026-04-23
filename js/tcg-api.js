import { getCachedCards, cacheCards, getAllCachedCards } from './db.js';

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

async function fetchCardsForPokemon(name, { skipCache = false } = {}) {
  if (!skipCache) {
    try {
      const cached = await getCachedCards(name);
      if (cached) return { cards: cached };
    } catch { /* ignore cache errors */ }
  }

  try {
    const q = encodeURIComponent(`name:"${name}"`);
    const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=set.releaseDate&pageSize=250`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const cards = (json.data || []).map(parseCard);
    try { await cacheCards(name, cards); } catch { /* ignore cache errors */ }
    return { cards };
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

  try {
    while (true) {
      const q = encodeURIComponent(`set.id:${setId}`);
      const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=number&pageSize=${pageSize}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const cards = json.data || [];
      allCards.push(...cards);
      if (allCards.length >= (json.totalCount || 0) || cards.length < pageSize) break;
      page++;
    }
    return { cards: allCards };
  } catch (err) {
    return { cards: allCards, error: err.message };
  }
}

function expandVariants(rawCards) {
  const slots = [];
  for (const raw of rawCards) {
    const card = parseCard(raw);
    const prices = raw.tcgplayer && raw.tcgplayer.prices ? raw.tcgplayer.prices : {};
    const variants = Object.keys(prices);

    if (variants.length === 0) {
      slots.push({
        ...card,
        slotId: `${card.cardId}:default`,
        variant: 'default',
        rawNumber: raw.number || '',
      });
    } else {
      // Sort variants by defined order
      variants.sort((a, b) => {
        const ai = VARIANT_ORDER.indexOf(a);
        const bi = VARIANT_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      for (const variant of variants) {
        slots.push({
          ...card,
          slotId: `${card.cardId}:${variant}`,
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

export { fetchCardsForPokemon, fetchSets, fetchSetCards, expandVariants, getVariantLabel, hydrateCards, VARIANT_LABELS };
