let allPokemon = [];

const GENERATION_NAMES = {
  1: 'Gen I', 2: 'Gen II', 3: 'Gen III', 4: 'Gen IV', 5: 'Gen V',
  6: 'Gen VI', 7: 'Gen VII', 8: 'Gen VIII', 9: 'Gen IX',
};

const GENERATION_RANGES = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1025],
};

const FORM_CATEGORY_LABELS = {
  regional: 'Regional Forms',
  mega: 'Mega Evolutions',
  gmax: 'Gigantamax',
  other: 'Other Forms',
};

const FORM_SUBCATEGORY_LABELS = {};
const FORM_SUBCATEGORY_ICONS = {
  rotom: '🔌', deoxys: '🧬', lycanroc: '🐺', oricorio: '💃',
  necrozma: '🌑', calyrex: '👑', zygarde: '🐍', kyurem: '❄️',
  wormadam: '🐛', basculin: '🐟', greninja: '🥷', ogerpon: '🎭',
  koraidon: '🦎', miraidon: '🤖', terapagos: '🐢',
  pumpkaboo: '🎃', gourgeist: '🎃',
};

async function loadPokemonData() {
  const res = await fetch('data/pokemon.json');
  allPokemon = await res.json();
  return allPokemon;
}

function getAllPokemon() {
  return allPokemon;
}

function getFormCategories() {
  const categories = new Set();
  for (const p of allPokemon) {
    if (p.formCategory) categories.add(p.formCategory);
  }
  return [...categories].sort();
}

function getAlternateFormsByCategory(category) {
  return allPokemon.filter(p => p.formCategory === category);
}

function getFormSubCategories() {
  const subs = new Map();
  for (const p of allPokemon) {
    if (p.formSubCategory && !subs.has(p.formSubCategory)) {
      subs.set(p.formSubCategory, []);
    }
    if (p.formSubCategory) {
      subs.get(p.formSubCategory).push(p);
    }
  }
  return subs;
}

function getAlternateFormsBySubCategory(subCategory) {
  return allPokemon.filter(p => p.formSubCategory === subCategory);
}

function getOtherFormsWithoutSubCategory() {
  return allPokemon.filter(p => p.formCategory === 'other' && !p.formSubCategory);
}

export {
  loadPokemonData, getAllPokemon, getFormCategories, getAlternateFormsByCategory,
  getFormSubCategories, getAlternateFormsBySubCategory, getOtherFormsWithoutSubCategory,
  GENERATION_NAMES, GENERATION_RANGES, FORM_CATEGORY_LABELS,
  FORM_SUBCATEGORY_LABELS, FORM_SUBCATEGORY_ICONS,
};
