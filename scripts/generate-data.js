#!/usr/bin/env node

// Fetches all Pokemon species and forms from PokeAPI and generates data/pokemon.json
// Run: node scripts/generate-data.js

const API_BASE = 'https://pokeapi.co/api/v2';
const BATCH_SIZE = 50;
const DELAY_MS = 200;
const MAX_SPECIES = 1025;

const GENERATION_MAP = {
  'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3,
  'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6,
  'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
};

// Regional form suffixes
const REGIONAL_SUFFIXES = ['-alola', '-galar', '-hisui', '-paldea'];
// Mega form patterns
const MEGA_PATTERNS = ['-mega', '-mega-x', '-mega-y', '-mega-z', '-primal'];
// Gigantamax
const GMAX_PATTERN = '-gmax';

// Forms to skip entirely (cosmetic-only, not meaningful for collection)
const SKIP_PATTERNS = [
  // Pikachu costumes
  'pikachu-original-cap', 'pikachu-hoenn-cap', 'pikachu-sinnoh-cap',
  'pikachu-unova-cap', 'pikachu-kalos-cap', 'pikachu-alola-cap',
  'pikachu-partner-cap', 'pikachu-world-cap',
  'pikachu-rock-star', 'pikachu-belle', 'pikachu-pop-star',
  'pikachu-phd', 'pikachu-libre', 'pikachu-cosplay',
  'pikachu-starter',
  // Unown letters (keep just default)
  ...Array.from({length: 26}, (_, i) => `unown-${String.fromCharCode(97 + i)}`).filter(s => s !== 'unown-a'),
  'unown-exclamation', 'unown-question',
  // Spinda patterns are cosmetic
  // Vivillon patterns
  ...['vivillon-archipelago', 'vivillon-continental', 'vivillon-elegant',
    'vivillon-fancy', 'vivillon-garden', 'vivillon-high-plains',
    'vivillon-icy-snow', 'vivillon-jungle', 'vivillon-marine',
    'vivillon-modern', 'vivillon-monsoon', 'vivillon-ocean',
    'vivillon-poke-ball', 'vivillon-polar', 'vivillon-river',
    'vivillon-sandstorm', 'vivillon-savanna', 'vivillon-sun',
    'vivillon-tundra'],
  // Furfrou trims
  ...['furfrou-dandy', 'furfrou-debutante', 'furfrou-diamond',
    'furfrou-heart', 'furfrou-kabuki', 'furfrou-la-reine',
    'furfrou-matron', 'furfrou-pharaoh', 'furfrou-star'],
  // Alcremie decorations (too many cosmetic combos) - keep forms, skip decorations handled below
  // Minior colors (keep just default meteor + core)
  ...['minior-orange-meteor', 'minior-yellow-meteor', 'minior-green-meteor',
    'minior-blue-meteor', 'minior-indigo-meteor', 'minior-violet-meteor',
    'minior-red', 'minior-orange', 'minior-yellow', 'minior-green',
    'minior-blue', 'minior-indigo', 'minior-violet'],
  // Totem forms
  'raticate-alola-totem', 'marowak-alola-totem', 'mimikyu-busted-totem',
  'mimikyu-totem-disguised', 'mimikyu-totem-busted',
  'gumshoos-totem', 'vikavolt-totem', 'ribombee-totem',
  'araquanid-totem', 'lurantis-totem', 'salazzle-totem',
  'togedemaru-totem', 'kommo-o-totem',
  // Battle-only forms that revert
  'castform-rainy', 'castform-snowy', 'castform-sunny',
  'cherrim-sunshine',
  'darmanitan-zen', 'darmanitan-galar-zen',
  'meloetta-pirouette',
  'aegislash-blade',
  'xerneas-neutral',
  'wishiwashi-school',
  'mimikyu-busted',
  'cramorant-gorging', 'cramorant-gulping',
  'eiscue-noice',
  'morpeko-hangry',
  'zacian-crowned', 'zamazenta-crowned',
  'eternatus-eternamax',
  'palafin-hero',
  'tatsugiri-droopy', 'tatsugiri-stretchy',
  'squawkabilly-blue-plumage', 'squawkabilly-yellow-plumage', 'squawkabilly-white-plumage',
  'maushold-family-of-three',
  'dudunsparce-three-segment',
];

function categorizeForm(formName, speciesName) {
  if (REGIONAL_SUFFIXES.some(s => formName.endsWith(s) || formName.includes(s + '-'))) {
    return 'regional';
  }
  if (MEGA_PATTERNS.some(s => formName.endsWith(s))) {
    return 'mega';
  }
  if (formName.endsWith(GMAX_PATTERN)) {
    return 'gmax';
  }
  return 'other';
}

function humanizeFormName(formName, speciesName) {
  // Remove species prefix
  let suffix = formName.startsWith(speciesName + '-')
    ? formName.slice(speciesName.length + 1)
    : formName;

  if (!suffix || suffix === speciesName) return null;

  // Map known suffixes to human-readable names
  const nameMap = {
    'alola': 'Alolan', 'galar': 'Galarian', 'hisui': 'Hisuian', 'paldea': 'Paldean',
    'mega': 'Mega', 'mega-x': 'Mega X', 'mega-y': 'Mega Y',
    'gmax': 'Gigantamax',
    'origin': 'Origin', 'sky': 'Sky', 'land': 'Land',
    'attack': 'Attack', 'defense': 'Defense', 'speed': 'Speed', 'normal': 'Normal',
    'heat': 'Heat', 'wash': 'Wash', 'frost': 'Frost', 'fan': 'Fan', 'mow': 'Mow',
    'sandy': 'Sandy', 'trash': 'Trash',
    'zen': 'Zen', 'pirouette': 'Pirouette',
    'therian': 'Therian', 'incarnate': 'Incarnate',
    'black': 'Black', 'white': 'White',
    'resolute': 'Resolute', 'ordinary': 'Ordinary',
    'aria': 'Aria', 'blade': 'Blade', 'shield': 'Shield',
    'small': 'Small', 'average': 'Average', 'large': 'Large', 'super': 'Super',
    '10': '10%', '50': '50%', 'complete': 'Complete',
    'midday': 'Midday', 'midnight': 'Midnight', 'dusk': 'Dusk',
    'solo': 'Solo', 'school': 'School',
    'original': 'Original', 'altered': 'Altered',
    'confined': 'Confined', 'unbound': 'Unbound',
    'baile': 'Baile', 'pom-pom': 'Pom-Pom', 'pau': "Pa'u", 'sensu': 'Sensu',
    'disguised': 'Disguised',
    'dusk-mane': 'Dusk Mane', 'dawn-wings': 'Dawn Wings', 'ultra': 'Ultra',
    'low-key': 'Low Key', 'amped': 'Amped',
    'ice': 'Ice Rider', 'shadow': 'Shadow Rider',
    'single-strike': 'Single Strike', 'rapid-strike': 'Rapid Strike',
    'bloodmoon': 'Blood Moon',
    'cornerstone': 'Cornerstone', 'wellspring': 'Wellspring', 'hearthflame': 'Hearthflame',
    'teal': 'Teal Mask', 'terastal': 'Terastal',
    'combat': 'Combat', 'blaze': 'Blaze', 'aqua': 'Aqua',
    'stellar': 'Stellar',
    'family-of-four': 'Family of Four',
    'three-segment': 'Three-Segment',
    'curly': 'Curly', 'droopy': 'Droopy', 'stretchy': 'Stretchy',
    'green-plumage': 'Green Plumage',
    'blue-plumage': 'Blue Plumage',
    'yellow-plumage': 'Yellow Plumage',
    'white-plumage': 'White Plumage',
    'roaming': 'Roaming', 'apex-build': 'Apex Build',
    'primal': 'Primal',
  };

  // Try exact match first
  if (nameMap[suffix]) return nameMap[suffix];

  // Capitalize as fallback
  return suffix.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function fetchBatch(urls) {
  return Promise.all(urls.map(url => fetchJSON(url)));
}

async function main() {
  console.log('Fetching species list...');
  const speciesList = await fetchJSON(`${API_BASE}/pokemon-species?limit=${MAX_SPECIES}`);
  console.log(`Got ${speciesList.results.length} species`);

  const allEntries = [];
  const speciesUrls = speciesList.results.map(s => s.url);

  // Fetch species details in batches
  for (let i = 0; i < speciesUrls.length; i += BATCH_SIZE) {
    const batch = speciesUrls.slice(i, i + BATCH_SIZE);
    console.log(`Fetching species ${i + 1}-${Math.min(i + BATCH_SIZE, speciesUrls.length)}...`);
    const speciesData = await fetchBatch(batch);

    // Collect pokemon form URLs from varieties
    const pokemonUrls = [];
    const pokemonSpeciesMap = new Map();

    for (const species of speciesData) {
      for (const variety of species.varieties) {
        pokemonUrls.push(variety.pokemon.url);
        pokemonSpeciesMap.set(variety.pokemon.url, species);
      }
    }

    // Fetch pokemon details in sub-batches
    for (let j = 0; j < pokemonUrls.length; j += BATCH_SIZE) {
      const pokeBatch = pokemonUrls.slice(j, j + BATCH_SIZE);
      let pokeData;
      try {
        pokeData = await fetchBatch(pokeBatch);
      } catch (e) {
        // Retry individually on batch failure
        console.log(`  Batch failed, retrying individually...`);
        pokeData = [];
        for (const url of pokeBatch) {
          try {
            pokeData.push(await fetchJSON(url));
          } catch (e2) {
            console.log(`  Skipping ${url}: ${e2.message}`);
          }
        }
      }

      for (let k = 0; k < pokeData.length; k++) {
        const pokemon = pokeData[k];
        const species = pokemonSpeciesMap.get(pokeBatch[k]);
        const formId = pokemon.name;

        // Skip unwanted forms
        if (SKIP_PATTERNS.includes(formId)) continue;

        const genName = species.generation.name;
        const generation = GENERATION_MAP[genName] || 0;
        const isDefault = species.varieties.find(v => v.pokemon.name === formId)?.is_default || false;

        const speciesName = species.name;
        const displayName = species.names.find(n => n.language.name === 'en')?.name || speciesName;
        const formName = isDefault ? null : humanizeFormName(formId, speciesName);
        const formCategory = isDefault ? null : categorizeForm(formId, speciesName);
        const types = pokemon.types
          .sort((a, b) => a.slot - b.slot)
          .map(t => t.type.name);

        allEntries.push({
          id: species.id,
          name: displayName,
          formName,
          formId,
          generation,
          types,
          isDefault,
          formCategory,
          formSubCategory: null, // assigned in post-processing below
        });
      }

      if (j + BATCH_SIZE < pokemonUrls.length) await sleep(DELAY_MS);
    }

    if (i + BATCH_SIZE < speciesUrls.length) await sleep(DELAY_MS);
  }

  // Assign formSubCategory for "other" forms: group by species where species has 2+ "other" alt forms
  const otherBySpecies = new Map();
  for (const e of allEntries) {
    if (e.formCategory === 'other') {
      if (!otherBySpecies.has(e.id)) otherBySpecies.set(e.id, []);
      otherBySpecies.get(e.id).push(e);
    }
  }
  for (const [speciesId, forms] of otherBySpecies) {
    if (forms.length >= 2) {
      const subCat = forms[0].formId.split('-')[0]; // species name as sub-category key
      for (const f of forms) {
        f.formSubCategory = subCat;
      }
    }
  }

  // Sort: by Pokedex number, then default form first, then alphabetical formId
  allEntries.sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.formId.localeCompare(b.formId);
  });

  const outputPath = new URL('../data/pokemon.json', import.meta.url).pathname;
  const { writeFileSync } = await import('node:fs');
  writeFileSync(outputPath, JSON.stringify(allEntries, null, 2));

  const baseCount = allEntries.filter(e => e.isDefault).length;
  const altCount = allEntries.filter(e => !e.isDefault).length;
  const categories = {};
  for (const e of allEntries) {
    if (e.formCategory) {
      categories[e.formCategory] = (categories[e.formCategory] || 0) + 1;
    }
  }

  console.log(`\nDone! Wrote ${allEntries.length} entries to data/pokemon.json`);
  console.log(`  Base forms: ${baseCount}`);
  console.log(`  Alternate forms: ${altCount}`);
  console.log(`  Categories:`, categories);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
