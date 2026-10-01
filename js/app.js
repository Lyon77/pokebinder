import {
  loadPokemonData, getAllPokemon, getFormCategories, getAlternateFormsByCategory,
  getFormSubCategories, getOtherFormsWithoutSubCategory,
  FORM_CATEGORY_LABELS, FORM_SUBCATEGORY_ICONS,
} from './data.js';
import { buildCollection, buildBookCollection } from './collection.js';
import { renderListView, updateListCaughtState } from './render.js';
import { renderBinderView, updateBinderSlot, getTotalViews, getViewPageInfo, parseLayout, getTotalPages, buildViews } from './binder.js';
import { computeStats, computeMasterStats, renderStats, renderMasterStats } from './stats.js';
import {
  loadState, saveState, loadStateFromData,
  loadSettings, saveSettings,
  getActiveCollectionId, setActiveCollectionId,
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setBinderHeaders, setCardSelection, clearCardSelection,
  setFreestyleSlot, clearFreestyleSlot,
  saveBooks, addSetToCollection, removeSetFromCollection,
  exportState, importState, resetCaught,
  defaultCollectionRecord,
  parseBundle, rehydrateBundle, reconcileBundleToIDB,
  pushBundle, currentBundleJson, saveCollectionRecord, deleteCollectionRecord,
  setSaveErrorCallback,
} from './storage.js';
import {
  isSyncConfigured, getSyncConfig, setSyncConfig, clearSyncConfig,
  hasPendingLocalChange,
  setStatusCallback, setRemoteChangeCallback, setLastSavedJson,
  loadFromGist, cancelPendingSave, startPolling, stopPolling,
  flushStashedPending,
} from './sync.js';
import { fetchCardsForPokemon, searchCardsByScanHints, fetchSets, fetchSetCards, expandVariants, hydrateCards, ensureOverridesLoaded, getVariantLabel } from './tcg-api.js';
import {
  hasClearScanLeader,
  rankCardCandidates,
  recognizeCardImage,
  visualResultToScanHints,
} from './card-scanner.js';
import { createCollectorVisionScannerApplet } from '../vendor/collectorvision/lib/collectorvision-scanner-applet.mjs';
import { getAllCollections, getAllCollectionsFull, clearAllTcgCache } from './db.js';

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
const bookSettingsDescEl = document.getElementById('book-settings-description');
const bookUnassignedEl = document.getElementById('book-unassigned');
const bookAddBtn = document.getElementById('book-add-btn');
const bookSetsSection = document.getElementById('book-sets-section');
const bookSetSearch = document.getElementById('book-set-search');
const bookSetResults = document.getElementById('book-set-results');
const bookIncludedSets = document.getElementById('book-included-sets');
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
  } else if (state.type === 'master') {
    const stats = computeMasterStats(collection, state.caught, state.sets || []);
    renderMasterStats(statsOverallText, statsOverallBar, statsGenEl, stats);
  } else {
    const filled = collection.filter(s => !s.isEmpty);
    const total = filled.length;
    const caught = filled.filter(s => state.caught.has(s.formId)).length;
    const pct = total > 0 ? ((caught / total) * 100).toFixed(1) : '0.0';
    statsOverallText.textContent = `${caught} / ${total} (${pct}%)`;
    statsOverallBar.style.width = `${total > 0 ? (caught / total) * 100 : 0}%`;
    statsGenEl.innerHTML = '';
  }
}

function updateTypeAwareControls() {
  if (!cardPickerModal.hidden) {
    closeCardPicker();
    pickerPreviousFocus = null;
  }
  const isPokedex = state.type === 'pokedex';
  const isFreestyle = state.type === 'freestyle';

  document.body.dataset.type = state.type || 'pokedex';

  // Forms button: pokedex only
  formSettingsBtn.hidden = !isPokedex;
  // Books button: pokedex and master only
  bookSettingsBtn.hidden = isFreestyle;
  // List/Binder toggle: always visible, but list button is disabled for freestyle
  viewToggle.hidden = false;
  viewListBtn.disabled = isFreestyle;
  viewListBtn.title = isFreestyle ? 'List view is not available for Freestyle collections' : '';
  // Book selector: not for freestyle
  bookSelectorEl.hidden = isFreestyle;

  // Force binder view for freestyle (no list view)
  if (isFreestyle) {
    if (currentView === 'list') {
      currentView = 'binder';
    }
    listViewEl.hidden = true;
    binderViewEl.hidden = false;
    viewListBtn.classList.remove('active');
    viewBinderBtn.classList.add('active');
    viewSlider.classList.add('right');
  }

  // Update header title
  collectionTitle.innerHTML = `${(state.collectionName || 'Collection').toUpperCase()} <span class="chevron"></span>`;

  // Update layout selector to match collection
  binderLayoutSelect.value = getLayout();
}

// ---- Slot click handlers ----

let lastTouchedFormId = null;

function flashScan(container, slotId) {
  const el = container.querySelector(`[data-form-id="${CSS.escape(String(slotId))}"]`);
  if (!el) return;
  el.classList.add('scanning');
  setTimeout(() => el.classList.remove('scanning'), 380);
}

function handleToggleCaught(slotId) {
  if (currentView === 'list') lastTouchedFormId = slotId;
  toggleCaught(state, slotId);
  const becameCaught = state.caught.has(slotId);
  if (currentView === 'list') {
    updateListCaughtState(pokemonListEl, state.caught);
    if (becameCaught) flashScan(pokemonListEl, slotId);
  } else {
    const cardSels = state.type === 'pokedex' ? (state.cardSelections || {}) : {};
    const swapped = updateBinderSlot(
      binderContainerEl, slotId, bookCollection, state.caught,
      cardSels, handleToggleCaught, handleSlotClick, state.type,
    );
    if (!swapped) renderBinder();
    if (becameCaught) flashScan(binderContainerEl, slotId);
  }
  updateStats();
}

function handleSlotClick(slotId, name, event) {
  if (state.type === 'master') {
    handleToggleCaught(slotId);
  } else if (state.type === 'freestyle') {
    // Empty slot → pokemon-search mode; filled slot → cards mode for that pokemon.
    openCardPicker(slotId, name || '');
  } else {
    openCardPicker(slotId, name);
  }
}

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
    const refreshBtn = c.type === 'master'
      ? `<button class="collection-dd-refresh" data-refresh-id="${c.id}" title="Refresh slots">&#10227;</button>`
      : '';
    item.innerHTML = `
      <div class="collection-dd-left">
        <span class="collection-dd-check">${c.id === activeId ? '&#10003;' : ''}</span>
        <span>${c.name}</span>
      </div>
      <div class="collection-dd-right">
        <span class="collection-dd-type">${typeBadge}</span>
        ${refreshBtn}
        <button class="collection-dd-rename" data-rename-id="${c.id}" title="Rename">&#9998;</button>
        ${collections.length > 1 ? `<button class="collection-dd-delete" data-delete-id="${c.id}" title="Delete">&times;</button>` : ''}
      </div>
    `;
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.collection-dd-delete') || e.target.closest('.collection-dd-rename') || e.target.closest('.collection-dd-refresh')) return;
      if (c.id !== activeId) {
        setActiveCollectionId(c.id);
        state = await loadState();
        selectedBookIndex = 0;
        binderViewIndex = 0;
        updateTypeAwareControls();
        rebuildCollection();
        const binderFlowCheck = document.getElementById('binder-flow-check');
        binderFlowCheck.checked = state.binderFlow === 'row';
        const binderHeadersCheck = document.getElementById('binder-headers-check');
        binderHeadersCheck.checked = state.binderHeaders !== false;
        applyBinderHeaders();
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

  // Refresh handlers (master sets only)
  for (const btn of collectionDropdown.querySelectorAll('.collection-dd-refresh')) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.refreshId;
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '&hellip;';
      try {
        await refreshMasterSlots(id, id === activeId);
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
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

async function refreshMasterSlots(id, isActive) {
  const { getCollection } = await import('./db.js');
  const record = isActive ? null : await getCollection(id);
  const sets = isActive ? (state.sets || []) : (record && Array.isArray(record.sets) ? record.sets : []);
  const oldSlotList = isActive ? (state.slotList || []) : (record && Array.isArray(record.slotList) ? record.slotList : []);
  const caughtSet = isActive ? state.caught : new Set(record && Array.isArray(record.caught) ? record.caught : []);
  const name = isActive ? state.collectionName : (record && record.name);

  if (sets.length === 0) {
    alert('This Master Set has no sets to refresh.');
    return;
  }

  await ensureOverridesLoaded();

  const allSlots = [];
  for (const setId of sets) {
    const cardResult = await fetchSetCards(setId);
    if (cardResult.error) {
      alert(`Could not load set ${setId}: ${cardResult.error}. Try Refresh slots again later.`);
      return;
    }
    allSlots.push(...expandVariants(cardResult.cards));
  }

  const oldIds = new Set(oldSlotList.map(s => s && s.slotId).filter(Boolean));
  const newIds = new Set(allSlots.map(s => s.slotId));
  const added = [...newIds].filter(sid => !oldIds.has(sid));
  const removed = [...oldIds].filter(sid => !newIds.has(sid));
  const ownedRemoved = removed.filter(sid => caughtSet.has(sid));

  if (added.length === 0 && removed.length === 0) {
    alert(`"${name}" is already up to date.`);
    return;
  }

  const lines = [
    `Refresh "${name}"?`,
    '',
    `+${added.length} new slot(s)`,
    `-${removed.length} removed slot(s)`,
  ];
  if (ownedRemoved.length > 0) {
    lines.push(`${ownedRemoved.length} owned slot(s) will lose their owned state.`);
  }
  if (!confirm(lines.join('\n'))) return;

  if (isActive) {
    state.slotList = allSlots;
    for (const sid of removed) state.caught.delete(sid);
    await saveState(state);
    rebuildCollection();
  } else {
    record.slotList = allSlots;
    record.caught = (record.caught || []).filter(sid => newIds.has(sid));
    await saveCollectionRecord(record);
  }
}

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
        meta.textContent = `Fetching ${s.total} cards...`;
        try {
          const cardResult = await fetchSetCards(s.id);
          if (cardResult.error) throw new Error(cardResult.error);
          meta.textContent = `Expanding variants...`;
          await ensureOverridesLoaded();
          // Yield to UI before heavy computation
          await new Promise(r => setTimeout(r, 0));
          const slotList = expandVariants(cardResult.cards);
          createSets.push({ id: s.id, name: s.name, year: s.year, total: s.total, slotCount: slotList.length, slotList });
          renderSelectedSets();
          createConfirmBtn.disabled = !canCreate();
          el.remove();
        } catch (err) {
          meta.textContent = `Could not load ${s.name}: ${err.message}. Retry.`;
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
  renderBookSetsSection();

  if (state.type === 'freestyle') return;

  if (bookSettingsDescEl) {
    bookSettingsDescEl.textContent = state.type === 'master'
      ? 'Manage which sets belong to this collection and assign them to books.'
      : 'Assign generations to books. Each generation must be in exactly one book.';
  }

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

function renderBookSetsSection() {
  if (state.type !== 'master') {
    bookSetsSection.hidden = true;
    return;
  }
  bookSetsSection.hidden = false;
  bookSetSearch.value = '';
  bookSetResults.hidden = true;
  bookSetResults.innerHTML = '';

  bookIncludedSets.innerHTML = '';
  const setIds = state.sets || [];
  if (setIds.length === 0) {
    bookIncludedSets.innerHTML = '<div style="color:var(--text-muted);font-size:0.7rem;">No sets in this collection</div>';
    return;
  }
  for (const setId of setIds) {
    const slots = (state.slotList || []).filter(s => s.setId === setId);
    const setName = slots[0]?.setName || setId;
    const slotCount = slots.length;
    const caughtCount = slots.filter(s => state.caught.has(s.formId)).length;
    const isLast = setIds.length === 1;

    const el = document.createElement('div');
    el.className = 'selected-set';
    el.innerHTML = `
      <div>
        <div>${setName}</div>
        <div class="selected-set-slots">${slotCount} slots${caughtCount ? ` &middot; ${caughtCount} caught` : ''}</div>
      </div>
      <button class="btn-remove" title="${isLast ? 'Cannot remove the last set' : 'Remove set'}"${isLast ? ' disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>&times;</button>
    `;
    if (!isLast) {
      el.querySelector('.btn-remove').addEventListener('click', async () => {
        const msg = caughtCount > 0
          ? `Remove "${setName}"? This will permanently delete ${caughtCount} caught marker${caughtCount === 1 ? '' : 's'} in that set.`
          : `Remove "${setName}"?`;
        if (!window.confirm(msg)) return;
        await removeSetFromCollection(state, setId);
        binderViewIndex = 0;
        rebuildCollection();
        renderBookSettings();
        renderBookSelector();
      });
    }
    bookIncludedSets.appendChild(el);
  }
}

let bookSetSearchTimer = null;
bookSetSearch.addEventListener('input', () => {
  clearTimeout(bookSetSearchTimer);
  bookSetSearchTimer = setTimeout(async () => {
    const q = bookSetSearch.value.trim();
    if (!q) { bookSetResults.hidden = true; bookSetResults.innerHTML = ''; return; }
    bookSetResults.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted);font-size:0.7rem;">Searching...</div>';
    bookSetResults.hidden = false;
    const result = await fetchSets(q);
    if (result.error) {
      bookSetResults.innerHTML = `<div style="padding:0.5rem;color:var(--accent);font-size:0.7rem;">${result.error}</div>`;
      return;
    }
    const includedIds = new Set(state.sets || []);
    const candidates = result.sets.filter(s => !includedIds.has(s.id));
    if (candidates.length === 0) {
      bookSetResults.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted);font-size:0.7rem;">No new sets found</div>';
      return;
    }
    bookSetResults.innerHTML = '';
    for (const s of candidates) {
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
        const meta = el.querySelector('.set-result-meta');
        btn.textContent = 'Fetching...';
        btn.disabled = true;
        meta.textContent = `Fetching ${s.total} cards...`;
        try {
          const cardResult = await fetchSetCards(s.id);
          if (cardResult.error) throw new Error(cardResult.error);
          meta.textContent = 'Expanding variants...';
          await ensureOverridesLoaded();
          await new Promise(r => setTimeout(r, 0));
          const slotList = expandVariants(cardResult.cards);
          await addSetToCollection(state, { id: s.id, name: s.name, year: s.year, total: s.total, slotList });
          rebuildCollection();
          renderBookSettings();
          renderBookSelector();
        } catch (err) {
          meta.textContent = `Could not load ${s.name}: ${err.message}. Retry.`;
          btn.textContent = 'Retry';
          btn.disabled = false;
        }
      });
      bookSetResults.appendChild(el);
    }
  }, 300);
});

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
    if (results.length >= 30) break;
    if (p.isEmpty) continue;
    const nameMatch = p.name && p.name.toLowerCase().includes(q);
    const formMatch = p.formName && p.formName.toLowerCase().includes(q);
    const numMatch = String(p.id).startsWith(q);
    const setMatch = p.setName && p.setName.toLowerCase().includes(q);
    const cardNumMatch = p.number && String(p.number).toLowerCase().includes(q);
    const variantLabel = p.variant ? getVariantLabel(p.variant) : '';
    const variantMatch = variantLabel && variantLabel.toLowerCase().includes(q);
    if (nameMatch || formMatch || numMatch || setMatch || cardNumMatch || variantMatch) results.push(p);
  }
  return results;
}

function renderSearchDropdown(results) {
  searchDropdown.innerHTML = '';
  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-no-signal';
    empty.textContent = 'NO SIGNAL — no entries match';
    searchDropdown.appendChild(empty);
    searchDropdown.hidden = false;
    return;
  }
  for (let i = 0; i < results.length; i++) {
    const p = results[i];
    const isCaught = state.caught.has(p.formId);
    const item = document.createElement('div');
    item.className = 'dropdown-item' + (isCaught ? ' caught' : '') + (i === activeIndex ? ' active' : '');
    item.dataset.index = i;
    let primary = `#${p.collectionNum} ${p.name || ''}`;
    if (p.formName) primary += ` (${p.formName})`;
    if (isCaught) primary = '\u2713 ' + primary;
    const primaryEl = document.createElement('div');
    primaryEl.className = 'dropdown-item-primary';
    primaryEl.textContent = primary;
    item.appendChild(primaryEl);
    if (p.setName) {
      const variantLabel = p.variant ? getVariantLabel(p.variant) : '';
      const metaParts = [`${p.setName} ${p.number || ''}`.trim()];
      if (variantLabel) metaParts.push(variantLabel);
      const metaEl = document.createElement('div');
      metaEl.className = 'dropdown-item-meta';
      metaEl.textContent = metaParts.join(' \u00b7 ');
      item.appendChild(metaEl);
    }
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
const mainScrollEl = document.querySelector('main');
mainScrollEl.addEventListener('scroll', () => { scrollTopBtn.hidden = mainScrollEl.scrollTop < 300; });
scrollTopBtn.addEventListener('click', () => { mainScrollEl.scrollTo({ top: 0, behavior: 'smooth' }); });

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
const cardPickerSearchBar = cardPickerFilter.closest('.card-search-bar');
const cardPickerFooter = cardPickerSave.closest('.card-picker-footer');
const cardPickerCamera = document.getElementById('card-picker-camera');
const pickerIntentEl = document.getElementById('picker-intent');
const pickerIntentInputs = pickerIntentEl.querySelectorAll('input[name="picker-intent"]');
const cardScannerEl = document.getElementById('card-scanner');
const cardScannerVisual = document.getElementById('card-scanner-visual');
const cardScannerCanvas = document.getElementById('card-scanner-canvas');
const cardScannerStatus = document.getElementById('card-scanner-status');
const cardScannerCapture = document.getElementById('card-scanner-capture');
const cardScannerFile = document.getElementById('card-scanner-file');
const cardScannerRetry = document.getElementById('card-scanner-retry');
const cardScannerCancel = document.getElementById('card-scanner-cancel');

let pickerFormId = null;
let pickerCards = [];
let pickerSelectedCard = null;
let pickerFilterTimer;
let pickerPreviousFocus = null;
let pickerCurrentName = null;
let pickerOwnedIntent = false;
let scannerStream = null;
let scannerSessionId = 0;
let scannerReturnState = null;
let visualScanner = null;
let visualScannerPromise = null;
let scannerRecognitionPending = false;

let pickerMode = 'cards'; // 'pokemon-search', 'cards', 'scanner', or 'scan-results'

function stopScannerStream() {
  visualScanner?.stop();
  if (scannerStream) {
    for (const track of scannerStream.getTracks()) track.stop();
  }
  scannerStream = null;
}

function setScannerStatus(message, { error = false } = {}) {
  cardScannerStatus.textContent = message;
  cardScannerStatus.classList.toggle('error', error);
}

function showScannerError(message) {
  stopScannerStream();
  setScannerStatus(message, { error: true });
  cardScannerCapture.disabled = true;
  cardScannerRetry.hidden = false;
  cardScannerFile.disabled = false;
}

function scannerErrorMessage(error) {
  if (!window.isSecureContext) return 'Live camera access requires HTTPS or localhost. Choose a photo or search manually.';
  if (error?.name === 'NotAllowedError') return 'Camera permission was denied. Allow it and retry, or choose a photo.';
  if (error?.name === 'NotFoundError') return 'No camera was found. Choose a photo or search manually.';
  if (error?.name === 'NotReadableError') return 'The camera is busy or unavailable. Close other camera apps and retry.';
  if (/fetch|catalog|model|onnx|visual/i.test(error?.message || '')) {
    return 'The visual card reader could not load. Check the connection, retry, or choose a photo for OCR fallback.';
  }
  return 'The camera could not be started. Choose a photo or search manually.';
}

function visualProgressMessage(progress) {
  const labels = {
    detector: 'Loading card detector',
    embedder: 'Loading visual matcher',
    catalog: 'Loading Pokemon card catalog',
  };
  const label = labels[progress?.stage];
  if (!label) return null;
  const ratio = Number(progress?.ratio);
  return Number.isFinite(ratio) && ratio > 0
    ? `${label} ${Math.round(ratio * 100)}%`
    : `${label}...`;
}

async function getVisualScanner() {
  if (visualScanner) return visualScanner;
  if (!visualScannerPromise) {
    visualScannerPromise = createCollectorVisionScannerApplet({
      target: cardScannerVisual,
      manifestUrl: new URL('../vendor/collectorvision/manifest.json', import.meta.url).href,
      assetBasePath: 'https://hanclinto.github.io/CollectorVision/assets',
      workerUrl: new URL('../vendor/collectorvision/scanner.worker.mjs', import.meta.url).href,
      catalogMode: 'v2',
      catalogGame: 'pokemon',
      autoStart: false,
      enableWebGpu: false,
      matchThreshold: 0.65,
      rotationFastPathThreshold: 0.75,
      consecutiveMatches: 2,
      scanIntervalMs: 300,
      cooldownMs: 1500,
      groupBySecondaryId: false,
      showFpsOverlay: false,
      overlay: true,
    }).then(scanner => {
      visualScanner = scanner;
      if (window.__pokebinderScannerTest) window.__pokebinderScannerTest.visualScanner = scanner;
      return scanner;
    }).catch(error => {
      visualScannerPromise = null;
      throw error;
    });
  }
  return visualScannerPromise;
}

async function processVisualScannerResult(result, sessionId) {
  if (scannerRecognitionPending || sessionId !== scannerSessionId || pickerMode !== 'scanner') return;
  if (!result?.cardPresent || !result?.cornersValid || !Number.isFinite(result.score) || result.score < 0.65) return;
  scannerRecognitionPending = true;
  stopScannerStream();
  const hints = visualResultToScanHints(result);
  setScannerStatus(`Matched ${hints.names[0] || 'card'} visually. Looking up the printing...`);
  try {
    const matched = await showScannerMatches(hints, sessionId, { source: 'visual' });
    if (!matched && sessionId === scannerSessionId) {
      showScannerError('The artwork matched, but the printing was not found. Retry or search manually.');
    }
  } catch (error) {
    if (sessionId === scannerSessionId) {
      showScannerError(`${error.message}. Retry or search manually.`);
    }
  } finally {
    scannerRecognitionPending = false;
  }
}

async function startScannerCamera(sessionId) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    showScannerError(scannerErrorMessage(new Error('Camera unavailable')));
    return;
  }

  setScannerStatus('Loading visual card reader...');
  cardScannerCapture.disabled = true;
  cardScannerRetry.hidden = true;
  try {
    const scanner = await getVisualScanner();
    scanner.updateConfig({
      onProgress(progress) {
        const message = visualProgressMessage(progress);
        if (message && sessionId === scannerSessionId && !cardScannerStatus.classList.contains('error')) {
          setScannerStatus(message);
        }
      },
      onReady() {
        if (sessionId === scannerSessionId && scanner.started) {
          setScannerStatus('Point one card at the camera. Hold it steady while several frames are checked.');
        }
      },
      onResult(result) {
        if (sessionId !== scannerSessionId || pickerMode !== 'scanner' || scannerRecognitionPending) return;
        window.__pokebinderScannerTest?.onVisualResult?.({
          cardPresent: result.cardPresent,
          cornersValid: result.cornersValid,
          cardId: result.cardId,
          cardName: result.cardName,
          collectorNumber: result.collectorNumber,
          setName: result.setName,
          score: result.score,
          confidence: result.confidence,
          orientation: result.orientation,
          rotationChecked: result.rotationChecked,
          uprightScore: result.uprightScore,
          timing: result.timing,
        });
        if (!result.cardPresent) {
          setScannerStatus('Point one card at the camera and fill most of the frame.');
        } else if (!result.cornersValid) {
          setScannerStatus('Card found. Move it fully into view so all four corners are visible.');
        } else if (!Number.isFinite(result.score) || result.score < 0.65) {
          setScannerStatus('Card found, but the match is uncertain. Tilt it to move glare and hold steady.');
        } else {
          setScannerStatus(`Checking ${result.cardName || 'the closest visual match'} across another frame...`);
        }
      },
      onCardDetected(card) {
        processVisualScannerResult(card.raw, sessionId);
      },
      onError({ error, message }) {
        window.__pokebinderScannerTest?.onVisualError?.(message || error?.message || String(error));
        if (sessionId === scannerSessionId) showScannerError(scannerErrorMessage(error || new Error(message)));
      },
    });
    if (sessionId !== scannerSessionId || pickerMode !== 'scanner') {
      return;
    }
    setScannerStatus('Requesting camera access...');
    await scanner.start();
    scannerStream = scanner.stream;
    if (sessionId !== scannerSessionId || pickerMode !== 'scanner') {
      stopScannerStream();
    } else {
      setScannerStatus('Point one card at the camera. Hold it steady while several frames are checked.');
    }
  } catch (error) {
    if (sessionId !== scannerSessionId) return;
    showScannerError(scannerErrorMessage(error));
  }
}

function snapshotPickerForScanner() {
  return {
    mode: pickerMode,
    currentName: pickerCurrentName,
    cards: pickerCards.slice(),
    selectedCard: pickerSelectedCard,
    ownedIntent: pickerOwnedIntent,
    filterValue: cardPickerFilter.value,
    filterPlaceholder: cardPickerFilter.placeholder,
    title: cardPickerName.textContent,
  };
}

function showScannerMode() {
  pickerMode = 'scanner';
  cardPickerName.textContent = 'Scan a card';
  cardPickerSearchBar.hidden = true;
  cardPickerGrid.hidden = true;
  pickerIntentEl.hidden = true;
  cardPickerFooter.hidden = true;
  cardScannerEl.hidden = false;
  cardScannerRetry.hidden = true;
  cardScannerCapture.disabled = true;
  cardScannerFile.disabled = false;
  cardScannerFile.value = '';
  updatePickerBackVisibility();
}

function beginCardScanner() {
  if (state.type !== 'freestyle') return;
  stopScannerStream();
  scannerReturnState = snapshotPickerForScanner();
  const sessionId = ++scannerSessionId;
  showScannerMode();
  setScannerStatus('Starting camera...');
  startScannerCamera(sessionId);
}

function restoreScannerReturnState() {
  const previous = scannerReturnState;
  scannerReturnState = null;
  ++scannerSessionId;
  stopScannerStream();
  cardScannerEl.hidden = true;
  cardPickerSearchBar.hidden = false;
  cardPickerGrid.hidden = false;
  cardPickerFooter.hidden = false;
  if (!previous) {
    pickerMode = 'pokemon-search';
    pickerCurrentName = null;
    pickerCards = [];
    pickerSelectedCard = null;
    pickerOwnedIntent = false;
    cardPickerFilter.value = '';
    cardPickerFilter.placeholder = 'Type a Pokemon name...';
    cardPickerName.textContent = 'Search for a Pokemon';
    cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">Type a Pokemon name above to search for cards</div>';
    cardPickerCount.textContent = '';
  } else {
    pickerMode = previous.mode;
    pickerCurrentName = previous.currentName;
    pickerCards = previous.cards;
    pickerSelectedCard = previous.selectedCard;
    pickerOwnedIntent = previous.ownedIntent;
    cardPickerFilter.value = previous.filterValue;
    cardPickerFilter.placeholder = previous.filterPlaceholder;
    cardPickerName.textContent = previous.title;
    if (pickerMode === 'pokemon-search') {
      if (cardPickerFilter.value.trim()) runPickerSearch();
      else {
        cardPickerGrid.innerHTML = '<div class="card-picker-loading" style="color:var(--text-muted)">Type a Pokemon name above to search for cards</div>';
        cardPickerCount.textContent = '';
      }
    } else {
      runPickerSearch();
    }
  }
  updatePickerFooter();
  cardPickerCamera.focus();
}

function scannerProgressMessage(message) {
  const status = message?.status || 'Reading card...';
  const progress = Number(message?.progress);
  if (!Number.isFinite(progress) || progress <= 0) return status;
  return `${status} ${Math.round(progress * 100)}%`;
}

async function showScannerMatches(hints, sessionId, { source = 'ocr' } = {}) {
  if (sessionId !== scannerSessionId || cardPickerModal.hidden) return false;
  if (typeof window.__pokebinderScannerTest?.onRecognition === 'function') {
    window.__pokebinderScannerTest.onRecognition({
      source,
      names: hints.names.slice(),
      collectorNumbers: hints.collectorNumbers.slice(),
      setTokens: hints.setTokens.slice(),
      visualScore: hints.visualScore || 0,
      visualProductId: hints.visualProductId || '',
    });
  }
  if (hints.names.length === 0 && hints.collectorNumbers.length === 0) return false;

  setScannerStatus('Looking up matching cards...');
  const result = await searchCardsByScanHints({
    ...hints,
    combineNameAndNumber: source === 'visual',
  });
  if (sessionId !== scannerSessionId || cardPickerModal.hidden) return false;
  if (result.error) throw new Error(`Card lookup failed: ${result.error}`);

  const ranked = rankCardCandidates(hints, result.cards);
  if (ranked.length === 0) return false;

  const top = ranked[0];
  const clearlyLeading = source === 'visual' || hasClearScanLeader(ranked);
  setScannerStatus(source === 'visual' ? 'Visual match found.' : 'Text match found.');
  pickerMode = 'scan-results';
  pickerCurrentName = null;
  pickerCards = ranked.map(item => item.card);
  pickerSelectedCard = clearlyLeading ? top.card : null;
  pickerOwnedIntent = true;
  scannerReturnState = null;
  cardScannerEl.hidden = true;
  cardPickerSearchBar.hidden = false;
  cardPickerGrid.hidden = false;
  cardPickerFooter.hidden = false;
  cardPickerName.textContent = 'Scan matches';
  cardPickerFilter.value = '';
  cardPickerFilter.placeholder = 'Filter scan matches...';
  renderPickerCards(pickerCards);
  cardPickerCount.textContent = clearlyLeading
    ? `${pickerCards.length} matches · best match selected`
    : `${pickerCards.length} matches · choose the correct printing`;
  updatePickerFooter();
  requestAnimationFrame(() => {
    const target = cardPickerGrid.querySelector('.card-picker-item.selected')
      || cardPickerGrid.querySelector('.card-picker-item');
    target?.focus();
  });
  return true;
}

async function processScannerImage(blob) {
  const sessionId = scannerSessionId;
  stopScannerStream();
  cardScannerCapture.disabled = true;
  cardScannerRetry.hidden = true;
  cardScannerFile.disabled = true;
  setScannerStatus('Loading card reader...');

  try {
    try {
      const scanner = await getVisualScanner();
      if (sessionId !== scannerSessionId || cardPickerModal.hidden) return;
      setScannerStatus('Matching the card artwork...');
      const visualResult = await scanner.scanImage(blob);
      if (sessionId !== scannerSessionId || cardPickerModal.hidden) return;
      if (visualResult.cardPresent && visualResult.cornersValid && visualResult.score >= 0.65) {
        const matched = await showScannerMatches(
          visualResultToScanHints(visualResult),
          sessionId,
          { source: 'visual' },
        );
        if (matched) return;
      }
      setScannerStatus('Visual match uncertain. Reading the printed details as a fallback...');
    } catch {
      if (sessionId !== scannerSessionId || cardPickerModal.hidden) return;
      setScannerStatus('Visual reader unavailable. Reading the printed details as a fallback...');
    }

    const pokemonNames = [...new Set(getAllPokemon()
      .filter(pokemon => pokemon.isDefault)
      .map(pokemon => pokemon.name))];
    const recognition = await recognizeCardImage(blob, {
      pokemonNames,
      onProgress(message) {
        if (sessionId === scannerSessionId) setScannerStatus(scannerProgressMessage(message));
      },
    });
    if (sessionId !== scannerSessionId || cardPickerModal.hidden) return;
    const { hints } = recognition;
    if (hints.names.length === 0 && hints.collectorNumbers.length === 0) {
      showScannerError('No readable card name or number was found. Improve the lighting, fill the guide, and retry.');
      return;
    }
    const matched = await showScannerMatches(hints, sessionId);
    if (!matched && sessionId === scannerSessionId) {
      showScannerError('No matching cards were found. Improve the lighting and retry, or search manually.');
    }
  } catch (error) {
    console.error('Card scanner failed:', error);
    if (sessionId === scannerSessionId) {
      showScannerError('The card reader could not load or process this image. Retry or search manually.');
    }
  } finally {
    cardScannerCanvas.width = 0;
    cardScannerCanvas.height = 0;
    cardScannerFile.disabled = false;
  }
}

async function openCardPicker(formId, pokemonName) {
  ++scannerSessionId;
  stopScannerStream();
  scannerReturnState = null;
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
  cardScannerEl.hidden = true;
  cardPickerSearchBar.hidden = false;
  cardPickerGrid.hidden = false;
  cardPickerFooter.hidden = false;

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
  const isScannerMode = pickerMode === 'scanner';
  const isResultMode = pickerMode === 'cards' || pickerMode === 'scan-results';
  cardPickerBack.hidden = !(state.type === 'freestyle' && isResultMode);
  cardPickerCamera.hidden = state.type !== 'freestyle' || isScannerMode;
  cardPickerRefresh.hidden = pickerMode !== 'cards' || !pickerCurrentName;
  const isSearchMode = pickerMode === 'pokemon-search';
  cardPickerSave.hidden = isSearchMode || isScannerMode;
  cardPickerClear.hidden = isSearchMode || isScannerMode;
}

function closeCardPicker() {
  ++scannerSessionId;
  stopScannerStream();
  scannerReturnState = null;
  cardPickerModal.hidden = true;
  pickerFormId = null;
  pickerCurrentName = null;
  pickerCards = [];
  pickerSelectedCard = null;
  pickerOwnedIntent = false;
  pickerMode = 'cards';
  cardScannerEl.hidden = true;
  cardPickerSearchBar.hidden = false;
  cardPickerGrid.hidden = false;
  cardPickerFooter.hidden = false;
  pickerIntentEl.hidden = true;
  cardPickerBack.hidden = true;
  cardPickerFilter.placeholder = 'Filter by set, number, rarity...';
}

for (const input of pickerIntentInputs) {
  input.addEventListener('change', () => {
    if (input.checked) pickerOwnedIntent = (input.value === 'owned');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      // Jump back to the currently selected card, or the last card in the grid
      const selected = cardPickerGrid.querySelector('.card-picker-item.selected');
      const items = cardPickerGrid.querySelectorAll('.card-picker-item');
      const target = selected || items[items.length - 1];
      if (target) target.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const inputs = [...pickerIntentInputs];
      const curIdx = inputs.indexOf(input);
      const nextIdx = e.key === 'ArrowRight'
        ? Math.min(inputs.length - 1, curIdx + 1)
        : Math.max(0, curIdx - 1);
      const next = inputs[nextIdx];
      next.checked = true;
      pickerOwnedIntent = (next.value === 'owned');
      next.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      cardPickerSave.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Enter on the radio just selects that option; the radio is already
      // updated via its `change` event. Don't save — user must focus
      // Clear/Save to commit.
      input.checked = true;
      pickerOwnedIntent = (input.value === 'owned');
    }
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
cardPickerCamera.addEventListener('click', beginCardScanner);
cardScannerCancel.addEventListener('click', restoreScannerReturnState);
cardScannerRetry.addEventListener('click', () => {
  const sessionId = ++scannerSessionId;
  stopScannerStream();
  showScannerMode();
  setScannerStatus('Starting camera...');
  startScannerCamera(sessionId);
});
cardScannerFile.addEventListener('change', async () => {
  const sessionId = scannerSessionId;
  const file = cardScannerFile.files?.[0];
  if (!file) return;
  if (sessionId !== scannerSessionId || pickerMode !== 'scanner') return;
  await processScannerImage(file);
  cardScannerFile.value = '';
});

window.addEventListener('pagehide', () => {
  ++scannerSessionId;
  stopScannerStream();
  if (pickerMode === 'scanner') {
    setScannerStatus('The camera stopped when the page was left. Retry to resume scanning.', { error: true });
    cardScannerCapture.disabled = true;
    cardScannerRetry.hidden = false;
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || pickerMode !== 'scanner' || !scannerStream) return;
  ++scannerSessionId;
  showScannerError('The camera stopped while the page was hidden. Retry to resume scanning.');
});

cardPickerBack.addEventListener('click', () => {
  ++scannerSessionId;
  stopScannerStream();
  scannerReturnState = null;
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
    if (pickerMode === 'scanner') {
      restoreScannerReturnState();
      return;
    }
    closeCardPicker();
    restorePickerFocus();
  } else if (e.key === 'Enter') {
    if (pickerMode === 'pokemon-search' || pickerMode === 'scanner') return;
    const focused = document.activeElement;
    if (focused && focused.classList.contains('card-picker-item')) return;
    if (focused === cardPickerFilter) return;
    // If a button or radio is focused, let the browser's default Enter handling
    // activate that specific element. Only fall back to Save when focus is
    // nowhere meaningful.
    if (focused === cardPickerSave || focused === cardPickerClear
        || focused === cardPickerBack || focused === cardPickerClose
        || focused === cardPickerRefresh || focused === cardPickerCamera) return;
    if (focused && focused.tagName === 'INPUT' && focused.type === 'radio') return;
    e.preventDefault();
    cardPickerSave.click();
  }
});

cardPickerSave.addEventListener('click', () => {
  // Pokemon-search mode has no selection to save — ignore any stray invocations.
  if (pickerMode === 'pokemon-search' || pickerMode === 'scanner') return;
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

cardPickerClear.addEventListener('click', async () => {
  let undoFn = null;
  if (pickerFormId) {
    const formId = pickerFormId;
    const collectionId = state.collectionId;
    if (state.type === 'freestyle') {
      const idx = parseInt(formId, 10);
      const prevSlot = state.slots ? state.slots[idx] : null;
      const wasCaught = state.caught.has(String(idx));
      await clearFreestyleSlot(state, idx);
      rebuildCollection();
      if (prevSlot) undoFn = async () => {
        if (state.collectionId !== collectionId) return;
        await setFreestyleSlot(state, idx, prevSlot);
        if (wasCaught) state.caught.add(String(idx));
        await saveState(state);
        rebuildCollection();
        renderBinder();
        updateStats();
      };
    } else {
      const prevSelection = state.cardSelections ? state.cardSelections[formId] : null;
      const wasCaught = state.caught.has(formId);
      await clearCardSelection(state, formId);
      if (wasCaught) {
        state.caught.delete(formId);
        await saveState(state);
      }
      if (prevSelection || wasCaught) undoFn = async () => {
        if (state.collectionId !== collectionId) return;
        if (prevSelection) await setCardSelection(state, formId, prevSelection);
        if (wasCaught) state.caught.add(formId);
        await saveState(state);
        renderCurrentView();
        updateStats();
      };
    }
  }
  closeCardPicker();
  renderBinder();
  updateStats();
  restorePickerFocus();
  if (undoFn) showUndoToast('Cleared.', undoFn);
});

function onActionButtonKeydown(e) {
  const isSave = e.currentTarget === cardPickerSave;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    (isSave ? cardPickerClear : cardPickerSave).focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    // Jump back to the currently-checked intent radio (freestyle), or
    // the selected card if no intent is showing.
    if (!pickerIntentEl.hidden) {
      const checked = pickerIntentEl.querySelector('input[type="radio"]:checked');
      (checked || pickerIntentInputs[0]).focus();
    } else {
      const selected = cardPickerGrid.querySelector('.card-picker-item.selected');
      const items = cardPickerGrid.querySelectorAll('.card-picker-item');
      (selected || items[items.length - 1])?.focus();
    }
  }
}
cardPickerSave.addEventListener('keydown', onActionButtonKeydown);
cardPickerClear.addEventListener('keydown', onActionButtonKeydown);

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
  else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = idx + cols;
    if (next < items.length) {
      items[next].focus();
    } else if (!pickerIntentEl.hidden) {
      // At the bottom row: jump to the intent radio group so the user can
      // change Placeholder/Owned via keyboard.
      const checked = pickerIntentEl.querySelector('input[type="radio"]:checked');
      (checked || pickerIntentInputs[0]).focus();
    }
  }
  else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = idx - cols; if (prev >= 0) items[prev].focus(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation(); // prevent document-level Enter handler from also firing
    if (pickerMode !== 'cards') {
      focused.click(); // select Pokemon in search mode
      return;
    }
    if (state.type === 'freestyle') {
      // Freestyle: Enter just toggles card selection. User then uses
      // arrow keys to reach Save/Clear and commits explicitly.
      focused.click();
      return;
    }
    // Pokedex: Enter selects the card (if not already) and saves.
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
const binderHeadersCheck = document.getElementById('binder-headers-check');
function applyBinderHeaders() {
  binderViewEl.classList.toggle('hide-headers', state.binderHeaders === false);
}
binderLayoutSelect.addEventListener('change', () => {
  setBinderLayout(state, binderLayoutSelect.value);
  binderViewIndex = 0;
  renderBinder();
});
binderFlowCheck.addEventListener('change', () => {
  setBinderFlow(state, binderFlowCheck.checked ? 'row' : 'page');
  renderBinder();
});
binderHeadersCheck.addEventListener('change', () => {
  setBinderHeaders(state, binderHeadersCheck.checked);
  applyBinderHeaders();
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
resetBtn.addEventListener('click', async () => {
  if (!confirm('Mark every slot as uncaught? Card picks, books, and layout are kept.')) return;
  const snapshot = new Set(state.caught);
  const collectionId = state.collectionId;
  await resetCaught(state);
  renderCurrentView();
  updateStats();
  if (snapshot.size > 0) {
    showUndoToast(`Reset ${snapshot.size} slot${snapshot.size === 1 ? '' : 's'}.`, async () => {
      if (state.collectionId !== collectionId) return;
      state.caught = snapshot;
      await saveState(state);
      renderCurrentView();
      updateStats();
    });
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

// ---- Device-top LED state ----
// The four chrome LEDs reflect live device state instead of being decoration:
//   big    — slow heartbeat, always on (the device is "powered")
//   yellow — pulses while sync is mid-flight (loading or saving)
//   red    — flashes on either a sync error or an IDB save failure
//   green  — solid bright when the last sync was healthy; dim otherwise
const ledBig = document.querySelector('.device-top .led-big');
const ledYellow = document.querySelector('.device-top .led-yellow');
const ledRed = document.querySelector('.device-top .led-red');
const ledGreen = document.querySelector('.device-top .led-green');

const ledState = { syncing: false, synced: false, syncError: false, saveError: false };

function refreshLeds() {
  if (ledYellow) ledYellow.classList.toggle('active', ledState.syncing);
  if (ledRed) ledRed.classList.toggle('active', ledState.syncError || ledState.saveError);
  if (ledGreen) ledGreen.classList.toggle('active',
    ledState.synced && !ledState.syncError && !ledState.saveError);
}

if (ledBig) ledBig.classList.add('alive');
refreshLeds();

function showSyncIndicator(status, message) {
  syncIndicator.textContent = message;
  syncIndicator.className = 'sync-indicator ' + status;
  syncIndicator.hidden = false;
  if (status === 'synced') setTimeout(() => { syncIndicator.hidden = true; }, 2000);

  if (status === 'loading' || status === 'saving') {
    ledState.syncing = true;
    ledState.syncError = false;
  } else if (status === 'synced') {
    ledState.syncing = false;
    ledState.synced = true;
    ledState.syncError = false;
  } else if (status === 'error') {
    ledState.syncing = false;
    ledState.syncError = true;
  }
  refreshLeds();
}

setStatusCallback(showSyncIndicator);

const saveErrorBanner = document.getElementById('save-error-banner');

function dismissSaveErrorBanner() {
  if (saveErrorBanner) saveErrorBanner.hidden = true;
  ledState.saveError = false;
  refreshLeds();
}

function showSaveErrorBanner(err) {
  if (!saveErrorBanner) return;
  const isQuota = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''));
  saveErrorBanner.innerHTML = isQuota
    ? '<span class="save-error-msg">Storage is full — your last change wasn\'t saved. Free space by clearing the cached card metadata (it will re-fetch on demand).</span>'
      + '<button class="btn btn-small" id="save-error-clear-cache">Clear card cache</button>'
      + '<button class="btn btn-small" id="save-error-dismiss">Dismiss</button>'
    : '<span class="save-error-msg">Couldn\'t save your last change. Try reloading to recover.</span>'
      + '<button class="btn btn-small" id="save-error-dismiss">Dismiss</button>';
  saveErrorBanner.hidden = false;
  ledState.saveError = true;
  refreshLeds();

  const dismissBtn = document.getElementById('save-error-dismiss');
  if (dismissBtn) dismissBtn.addEventListener('click', dismissSaveErrorBanner);

  const clearBtn = document.getElementById('save-error-clear-cache');
  if (clearBtn) clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = 'Clearing...';
    try {
      await clearAllTcgCache();
      dismissSaveErrorBanner();
    } catch {
      clearBtn.disabled = false;
      clearBtn.textContent = 'Clear card cache';
    }
  });
}

setSaveErrorCallback(showSaveErrorBanner);

const undoToast = document.getElementById('undo-toast');
const undoToastMsg = document.getElementById('undo-toast-msg');
const undoToastAction = document.getElementById('undo-toast-action');
let undoToastTimer = null;
let pendingUndoFn = null;

function showUndoToast(message, undoFn, durationMs = 5000) {
  if (!undoToast || !undoToastMsg || !undoToastAction) return;
  undoToastMsg.textContent = message;
  pendingUndoFn = undoFn;
  undoToast.hidden = false;
  clearTimeout(undoToastTimer);
  undoToastTimer = setTimeout(() => {
    undoToast.hidden = true;
    pendingUndoFn = null;
  }, durationMs);
}

if (undoToastAction) {
  undoToastAction.addEventListener('click', async () => {
    const fn = pendingUndoFn;
    pendingUndoFn = null;
    clearTimeout(undoToastTimer);
    if (undoToast) undoToast.hidden = true;
    if (fn) await fn();
  });
}

async function handleRemoteData(raw, { mode = 'reconcile', priorityIds } = {}) {
  if (!raw || typeof raw !== 'object') return false;
  const bundle = parseBundle(raw);
  if (!bundle) return false;

  const { records: rehydrated, stubsRemain } = await rehydrateBundle(bundle.collections, { priorityIds });
  const hadLocalOnly = await reconcileBundleToIDB(rehydrated, mode);
  // If we kept local-only collections during union, schedule a push so the
  // remote catches up. This prevents a situation where a locally-created
  // collection gets silently lost because the gist still had an older bundle.
  const needsBundlePush = mode === 'union' && hadLocalOnly;

  if (bundle.settings) {
    const next = loadSettings();
    if (typeof bundle.settings.binderHeaders === 'boolean') next.binderHeaders = bundle.settings.binderHeaders;
    saveSettings(next);
  }

  const localActiveId = getActiveCollectionId();
  const availableIdsAfter = new Set((await getAllCollectionsFull()).map(r => r.id));
  if (!availableIdsAfter.has(localActiveId)) {
    let nextId;
    if (bundle.activeId && availableIdsAfter.has(bundle.activeId)) nextId = bundle.activeId;
    else if (availableIdsAfter.size > 0) nextId = availableIdsAfter.values().next().value;
    else nextId = 'living-dex';
    setActiveCollectionId(nextId);
  }

  // Skip reassigning in-memory state from IDB when a local save is pending —
  // the user's in-flight edits may not have hit IDB yet and a reload would
  // clobber them. The pending push will propagate the user's state to the gist.
  if (!hasPendingLocalChange()) state = await loadState();

  return { handled: true, needsBundlePush, stubsRemain };
}

setRemoteChangeCallback(async (data) => {
  const result = await handleRemoteData(data);
  if (result && result.handled) {
    if (result.needsBundlePush) await pushBundle(state);
    updateTypeAwareControls();
    binderFlowCheck.checked = state.binderFlow === 'row';
    binderHeadersCheck.checked = state.binderHeaders !== false;
    applyBinderHeaders();
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
      // First connection: union so local collections survive even if the
      // remote gist is older or has fewer collections.
      const result = await handleRemoteData(gist.data, { mode: 'union' });
      if (result && result.handled) {
        setLastSavedJson(gist.raw);
        if (result.needsBundlePush) await pushBundle(state);
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

// One-shot cache wipe: a previous build of hydrateCards polluted the
// Pokemon-name-keyed TCG cache with subset results (single cards).
// Running this once ensures users on any poisoned cache get a clean slate.
const TCG_CACHE_RESET_KEY = 'pokebinder-tcg-cache-reset-v1';
async function maybeResetTcgCache() {
  if (localStorage.getItem(TCG_CACHE_RESET_KEY)) return;
  try { await clearAllTcgCache(); } catch { /* ignore */ }
  localStorage.setItem(TCG_CACHE_RESET_KEY, String(Date.now()));
}

// ---- Init ----
function renderAll() {
  binderLayoutSelect.value = getLayout();
  binderFlowCheck.checked = state.binderFlow === 'row';
  binderHeadersCheck.checked = state.binderHeaders !== false;
  applyBinderHeaders();
  updateSyncButton();
  updateTypeAwareControls();
  rebuildCollection();
  if (state.type === 'pokedex') switchView(currentView);
  else switchView('binder');
}

// Card IDs for the slots currently on screen in the binder view — used to
// prioritize hydration during the initial reconcile so the visible page fills
// in before the rest of the collection.
function getVisibleCardIds() {
  if (!state || currentView !== 'binder') return [];
  if (!Array.isArray(bookCollection) || bookCollection.length === 0) return [];
  const layout = getLayout();
  const { perPage } = parseLayout(layout);
  const totalPages = getTotalPages(bookCollection.length, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(binderViewIndex, Math.max(0, views.length - 1))];
  if (!view) return [];
  const ids = new Set();
  for (const pageIdx of view.pages) {
    const start = pageIdx * perPage;
    const end = Math.min(start + perPage, bookCollection.length);
    for (let i = start; i < end; i++) {
      const slot = bookCollection[i];
      if (!slot) continue;
      if (state.type === 'pokedex') {
        const card = state.cardSelections && state.cardSelections[slot.formId];
        if (card && card.cardId) ids.add(card.cardId);
      } else if (slot.cardId) {
        ids.add(slot.cardId);
      }
    }
  }
  return [...ids];
}

async function reconcileFromGist() {
  try {
    // Replay any push that was stashed by a prior tab-close before pulling.
    // Without this, edits made within the 5s push debounce window before
    // close would be silently rolled back when the older remote bundle is
    // pulled in. The stash is dropped if local IDB has diverged from it.
    await flushStashedPending(await currentBundleJson());

    const gist = await loadFromGist();
    if (gist && gist.data) {
      // Page load: use union mode so collections created locally but
      // not yet pushed to the gist (e.g., created just before a
      // refresh) are preserved and pushed to the remote instead of
      // being wiped by an older bundle.
      //
      // Stage 1 restricts network hydration to the cards currently on screen.
      // Non-visible cards that aren't already in local IDB or the name cache
      // stay as stubs (rendered as spinners) until stage 2 fills them in.
      const visibleIds = getVisibleCardIds();
      const result1 = await handleRemoteData(gist.data, {
        mode: 'union',
        priorityIds: visibleIds.length > 0 ? visibleIds : undefined,
      });
      if (result1 && result1.handled) {
        setLastSavedJson(gist.raw);
        if (result1.needsBundlePush) await pushBundle(state);
        renderAll();
      } else {
        setLastSavedJson(gist.raw);
      }

      // Stage 2 — only if stage 1 left unresolved stubs (network was needed
      // beyond the visible set). Runs unrestricted to fill everything in.
      if (result1 && result1.handled && result1.stubsRemain) {
        const result2 = await handleRemoteData(gist.data, { mode: 'union' });
        if (result2 && result2.handled) {
          if (result2.needsBundlePush) await pushBundle(state);
          renderAll();
        }
      }
    } else {
      setLastSavedJson('');
      await pushBundle(state);
    }
    startPolling(30000);
  } catch { /* Fall back to local state */ }
}

async function init() {
  cleanupLegacyStorage();
  await maybeResetTcgCache();
  state = await loadState();
  await loadPokemonData();

  // Paint from local IDB immediately. The reconcile runs in the background
  // so the UI is interactive while the gist is being fetched and hydrated.
  renderAll();

  if (isSyncConfigured()) reconcileFromGist();
}

// Re-sync on tab focus
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !isSyncConfigured()) return;
  // Skip the tab-focus pull when a local save is queued or in-flight, mirroring
  // the guard in pollForChanges. The pending push is the newer truth; a pull
  // now would risk clobbering it.
  if (hasPendingLocalChange()) return;
  try {
    const gist = await loadFromGist();
    if (gist && gist.data) {
      const result = await handleRemoteData(gist.data, { mode: 'union' });
      if (result && result.handled) {
        setLastSavedJson(gist.raw);
        if (result.needsBundlePush) await pushBundle(state);
        updateTypeAwareControls();
        rebuildCollection();
      }
    }
  } catch { /* Ignore */ }
});

init();
