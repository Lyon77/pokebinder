import {
  loadPokemonData, getFormCategories, getAlternateFormsByCategory,
  getFormSubCategories, getOtherFormsWithoutSubCategory,
  FORM_CATEGORY_LABELS, FORM_SUBCATEGORY_ICONS,
} from './data.js';
import { buildCollection, buildBookCollection } from './collection.js';
import { renderListView, updateListCaughtState } from './render.js';
import { renderBinderView, getTotalViews, getViewPageInfo, parseLayout, getTotalPages, buildViews } from './binder.js';
import { computeStats, renderStats } from './stats.js';
import {
  loadState, saveState, saveStateLocal, serializeState, loadStateFromData,
  loadSettings, saveSettings,
  getActiveCollectionId, setActiveCollectionId,
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setCardSelection, clearCardSelection,
  setFreestyleSlot, clearFreestyleSlot,
  saveBooks, exportState, importState, resetCaught,
  defaultCollectionRecord,
  parseBundle, isLegacyV1, migrateV1ToV2, rehydrateBundle, reconcileBundleToIDB,
  currentBundleObject, pushBundle, saveCollectionRecord, deleteCollectionRecord,
} from './storage.js';
import {
  isSyncConfigured, getSyncConfig, setSyncConfig, clearSyncConfig,
  setStatusCallback, setRemoteChangeCallback, setLastSavedJson,
  loadFromGist, cancelPendingSave, startPolling, stopPolling,
} from './sync.js';
import { fetchCardsForPokemon, fetchSets, fetchSetCards, expandVariants, hydrateCards } from './tcg-api.js';
import { getAllCollections, getAllCollectionsFull } from './db.js';

// ---- View State ----
const VIEW_STATE_KEY = 'pokebinder-view-state';

function loadViewState() {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveViewState() {
  localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
    currentView,
    binderViewIndex,
    selectedBookIndex,
  }));
}

let state;
let collection = [];
let bookCollection = [];
const viewState = loadViewState();
let currentView = viewState.currentView || 'list';
let binderViewIndex = viewState.binderViewIndex || 0;
let selectedBookIndex = viewState.selectedBookIndex || 0;

// ---- DOM refs ----
const pokemonListEl = document.getElementById('pokemon-list');
const binderContainerEl = document.getElementById('binder-container');
const bookSelectorEl = document.getElementById('book-selector');
const listViewEl = document.getElementById('list-view');
const binderViewEl = document.getElementById('binder-view');
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const binderLayoutSelect = document.getElementById('binder-layout-select');
const binderPageInput = document.getElementById('binder-page-input');
const binderPageTotal = document.getElementById('binder-page-total');
const binderPrev = document.getElementById('binder-prev');
const binderNext = document.getElementById('binder-next');
const statsOverallText = document.getElementById('stats-overall-text');
const statsOverallBar = document.getElementById('stats-overall-bar');
const statsGenEl = document.getElementById('stats-generations');
const viewListBtn = document.getElementById('view-list-btn');
const viewBinderBtn = document.getElementById('view-binder-btn');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const resetBtn = document.getElementById('reset-btn');
const formSettingsBtn = document.getElementById('form-settings-btn');
const formSettingsModal = document.getElementById('form-settings-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const formSettingsBodyEl = document.getElementById('form-settings-body');
const bookSettingsBtn = document.getElementById('book-settings-btn');
const bookSettingsModal = document.getElementById('book-settings-modal');
const bookModalCloseBtn = document.getElementById('book-modal-close-btn');
const bookSettingsBodyEl = document.getElementById('book-settings-body');
const bookUnassignedEl = document.getElementById('book-unassigned');
const bookAddBtn = document.getElementById('book-add-btn');
const scrollTopBtn = document.getElementById('scroll-top-btn');
const statsBar = document.getElementById('stats-bar');
const collectionTitle = document.getElementById('collection-title');
const collectionDropdown = document.getElementById('collection-dropdown');
const viewToggle = document.querySelector('.view-toggle');

// ---- Core rendering ----

function rebuildCollection() {
  collection = buildCollection(state);
  rebuildBookCollection();
  renderCurrentView();
  updateStats();
}

function rebuildBookCollection() {
  if (state.type === 'freestyle') {
    bookCollection = buildBookCollection(collection, {}, 'freestyle');
  } else {
    const book = state.books[selectedBookIndex] || state.books[0];
    bookCollection = buildBookCollection(collection, book, state.type);
  }
}

function renderCurrentView() {
  if (currentView === 'list' && (state.type === 'pokedex' || state.type === 'master')) {
    const listData = state.type === 'master' ? bookCollection : collection;
    renderListView(pokemonListEl, listData, state.caught, handleToggleCaught, state.type);
  } else {
    renderBinder();
  }
}

function getLayout() {
  return state.layout || '3x3';
}

function renderBinder() {
  const layout = getLayout();
  const totalViews = getTotalViews(bookCollection.length, layout);
  binderViewIndex = Math.min(binderViewIndex, Math.max(0, totalViews - 1));

  const cardSels = state.type === 'pokedex' ? (state.cardSelections || {}) : {};
  renderBinderView(
    binderContainerEl, bookCollection, binderViewIndex, layout,
    state.caught, handleToggleCaught, state.binderFlow, cardSels,
    handleSlotClick, state.type
  );

  const totalPages = getTotalPages(bookCollection.length, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(binderViewIndex, views.length - 1)];
  binderPageInput.value = view.pages[0] + 1;
  binderPageInput.max = totalPages;
  binderPageTotal.textContent = `of ${totalPages}`;

  const hasBooks = state.type !== 'freestyle';
  const isFirstBook = !hasBooks || selectedBookIndex === 0;
  const isLastBook = !hasBooks || selectedBookIndex >= state.books.length - 1;
  binderPrev.disabled = binderViewIndex === 0 && isFirstBook;
  binderNext.disabled = binderViewIndex >= totalViews - 1 && isLastBook;

  if (hasBooks) renderBookSelector();
  saveViewState();
}

function updateStats() {
  if (state.type === 'pokedex') {
    const stats = computeStats(collection, state.caught);
    renderStats(statsOverallText, statsOverallBar, statsGenEl, stats);
  } else {
    // Simple caught / total for master and freestyle
    let total, caught;
    if (state.type === 'freestyle') {
      const filled = collection.filter(s => !s.isEmpty);
      total = filled.length;
      caught = filled.filter(s => state.caught.has(s.formId)).length;
    } else {
      total = collection.length;
      caught = [...state.caught].filter(id => collection.some(s => s.formId === id)).length;
    }
    const pct = total > 0 ? ((caught / total) * 100).toFixed(1) : '0.0';
    statsOverallText.textContent = `${caught} / ${total} (${pct}%)`;
    statsOverallBar.style.width = `${total > 0 ? (caught / total) * 100 : 0}%`;
    statsGenEl.innerHTML = '';
  }
}

function updateTypeAwareControls() {
  const isPokedex = state.type === 'pokedex';
  const isFreestyle = state.type === 'freestyle';

  // Forms button: pokedex only
  formSettingsBtn.hidden = !isPokedex;
  // Books button: pokedex and master only
  bookSettingsBtn.hidden = isFreestyle;
  // List/Binder toggle: pokedex and master
  viewToggle.hidden = isFreestyle;
  // Book selector: not for freestyle
  bookSelectorEl.hidden = isFreestyle;

  // Force binder view for freestyle only
  if (isFreestyle && currentView === 'list') {
    currentView = 'binder';
    listViewEl.hidden = true;
    binderViewEl.hidden = false;
  }

  // Update header title
  collectionTitle.innerHTML = `${(state.collectionName || 'Collection').toUpperCase()} <span class="chevron"></span>`;

  // Update layout selector to match collection
  binderLayoutSelect.value = getLayout();
}

// ---- Slot click handlers ----

let lastTouchedFormId = null;

function handleToggleCaught(slotId) {
  if (currentView === 'list') lastTouchedFormId = slotId;
  toggleCaught(state, slotId);
  if (currentView === 'list') {
    updateListCaughtState(pokemonListEl, state.caught);
  } else {
    renderBinder();
  }
  updateStats();
}

function handleSlotClick(slotId, name, event) {
  if (state.type === 'master') {
    handleToggleCaught(slotId);
  } else if (state.type === 'freestyle') {
    const slot = collection.find(s => s.formId === slotId);
    if (slot && slot.isEmpty) {
      openCardPicker(slotId, '');
    } else {
      openFreestyleMenu(slotId, event);
    }
  } else {
    openCardPicker(slotId, name);
  }
}

// ---- Freestyle context menu ----

const freestyleMenu = document.getElementById('freestyle-slot-menu');
let freestyleMenuSlotId = null;

function openFreestyleMenu(slotId, event) {
  freestyleMenuSlotId = slotId;
  freestyleMenu.hidden = false;
  const rect = event && event.target ? event.target.closest('.binder-slot').getBoundingClientRect() : { left: 100, top: 100 };
  freestyleMenu.style.left = `${Math.min(rect.left, window.innerWidth - 170)}px`;
  freestyleMenu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 120)}px`;
}

function closeFreestyleMenu() {
  freestyleMenu.hidden = true;
  freestyleMenuSlotId = null;
}

freestyleMenu.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action || !freestyleMenuSlotId) return;
  const idx = parseInt(freestyleMenuSlotId, 10);

  if (action === 'change-card') {
    const existing = state.slots && state.slots[idx];
    openCardPicker(freestyleMenuSlotId, (existing && existing.name) || '');
  } else if (action === 'remove') {
    clearFreestyleSlot(state, idx);
    rebuildCollection();
  }
  closeFreestyleMenu();
});

document.addEventListener('click', (e) => {
  if (!freestyleMenu.hidden && !freestyleMenu.contains(e.target)) {
    closeFreestyleMenu();
  }
});

// ---- View switching ----

const viewSlider = document.querySelector('.view-toggle .slider');

function switchView(view) {
  if (state.type === 'freestyle' && view === 'list') view = 'binder';
  currentView = view;
  listViewEl.hidden = view !== 'list';
  binderViewEl.hidden = view !== 'binder';
  viewListBtn.classList.toggle('active', view === 'list');
  viewBinderBtn.classList.toggle('active', view === 'binder');
  viewSlider.classList.toggle('right', view === 'binder');

  if (view === 'binder' && lastTouchedFormId) {
    const idx = bookCollection.findIndex(p => p.formId === lastTouchedFormId);
    if (idx >= 0) {
      const layout = getLayout();
      const { perPage } = parseLayout(layout);
      const targetPage = Math.floor(idx / perPage);
      const totalPages = getTotalPages(bookCollection.length, layout);
      const views = buildViews(totalPages);
      for (let v = 0; v < views.length; v++) {
        if (views[v].pages.includes(targetPage)) {
          binderViewIndex = v;
          break;
        }
      }
    }
  }

  renderCurrentView();
  saveViewState();
}

// ---- Collection switcher dropdown ----

let dropdownOpen = false;

collectionTitle.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (dropdownOpen) {
    closeCollectionDropdown();
    return;
  }
  dropdownOpen = true;
  collectionTitle.classList.add('open');
  collectionDropdown.hidden = false;
  collectionDropdown.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted);font-size:0.75rem;">Loading...</div>';

  const collections = await getAllCollections();
  collectionDropdown.innerHTML = '';
  const activeId = getActiveCollectionId();

  for (const c of collections) {
    const item = document.createElement('div');
    item.className = 'collection-dd-item' + (c.id === activeId ? ' active' : '');
    const typeBadge = { pokedex: 'Pokedex', master: 'Master Set', freestyle: 'Freestyle' }[c.type] || c.type;
    item.innerHTML = `
      <div class="collection-dd-left">
        <span class="collection-dd-check">${c.id === activeId ? '&#10003;' : ''}</span>
        <span>${c.name}</span>
      </div>
      <div class="collection-dd-right">
        <span class="collection-dd-type">${typeBadge}</span>
        <button class="collection-dd-rename" data-rename-id="${c.id}" title="Rename">&#9998;</button>
        ${collections.length > 1 ? `<button class="collection-dd-delete" data-delete-id="${c.id}" title="Delete">&times;</button>` : ''}
      </div>
    `;
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.collection-dd-delete') || e.target.closest('.collection-dd-rename')) return;
      if (c.id !== activeId) {
        setActiveCollectionId(c.id);
        state = await loadState();
        selectedBookIndex = 0;
        binderViewIndex = 0;
        updateTypeAwareControls();
        rebuildCollection();
        const binderFlowCheck = document.getElementById('binder-flow-check');
        binderFlowCheck.checked = state.binderFlow === 'row';
        if (state.type !== 'pokedex') switchView('binder');
      }
      closeCollectionDropdown();
    });
    collectionDropdown.appendChild(item);
  }

  // Delete handlers
  for (const btn of collectionDropdown.querySelectorAll('.collection-dd-delete')) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      if (!confirm(`Delete collection "${collections.find(c => c.id === id)?.name}"?`)) return;
      await deleteCollectionRecord(id);
      if (id === activeId) {
        const remaining = collections.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveCollectionId(remaining[0].id);
          state = await loadState();
          selectedBookIndex = 0;
          binderViewIndex = 0;
          updateTypeAwareControls();
          rebuildCollection();
        }
      }
      closeCollectionDropdown();
    });
  }

  // Rename handlers
  for (const btn of collectionDropdown.querySelectorAll('.collection-dd-rename')) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.renameId;
      const c = collections.find(c => c.id === id);
      const newName = prompt('Rename collection:', c?.name || '');
      if (!newName || !newName.trim()) return;
      if (id === activeId) {
        state.collectionName = newName.trim();
        await saveState(state);
        updateTypeAwareControls();
      } else {
        const record = await (await import('./db.js')).getCollection(id);
        if (record) {
          record.name = newName.trim();
          await saveCollectionRecord(record);
        }
      }
      closeCollectionDropdown();
    });
  }

  // New collection button
  const addItem = document.createElement('div');
  addItem.className = 'collection-dd-item collection-dd-add';
  addItem.innerHTML = '<span>+ New Collection</span>';
  addItem.addEventListener('click', () => {
    closeCollectionDropdown();
    openCreateModal();
  });
  collectionDropdown.appendChild(addItem);
});

function closeCollectionDropdown() {
  dropdownOpen = false;
  collectionTitle.classList.remove('open');
  collectionDropdown.hidden = true;
}

document.addEventListener('click', (e) => {
  if (dropdownOpen && !collectionDropdown.contains(e.target) && !collectionTitle.contains(e.target)) {
    closeCollectionDropdown();
  }
});

// ---- Collection creation modal ----

const createModal = document.getElementById('create-collection-modal');
const createModalClose = document.getElementById('create-modal-close');
const createNameInput = document.getElementById('create-name');
const createStep1 = document.getElementById('create-step-1');
const createStepPokedex = document.getElementById('create-step-pokedex');
const createStepMaster = document.getElementById('create-step-master');
const createStepFreestyle = document.getElementById('create-step-freestyle');
const createBackBtn = document.getElementById('create-back-btn');
const createCancelBtn = document.getElementById('create-cancel-btn');
const createConfirmBtn = document.getElementById('create-confirm-btn');
const createSetSearch = document.getElementById('create-set-search');
const createSetResults = document.getElementById('create-set-results');
const createSelectedSets = document.getElementById('create-selected-sets');
const createProgress = document.getElementById('create-progress');
const createProgressBar = document.getElementById('create-progress-bar');
const createProgressText = createProgress ? createProgress.querySelector('.create-progress-text') : null;

let createType = null;
let createSelectedLayout = '3x3';
let createGens = new Set();
let createSets = []; // [{id, name, year, total, slotList}]
let createStep = 1;
let setSearchTimer = null;

const LAYOUTS = ['3x3', '3x4', '4x3', '4x4'];
const GENERATION_NAMES = {
  1: 'Gen I', 2: 'Gen II', 3: 'Gen III', 4: 'Gen IV', 5: 'Gen V',
  6: 'Gen VI', 7: 'Gen VII', 8: 'Gen VIII', 9: 'Gen IX',
};

function openCreateModal() {
  createType = null;
  createSelectedLayout = '3x3';
  createGens = new Set();
  createSets = [];
  createStep = 1;
  createNameInput.value = '';
  createConfirmBtn.disabled = true;
  createConfirmBtn.textContent = 'Create';
  createBackBtn.hidden = true;
  createProgress.hidden = true;
  createProgressBar.style.width = '0%';
  showCreateStep(1);
  for (const card of document.querySelectorAll('.type-card')) card.classList.remove('selected');
  createModal.hidden = false;
  createNameInput.focus();
}

function closeCreateModal() {
  createModal.hidden = true;
}

createModalClose.addEventListener('click', closeCreateModal);
createCancelBtn.addEventListener('click', closeCreateModal);
createModal.querySelector('.modal-backdrop').addEventListener('click', closeCreateModal);

function showCreateStep(step) {
  createStep = step;
  createStep1.hidden = step !== 1;
  createStepPokedex.hidden = step !== 2 || createType !== 'pokedex';
  createStepMaster.hidden = step !== 2 || createType !== 'master';
  createStepFreestyle.hidden = step !== 2 || createType !== 'freestyle';
  createBackBtn.hidden = step === 1;
  createConfirmBtn.disabled = !canCreate();
}

function canCreate() {
  if (!createNameInput.value.trim()) return false;
  if (createStep === 1) return false;
  if (createType === 'pokedex' && createGens.size === 0) return false;
  if (createType === 'master' && createSets.length === 0) return false;
  return true;
}

// Type card selection
for (const card of document.querySelectorAll('.type-card')) {
  card.addEventListener('click', () => {
    createType = card.dataset.type;
    for (const c of document.querySelectorAll('.type-card')) c.classList.remove('selected');
    card.classList.add('selected');
    showCreateStep(2);
    if (createType === 'pokedex') renderGenGrid();
    if (createType === 'master') renderMasterConfig();
    renderLayoutPicker(createType);
  });
}

createBackBtn.addEventListener('click', () => showCreateStep(1));
createNameInput.addEventListener('input', () => {
  createConfirmBtn.disabled = !canCreate();
  // Update button text to indicate readiness
  if (canCreate()) {
    createConfirmBtn.textContent = 'Create';
  }
});

// Gen grid
function renderGenGrid() {
  const grid = document.getElementById('create-gen-grid');
  grid.innerHTML = '';
  for (let g = 1; g <= 9; g++) {
    const el = document.createElement('div');
    el.className = 'gen-check' + (createGens.has(g) ? ' checked' : '');
    el.innerHTML = `<div class="gen-check-box">${createGens.has(g) ? '&#10003;' : ''}</div> ${GENERATION_NAMES[g]}`;
    el.addEventListener('click', () => {
      if (createGens.has(g)) createGens.delete(g); else createGens.add(g);
      renderGenGrid();
      createConfirmBtn.disabled = !canCreate();
    });
    grid.appendChild(el);
  }
}

// Layout picker
function renderLayoutPicker(type) {
  const containerId = `create-layout-${type}`;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (const layout of LAYOUTS) {
    const [cols, rows] = layout.split('x').map(Number);
    const opt = document.createElement('div');
    opt.className = 'layout-option' + (createSelectedLayout === layout ? ' selected' : '');
    let cells = '';
    for (let i = 0; i < cols * rows; i++) cells += '<span></span>';
    opt.innerHTML = `<div class="layout-preview" style="display:grid;grid-template-columns:repeat(${cols},8px);gap:1px;">${cells}</div><div class="layout-label">${cols}&times;${rows}</div>`;
    opt.querySelector('.layout-preview').querySelectorAll('span').forEach(s => {
      s.style.cssText = 'background:currentColor;width:8px;height:10px;border-radius:1px;opacity:0.5;';
    });
    opt.addEventListener('click', () => {
      createSelectedLayout = layout;
      renderLayoutPicker(type);
    });
    container.appendChild(opt);
  }
}

// Master set config
function renderMasterConfig() {
  createSetSearch.value = '';
  createSetResults.hidden = true;
  renderSelectedSets();
}

let setSearchAbort = null;
createSetSearch.addEventListener('input', () => {
  clearTimeout(setSearchTimer);
  setSearchTimer = setTimeout(async () => {
    const q = createSetSearch.value.trim();
    if (!q) { createSetResults.hidden = true; return; }
    if (setSearchAbort) setSearchAbort.abort();
    createSetResults.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted);font-size:0.7rem;">Searching...</div>';
    createSetResults.hidden = false;
    const result = await fetchSets(q);
    if (result.error) {
      createSetResults.innerHTML = `<div style="padding:0.5rem;color:var(--accent);font-size:0.7rem;">${result.error}</div>`;
      return;
    }
    if (result.sets.length === 0) {
      createSetResults.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted);font-size:0.7rem;">No sets found</div>';
      return;
    }
    createSetResults.innerHTML = '';
    const addedIds = new Set(createSets.map(s => s.id));
    for (const s of result.sets) {
      if (addedIds.has(s.id)) continue;
      const el = document.createElement('div');
      el.className = 'set-result';
      el.innerHTML = `
        <div class="set-result-info">
          <span>${s.name}</span>
          <span class="set-result-meta">${s.year} &middot; ${s.total} cards</span>
        </div>
        <button class="btn btn-add">Add</button>
      `;
      el.querySelector('.btn-add').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.textContent = 'Fetching...';
        btn.disabled = true;
        const meta = el.querySelector('.set-result-meta');
        const origMeta = meta.textContent;
        meta.textContent = `Fetching ${s.total} cards...`;
        try {
          const cardResult = await fetchSetCards(s.id);
          meta.textContent = `Expanding variants...`;
          // Yield to UI before heavy computation
          await new Promise(r => setTimeout(r, 0));
          const slotList = expandVariants(cardResult.cards);
          createSets.push({ id: s.id, name: s.name, year: s.year, total: s.total, slotCount: slotList.length, slotList });
          renderSelectedSets();
          createConfirmBtn.disabled = !canCreate();
          el.remove();
        } catch (err) {
          meta.textContent = origMeta;
          btn.textContent = 'Retry';
          btn.disabled = false;
        }
      });
      createSetResults.appendChild(el);
    }
  }, 300);
});

function renderSelectedSets() {
  createSelectedSets.innerHTML = '';
  if (createSets.length === 0) {
    createSelectedSets.innerHTML = '<div style="color:var(--text-muted);font-size:0.7rem;">No sets added yet</div>';
    return;
  }
  for (let i = 0; i < createSets.length; i++) {
    const s = createSets[i];
    const el = document.createElement('div');
    el.className = 'selected-set';
    el.innerHTML = `
      <div>
        <div>${s.name}</div>
        <div class="selected-set-slots">${s.total} cards &middot; ${s.slotCount} variant slots</div>
      </div>
      <button class="btn-remove">&times;</button>
    `;
    el.querySelector('.btn-remove').addEventListener('click', () => {
      createSets.splice(i, 1);
      renderSelectedSets();
      createConfirmBtn.disabled = !canCreate();
    });
    createSelectedSets.appendChild(el);
  }
}

// Create button
createConfirmBtn.addEventListener('click', async () => {
  if (!canCreate()) return;
  createConfirmBtn.disabled = true;
  createConfirmBtn.textContent = 'Creating...';

  const yield_ = () => new Promise(r => setTimeout(r, 0));

  try {
    createProgress.hidden = false;
    createProgressText.textContent = 'Preparing collection...';
    createProgressBar.style.width = '5%';
    await yield_();

    const name = createNameInput.value.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const record = {
      id,
      name,
      type: createType,
      layout: createSelectedLayout,
      caught: [],
      books: [],
    };

    if (createType === 'pokedex') {
      const gens = [...createGens].sort((a, b) => a - b);
      record.generations = gens;
      record.cardSelections = {};
      record.disabledCategories = [];
      record.excludedForms = [];
      record.books = [{ generations: gens }];
    } else if (createType === 'master') {
      createProgressText.textContent = `Merging ${createSets.length} set(s)...`;
      createProgressBar.style.width = '15%';
      await yield_();

      record.sets = createSets.map(s => s.id);
      const allSlots = [];
      for (let si = 0; si < createSets.length; si++) {
        const s = createSets[si];
        allSlots.push(...s.slotList);
        createProgressText.textContent = `Merging sets... (${si + 1}/${createSets.length})`;
        createProgressBar.style.width = `${15 + (si + 1) / createSets.length * 20}%`;
        await yield_();
      }
      record.slotList = allSlots;
      record.books = createSets.map((s, i) => ({ sets: [s.id], name: `Book ${i + 1}` }));
      createProgressText.textContent = `${allSlots.length} total slots ready`;
      createProgressBar.style.width = '40%';
      await yield_();
    } else if (createType === 'freestyle') {
      const [cols, rows] = createSelectedLayout.split('x').map(Number);
      record.slots = new Array(3 * cols * rows).fill(null);
      record.books = [];
    }

    createProgressText.textContent = 'Saving to database...';
    createProgressBar.style.width = '50%';
    await yield_();
    await saveCollectionRecord(record);

    createProgressText.textContent = 'Loading collection...';
    createProgressBar.style.width = '70%';
    await yield_();
    setActiveCollectionId(id);
    state = await loadState();
    selectedBookIndex = 0;
    binderViewIndex = 0;

    createProgressText.textContent = 'Building binder...';
    createProgressBar.style.width = '90%';
    await yield_();
    updateTypeAwareControls();
    rebuildCollection();
    if (state.type !== 'pokedex') switchView('binder');
    else switchView(currentView);

    createProgressBar.style.width = '100%';
    await yield_();
    createProgress.hidden = true;
    closeCreateModal();
  } catch (err) {
    createProgress.hidden = true;
    console.error('Failed to create collection:', err);
    alert('Failed to create collection: ' + err.message);
  }
  createConfirmBtn.textContent = 'Create';
  createConfirmBtn.disabled = false;
});

// ---- Form settings (pokedex only) ----

const MAIN_CAT_ICONS = { regional: '🌍', mega: '💎', gmax: '⚡' };

function buildAccordionGroup(key, label, icon, forms, isCategory) {
  const isEnabled = !state.disabledCategories.has(key);
  const group = document.createElement('div');
  group.className = 'cat-group' + (!isEnabled ? ' disabled' : '');

  const header = document.createElement('div');
  header.className = 'cat-header';
  header.innerHTML = `
    <div class="cat-header-left">
      <div class="cat-icon">${icon}</div>
      ${label} <span class="count-badge">${forms.length}</span>
    </div>
    <div class="cat-header-right">
      <div class="toggle-switch${isEnabled ? ' on' : ''}"></div>
      <span class="cat-chevron">&#9654;</span>
    </div>
  `;

  header.addEventListener('click', (e) => {
    if (e.target.closest('.toggle-switch')) return;
    group.classList.toggle('open');
  });

  header.querySelector('.toggle-switch').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCategory(state, key);
    rebuildCollection();
    renderFormSettings();
  });

  const body = document.createElement('div');
  body.className = 'cat-body';

  for (const f of forms) {
    const isIncluded = !state.excludedForms.has(f.formId);
    const row = document.createElement('div');
    row.className = 'form-row';
    row.innerHTML = `
      <div class="form-row-left">
        <span class="form-dex">#${f.id}</span>
        ${f.name} <span class="form-name-sub">${f.formName ? '(' + f.formName + ')' : ''}</span>
      </div>
      <div class="mini-toggle${isIncluded ? ' on' : ''}"></div>
    `;
    row.addEventListener('click', () => {
      toggleExcludedForm(state, f.formId);
      const mt = row.querySelector('.mini-toggle');
      mt.classList.toggle('on');
      rebuildCollection();
    });
    body.appendChild(row);
  }

  group.appendChild(header);
  group.appendChild(body);
  return group;
}

function renderFormSettings() {
  formSettingsBodyEl.innerHTML = '';

  const toggleAllRow = document.createElement('div');
  toggleAllRow.style.cssText = 'display:flex;gap:0.4rem;margin-bottom:0.75rem;';
  const disableAllBtn = document.createElement('button');
  disableAllBtn.className = 'btn';
  disableAllBtn.textContent = 'Disable All';
  disableAllBtn.addEventListener('click', () => {
    const allCats = getFormCategories();
    const subCats = getFormSubCategories();
    // 'other' has no top-level toggle in the UI, so adding it would strand
    // users — re-enabling a subcategory or individual form wouldn't bring
    // it back. Subcategory + misc-form disables already cover 'other'.
    for (const cat of allCats) {
      if (cat === 'other') continue;
      state.disabledCategories.add(cat);
    }
    for (const [subKey] of subCats) state.disabledCategories.add(subKey);
    const miscForms = getOtherFormsWithoutSubCategory();
    for (const f of miscForms) state.excludedForms.add(f.formId);
    saveState(state);
    rebuildCollection();
    renderFormSettings();
  });
  const enableAllBtn = document.createElement('button');
  enableAllBtn.className = 'btn';
  enableAllBtn.textContent = 'Enable All';
  enableAllBtn.addEventListener('click', () => {
    state.disabledCategories.clear();
    state.excludedForms.clear();
    saveState(state);
    rebuildCollection();
    renderFormSettings();
  });
  toggleAllRow.appendChild(disableAllBtn);
  toggleAllRow.appendChild(enableAllBtn);
  formSettingsBodyEl.appendChild(toggleAllRow);

  const mainCats = ['regional', 'mega', 'gmax'];
  for (const cat of mainCats) {
    const forms = getAlternateFormsByCategory(cat);
    if (forms.length === 0) continue;
    const label = FORM_CATEGORY_LABELS[cat] || cat;
    const icon = MAIN_CAT_ICONS[cat] || '🔄';
    formSettingsBodyEl.appendChild(buildAccordionGroup(cat, label, icon, forms, true));
  }

  const divider = document.createElement('div');
  divider.className = 'section-divider';
  divider.textContent = 'Other Form Groups';
  formSettingsBodyEl.appendChild(divider);

  const subCats = getFormSubCategories();
  const sortedSubs = [...subCats.entries()].sort((a, b) => a[1][0].id - b[1][0].id);
  for (const [subKey, forms] of sortedSubs) {
    const speciesName = forms[0].name;
    const icon = FORM_SUBCATEGORY_ICONS[subKey] || '🔄';
    const label = `${speciesName} Forms`;
    formSettingsBodyEl.appendChild(buildAccordionGroup(subKey, label, icon, forms, false));
  }

  const miscForms = getOtherFormsWithoutSubCategory();
  if (miscForms.length > 0) {
    const miscDivider = document.createElement('div');
    miscDivider.className = 'section-divider';
    miscDivider.textContent = 'Other Individual Forms';
    formSettingsBodyEl.appendChild(miscDivider);

    for (const f of miscForms) {
      const isIncluded = !state.excludedForms.has(f.formId);
      const row = document.createElement('div');
      row.className = 'form-row misc-form-row';
      row.innerHTML = `
        <div class="form-row-left">
          <span class="form-dex">#${f.id}</span>
          ${f.name} <span class="form-name-sub">${f.formName ? '(' + f.formName + ')' : ''}</span>
        </div>
        <div class="mini-toggle${isIncluded ? ' on' : ''}"></div>
      `;
      row.addEventListener('click', () => {
        toggleExcludedForm(state, f.formId);
        const mt = row.querySelector('.mini-toggle');
        mt.classList.toggle('on');
        rebuildCollection();
      });
      formSettingsBodyEl.appendChild(row);
    }
  }
}

// ---- Book selector ----

function renderBookSelector() {
  bookSelectorEl.innerHTML = '';
  if (state.type === 'freestyle') return;
  for (let i = 0; i < state.books.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = state.books[i].name || `Book ${i + 1}`;
    bookSelectorEl.appendChild(opt);
  }
  bookSelectorEl.value = selectedBookIndex;
}

bookSelectorEl.addEventListener('change', () => {
  selectedBookIndex = parseInt(bookSelectorEl.value, 10);
  binderViewIndex = 0;
  rebuildBookCollection();
  renderBinder();
});

// ---- Book settings modal ----

function getAssignedSources() {
  const assigned = new Set();
  for (const book of state.books) {
    const sources = state.type === 'master' ? (book.sets || []) : (book.generations || []);
    for (const s of sources) assigned.add(s);
  }
  return assigned;
}

function getAllSources() {
  if (state.type === 'master') return state.sets || [];
  return state.generations || [1,2,3,4,5,6,7,8,9];
}

function sourceLabel(source) {
  if (state.type === 'master') {
    // Find set name from slotList
    const slot = (state.slotList || []).find(s => s.setId === source);
    return slot ? slot.setName : source;
  }
  return GENERATION_NAMES[source] || `Gen ${source}`;
}

function bookSourceCount(sources) {
  if (state.type === 'master') {
    const setIds = new Set(sources);
    return collection.filter(p => setIds.has(p.setId)).length;
  }
  return collection.filter(p => sources.includes(p.generation)).length;
}

function makeSourceChip(source, onRemove) {
  const chip = document.createElement('div');
  chip.className = 'gen-chip';
  chip.draggable = true;
  chip.dataset.gen = source;
  chip.innerHTML = `${sourceLabel(source)} <span class="gen-chip-remove">\u2715</span>`;
  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(source));
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
  if (onRemove) {
    chip.querySelector('.gen-chip-remove').addEventListener('click', () => onRemove(source));
  }
  return chip;
}

function setupDropZone(el, onDrop) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    const raw = e.dataTransfer.getData('text/plain');
    const val = state.type === 'master' ? raw : parseInt(raw, 10);
    if (val) onDrop(val);
  });
}

function getBookSourceKey() {
  return state.type === 'master' ? 'sets' : 'generations';
}

function renderBookSettings() {
  bookSettingsBodyEl.innerHTML = '';

  if (state.type === 'freestyle') return;

  const key = getBookSourceKey();
  const allSources = getAllSources();
  const assigned = getAssignedSources();
  const unassigned = allSources.filter(s => !assigned.has(s));

  const pool = document.createElement('div');
  pool.className = 'book-pool';
  if (unassigned.length > 0) {
    pool.innerHTML = '<div class="book-pool-label">Unassigned — drag into a book</div>';
    const chipsEl = document.createElement('div');
    chipsEl.className = 'book-pool-gens';
    for (const s of unassigned) chipsEl.appendChild(makeSourceChip(s, null));
    pool.appendChild(chipsEl);
  } else {
    pool.innerHTML = '<div class="book-pool-label">All sources assigned</div>';
  }
  setupDropZone(pool, (source) => {
    for (const book of state.books) {
      book[key] = (book[key] || []).filter(x => x !== source);
    }
    saveBooks(state, state.books);
    rebuildBookCollection();
    renderBookSettings();
  });
  bookSettingsBodyEl.appendChild(pool);

  const grid = document.createElement('div');
  grid.className = 'books-grid';
  for (let bi = 0; bi < state.books.length; bi++) {
    const book = state.books[bi];
    const sources = book[key] || [];
    const col = document.createElement('div');
    col.className = 'book-col';

    const header = document.createElement('div');
    header.className = 'book-col-header';
    header.innerHTML = `<span class="book-col-label">${book.name || `Book ${bi + 1}`}</span><span class="book-col-size">${bookSourceCount(sources)} slots</span>`;
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'book-col-body';
    for (const s of sources) {
      body.appendChild(makeSourceChip(s, (src) => {
        state.books[bi][key] = (state.books[bi][key] || []).filter(x => x !== src);
        saveBooks(state, state.books);
        rebuildBookCollection();
        renderBookSettings();
      }));
    }
    if (sources.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'book-pool-empty';
      empty.textContent = 'Drag here';
      body.appendChild(empty);
    }
    col.appendChild(body);

    setupDropZone(col, (source) => {
      for (const b of state.books) {
        b[key] = (b[key] || []).filter(x => x !== source);
      }
      if (!state.books[bi][key]) state.books[bi][key] = [];
      state.books[bi][key].push(source);
      if (state.type !== 'master') state.books[bi][key].sort((a, b) => a - b);
      saveBooks(state, state.books);
      rebuildBookCollection();
      renderBookSettings();
    });

    grid.appendChild(col);
  }
  bookSettingsBodyEl.appendChild(grid);

  if (unassigned.length > 0) {
    bookUnassignedEl.textContent = 'Unassigned: ' + unassigned.map(s => sourceLabel(s)).join(', ');
  } else {
    bookUnassignedEl.textContent = '';
  }
}

bookAddBtn.addEventListener('click', () => {
  const key = getBookSourceKey();
  const newBook = { name: '' };
  newBook[key] = [];
  state.books.push(newBook);
  saveBooks(state, state.books);
  renderBookSettings();
});

document.getElementById('book-remove-btn').addEventListener('click', () => {
  if (state.books.length <= 1) return;
  state.books.pop();
  saveBooks(state, state.books);
  if (selectedBookIndex >= state.books.length) selectedBookIndex = 0;
  rebuildBookCollection();
  renderBookSettings();
  renderBinder();
});

bookSettingsBtn.addEventListener('click', () => {
  if (state.type === 'freestyle') return;
  bookSettingsModal.hidden = false;
  renderBookSettings();
});

function closeBookSettings() {
  bookSettingsModal.hidden = true;
  rebuildBookCollection();
  if (currentView === 'binder') renderBinder();
}
bookModalCloseBtn.addEventListener('click', closeBookSettings);
bookSettingsModal.querySelector('.modal-backdrop').addEventListener('click', closeBookSettings);

// ---- Autocomplete search ----

let searchTimer;
let activeIndex = -1;

function searchMatches(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const p of collection) {
    if (results.length >= 10) break;
    if (p.isEmpty) continue;
    const nameMatch = p.name && p.name.toLowerCase().includes(q);
    const formMatch = p.formName && p.formName.toLowerCase().includes(q);
    const numMatch = String(p.id).startsWith(q);
    if (nameMatch || formMatch || numMatch) results.push(p);
  }
  return results;
}

function renderSearchDropdown(results) {
  searchDropdown.innerHTML = '';
  if (results.length === 0) {
    searchDropdown.hidden = true;
    return;
  }
  for (let i = 0; i < results.length; i++) {
    const p = results[i];
    const isCaught = state.caught.has(p.formId);
    const item = document.createElement('div');
    item.className = 'dropdown-item' + (isCaught ? ' caught' : '') + (i === activeIndex ? ' active' : '');
    item.dataset.index = i;
    let text = `#${p.collectionNum} ${p.name || ''}`;
    if (p.formName) text += ` (${p.formName})`;
    if (isCaught) text = '\u2713 ' + text;
    item.textContent = text;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectSearchResult(p);
    });
    searchDropdown.appendChild(item);
  }
  searchDropdown.hidden = false;
}

function dismissSearchDropdown() {
  searchDropdown.hidden = true;
  searchDropdown.innerHTML = '';
  activeIndex = -1;
}

function selectSearchResult(pokemon) {
  searchInput.value = '';
  dismissSearchDropdown();
  navigateTo(pokemon);
}

function navigateTo(pokemon) {
  if (currentView === 'list' && state.type === 'pokedex') {
    const row = pokemonListEl.querySelector(`[data-form-id="${pokemon.formId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          row.classList.add('highlight-pulse');
          row.addEventListener('animationend', () => row.classList.remove('highlight-pulse'), { once: true });
        }
      }, { threshold: 0.5 });
      observer.observe(row);
    }
  } else {
    let idx = bookCollection.findIndex(p => p.formId === pokemon.formId);
    if (idx === -1 && state.type !== 'freestyle') {
      for (let bi = 0; bi < state.books.length; bi++) {
        selectedBookIndex = bi;
        rebuildBookCollection();
        idx = bookCollection.findIndex(p => p.formId === pokemon.formId);
        if (idx >= 0) break;
      }
      if (idx === -1) return;
    }
    if (idx === -1) return;
    const layout = getLayout();
    const { perPage } = parseLayout(layout);
    const pageIndex = Math.floor(idx / perPage);
    const totalPages = getTotalPages(bookCollection.length, layout);
    const views = buildViews(totalPages);
    for (let v = 0; v < views.length; v++) {
      if (views[v].pages.includes(pageIndex)) {
        binderViewIndex = v;
        break;
      }
    }
    renderBinder();
    const slot = binderContainerEl.querySelector(`[data-form-id="${pokemon.formId}"]`);
    if (slot) {
      slot.classList.add('highlight-pulse');
      slot.addEventListener('animationend', () => slot.classList.remove('highlight-pulse'), { once: true });
    }
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    activeIndex = -1;
    if (!query) { dismissSearchDropdown(); return; }
    const results = searchMatches(query);
    renderSearchDropdown(results);
  }, 150);
});

searchInput.addEventListener('keydown', (e) => {
  if (searchDropdown.hidden) return;
  const items = searchDropdown.querySelectorAll('.dropdown-item');
  if (items.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % items.length;
    updateActiveItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    updateActiveItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < items.length) {
      const results = searchMatches(searchInput.value.trim());
      selectSearchResult(results[activeIndex]);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    searchInput.value = '';
    dismissSearchDropdown();
  }
});

function updateActiveItem(items) {
  for (let i = 0; i < items.length; i++) items[i].classList.toggle('active', i === activeIndex);
  if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) dismissSearchDropdown();
});

// ---- Scroll to top ----
window.addEventListener('scroll', () => { scrollTopBtn.hidden = window.scrollY < 300; });
scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

// ---- Card Picker ----

const cardPickerModal = document.getElementById('card-picker-modal');
const cardPickerName = document.getElementById('card-picker-name');
const cardPickerFilter = document.getElementById('card-picker-filter');
const cardPickerGrid = document.getElementById('card-picker-grid');
const cardPickerCount = document.getElementById('card-picker-count');
const cardPickerSelected = document.getElementById('card-picker-selected');
const cardPickerClose = document.getElementById('card-picker-close');
const cardPickerRefresh = document.getElementById('card-picker-refresh');
const cardPickerSave = document.getElementById('card-picker-save');
const cardPickerClear = document.getElementById('card-picker-clear');
const cardPickerBack = document.getElementById('card-picker-back');
const pickerIntentEl = document.getElementById('picker-intent');
const pickerIntentInputs = pickerIntentEl.querySelectorAll('input[name="picker-intent"]');

let pickerFormId = null;
let pickerCards = [];
let pickerSelectedCard = null;
let pickerFilterTimer;
let pickerPreviousFocus = null;
let pickerCurrentName = null;
let pickerOwnedIntent = false;

let pickerMode = 'cards'; // 'pokemon-search' or 'cards'

async function openCardPicker(formId, pokemonName) {
  pickerPreviousFocus = document.activeElement;
  pickerFormId = formId;
  pickerCurrentName = pokemonName;
  pickerSelectedCard = null;
  pickerOwnedIntent = false;

  if (state.type === 'pokedex') {
    const existingCard = state.cardSelections[formId];
    const isCaught = state.caught.has(formId);
    if (existingCard) pickerSelectedCard = existingCard;
    else if (isCaught) pickerSelectedCard = EMPTY_CARD;
  } else if (state.type === 'freestyle') {
    const slotIdx = parseInt(formId, 10);
    const existing = state.slots && state.slots[slotIdx];
    if (existing) {
      pickerSelectedCard = existing;
      pickerOwnedIntent = state.caught.has(String(slotIdx));
    }
  }

  cardPickerFilter.value = '';
  cardPickerModal.hidden = false;

  if (state.type === 'freestyle' && !pokemonName) {
    // Freestyle: show Pokemon search first
    pickerMode = 'pokemon-search';
    cardPickerName.textContent = 'Search for a Pokemon';
    cardPickerFilter.placeholder = 'Type a Pokemon name...';
    cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">Type a Pokemon name above to search for cards</div>';
    cardPickerCount.textContent = '';
    updatePickerFooter();
    cardPickerFilter.focus();
    return;
  }

  // Normal flow: load cards for the given Pokemon
  pickerMode = 'cards';
  cardPickerName.textContent = pokemonName ? `Cards for ${pokemonName}` : 'Select a card';
  cardPickerFilter.placeholder = 'Filter by set, number, rarity...';
  cardPickerGrid.innerHTML = '<div class="card-picker-loading">Loading cards...</div>';
  cardPickerCount.textContent = '';
  updatePickerFooter();

  const result = await fetchCardsForPokemon(pokemonName || '');
  pickerCards = result.cards;

  if (result.error && pickerCards.length === 0) {
    cardPickerGrid.innerHTML = `<div class="card-picker-error">Failed to load cards: ${result.error}</div>`;
    return;
  }

  renderPickerCards(pickerCards);
  requestAnimationFrame(() => {
    const firstItem = cardPickerGrid.querySelector('.card-picker-item');
    if (firstItem) firstItem.focus();
  });
}

const EMPTY_CARD = { cardId: '__empty__', name: '', number: '', setName: '', setYear: '', rarity: '', imageSmall: '' };

function renderPickerCards(cards) {
  cardPickerGrid.innerHTML = '';
  cardPickerCount.textContent = `${cards.length} cards`;

  // "No card" option for pokedex
  if (state.type === 'pokedex') {
    const emptyItem = document.createElement('div');
    const isEmptySelected = pickerSelectedCard && pickerSelectedCard.cardId === '__empty__';
    emptyItem.className = 'card-picker-item card-picker-empty' + (isEmptySelected ? ' selected' : '');
    emptyItem.tabIndex = 0;
    emptyItem.innerHTML = `
      <div class="card-picker-empty-art">&#10003;</div>
      <div class="card-picker-item-info">
        <div><span class="card-picker-item-number">Caught</span></div>
        <div class="card-picker-item-set">No specific card</div>
      </div>
    `;
    emptyItem.addEventListener('click', () => {
      if (pickerSelectedCard && pickerSelectedCard.cardId === '__empty__') {
        pickerSelectedCard = null;
        emptyItem.classList.remove('selected');
      } else {
        pickerSelectedCard = EMPTY_CARD;
        for (const el of cardPickerGrid.querySelectorAll('.card-picker-item')) el.classList.remove('selected');
        emptyItem.classList.add('selected');
      }
      updatePickerFooter();
    });
    cardPickerGrid.appendChild(emptyItem);
  }

  for (const card of cards) {
    const item = document.createElement('div');
    item.className = 'card-picker-item' + (pickerSelectedCard && pickerSelectedCard.cardId === card.cardId ? ' selected' : '');
    item.tabIndex = 0;
    item.innerHTML = `
      <img src="${card.imageSmall}" alt="${card.name}" loading="lazy">
      <div class="card-picker-item-info">
        <div><span class="card-picker-item-number">${card.number}</span> ${card.name}</div>
        <div class="card-picker-item-set">${card.setName} (${card.setYear})</div>
        <div class="card-picker-item-rarity">${card.rarity}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      if (pickerSelectedCard && pickerSelectedCard.cardId === card.cardId) {
        pickerSelectedCard = null;
        item.classList.remove('selected');
      } else {
        pickerSelectedCard = card;
        for (const el of cardPickerGrid.querySelectorAll('.card-picker-item')) el.classList.remove('selected');
        item.classList.add('selected');
      }
      updatePickerFooter();
    });
    cardPickerGrid.appendChild(item);
  }
}

function updatePickerFooter() {
  if (pickerSelectedCard && pickerSelectedCard.cardId === '__empty__') {
    cardPickerSelected.innerHTML = `Selected: <strong style="color:var(--caught-border)">Caught (no card)</strong>`;
  } else if (pickerSelectedCard) {
    cardPickerSelected.innerHTML = `Selected: <strong style="color:var(--caught-border)">${pickerSelectedCard.setName} ${pickerSelectedCard.number}</strong>`;
  } else {
    cardPickerSelected.textContent = state.type === 'freestyle' ? 'No selection' : 'No selection (will mark uncaught)';
  }
  updatePickerIntent();
  updatePickerBackVisibility();
}

function updatePickerIntent() {
  const shouldShow = state.type === 'freestyle' && !!pickerSelectedCard;
  pickerIntentEl.hidden = !shouldShow;
  if (shouldShow) {
    for (const input of pickerIntentInputs) {
      input.checked = (input.value === 'owned') === pickerOwnedIntent;
    }
  }
}

function updatePickerBackVisibility() {
  cardPickerBack.hidden = !(state.type === 'freestyle' && pickerMode === 'cards');
  const isSearchMode = pickerMode === 'pokemon-search';
  cardPickerSave.hidden = isSearchMode;
  cardPickerClear.hidden = isSearchMode;
}

function closeCardPicker() {
  cardPickerModal.hidden = true;
  pickerFormId = null;
  pickerCurrentName = null;
  pickerCards = [];
  pickerSelectedCard = null;
  pickerOwnedIntent = false;
  pickerMode = 'cards';
  pickerIntentEl.hidden = true;
  cardPickerBack.hidden = true;
  cardPickerFilter.placeholder = 'Filter by set, number, rarity...';
}

for (const input of pickerIntentInputs) {
  input.addEventListener('change', () => {
    if (input.checked) pickerOwnedIntent = (input.value === 'owned');
  });
}

function restorePickerFocus() {
  const el = pickerPreviousFocus;
  const formId = el ? el.dataset.formId : null;
  pickerPreviousFocus = null;
  requestAnimationFrame(() => {
    if (el && el.isConnected) el.focus();
    else if (formId) {
      const newEl = binderContainerEl.querySelector(`[data-form-id="${formId}"]`);
      if (newEl) newEl.focus();
    }
  });
}

cardPickerClose.addEventListener('click', () => { closeCardPicker(); restorePickerFocus(); });
cardPickerModal.querySelector('.modal-backdrop').addEventListener('click', () => { closeCardPicker(); restorePickerFocus(); });

cardPickerBack.addEventListener('click', () => {
  pickerMode = 'pokemon-search';
  pickerSelectedCard = null;
  pickerCurrentName = null;
  pickerCards = [];
  pickerOwnedIntent = false;
  cardPickerFilter.value = '';
  cardPickerFilter.placeholder = 'Type a Pokemon name...';
  cardPickerName.textContent = 'Search for a Pokemon';
  cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">Type a Pokemon name above to search for cards</div>';
  cardPickerCount.textContent = '';
  updatePickerFooter();
  cardPickerFilter.focus();
});

document.addEventListener('keydown', (e) => {
  if (cardPickerModal.hidden) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCardPicker();
    restorePickerFocus();
  } else if (e.key === 'Enter') {
    if (pickerMode === 'pokemon-search') return;
    const focused = document.activeElement;
    if (focused && focused.classList.contains('card-picker-item')) return;
    if (focused === cardPickerFilter) return;
    e.preventDefault();
    cardPickerSave.click();
  }
});

cardPickerSave.addEventListener('click', () => {
  if (!pickerFormId) { closeCardPicker(); return; }

  if (state.type === 'freestyle') {
    const idx = parseInt(pickerFormId, 10);
    if (pickerSelectedCard && pickerSelectedCard.cardId !== '__empty__') {
      const idxStr = String(idx);
      if (pickerOwnedIntent) state.caught.add(idxStr);
      else state.caught.delete(idxStr);
      setFreestyleSlot(state, idx, pickerSelectedCard);
      rebuildCollection();
    }
  } else if (state.type === 'pokedex') {
    if (pickerSelectedCard) {
      if (pickerSelectedCard.cardId === '__empty__') {
        clearCardSelection(state, pickerFormId);
        if (!state.caught.has(pickerFormId)) {
          state.caught.add(pickerFormId);
          saveState(state);
        }
      } else {
        setCardSelection(state, pickerFormId, pickerSelectedCard);
        if (!state.caught.has(pickerFormId)) {
          state.caught.add(pickerFormId);
          saveState(state);
        }
      }
    } else {
      clearCardSelection(state, pickerFormId);
      if (state.caught.has(pickerFormId)) {
        state.caught.delete(pickerFormId);
        saveState(state);
      }
    }
  }

  closeCardPicker();
  renderBinder();
  updateStats();
  restorePickerFocus();
});

cardPickerClear.addEventListener('click', () => {
  if (pickerFormId) {
    if (state.type === 'freestyle') {
      clearFreestyleSlot(state, parseInt(pickerFormId, 10));
      rebuildCollection();
    } else {
      clearCardSelection(state, pickerFormId);
      if (state.caught.has(pickerFormId)) {
        state.caught.delete(pickerFormId);
        saveState(state);
      }
    }
  }
  closeCardPicker();
  renderBinder();
  updateStats();
  restorePickerFocus();
});

cardPickerRefresh.addEventListener('click', async () => {
  if (!pickerCurrentName) return;
  cardPickerRefresh.disabled = true;
  cardPickerRefresh.textContent = '...';
  const result = await fetchCardsForPokemon(pickerCurrentName, { skipCache: true });
  cardPickerRefresh.disabled = false;
  cardPickerRefresh.textContent = '\u21BB';
  if (result.error && result.cards.length === 0) {
    cardPickerCount.textContent = 'Refresh failed';
    return;
  }
  pickerCards = result.cards;
  renderPickerCards(pickerCards);
});

cardPickerGrid.addEventListener('keydown', (e) => {
  const items = cardPickerGrid.querySelectorAll('.card-picker-item');
  if (items.length === 0) return;
  const focused = document.activeElement;
  if (!focused || !focused.classList.contains('card-picker-item')) return;
  const idx = Array.prototype.indexOf.call(items, focused);
  if (idx === -1) return;
  const cols = getComputedStyle(cardPickerGrid).gridTemplateColumns.split(' ').length;

  if (e.key === 'ArrowRight') { e.preventDefault(); if (idx + 1 < items.length) items[idx + 1].focus(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (idx - 1 >= 0) items[idx - 1].focus(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); const next = idx + cols; if (next < items.length) items[next].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = idx - cols; if (prev >= 0) items[prev].focus(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (pickerMode !== 'cards') {
      focused.click(); // select Pokemon in search mode
      return;
    }
    // If this card isn't selected yet, select it then save
    // If already selected, just save
    if (!focused.classList.contains('selected')) {
      focused.click();
    }
    cardPickerSave.click();
  }
});

async function runPickerSearch() {
  const q = cardPickerFilter.value.trim();
  if (!q) {
    if (pickerMode === 'pokemon-search') {
      cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">Type a Pokemon name above to search for cards</div>';
      cardPickerCount.textContent = '';
    } else {
      renderPickerCards(pickerCards);
    }
    return;
  }

  if (pickerMode === 'pokemon-search') {
    cardPickerGrid.innerHTML = '';
    cardPickerCount.textContent = '';
    const allPokemon = (await import('./data.js')).getAllPokemon();
    const ql = q.toLowerCase();
    const matches = allPokemon
      .filter(p => p.isDefault && p.name.toLowerCase().includes(ql))
      .slice(0, 20);

    if (matches.length === 0) {
      cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">No Pokemon found</div>';
      return;
    }

    for (const p of matches) {
      const item = document.createElement('div');
      item.className = 'card-picker-item card-picker-empty';
      item.tabIndex = 0;
      item.innerHTML = `
        <div class="card-picker-empty-art" style="font-size:1rem;">#${p.id}</div>
        <div class="card-picker-item-info">
          <div><span class="card-picker-item-number">${p.name}</span></div>
        </div>
      `;
      item.addEventListener('click', () => selectPokemonFromSearch(p.name));
      cardPickerGrid.appendChild(item);
    }
    return;
  }

  // Normal card filter mode
  const ql = q.toLowerCase();
  const filtered = pickerCards.filter(c =>
    c.setName.toLowerCase().includes(ql) || c.number.toLowerCase().includes(ql) || c.rarity.toLowerCase().includes(ql)
  );
  renderPickerCards(filtered);
}

async function selectPokemonFromSearch(name) {
  pickerMode = 'cards';
  pickerCurrentName = name;
  cardPickerName.textContent = `Cards for ${name}`;
  cardPickerFilter.value = '';
  cardPickerFilter.placeholder = 'Filter by set, number, rarity...';
  cardPickerGrid.innerHTML = '<div class="card-picker-loading">Loading cards...</div>';
  cardPickerCount.textContent = '';
  updatePickerBackVisibility();
  const result = await fetchCardsForPokemon(name);
  pickerCards = result.cards;
  if (result.error && pickerCards.length === 0) {
    cardPickerGrid.innerHTML = `<div class="card-picker-error">Failed to load cards: ${result.error}</div>`;
    return;
  }
  renderPickerCards(pickerCards);
  requestAnimationFrame(() => {
    const firstItem = cardPickerGrid.querySelector('.card-picker-item');
    if (firstItem) firstItem.focus();
  });
}

cardPickerFilter.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const firstItem = cardPickerGrid.querySelector('.card-picker-item');
    if (firstItem) firstItem.focus();
  } else if (e.key === 'Enter' && pickerMode === 'pokemon-search') {
    e.preventDefault();
    (async () => {
      clearTimeout(pickerFilterTimer);
      await runPickerSearch();
      const focused = document.activeElement;
      if (focused && focused.classList.contains('card-picker-item') && cardPickerGrid.contains(focused)) {
        focused.click();
        return;
      }
      const first = cardPickerGrid.querySelector('.card-picker-item');
      if (first) first.click();
    })();
  }
});

cardPickerFilter.addEventListener('input', () => {
  clearTimeout(pickerFilterTimer);
  pickerFilterTimer = setTimeout(runPickerSearch, 150);
});

// ---- Stats bar toggle ----
statsBar.addEventListener('click', () => {
  statsGenEl.classList.toggle('collapsed');
  statsBar.querySelector('.stats-chevron').classList.toggle('open');
});

// ---- List keyboard navigation ----
pokemonListEl.addEventListener('keydown', (e) => {
  const rows = pokemonListEl.querySelectorAll('.pokemon-row');
  if (rows.length === 0) return;
  const focused = document.activeElement;
  if (!focused || !focused.classList.contains('pokemon-row')) return;
  const cols = getComputedStyle(pokemonListEl).gridTemplateColumns.split(' ').length;
  const idx = Array.prototype.indexOf.call(rows, focused);

  if (e.key === 'ArrowDown') { e.preventDefault(); const next = rows[idx + cols]; if (next) next.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = rows[idx - cols]; if (prev) prev.focus(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); const next = rows[idx + 1]; if (next) next.focus(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); const prev = rows[idx - 1]; if (prev) prev.focus(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (focused.dataset.formId) handleToggleCaught(focused.dataset.formId); }
});

// ---- Binder keyboard navigation ----

function getVisualSlots() {
  const grids = Array.from(binderContainerEl.querySelectorAll('.binder-grid:not(.binder-page-blank)'));
  if (grids.length <= 1 || state.binderFlow !== 'row') {
    return Array.from(binderContainerEl.querySelectorAll('.binder-slot:not(.empty)'));
  }
  const leftSlots = Array.from(grids[0].querySelectorAll('.binder-slot'));
  const rightSlots = Array.from(grids[1].querySelectorAll('.binder-slot'));
  const cols = getComputedStyle(grids[0]).gridTemplateColumns.split(' ').length;
  const rows = Math.ceil(leftSlots.length / cols);
  const visual = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) { const s = leftSlots[r * cols + c]; if (s && !s.classList.contains('empty')) visual.push(s); }
    for (let c = 0; c < cols; c++) { const s = rightSlots[r * cols + c]; if (s && !s.classList.contains('empty')) visual.push(s); }
  }
  return visual;
}

document.addEventListener('keydown', (e) => {
  if (currentView !== 'binder' || !cardPickerModal.hidden) return;
  const focused = document.activeElement;
  if (!focused || !focused.dataset.formId) return;
  const grid = focused.closest('.binder-grid');
  if (!grid) return;

  const visualSlots = getVisualSlots();
  const visualIdx = visualSlots.indexOf(focused);
  if (visualIdx === -1) return;

  const gridSlots = Array.from(grid.querySelectorAll('.binder-slot:not(.empty)'));
  const gridIdx = gridSlots.indexOf(focused);
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const realGrids = Array.from(binderContainerEl.querySelectorAll('.binder-grid:not(.binder-page-blank)'));
  const isRowFlow = state.binderFlow === 'row' && realGrids.length === 2;
  const visualCols = isRowFlow ? cols * 2 : cols;
  const layout = getLayout();
  const totalViews = getTotalViews(bookCollection.length, layout);

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (visualIdx + 1 < visualSlots.length) visualSlots[visualIdx + 1].focus();
    else if (binderViewIndex < totalViews - 1) { binderViewIndex++; renderBinder(); requestAnimationFrame(() => { const ns = getVisualSlots(); if (ns.length) ns[0].focus(); }); }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (visualIdx - 1 >= 0) visualSlots[visualIdx - 1].focus();
    else if (binderViewIndex > 0) { binderViewIndex--; renderBinder(); requestAnimationFrame(() => { const ns = getVisualSlots(); if (ns.length) ns[ns.length - 1].focus(); }); }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (isRowFlow) { const next = visualIdx + visualCols; if (next < visualSlots.length) visualSlots[next].focus(); }
    else { const next = gridIdx + cols; if (next < gridSlots.length) gridSlots[next].focus(); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (isRowFlow) { const prev = visualIdx - visualCols; if (prev >= 0) visualSlots[prev].focus(); }
    else { const prev = gridIdx - cols; if (prev >= 0) gridSlots[prev].focus(); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const formId = focused.dataset.formId;
    if (formId) {
      const p = bookCollection.find(pk => pk.formId === formId);
      if (p) handleSlotClick(formId, p.name, e);
    }
  }
});

// ---- View toggle ----
viewListBtn.addEventListener('click', () => switchView('list'));
viewBinderBtn.addEventListener('click', () => switchView('binder'));

// ---- Binder controls ----
const binderFlowCheck = document.getElementById('binder-flow-check');
binderLayoutSelect.addEventListener('change', () => {
  setBinderLayout(state, binderLayoutSelect.value);
  binderViewIndex = 0;
  renderBinder();
});
binderFlowCheck.addEventListener('change', () => {
  setBinderFlow(state, binderFlowCheck.checked ? 'row' : 'page');
  renderBinder();
});
binderPrev.addEventListener('click', () => {
  if (binderViewIndex > 0) {
    binderViewIndex--;
  } else if (state.type !== 'freestyle' && selectedBookIndex > 0) {
    selectedBookIndex--;
    rebuildBookCollection();
    binderViewIndex = getTotalViews(bookCollection.length, getLayout()) - 1;
  }
  renderBinder();
});
binderNext.addEventListener('click', () => {
  const totalViews = getTotalViews(bookCollection.length, getLayout());
  if (binderViewIndex < totalViews - 1) {
    binderViewIndex++;
  } else if (state.type !== 'freestyle' && selectedBookIndex < state.books.length - 1) {
    selectedBookIndex++;
    rebuildBookCollection();
    binderViewIndex = 0;
  }
  renderBinder();
});

// Page input
function goToPageFromInput() {
  const pageNum = parseInt(binderPageInput.value, 10);
  if (isNaN(pageNum) || pageNum < 1) return;
  const layout = getLayout();
  const totalPages = getTotalPages(bookCollection.length, layout);
  const targetPage = Math.min(pageNum, totalPages) - 1;
  const views = buildViews(totalPages);
  for (let v = 0; v < views.length; v++) {
    if (views[v].pages.includes(targetPage)) { binderViewIndex = v; break; }
  }
  renderBinder();
}
binderPageInput.addEventListener('change', goToPageFromInput);
binderPageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goToPageFromInput(); binderPageInput.blur(); } });

// ---- Export/Import/Reset ----
exportBtn.addEventListener('click', () => exportState(state));
importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = await importState(file);
    updateTypeAwareControls();
    rebuildCollection();
    if (state.type === 'pokedex') renderFormSettings();
  } catch (err) { alert('Import failed: ' + err.message); }
  importInput.value = '';
});
resetBtn.addEventListener('click', () => {
  if (confirm('Reset all progress? This will mark everything as uncaught.')) {
    resetCaught(state);
    renderCurrentView();
    updateStats();
  }
});

// ---- Form settings modal ----
formSettingsBtn.addEventListener('click', () => {
  if (state.type !== 'pokedex') return;
  formSettingsModal.hidden = false;
  renderFormSettings();
});
modalCloseBtn.addEventListener('click', () => { formSettingsModal.hidden = true; });
formSettingsModal.querySelector('.modal-backdrop').addEventListener('click', () => { formSettingsModal.hidden = true; });

// ---- Sync UI ----
const syncBtn = document.getElementById('sync-btn');
const syncModal = document.getElementById('sync-modal');
const syncModalClose = document.getElementById('sync-modal-close');
const syncPatInput = document.getElementById('sync-pat-input');
const syncGistInput = document.getElementById('sync-gist-input');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncDisconnectBtn = document.getElementById('sync-disconnect-btn');
const syncStatusBox = document.getElementById('sync-status-box');
const syncIndicator = document.getElementById('sync-indicator');

function updateSyncButton() { syncBtn.classList.toggle('connected', isSyncConfigured()); }

function showSyncIndicator(status, message) {
  syncIndicator.textContent = message;
  syncIndicator.className = 'sync-indicator ' + status;
  syncIndicator.hidden = false;
  if (status === 'synced') setTimeout(() => { syncIndicator.hidden = true; }, 2000);
}

setStatusCallback(showSyncIndicator);

async function handleRemoteData(raw) {
  if (!raw || typeof raw !== 'object') return false;
  let bundle = parseBundle(raw);
  let needsMigrationPush = false;
  if (!bundle && isLegacyV1(raw)) {
    const localCollections = await getAllCollectionsFull();
    bundle = migrateV1ToV2(raw, localCollections);
    needsMigrationPush = true;
  }
  if (!bundle) return false;

  const rehydrated = await rehydrateBundle(bundle.collections);
  await reconcileBundleToIDB(rehydrated);

  if (bundle.settings && bundle.settings.binderFlow) {
    saveSettings({ binderFlow: bundle.settings.binderFlow });
  }

  const localActiveId = getActiveCollectionId();
  const availableIds = new Set(rehydrated.map(r => r.id));
  if (!availableIds.has(localActiveId)) {
    let nextId;
    if (bundle.activeId && availableIds.has(bundle.activeId)) nextId = bundle.activeId;
    else if (rehydrated.length > 0) nextId = rehydrated[0].id;
    else nextId = 'living-dex';
    setActiveCollectionId(nextId);
  }

  state = await loadState();

  return { handled: true, needsMigrationPush };
}

setRemoteChangeCallback(async (data) => {
  const result = await handleRemoteData(data);
  if (result && result.handled) {
    if (result.needsMigrationPush) await pushBundle(state);
    updateTypeAwareControls();
    binderFlowCheck.checked = state.binderFlow === 'row';
    rebuildCollection();
  }
});

syncBtn.addEventListener('click', () => {
  const config = getSyncConfig();
  syncPatInput.value = config.pat;
  syncGistInput.value = config.gistId;
  syncStatusBox.textContent = isSyncConfigured() ? 'Connected' : 'Not connected';
  syncStatusBox.className = 'sync-status-box ' + (isSyncConfigured() ? 'connected' : '');
  syncModal.hidden = false;
});

function closeSyncModal() { syncModal.hidden = true; }
syncModalClose.addEventListener('click', closeSyncModal);
syncModal.querySelector('.modal-backdrop').addEventListener('click', closeSyncModal);

syncSaveBtn.addEventListener('click', async () => {
  const pat = syncPatInput.value.trim();
  const gistId = syncGistInput.value.trim();
  if (!pat || !gistId) {
    syncStatusBox.textContent = 'Please enter both fields';
    syncStatusBox.className = 'sync-status-box error';
    return;
  }
  setSyncConfig(pat, gistId);
  syncStatusBox.textContent = 'Testing connection...';
  syncStatusBox.className = 'sync-status-box';
  try {
    const gist = await loadFromGist();
    if (gist && gist.data) {
      const result = await handleRemoteData(gist.data);
      if (result && result.handled) {
        setLastSavedJson(gist.raw);
        if (result.needsMigrationPush) await pushBundle(state);
        updateTypeAwareControls();
        binderFlowCheck.checked = state.binderFlow === 'row';
        rebuildCollection();
      }
    } else {
      // Empty gist — publish current local state as the initial bundle
      setLastSavedJson('');
      await pushBundle(state);
    }
    syncStatusBox.textContent = 'Connected!';
    syncStatusBox.className = 'sync-status-box connected';
    updateSyncButton();
    startPolling(30000);
    closeSyncModal();
  } catch (err) {
    syncStatusBox.textContent = 'Error: ' + err.message;
    syncStatusBox.className = 'sync-status-box error';
    clearSyncConfig();
    updateSyncButton();
    stopPolling();
  }
});

syncDisconnectBtn.addEventListener('click', () => {
  clearSyncConfig();
  stopPolling();
  syncStatusBox.textContent = 'Disconnected. Data remains in this browser.';
  syncStatusBox.className = 'sync-status-box';
  updateSyncButton();
});

// ---- Legacy cleanup ----
function cleanupLegacyStorage() {
  localStorage.removeItem('pokedex-tracker');
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tcg-cache-')) keysToRemove.push(key);
  }
  for (const key of keysToRemove) localStorage.removeItem(key);
}

// ---- Init ----
async function init() {
  cleanupLegacyStorage();
  state = await loadState();
  await loadPokemonData();

  if (isSyncConfigured()) {
    try {
      const gist = await loadFromGist();
      if (gist && gist.data) {
        const result = await handleRemoteData(gist.data);
        if (result && result.handled) {
          setLastSavedJson(gist.raw);
          if (result.needsMigrationPush) await pushBundle(state);
        } else {
          setLastSavedJson(gist.raw);
        }
      } else {
        setLastSavedJson('');
        await pushBundle(state);
      }
      startPolling(30000);
    } catch { /* Fall back to local state */ }
  }

  binderLayoutSelect.value = getLayout();
  binderFlowCheck.checked = state.binderFlow === 'row';
  updateSyncButton();
  updateTypeAwareControls();
  rebuildCollection();

  if (state.type === 'pokedex') switchView(currentView);
  else switchView('binder');
}

// Re-sync on tab focus
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isSyncConfigured()) {
    try {
      const gist = await loadFromGist();
      if (gist && gist.data) {
        cancelPendingSave();
        const result = await handleRemoteData(gist.data);
        if (result && result.handled) {
          setLastSavedJson(gist.raw);
          if (result.needsMigrationPush) await pushBundle(state);
          updateTypeAwareControls();
          rebuildCollection();
        }
      }
    } catch { /* Ignore */ }
  }
});

init();
