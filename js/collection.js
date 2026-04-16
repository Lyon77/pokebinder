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
    id: parseInt(slot.number, 10) || (i + 1),
    collectionNum: i + 1,
    generation: 0,
    isDefault: true,
    formName: null,
    formCategory: null,
    formSubCategory: null,
    types: [],
  }));
}

function buildFreestyleCollection(state) {
  const [cols, rows] = (state.layout || '3x3').split('x').map(Number);
  const perPage = cols * rows;
  const rawSlots = state.slots || [];

  // Find last filled slot index
  let lastFilled = -1;
  for (let i = rawSlots.length - 1; i >= 0; i--) {
    if (rawSlots[i]) { lastFilled = i; break; }
  }

  // Minimum 3 pages, or 2 pages past the last filled slot's page
  const lastFilledPage = lastFilled >= 0 ? Math.floor(lastFilled / perPage) : -1;
  const totalPages = Math.max(3, lastFilledPage + 3);
  const totalSlots = totalPages * perPage;

  // Expand slots array if needed (persisted array may be smaller)
  const slots = new Array(totalSlots).fill(null);
  for (let i = 0; i < rawSlots.length && i < totalSlots; i++) {
    slots[i] = rawSlots[i];
  }

  // Update state.slots if it grew
  if (slots.length > rawSlots.length) {
    state.slots = slots;
  }

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
