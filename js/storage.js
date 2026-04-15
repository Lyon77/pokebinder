import { scheduleSave, isSyncConfigured } from './sync.js';

const STORAGE_KEY = 'pokedex-tracker';
const CURRENT_VERSION = 2;
let skipSync = false;

const DEFAULT_BOOKS = [
  { generations: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== CURRENT_VERSION) return defaultState();
    return {
      version: CURRENT_VERSION,
      caught: new Set(parsed.caught || []),
      disabledCategories: new Set(parsed.disabledCategories || []),
      excludedForms: new Set(parsed.excludedForms || []),
      binderLayout: parsed.binderLayout || '3x3',
      binderFlow: parsed.binderFlow || 'page',
      books: Array.isArray(parsed.books) && parsed.books.length > 0
        ? parsed.books
        : [...DEFAULT_BOOKS],
      cardSelections: parsed.cardSelections || {},
    };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    version: CURRENT_VERSION,
    caught: new Set(),
    disabledCategories: new Set(),
    excludedForms: new Set(),
    binderLayout: '3x3',
    binderFlow: 'page',
    books: [...DEFAULT_BOOKS],
    cardSelections: {},
  };
}

function serializeState(state) {
  return {
    version: CURRENT_VERSION,
    caught: [...state.caught],
    disabledCategories: [...state.disabledCategories],
    excludedForms: [...state.excludedForms],
    binderLayout: state.binderLayout,
    binderFlow: state.binderFlow,
    books: state.books,
    cardSelections: state.cardSelections,
  };
}

function saveState(state) {
  const serializable = serializeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  if (isSyncConfigured() && !skipSync) {
    scheduleSave(serializable);
  }
}

function saveStateLocal(state) {
  skipSync = true;
  saveState(state);
  skipSync = false;
}

function toggleCaught(state, formId) {
  if (state.caught.has(formId)) {
    state.caught.delete(formId);
  } else {
    state.caught.add(formId);
  }
  saveState(state);
}

function toggleCategory(state, category) {
  if (state.disabledCategories.has(category)) {
    state.disabledCategories.delete(category);
  } else {
    state.disabledCategories.add(category);
  }
  saveState(state);
}

function toggleExcludedForm(state, formId) {
  if (state.excludedForms.has(formId)) {
    state.excludedForms.delete(formId);
  } else {
    state.excludedForms.add(formId);
  }
  saveState(state);
}

function setBinderLayout(state, layout) {
  state.binderLayout = layout;
  saveState(state);
}

function setBinderFlow(state, flow) {
  state.binderFlow = flow;
  saveState(state);
}

function setCardSelection(state, formId, cardData) {
  state.cardSelections[formId] = cardData;
  saveState(state);
}

function clearCardSelection(state, formId) {
  delete state.cardSelections[formId];
  saveState(state);
}

function saveBooks(state, books) {
  state.books = books;
  saveState(state);
}

function addBook(state, name, generations) {
  state.books.push({ name, generations });
  saveState(state);
}

function updateBook(state, index, name, generations) {
  state.books[index] = { name, generations };
  saveState(state);
}

function removeBook(state, index) {
  state.books.splice(index, 1);
  saveState(state);
}

function exportState(state) {
  const data = {
    version: CURRENT_VERSION,
    caught: [...state.caught],
    disabledCategories: [...state.disabledCategories],
    excludedForms: [...state.excludedForms],
    binderLayout: state.binderLayout,
    binderFlow: state.binderFlow,
    books: state.books,
    cardSelections: state.cardSelections,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pokedex-tracker-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importState(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.caught)) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        const state = {
          version: CURRENT_VERSION,
          caught: new Set(data.caught),
          disabledCategories: new Set(data.disabledCategories || []),
          excludedForms: new Set(data.excludedForms || []),
          binderLayout: data.binderLayout || '3x3',
          binderFlow: data.binderFlow || 'page',
          books: Array.isArray(data.books) && data.books.length > 0
            ? data.books
            : [...DEFAULT_BOOKS],
          cardSelections: data.cardSelections || {},
        };
        saveState(state);
        resolve(state);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function resetCaught(state) {
  state.caught = new Set();
  saveState(state);
}

function loadStateFromData(data) {
  if (!data || !Array.isArray(data.caught)) return null;
  return {
    version: CURRENT_VERSION,
    caught: new Set(data.caught),
    disabledCategories: new Set(data.disabledCategories || []),
    excludedForms: new Set(data.excludedForms || []),
    binderLayout: data.binderLayout || '3x3',
    binderFlow: data.binderFlow || 'page',
    books: Array.isArray(data.books) && data.books.length > 0
      ? data.books
      : [...DEFAULT_BOOKS],
    cardSelections: data.cardSelections || {},
  };
}

function mergeStates(local, remote) {
  // caught: union of both sets
  const mergedCaught = new Set(local.caught);
  for (const id of remote.caught) mergedCaught.add(id);

  // cardSelections: merge both, remote wins on conflicts
  const mergedCards = { ...local.cardSelections, ...remote.cardSelections };

  // Settings: take remote
  return {
    version: CURRENT_VERSION,
    caught: mergedCaught,
    disabledCategories: new Set(remote.disabledCategories),
    excludedForms: new Set(remote.excludedForms),
    binderLayout: remote.binderLayout,
    binderFlow: remote.binderFlow,
    books: remote.books,
    cardSelections: mergedCards,
  };
}

export {
  loadState, saveState, saveStateLocal, serializeState, loadStateFromData, mergeStates,
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setCardSelection, clearCardSelection,
  saveBooks, addBook, updateBook, removeBook,
  exportState, importState, resetCaught,
};
