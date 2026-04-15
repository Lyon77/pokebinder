const CACHE_PREFIX = 'tcg-cache-';

function getCachedCards(name) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + name.toLowerCase());
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function cacheCards(name, cards) {
  try {
    localStorage.setItem(CACHE_PREFIX + name.toLowerCase(), JSON.stringify(cards));
  } catch { /* localStorage full — silently fail */ }
}

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

async function fetchCardsForPokemon(name) {
  const cached = getCachedCards(name);
  if (cached) return { cards: cached };

  try {
    const q = encodeURIComponent(`name:"${name}"`);
    const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=set.releaseDate&pageSize=250`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const cards = (json.data || []).map(parseCard);
    cacheCards(name, cards);
    return { cards };
  } catch (err) {
    return { cards: [], error: err.message };
  }
}

export { fetchCardsForPokemon };
