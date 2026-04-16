import { getAllPokemon } from './data.js';

function buildCollection(state) {
  if (state.type === 'master') {
    return buildMasterCollection(state);
  }
  if (state.type === 'freestyle') {
    return buildFreestyleCollection(state);
  }
  return buildPokedexCollection(state);
}

function buildPokedexCollection(state) {
  const all = getAllPokemon();
  const genSet = new Set(state.generations || [1,2,3,4,5,6,7,8,9]);

  const active = all.filter(p => {
    if (!genSet.has(p.generation)) return false;
    if (p.isDefault) return true;
    if (state.disabledCategories && state.disabledCategories.has(p.formCategory)) return false;
    if (p.formSubCategory && state.disabledCategories && state.disabledCategories.has(p.formSubCategory)) return false;
    if (state.excludedForms && state.excludedForms.has(p.formId)) return false;
    return true;
  });

  for (let i = 0; i < active.length; i++) {
    active[i] = { ...active[i], collectionNum: i + 1 };
  }
  return active;
}

function buildMasterCollection(state) {
  const slots = state.slotList || [];
  return slots.map((slot, i) => ({
    ...slot,
    formId: slot.slotId,
    id: slot.number ? parseInt(slot.number, 10) || (i + 1) : i + 1,
    collectionNum: i + 1,
    generation: 0, // not applicable
    isDefault: true,
    formName: null,
    formCategory: null,
    formSubCategory: null,
    types: [],
  }));
}

function buildFreestyleCollection(state) {
  const slots = state.slots || [];
  return slots.map((slot, i) => {
    if (!slot) {
      return {
        formId: String(i),
        slotIndex: i,
        id: i + 1,
        name: '',
        formName: null,
        collectionNum: i + 1,
        generation: 0,
        isDefault: true,
        formCategory: null,
        formSubCategory: null,
        types: [],
        isEmpty: true,
      };
    }
    return {
      ...slot,
      formId: String(i),
      slotIndex: i,
      id: i + 1,
      collectionNum: i + 1,
      generation: 0,
      isDefault: true,
      formName: null,
      formCategory: null,
      formSubCategory: null,
      types: [],
      isEmpty: false,
    };
  });
}

function buildBookCollection(fullCollection, book, collectionType) {
  let filtered;

  if (collectionType === 'master') {
    const setIds = new Set(book.sets || []);
    filtered = fullCollection.filter(p => setIds.has(p.setId));
  } else if (collectionType === 'freestyle') {
    // Freestyle has no books — return full collection
    filtered = fullCollection;
  } else {
    // Pokedex
    const genSet = new Set(book.generations || []);
    filtered = fullCollection.filter(p => genSet.has(p.generation));
  }

  return filtered.map((p, i) => ({ ...p, bookNum: i + 1 }));
}

export { buildCollection, buildBookCollection };
