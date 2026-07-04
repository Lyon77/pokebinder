// Deterministic variant derivation for TCG cards.
//
// Why this exists: pokemontcg.io derives variants from tcgplayer.prices keys,
// which are incomplete for older sets (e.g. Expedition reverse holos). This
// module produces the variant list from card.rarity + set.releaseDate + a
// per-set table for original-era 1st Edition flags, with a JSON override file
// for known exceptions.

const OVERRIDES_URL = './data/variant-overrides.json';

// Original-era sets (released before Legendary Collection, 2002-05-24) that
// shipped with 1st Edition prints in English. Sets in this era NOT in this
// list (e.g. Base Set 2, Southern Islands, Wizards Promos) had no 1st Ed.
const FIRST_ED_SETS = new Set([
  'base1',  // Base Set
  'base2',  // Jungle
  'base3',  // Fossil
  'base5',  // Team Rocket
  'gym1',   // Gym Heroes
  'gym2',   // Gym Challenge
  'neo1',   // Neo Genesis
  'neo2',   // Neo Discovery
  'neo3',   // Neo Revelation
  'neo4',   // Neo Destiny
]);

// Era cutoffs by ISO release date.
// - preReverse: pre-Legendary Collection (no reverse foils)
// - earlyReverse: LC + e-Card era (reverse foils on Common/Uncommon/Rare;
//   Rare Holo and Rare Secret have set-specific reverse-foil exceptions)
// - modern: EX onwards (reverse foils on Common/Uncommon/Rare AND Rare Holo)
const LC_RELEASE = '2002-05-24';
const EX_RELEASE = '2003-06-01';

let overridesPromise = null;
let overridesMap = {};

function startLoadingOverrides() {
  if (overridesPromise) return overridesPromise;
  overridesPromise = fetch(OVERRIDES_URL)
    .then(r => (r.ok ? r.json() : {}))
    .then(json => {
      overridesMap = (json && typeof json === 'object') ? json : {};
      return overridesMap;
    })
    .catch(() => {
      overridesMap = {};
      return overridesMap;
    });
  return overridesPromise;
}

async function ensureOverridesLoaded() {
  await startLoadingOverrides();
}

// pokemontcg.io returns releaseDate as "YYYY/MM/DD"; normalise to "YYYY-MM-DD"
// so lexicographic comparison against ISO cutoffs is correct across the
// '/' vs '-' boundary (where '/' > '-' would otherwise mis-rank dates).
function normaliseDate(d) {
  return (d || '').replace(/\//g, '-');
}

function getEra(releaseDate, setId) {
  const date = normaliseDate(releaseDate);
  if (date && date < LC_RELEASE) return 'preReverse';
  if (date && date < EX_RELEASE) return 'earlyReverse';
  // Legendary Collection itself releases on LC_RELEASE; treat as earlyReverse.
  if (setId === 'base6') return 'earlyReverse';
  return 'modern';
}

function rarityCategory(rarity) {
  switch (rarity) {
    case 'Common':    return 'common';
    case 'Uncommon':  return 'uncommon';
    case 'Rare':      return 'rare';
    case 'Rare Holo': return 'rareHolo';
    case 'Rare Secret': return 'rareSecret';
    default:          return 'special'; // EX, GX, V, Ultra, Secret, Promo, etc.
  }
}

function variantsForEra(era, category, setId) {
  if (era === 'preReverse') {
    const has1stEd = FIRST_ED_SETS.has(setId);
    if (category === 'rareHolo' || category === 'rareSecret' || category === 'special') {
      return has1stEd ? ['1stEditionHolofoil', 'holofoil'] : ['holofoil'];
    }
    // common, uncommon, rare
    return has1stEd ? ['1stEditionNormal', 'normal'] : ['normal'];
  }

  if (era === 'earlyReverse') {
    if (setId === 'ecard2' && (category === 'rareHolo' || category === 'rareSecret')) {
      return ['holofoil'];
    }
    if (setId === 'ecard3' && category === 'rareHolo') return ['holofoil'];
    if (setId === 'ecard3' && category === 'rareSecret') {
      return ['holofoil', 'reverseHolofoil'];
    }
    if (category === 'rareSecret' || category === 'special') return ['holofoil'];
    if (category === 'rareHolo') return ['holofoil', 'reverseHolofoil'];
    return ['normal', 'reverseHolofoil'];
  }

  // modern
  if (category === 'rareSecret' || category === 'special') return ['holofoil'];
  if (category === 'rareHolo') return ['holofoil', 'reverseHolofoil'];
  return ['normal', 'reverseHolofoil'];
}

// Returns the canonical variant list for a card. Reads card.id, card.rarity,
// card.set.id, card.set.releaseDate. Falls back to ['default'] only when there
// is no rarity AND no era hint to work with.
function variantsForCard(card) {
  if (!card) return ['default'];

  const cardId = card.id || '';
  if (cardId && overridesMap[cardId]) {
    const override = overridesMap[cardId];
    if (Array.isArray(override) && override.length > 0) return [...override];
  }

  const set = card.set || {};
  const releaseDate = set.releaseDate || '';
  const setId = set.id || '';
  const rarity = card.rarity || '';

  if (!rarity && !releaseDate && !setId) return ['default'];

  const era = getEra(releaseDate, setId);
  const category = rarityCategory(rarity);
  return variantsForEra(era, category, setId);
}

// Browser entry: kick off override loading immediately. In Node (tests), the
// fetch will fail silently and overridesMap stays empty, which is fine.
if (typeof fetch === 'function') startLoadingOverrides();

export { variantsForCard, ensureOverridesLoaded, FIRST_ED_SETS };
