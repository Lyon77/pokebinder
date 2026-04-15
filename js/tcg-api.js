import { getCachedCards, cacheCards } from './db.js';

function parseCard(raw) {
  const num = raw.number || '';
  const setTotal = raw.set ? (raw.set.printedTotal || raw.set.total || '') : '';
  return {
    cardId: raw.id,
    name: raw.name,
    number: setTotal ? `${num}/${setTotal}` : num,
    setName: raw.set ? raw.set.name : '',
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

export { fetchCardsForPokemon };
