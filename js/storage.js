import { getCollection, saveCollection, deleteCollection, getAllCollectionsFull } from './db.js';
import { scheduleSave, isSyncConfigured } from './sync.js';
import { hydrateCards } from './tcg-api.js';

const SETTINGS_KEY = 'pokebinder-settings';
const ACTIVE_COLLECTION_KEY = 'pokebinder-active-collection';

const DEFAULT_COLLECTION_ID = 'living-dex';
const ALL_GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DEFAULT_BOOKS = [
  { generations: [...ALL_GENERATIONS] },
];

let skipSync = false;
let activeCollectionId = localStorage.getItem(ACTIVE_COLLECTION_KEY) || DEFAULT_COLLECTION_ID;

function getActiveCollectionId() { return activeCollectionId; }

function setActiveCollectionId(id) {
  activeCollectionId = id;
  localStorage.setItem(ACTIVE_COLLECTION_KEY, id);
}

function defaultCollectionRecord() {
  return {
    id: DEFAULT_COLLECTION_ID,
    name: 'Living Dex',
    type: 'pokedex',
    layout: '3x3',
    caught: [],
    books: [...DEFAULT_BOOKS],
    // Pokedex-specific
    generations: [...ALL_GENERATIONS],
    cardSelections: {},
    disabledCategories: [],
    excludedForms: [],
  };
}

function recordToState(record) {
  const type = record.type || 'pokedex';
  const state = {
    collectionId: record.id,
    collectionName: record.name,
    type,
    layout: record.layout || '3x3',
    caught: new Set(record.caught || []),
    books: Array.isArray(record.books) && record.books.length > 0
      ? record.books
      : [...DEFAULT_BOOKS],
  };

  if (type === 'pokedex') {
    state.generations = record.generations || [...ALL_GENERATIONS];
    state.cardSelections = record.cardSelections || {};
    state.disabledCategories = new Set(record.disabledCategories || []);
    state.excludedForms = new Set(record.excludedForms || []);
  } else if (type === 'master') {
    state.sets = record.sets || [];
    state.slotList = record.slotList || [];
  } else if (type === 'freestyle') {
    state.slots = record.slots || [];
  }

  return state;
}

function stateToRecord(state) {
  const type = state.type || 'pokedex';
  const record = {
    id: state.collectionId || activeCollectionId,
    name: state.collectionName || 'Collection',
    type,
    layout: state.layout || '3x3',
    caught: [...state.caught],
    books: state.books,
  };

  if (type === 'pokedex') {
    record.generations = state.generations || [...ALL_GENERATIONS];
    record.cardSelections = state.cardSelections || {};
    record.disabledCategories = [...(state.disabledCategories || [])];
    record.excludedForms = [...(state.excludedForms || [])];
  } else if (type === 'master') {
    record.sets = state.sets || [];
    record.slotList = state.slotList || [];
  } else if (type === 'freestyle') {
    record.slots = state.slots || [];
  }

  return record;
}

// --- Settings (localStorage) ---

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { binderFlow: parsed.binderFlow || 'page' };
    }
  } catch { /* ignore */ }
  return { binderFlow: 'page' };
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- State (IndexedDB) ---

async function loadState() {
  let record = await getCollection(activeCollectionId);
  if (!record) {
    record = defaultCollectionRecord();
    await saveCollection(record);
  }
  const state = recordToState(record);
  const settings = loadSettings();
  state.binderFlow = settings.binderFlow;
  return state;
}

async function saveState(state) {
  const record = stateToRecord(state);
  await saveCollection(record);
  await pushBundle(state);
}

async function currentBundleObject(state) {
  const collections = await getAllCollectionsFull();
  const settings = { binderFlow: (state && state.binderFlow) || loadSettings().binderFlow };
  return buildBundle(activeCollectionId, settings, collections);
}

async function saveStateLocal(state) {
  skipSync = true;
  await saveState(state);
  skipSync = false;
}

function serializeState(state) {
  const record = stateToRecord(state);
  record.binderFlow = state.binderFlow;
  return record;
}

function loadStateFromData(data) {
  if (!data || !Array.isArray(data.caught)) return null;
  const state = recordToState(data);
  state.binderFlow = data.binderFlow || 'page';
  return state;
}

// --- Bundle (v2) serialization ---

const BUNDLE_VERSION = 2;
const ALL_GENS_JSON = JSON.stringify([...ALL_GENERATIONS]);
const DEFAULT_BOOKS_JSON = JSON.stringify(DEFAULT_BOOKS);

function arraysEqualAsSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sorted = (arr) => [...arr].sort();
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

function compactCollection(record) {
  const type = record.type || 'pokedex';
  const out = { id: record.id, name: record.name, type, cg: [...(record.caught || [])] };

  if (record.layout && record.layout !== '3x3') out.l = record.layout;

  if (Array.isArray(record.books) && record.books.length > 0 && JSON.stringify(record.books) !== DEFAULT_BOOKS_JSON) {
    out.b = record.books;
  }

  if (type === 'pokedex') {
    if (record.generations && !arraysEqualAsSet(record.generations, ALL_GENERATIONS)) {
      out.g = [...record.generations];
    }
    const cs = {};
    for (const [formId, card] of Object.entries(record.cardSelections || {})) {
      if (card && card.cardId) cs[formId] = card.cardId;
    }
    if (Object.keys(cs).length > 0) out.cs = cs;
    if (Array.isArray(record.disabledCategories) && record.disabledCategories.length > 0) {
      out.dc = [...record.disabledCategories];
    }
    if (Array.isArray(record.excludedForms) && record.excludedForms.length > 0) {
      out.ef = [...record.excludedForms];
    }
  } else if (type === 'master') {
    if (Array.isArray(record.sets) && record.sets.length > 0) out.s = [...record.sets];
    if (Array.isArray(record.slotList) && record.slotList.length > 0) {
      out.sl = record.slotList.map(slot => slot ? { c: slot.cardId, v: slot.variant } : null);
    }
  } else if (type === 'freestyle') {
    if (typeof record.pageCount === 'number') out.pc = record.pageCount;
    if (Array.isArray(record.slots)) {
      out.sl = record.slots.map(slot => slot && slot.cardId ? slot.cardId : null);
    }
  }

  return out;
}

function expandCollection(compact) {
  const type = compact.type || 'pokedex';
  const record = {
    id: compact.id,
    name: compact.name,
    type,
    layout: compact.l || '3x3',
    caught: Array.isArray(compact.cg) ? [...compact.cg] : [],
    books: Array.isArray(compact.b) && compact.b.length > 0 ? compact.b : [...DEFAULT_BOOKS],
  };

  if (type === 'pokedex') {
    record.generations = Array.isArray(compact.g) ? [...compact.g] : [...ALL_GENERATIONS];
    const cs = {};
    for (const [formId, cardIdOrObj] of Object.entries(compact.cs || {})) {
      if (typeof cardIdOrObj === 'string') cs[formId] = { cardId: cardIdOrObj };
      else if (cardIdOrObj && cardIdOrObj.cardId) cs[formId] = cardIdOrObj;
    }
    record.cardSelections = cs;
    record.disabledCategories = Array.isArray(compact.dc) ? [...compact.dc] : [];
    record.excludedForms = Array.isArray(compact.ef) ? [...compact.ef] : [];
  } else if (type === 'master') {
    record.sets = Array.isArray(compact.s) ? [...compact.s] : [];
    record.slotList = Array.isArray(compact.sl)
      ? compact.sl.map(s => s ? { cardId: s.c, variant: s.v, slotId: `${s.c}:${s.v}` } : null)
      : [];
  } else if (type === 'freestyle') {
    if (typeof compact.pc === 'number') record.pageCount = compact.pc;
    record.slots = Array.isArray(compact.sl)
      ? compact.sl.map(s => typeof s === 'string' ? { cardId: s } : (s && s.cardId ? s : null))
      : [];
  }

  return record;
}

function buildBundle(activeId, settings, collections) {
  return {
    v: BUNDLE_VERSION,
    activeId,
    settings,
    collections: collections.map(compactCollection),
  };
}

function serializeBundle(activeId, settings, collections) {
  return JSON.stringify(buildBundle(activeId, settings, collections));
}

function parseBundle(raw) {
  if (raw && typeof raw === 'object' && raw.v === BUNDLE_VERSION && Array.isArray(raw.collections)) {
    return {
      v: BUNDLE_VERSION,
      activeId: raw.activeId || null,
      settings: raw.settings || { binderFlow: 'page' },
      collections: raw.collections,
    };
  }
  return null;
}

function isLegacyV1(raw) {
  return !!(raw && typeof raw === 'object' && raw.v !== BUNDLE_VERSION && Array.isArray(raw.caught));
}

function migrateV1ToV2(v1, localCollectionsFull = []) {
  const v1Record = {
    id: v1.id,
    name: v1.name,
    type: v1.type || 'pokedex',
    layout: v1.layout || '3x3',
    caught: v1.caught || [],
    books: v1.books || [...DEFAULT_BOOKS],
    generations: v1.generations,
    cardSelections: v1.cardSelections,
    disabledCategories: v1.disabledCategories,
    excludedForms: v1.excludedForms,
    sets: v1.sets,
    slotList: v1.slotList,
    slots: v1.slots,
    pageCount: v1.pageCount,
  };

  const seen = new Set([v1Record.id]);
  const collections = [v1Record];
  for (const local of localCollectionsFull) {
    if (local && local.id && !seen.has(local.id)) {
      seen.add(local.id);
      collections.push(local);
    }
  }

  return {
    v: BUNDLE_VERSION,
    activeId: v1.id,
    settings: { binderFlow: v1.binderFlow || 'page' },
    collections: collections.map(compactCollection),
  };
}

function collectCardIds(record) {
  const ids = [];
  const type = record.type || 'pokedex';
  if (type === 'pokedex' && record.cardSelections) {
    for (const card of Object.values(record.cardSelections)) {
      if (card && card.cardId && !card.imageSmall) ids.push(card.cardId);
    }
  } else if (type === 'master' && Array.isArray(record.slotList)) {
    for (const slot of record.slotList) {
      if (slot && slot.cardId && !slot.imageSmall) ids.push(slot.cardId);
    }
  } else if (type === 'freestyle' && Array.isArray(record.slots)) {
    for (const slot of record.slots) {
      if (slot && slot.cardId && !slot.imageSmall) ids.push(slot.cardId);
    }
  }
  return ids;
}

function applyHydrationToRecord(record, hydrated) {
  const type = record.type || 'pokedex';
  if (type === 'pokedex' && record.cardSelections) {
    for (const [formId, card] of Object.entries(record.cardSelections)) {
      if (card && card.cardId && !card.imageSmall) {
        const full = hydrated.get(card.cardId);
        if (full) record.cardSelections[formId] = full;
      }
    }
  } else if (type === 'master' && Array.isArray(record.slotList)) {
    for (let i = 0; i < record.slotList.length; i++) {
      const slot = record.slotList[i];
      if (slot && slot.cardId && !slot.imageSmall) {
        const full = hydrated.get(slot.cardId);
        if (full) record.slotList[i] = { ...full, variant: slot.variant, slotId: `${slot.cardId}:${slot.variant}` };
      }
    }
  } else if (type === 'freestyle' && Array.isArray(record.slots)) {
    for (let i = 0; i < record.slots.length; i++) {
      const slot = record.slots[i];
      if (slot && slot.cardId && !slot.imageSmall) {
        const full = hydrated.get(slot.cardId);
        if (full) record.slots[i] = full;
      }
    }
  }
  return record;
}

async function rehydrateBundle(bundleCollections) {
  const stubRecords = bundleCollections.map(expandCollection);
  const allIds = [];
  for (const rec of stubRecords) allIds.push(...collectCardIds(rec));
  const hydrated = await hydrateCards(allIds);
  return stubRecords.map(rec => applyHydrationToRecord(rec, hydrated));
}

async function pushBundle(stateForSettings) {
  if (!isSyncConfigured() || skipSync) return;
  const collections = await getAllCollectionsFull();
  const settings = {
    binderFlow: (stateForSettings && stateForSettings.binderFlow) || loadSettings().binderFlow,
  };
  scheduleSave(buildBundle(activeCollectionId, settings, collections));
}

async function saveCollectionRecord(record) {
  await saveCollection(record);
  await pushBundle(null);
}

async function deleteCollectionRecord(id) {
  await deleteCollection(id);
  await pushBundle(null);
}

async function reconcileBundleToIDB(rehydratedRecords) {
  const existing = await getAllCollectionsFull();
  const incomingIds = new Set(rehydratedRecords.map(r => r.id));
  for (const rec of rehydratedRecords) {
    await saveCollection(rec);
  }
  for (const local of existing) {
    if (!incomingIds.has(local.id)) {
      await deleteCollection(local.id);
    }
  }
}

// --- Mutations ---

async function toggleCaught(state, slotId) {
  if (state.caught.has(slotId)) {
    state.caught.delete(slotId);
  } else {
    state.caught.add(slotId);
  }
  await saveState(state);
}

async function toggleCategory(state, category) {
  if (state.disabledCategories.has(category)) {
    state.disabledCategories.delete(category);
  } else {
    state.disabledCategories.add(category);
  }
  await saveState(state);
}

async function toggleExcludedForm(state, formId) {
  if (state.excludedForms.has(formId)) {
    state.excludedForms.delete(formId);
  } else {
    state.excludedForms.add(formId);
  }
  await saveState(state);
}

async function setBinderLayout(state, layout) {
  state.layout = layout;
  await saveState(state);
}

function setBinderFlow(state, flow) {
  state.binderFlow = flow;
  saveSettings({ binderFlow: state.binderFlow });
}

async function setCardSelection(state, formId, cardData) {
  if (state.type === 'pokedex') {
    state.cardSelections[formId] = cardData;
  }
  await saveState(state);
}

async function clearCardSelection(state, formId) {
  if (state.type === 'pokedex') {
    delete state.cardSelections[formId];
  }
  await saveState(state);
}

async function setFreestyleSlot(state, index, cardData) {
  if (state.type === 'freestyle') {
    if (!state.slots) state.slots = [];
    // Expand array if needed
    while (state.slots.length <= index) state.slots.push(null);
    state.slots[index] = cardData;
  }
  await saveState(state);
}

async function clearFreestyleSlot(state, index) {
  if (state.type === 'freestyle' && state.slots) {
    state.slots[index] = null;
    state.caught.delete(String(index));
  }
  await saveState(state);
}

async function saveBooks(state, books) {
  state.books = books;
  await saveState(state);
}

async function addBook(state, name, generations) {
  state.books.push({ name, generations });
  await saveState(state);
}

async function updateBook(state, index, name, generations) {
  state.books[index] = { name, generations };
  await saveState(state);
}

async function removeBook(state, index) {
  state.books.splice(index, 1);
  await saveState(state);
}

function exportState(state) {
  const data = serializeState(state);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pokebinder-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importState(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.caught)) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        const state = loadStateFromData(data);
        await saveState(state);
        resolve(state);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function resetCaught(state) {
  state.caught = new Set();
  await saveState(state);
}

export {
  loadState, saveState, saveStateLocal, serializeState, loadStateFromData,
  loadSettings, saveSettings,
  getActiveCollectionId, setActiveCollectionId,
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setCardSelection, clearCardSelection,
  setFreestyleSlot, clearFreestyleSlot,
  saveBooks, addBook, updateBook, removeBook,
  exportState, importState, resetCaught,
  defaultCollectionRecord,
  // Bundle sync (v2)
  parseBundle, isLegacyV1, migrateV1ToV2, rehydrateBundle, reconcileBundleToIDB,
  pushBundle, currentBundleObject, saveCollectionRecord, deleteCollectionRecord,
};
