import { getCollection, saveCollection } from './db.js';
import { scheduleSave, isSyncConfigured } from './sync.js';

const SETTINGS_KEY = 'pokebinder-settings';
const ACTIVE_COLLECTION_KEY = 'pokebinder-active-collection';

const DEFAULT_COLLECTION_ID = 'living-dex';
const DEFAULT_BOOKS = [
  { generations: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

let skipSync = false;
let activeCollectionId = localStorage.getItem(ACTIVE_COLLECTION_KEY) || DEFAULT_COLLECTION_ID;

function defaultCollectionRecord() {
  return {
    id: DEFAULT_COLLECTION_ID,
    name: 'Living Dex',
    caught: [],
    cardSelections: {},
    disabledCategories: [],
    excludedForms: [],
    books: [...DEFAULT_BOOKS],
  };
}

function recordToState(record) {
  return {
    collectionId: record.id,
    collectionName: record.name,
    caught: new Set(record.caught || []),
    cardSelections: record.cardSelections || {},
    disabledCategories: new Set(record.disabledCategories || []),
    excludedForms: new Set(record.excludedForms || []),
    books: Array.isArray(record.books) && record.books.length > 0
      ? record.books
      : [...DEFAULT_BOOKS],
  };
}

function stateToRecord(state) {
  return {
    id: state.collectionId || activeCollectionId,
    name: state.collectionName || 'Living Dex',
    caught: [...state.caught],
    cardSelections: state.cardSelections,
    disabledCategories: [...state.disabledCategories],
    excludedForms: [...state.excludedForms],
    books: state.books,
  };
}

// --- Settings (localStorage) ---

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        binderLayout: parsed.binderLayout || '3x3',
        binderFlow: parsed.binderFlow || 'page',
      };
    }
  } catch { /* ignore */ }
  return { binderLayout: '3x3', binderFlow: 'page' };
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
  state.binderLayout = settings.binderLayout;
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
  return {
    id: state.collectionId || activeCollectionId,
    name: state.collectionName || 'Living Dex',
    caught: [...state.caught],
    disabledCategories: [...state.disabledCategories],
    excludedForms: [...state.excludedForms],
    books: state.books,
    cardSelections: state.cardSelections,
    binderLayout: state.binderLayout,
    binderFlow: state.binderFlow,
  };
}

function loadStateFromData(data) {
  if (!data || !Array.isArray(data.caught)) return null;
  const state = recordToState({
    id: data.id || activeCollectionId,
    name: data.name || 'Living Dex',
    caught: data.caught,
    cardSelections: data.cardSelections || {},
    disabledCategories: data.disabledCategories || [],
    excludedForms: data.excludedForms || [],
    books: data.books,
  });
  state.binderLayout = data.binderLayout || '3x3';
  state.binderFlow = data.binderFlow || 'page';
  return state;
}

// --- Mutations ---

async function toggleCaught(state, formId) {
  if (state.caught.has(formId)) {
    state.caught.delete(formId);
  } else {
    state.caught.add(formId);
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

function setBinderLayout(state, layout) {
  state.binderLayout = layout;
  saveSettings({ binderLayout: state.binderLayout, binderFlow: state.binderFlow });
}

function setBinderFlow(state, flow) {
  state.binderFlow = flow;
  saveSettings({ binderLayout: state.binderLayout, binderFlow: state.binderFlow });
}

async function setCardSelection(state, formId, cardData) {
  state.cardSelections[formId] = cardData;
  await saveState(state);
}

async function clearCardSelection(state, formId) {
  delete state.cardSelections[formId];
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
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setCardSelection, clearCardSelection,
  saveBooks, addBook, updateBook, removeBook,
  exportState, importState, resetCaught,
};
