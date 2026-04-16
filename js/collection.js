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

const VARIANT_SORT_ORDER = ['normal', 'holofoil', '1stEditionNormal', '1stEditionHolofoil', 'reverseHolofoil', 'default'];

function parseCardNum(raw) {
  // Handle "H1/144", "1/144", "TG1/30", etc.
  const num = (raw || '').split('/')[0];
  const match = num.match(/^([A-Za-z]*)(\d+)$/);
  if (!match) return [num, 0];
  return [match[1].toUpperCase(), parseInt(match[2], 10)];
}

function buildMasterCollection(state) {
  const slots = (state.slotList || []).map((slot, i) => ({
    ...slot,
    formId: slot.slotId,
    id: parseCardNum(slot.number)[1] || (i + 1),
    collectionNum: i + 1,
    generation: 0,
    isDefault: true,
    formName: null,
    formCategory: null,
    formSubCategory: null,
    types: [],
  }));

  // Sort at display time: numeric cards first, then prefixed (H, TG, etc.), then variant order
  slots.sort((a, b) => {
    // Group by set first (preserve set ordering from slotList)
    if (a.setId !== b.setId) return 0; // stable sort preserves original set grouping
    const [prefA, numA] = parseCardNum(a.number);
    const [prefB, numB] = parseCardNum(b.number);
    if (prefA !== prefB) {
      if (!prefA) return -1;
      if (!prefB) return 1;
      return prefA.localeCompare(prefB);
    }
    if (numA !== numB) return numA - numB;
    const vi = (v) => { const idx = VARIANT_SORT_ORDER.indexOf(v); return idx === -1 ? 99 : idx; };
    return vi(a.variant) - vi(b.variant);
  });

  // Reassign collection numbers after sort
  for (let i = 0; i < slots.length; i++) slots[i].collectionNum = i + 1;

  return slots;
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
    const bookSets = book.sets || [];
    const setIds = new Set(bookSets);
    const matching = fullCollection.filter(p => setIds.has(p.setId));
    // Sort by the order sets appear in the book
    const setOrder = new Map(bookSets.map((id, i) => [id, i]));
    filtered = matching.sort((a, b) => (setOrder.get(a.setId) || 0) - (setOrder.get(b.setId) || 0));
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
