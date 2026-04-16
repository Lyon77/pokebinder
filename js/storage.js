import { getCollection, saveCollection } from './db.js';
import { scheduleSave, isSyncConfigured } from './sync.js';

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
  if (isSyncConfigured() && !skipSync) {
    scheduleSave(serializeState(state));
  }
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
};
