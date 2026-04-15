import { getAllPokemon } from './data.js';

function buildCollection(state) {
  const all = getAllPokemon();
  const active = all.filter(p => {
    if (p.isDefault) return true;
    if (state.disabledCategories.has(p.formCategory)) return false;
    if (p.formSubCategory && state.disabledCategories.has(p.formSubCategory)) return false;
    if (state.excludedForms.has(p.formId)) return false;
    return true;
  });

  // Assign collection numbers (1-based sequential)
  for (let i = 0; i < active.length; i++) {
    active[i] = { ...active[i], collectionNum: i + 1 };
  }

  return active;
}

function buildBookCollection(fullCollection, bookGenerations) {
  const genSet = new Set(bookGenerations);
  const filtered = fullCollection.filter(p => genSet.has(p.generation));

  // Assign book-specific numbers (1-based sequential)
  return filtered.map((p, i) => ({ ...p, bookNum: i + 1 }));
}

export { buildCollection, buildBookCollection };
