import { getCachedCards, cacheCards } from './db.js';

const VARIANT_ORDER = ['normal', '1stEditionNormal', 'reverseHolofoil', 'holofoil', '1stEditionHolofoil', 'default'];

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

  // Sort by card number (numeric), then variant order
  slots.sort((a, b) => {
    const numA = parseInt(a.rawNumber, 10) || 0;
    const numB = parseInt(b.rawNumber, 10) || 0;
    if (numA !== numB) return numA - numB;
    const vi = (v) => { const i = VARIANT_ORDER.indexOf(v); return i === -1 ? 99 : i; };
    return vi(a.variant) - vi(b.variant);
  });

  // Remove rawNumber — only needed for sorting, not storage
  for (const slot of slots) delete slot.rawNumber;

  return slots;
}

export { fetchCardsForPokemon, fetchSets, fetchSetCards, expandVariants, getVariantLabel, VARIANT_LABELS };
