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
  loadState, saveState, loadStateFromData,
  toggleCaught, toggleCategory, toggleExcludedForm,
  setBinderLayout, setBinderFlow, setCardSelection, clearCardSelection,
  saveBooks, exportState, importState, resetCaught,
} from './storage.js';
import {
  isSyncConfigured, getSyncConfig, setSyncConfig, clearSyncConfig,
  setStatusCallback, loadFromGist,
} from './sync.js';
import { fetchCardsForPokemon } from './tcg-api.js';

let state;
let collection = [];
let bookCollection = [];
let currentView = 'list';
let binderViewIndex = 0;
let selectedBookIndex = 0;

// DOM refs
const pokemonListEl = document.getElementById('pokemon-list');
const binderContainerEl = document.getElementById('binder-container');
const bookSelectorEl = document.getElementById('book-selector');
const listViewEl = document.getElementById('list-view');
const binderViewEl = document.getElementById('binder-view');
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const binderControlsEl = document.getElementById('binder-controls');
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

function rebuildCollection() {
  collection = buildCollection(state);
  rebuildBookCollection();
  renderCurrentView();
  updateStats();
}

function rebuildBookCollection() {
  const book = state.books[selectedBookIndex] || state.books[0];
  bookCollection = buildBookCollection(collection, book ? book.generations : [1,2,3,4,5,6,7,8,9]);
}

function renderCurrentView() {
  if (currentView === 'list') {
    renderListView(pokemonListEl, collection, state.caught, handleToggleCaught);
  } else {
    renderBinder();
  }
}

function renderBinder() {
  const layout = state.binderLayout;
  const totalViews = getTotalViews(bookCollection.length, layout);
  binderViewIndex = Math.min(binderViewIndex, totalViews - 1);
  renderBinderView(binderContainerEl, bookCollection, binderViewIndex, layout, state.caught, handleToggleCaught, state.binderFlow, state.cardSelections, openCardPicker);
  const totalPages = getTotalPages(bookCollection.length, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(binderViewIndex, views.length - 1)];
  binderPageInput.value = view.pages[0] + 1;
  binderPageInput.max = totalPages;
  binderPageTotal.textContent = `of ${totalPages}`;
  const isFirstBook = selectedBookIndex === 0;
  const isLastBook = selectedBookIndex >= state.books.length - 1;
  binderPrev.disabled = binderViewIndex === 0 && isFirstBook;
  binderNext.disabled = binderViewIndex >= totalViews - 1 && isLastBook;
  renderBookSelector();
}

function updateStats() {
  const stats = computeStats(collection, state.caught);
  renderStats(statsOverallText, statsOverallBar, statsGenEl, stats);
}

let lastTouchedFormId = null;

function handleToggleCaught(formId) {
  if (currentView === 'list') lastTouchedFormId = formId;
  toggleCaught(state, formId);
  if (currentView === 'list') {
    updateListCaughtState(pokemonListEl, state.caught);
  } else {
    renderBinder();
  }
  updateStats();
}

const viewSlider = document.querySelector('.view-toggle .slider');

function switchView(view) {
  currentView = view;
  listViewEl.hidden = view !== 'list';
  binderViewEl.hidden = view !== 'binder';
  viewListBtn.classList.toggle('active', view === 'list');
  viewBinderBtn.classList.toggle('active', view === 'binder');
  viewSlider.classList.toggle('right', view === 'binder');

  // Navigate binder to last touched Pokemon from list view
  if (view === 'binder' && lastTouchedFormId) {
    const idx = bookCollection.findIndex(p => p.formId === lastTouchedFormId);
    if (idx >= 0) {
      const layout = state.binderLayout;
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
}

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

  // Accordion toggle on header click
  header.addEventListener('click', (e) => {
    if (e.target.closest('.toggle-switch')) return;
    group.classList.toggle('open');
  });

  // Category toggle switch
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

  // Toggle all buttons
  const toggleAllRow = document.createElement('div');
  toggleAllRow.style.cssText = 'display:flex;gap:0.4rem;margin-bottom:0.75rem;';
  const disableAllBtn = document.createElement('button');
  disableAllBtn.className = 'btn';
  disableAllBtn.textContent = 'Disable All';
  disableAllBtn.addEventListener('click', () => {
    const allCats = getFormCategories();
    const subCats = getFormSubCategories();
    for (const cat of allCats) state.disabledCategories.add(cat);
    for (const [subKey] of subCats) state.disabledCategories.add(subKey);
    state.disabledCategories.add('other-misc');
    saveState(state);
    rebuildCollection();
    renderFormSettings();
  });
  const enableAllBtn = document.createElement('button');
  enableAllBtn.className = 'btn';
  enableAllBtn.textContent = 'Enable All';
  enableAllBtn.addEventListener('click', () => {
    state.disabledCategories.clear();
    saveState(state);
    rebuildCollection();
    renderFormSettings();
  });
  toggleAllRow.appendChild(disableAllBtn);
  toggleAllRow.appendChild(enableAllBtn);
  formSettingsBodyEl.appendChild(toggleAllRow);

  // Main categories: regional, mega, gmax
  const mainCats = ['regional', 'mega', 'gmax'];
  for (const cat of mainCats) {
    const forms = getAlternateFormsByCategory(cat);
    if (forms.length === 0) continue;
    const label = FORM_CATEGORY_LABELS[cat] || cat;
    const icon = MAIN_CAT_ICONS[cat] || '🔄';
    formSettingsBodyEl.appendChild(buildAccordionGroup(cat, label, icon, forms, true));
  }

  // Section divider
  const divider = document.createElement('div');
  divider.className = 'section-divider';
  divider.textContent = 'Other Form Groups';
  formSettingsBodyEl.appendChild(divider);

  // Sub-category groups (species-specific)
  const subCats = getFormSubCategories();
  const sortedSubs = [...subCats.entries()].sort((a, b) => a[1][0].id - b[1][0].id);
  for (const [subKey, forms] of sortedSubs) {
    const speciesName = forms[0].name;
    const icon = FORM_SUBCATEGORY_ICONS[subKey] || '🔄';
    const label = `${speciesName} Forms`;
    formSettingsBodyEl.appendChild(buildAccordionGroup(subKey, label, icon, forms, false));
  }

  // Other misc (no sub-category)
  const miscForms = getOtherFormsWithoutSubCategory();
  if (miscForms.length > 0) {
    formSettingsBodyEl.appendChild(buildAccordionGroup('other-misc', 'Other Misc. Forms', '🔄', miscForms, false));
  }
}

// --- Book selector (dropdown) ---
function renderBookSelector() {
  bookSelectorEl.innerHTML = '';
  for (let i = 0; i < state.books.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const sz = bookCollection.length; // current book size shown in binder
    opt.textContent = `Book ${i + 1}`;
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

// --- Book settings modal (column cards + drag-and-drop) ---
const GENERATION_NAMES = {
  1: 'Gen I', 2: 'Gen II', 3: 'Gen III', 4: 'Gen IV', 5: 'Gen V',
  6: 'Gen VI', 7: 'Gen VII', 8: 'Gen VIII', 9: 'Gen IX',
};

function getAssignedGens() {
  const assigned = new Set();
  for (const book of state.books) {
    for (const g of book.generations) assigned.add(g);
  }
  return assigned;
}

function bookGenCount(gens) {
  // Count from the active collection
  return collection.filter(p => gens.includes(p.generation)).length;
}

function makeGenChip(g, onRemove) {
  const chip = document.createElement('div');
  chip.className = 'gen-chip';
  chip.draggable = true;
  chip.dataset.gen = g;
  chip.innerHTML = `${GENERATION_NAMES[g]} <span class="gen-chip-remove">\u2715</span>`;
  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(g));
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
  if (onRemove) {
    chip.querySelector('.gen-chip-remove').addEventListener('click', () => onRemove(g));
  }
  return chip;
}

function setupDropZone(el, onDrop) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    const g = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (g) onDrop(g);
  });
}

function renderBookSettings() {
  bookSettingsBodyEl.innerHTML = '';
  const assigned = getAssignedGens();
  const unassigned = [];
  for (let g = 1; g <= 9; g++) {
    if (!assigned.has(g)) unassigned.push(g);
  }

  // Unassigned pool
  const pool = document.createElement('div');
  pool.className = 'book-pool';
  if (unassigned.length > 0) {
    pool.innerHTML = '<div class="book-pool-label">Unassigned — drag into a book</div>';
    const gensEl = document.createElement('div');
    gensEl.className = 'book-pool-gens';
    for (const g of unassigned) {
      gensEl.appendChild(makeGenChip(g, null));
    }
    pool.appendChild(gensEl);
  } else {
    pool.innerHTML = '<div class="book-pool-label">All generations assigned</div>';
  }
  setupDropZone(pool, (g) => {
    // Remove from all books
    for (const book of state.books) {
      book.generations = book.generations.filter(x => x !== g);
    }
    saveBooks(state, state.books);
    rebuildBookCollection();
    renderBookSettings();
  });
  bookSettingsBodyEl.appendChild(pool);

  // Book columns
  const grid = document.createElement('div');
  grid.className = 'books-grid';
  for (let bi = 0; bi < state.books.length; bi++) {
    const book = state.books[bi];
    const col = document.createElement('div');
    col.className = 'book-col';

    const header = document.createElement('div');
    header.className = 'book-col-header';
    header.innerHTML = `<span class="book-col-label">Book ${bi + 1}</span><span class="book-col-size">${bookGenCount(book.generations)} cards</span>`;
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'book-col-body';
    for (const g of book.generations) {
      body.appendChild(makeGenChip(g, (gen) => {
        state.books[bi].generations = state.books[bi].generations.filter(x => x !== gen);
        saveBooks(state, state.books);
        rebuildBookCollection();
        renderBookSettings();
      }));
    }
    if (book.generations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'book-pool-empty';
      empty.textContent = 'Drag gens here';
      body.appendChild(empty);
    }
    col.appendChild(body);

    setupDropZone(col, (g) => {
      // Remove from all books and pool
      for (const b of state.books) {
        b.generations = b.generations.filter(x => x !== g);
      }
      state.books[bi].generations.push(g);
      state.books[bi].generations.sort((a, b) => a - b);
      saveBooks(state, state.books);
      rebuildBookCollection();
      renderBookSettings();
    });

    grid.appendChild(col);
  }
  bookSettingsBodyEl.appendChild(grid);

  // Unassigned warning
  if (unassigned.length > 0) {
    bookUnassignedEl.textContent = 'Unassigned: ' + unassigned.map(g => GENERATION_NAMES[g]).join(', ');
  } else {
    bookUnassignedEl.textContent = '';
  }
}

bookAddBtn.addEventListener('click', () => {
  state.books.push({ generations: [] });
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

// --- Autocomplete search ---
let searchTimer;
let activeIndex = -1;

function searchMatches(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const p of collection) {
    if (results.length >= 10) break;
    const nameMatch = p.name.toLowerCase().includes(q);
    const formMatch = p.formName && p.formName.toLowerCase().includes(q);
    const numMatch = String(p.id).startsWith(q);
    if (nameMatch || formMatch || numMatch) results.push(p);
  }
  return results;
}

function renderDropdown(results) {
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
    let text = `#${p.collectionNum} · Dex ${p.id} ${p.name}`;
    if (p.formName) text += ` (${p.formName})`;
    if (isCaught) text = '\u2713 ' + text;
    item.textContent = text;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectResult(p);
    });
    searchDropdown.appendChild(item);
  }
  searchDropdown.hidden = false;
}

function dismissDropdown() {
  searchDropdown.hidden = true;
  searchDropdown.innerHTML = '';
  activeIndex = -1;
}

function selectResult(pokemon) {
  searchInput.value = '';
  dismissDropdown();
  navigateTo(pokemon);
}

function navigateTo(pokemon) {
  if (currentView === 'list') {
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
    // Find which book contains this Pokemon
    let idx = bookCollection.findIndex(p => p.formId === pokemon.formId);
    if (idx === -1) {
      // Pokemon not in current book — search all books
      for (let bi = 0; bi < state.books.length; bi++) {
        const book = state.books[bi];
        const genSet = new Set(book.generations);
        if (genSet.has(pokemon.generation)) {
          selectedBookIndex = bi;
          rebuildBookCollection();
          idx = bookCollection.findIndex(p => p.formId === pokemon.formId);
          break;
        }
      }
      if (idx === -1) return;
    }
    const layout = state.binderLayout;
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
    if (!query) {
      dismissDropdown();
      return;
    }
    const results = searchMatches(query);
    renderDropdown(results);
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
      const query = searchInput.value.trim();
      const results = searchMatches(query);
      selectResult(results[activeIndex]);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    searchInput.value = '';
    dismissDropdown();
  }
});

function updateActiveItem(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('active', i === activeIndex);
  }
  if (activeIndex >= 0 && items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }
}

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
    dismissDropdown();
  }
});

// Scroll to top
window.addEventListener('scroll', () => {
  scrollTopBtn.hidden = window.scrollY < 300;
});
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---- Card Picker ----
const cardPickerModal = document.getElementById('card-picker-modal');
const cardPickerName = document.getElementById('card-picker-name');
const cardPickerFilter = document.getElementById('card-picker-filter');
const cardPickerGrid = document.getElementById('card-picker-grid');
const cardPickerCount = document.getElementById('card-picker-count');
const cardPickerSelected = document.getElementById('card-picker-selected');
const cardPickerClose = document.getElementById('card-picker-close');
const cardPickerSave = document.getElementById('card-picker-save');
const cardPickerClear = document.getElementById('card-picker-clear');

let pickerFormId = null;
let pickerCards = [];
let pickerSelectedCard = null;
let pickerFilterTimer;
let pickerPreviousFocus = null;

async function openCardPicker(formId, pokemonName) {
  pickerPreviousFocus = document.activeElement;
  pickerFormId = formId;
  const existingCard = state.cardSelections[formId];
  const isCaught = state.caught.has(formId);
  if (existingCard) {
    pickerSelectedCard = existingCard;
  } else if (isCaught) {
    pickerSelectedCard = EMPTY_CARD;
  } else {
    pickerSelectedCard = null;
  }
  cardPickerName.textContent = pokemonName;
  cardPickerFilter.value = '';
  cardPickerModal.hidden = false;

  cardPickerGrid.innerHTML = '<div class="card-picker-loading">Loading cards...</div>';
  cardPickerCount.textContent = '';
  updatePickerFooter();

  const result = await fetchCardsForPokemon(pokemonName);
  pickerCards = result.cards;

  if (result.error && pickerCards.length === 0) {
    cardPickerGrid.innerHTML = `<div class="card-picker-error">Failed to load cards: ${result.error}<br><button class="btn card-picker-retry" onclick="this.closest('.card-picker-error').innerHTML='Retrying...'">Retry</button></div>`;
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

  // "No card" option — marks as caught without a specific card image
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
    cardPickerSelected.textContent = 'No selection (will mark uncaught)';
  }
}

function closeCardPicker() {
  cardPickerModal.hidden = true;
  pickerFormId = null;
  pickerCards = [];
  pickerSelectedCard = null;
}

function restorePickerFocus() {
  const el = pickerPreviousFocus;
  const formId = el ? el.dataset.formId : null;
  pickerPreviousFocus = null;
  requestAnimationFrame(() => {
    if (el && el.isConnected) {
      el.focus();
    } else if (formId) {
      const newEl = binderContainerEl.querySelector(`[data-form-id="${formId}"]`);
      if (newEl) newEl.focus();
    }
  });
}

cardPickerClose.addEventListener('click', () => { closeCardPicker(); restorePickerFocus(); });
cardPickerModal.querySelector('.modal-backdrop').addEventListener('click', () => { closeCardPicker(); restorePickerFocus(); });
document.addEventListener('keydown', (e) => {
  if (cardPickerModal.hidden) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeCardPicker();
    restorePickerFocus();
  } else if (e.key === 'Enter' && !document.activeElement.classList.contains('card-picker-item')) {
    e.preventDefault();
    cardPickerSave.click();
  }
});

cardPickerSave.addEventListener('click', () => {
  if (pickerFormId) {
    if (pickerSelectedCard) {
      if (pickerSelectedCard.cardId === '__empty__') {
        clearCardSelection(state, pickerFormId);
      } else {
        setCardSelection(state, pickerFormId, pickerSelectedCard);
      }
      // Auto-mark as caught
      if (!state.caught.has(pickerFormId)) {
        state.caught.add(pickerFormId);
        saveState(state);
      }
    } else {
      // Deselected — uncaught, clear card
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
    clearCardSelection(state, pickerFormId);
    if (state.caught.has(pickerFormId)) {
      state.caught.delete(pickerFormId);
      saveState(state);
    }
  }
  closeCardPicker();
  renderBinder();
  updateStats();
  restorePickerFocus();
});

cardPickerGrid.addEventListener('keydown', (e) => {
  const items = cardPickerGrid.querySelectorAll('.card-picker-item');
  if (items.length === 0) return;
  const focused = document.activeElement;
  if (!focused || !focused.classList.contains('card-picker-item')) return;

  const idx = Array.prototype.indexOf.call(items, focused);
  if (idx === -1) return;

  const cols = getComputedStyle(cardPickerGrid).gridTemplateColumns.split(' ').length;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (idx + 1 < items.length) items[idx + 1].focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (idx - 1 >= 0) items[idx - 1].focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = idx + cols;
    if (next < items.length) items[next].focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = idx - cols;
    if (prev >= 0) items[prev].focus();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    focused.click();
    cardPickerSave.click();
  }
});

cardPickerFilter.addEventListener('input', () => {
  clearTimeout(pickerFilterTimer);
  pickerFilterTimer = setTimeout(() => {
    const q = cardPickerFilter.value.trim().toLowerCase();
    if (!q) {
      renderPickerCards(pickerCards);
      return;
    }
    const filtered = pickerCards.filter(c =>
      c.setName.toLowerCase().includes(q) ||
      c.number.toLowerCase().includes(q) ||
      c.rarity.toLowerCase().includes(q)
    );
    renderPickerCards(filtered);
  }, 150);
});

// Stats bar toggle
statsBar.addEventListener('click', () => {
  statsGenEl.classList.toggle('collapsed');
  statsBar.querySelector('.stats-chevron').classList.toggle('open');
});

// List keyboard navigation
pokemonListEl.addEventListener('keydown', (e) => {
  const rows = pokemonListEl.querySelectorAll('.pokemon-row');
  if (rows.length === 0) return;
  const focused = document.activeElement;
  if (!focused || !focused.classList.contains('pokemon-row')) return;

  const cols = getComputedStyle(pokemonListEl).gridTemplateColumns.split(' ').length;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const idx = Array.prototype.indexOf.call(rows, focused);
    const next = rows[idx + cols];
    if (next) next.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const idx = Array.prototype.indexOf.call(rows, focused);
    const prev = rows[idx - cols];
    if (prev) prev.focus();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const idx = Array.prototype.indexOf.call(rows, focused);
    const next = rows[idx + 1];
    if (next) next.focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const idx = Array.prototype.indexOf.call(rows, focused);
    const prev = rows[idx - 1];
    if (prev) prev.focus();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const formId = focused.dataset.formId;
    if (formId) handleToggleCaught(formId);
  }
});

// Binder keyboard navigation — build visual-order slot list
function getVisualSlots() {
  const grids = Array.from(binderContainerEl.querySelectorAll('.binder-grid:not(.binder-page-blank)'));
  if (grids.length <= 1 || state.binderFlow !== 'row') {
    return Array.from(binderContainerEl.querySelectorAll('.binder-slot:not(.empty)'));
  }
  // Row flow with two grids — interleave rows
  const leftSlots = Array.from(grids[0].querySelectorAll('.binder-slot'));
  const rightSlots = Array.from(grids[1].querySelectorAll('.binder-slot'));
  const cols = getComputedStyle(grids[0]).gridTemplateColumns.split(' ').length;
  const rows = Math.ceil(leftSlots.length / cols);
  const visual = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s = leftSlots[r * cols + c];
      if (s && !s.classList.contains('empty')) visual.push(s);
    }
    for (let c = 0; c < cols; c++) {
      const s = rightSlots[r * cols + c];
      if (s && !s.classList.contains('empty')) visual.push(s);
    }
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

  // For up/down, use per-grid navigation
  const gridSlots = Array.from(grid.querySelectorAll('.binder-slot:not(.empty)'));
  const gridIdx = gridSlots.indexOf(focused);
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;

  // For row flow, up/down spans both grids (total cols across spread)
  const realGrids = Array.from(binderContainerEl.querySelectorAll('.binder-grid:not(.binder-page-blank)'));
  const isRowFlow = state.binderFlow === 'row' && realGrids.length === 2;
  const visualCols = isRowFlow ? cols * 2 : cols;

  const totalViews = getTotalViews(bookCollection.length, state.binderLayout);

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (visualIdx + 1 < visualSlots.length) {
      visualSlots[visualIdx + 1].focus();
    } else if (binderViewIndex < totalViews - 1) {
      binderViewIndex++;
      renderBinder();
      requestAnimationFrame(() => {
        const newSlots = getVisualSlots();
        if (newSlots.length > 0) newSlots[0].focus();
      });
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (visualIdx - 1 >= 0) {
      visualSlots[visualIdx - 1].focus();
    } else if (binderViewIndex > 0) {
      binderViewIndex--;
      renderBinder();
      requestAnimationFrame(() => {
        const newSlots = getVisualSlots();
        if (newSlots.length > 0) newSlots[newSlots.length - 1].focus();
      });
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (isRowFlow) {
      const next = visualIdx + visualCols;
      if (next < visualSlots.length) visualSlots[next].focus();
    } else {
      const next = gridIdx + cols;
      if (next < gridSlots.length) gridSlots[next].focus();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (isRowFlow) {
      const prev = visualIdx - visualCols;
      if (prev >= 0) visualSlots[prev].focus();
    } else {
      const prev = gridIdx - cols;
      if (prev >= 0) gridSlots[prev].focus();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const formId = focused.dataset.formId;
    if (formId) {
      const p = bookCollection.find(pk => pk.formId === formId);
      if (p) openCardPicker(formId, p.name);
    }
  }
});

// View toggle
viewListBtn.addEventListener('click', () => switchView('list'));
viewBinderBtn.addEventListener('click', () => switchView('binder'));

// Binder controls
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
  } else if (selectedBookIndex > 0) {
    selectedBookIndex--;
    rebuildBookCollection();
    binderViewIndex = getTotalViews(bookCollection.length, state.binderLayout) - 1;
  }
  renderBinder();
});
binderNext.addEventListener('click', () => {
  const totalViews = getTotalViews(bookCollection.length, state.binderLayout);
  if (binderViewIndex < totalViews - 1) {
    binderViewIndex++;
  } else if (selectedBookIndex < state.books.length - 1) {
    selectedBookIndex++;
    rebuildBookCollection();
    binderViewIndex = 0;
  }
  renderBinder();
});

// Page input navigation
function goToPageFromInput() {
  const pageNum = parseInt(binderPageInput.value, 10);
  if (isNaN(pageNum) || pageNum < 1) return;
  const layout = state.binderLayout;
  const totalPages = getTotalPages(bookCollection.length, layout);
  const targetPage = Math.min(pageNum, totalPages) - 1;
  const views = buildViews(totalPages);
  for (let v = 0; v < views.length; v++) {
    if (views[v].pages.includes(targetPage)) {
      binderViewIndex = v;
      break;
    }
  }
  renderBinder();
}

binderPageInput.addEventListener('change', goToPageFromInput);
binderPageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); goToPageFromInput(); binderPageInput.blur(); }
});

// Export/Import/Reset
exportBtn.addEventListener('click', () => exportState(state));
importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = await importState(file);
    rebuildCollection();
    renderFormSettings();
  } catch (err) {
    alert('Import failed: ' + err.message);
  }
  importInput.value = '';
});
resetBtn.addEventListener('click', () => {
  if (confirm('Reset all progress? This will mark all Pokemon as uncaught. Form preferences and binder layout will be preserved.')) {
    resetCaught(state);
    renderCurrentView();
    updateStats();
  }
});

// Form settings modal
formSettingsBtn.addEventListener('click', () => {
  formSettingsModal.hidden = false;
  renderFormSettings();
});
modalCloseBtn.addEventListener('click', () => { formSettingsModal.hidden = true; });
formSettingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  formSettingsModal.hidden = true;
});

// --- Sync UI ---
const syncBtn = document.getElementById('sync-btn');
const syncModal = document.getElementById('sync-modal');
const syncModalClose = document.getElementById('sync-modal-close');
const syncPatInput = document.getElementById('sync-pat-input');
const syncGistInput = document.getElementById('sync-gist-input');
const syncSaveBtn = document.getElementById('sync-save-btn');
const syncDisconnectBtn = document.getElementById('sync-disconnect-btn');
const syncStatusBox = document.getElementById('sync-status-box');
const syncIndicator = document.getElementById('sync-indicator');

function updateSyncButton() {
  syncBtn.classList.toggle('connected', isSyncConfigured());
}

function showSyncIndicator(status, message) {
  syncIndicator.textContent = message;
  syncIndicator.className = 'sync-indicator ' + status;
  syncIndicator.hidden = false;
  if (status === 'synced') {
    setTimeout(() => { syncIndicator.hidden = true; }, 2000);
  }
}

setStatusCallback(showSyncIndicator);

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
    const data = await loadFromGist();
    if (data && Array.isArray(data.caught)) {
      const remote = loadStateFromData(data);
      if (remote) {
        state = remote;
        saveState(state);
        rebuildCollection();
      }
    }
    syncStatusBox.textContent = 'Connected and synced!';
    syncStatusBox.className = 'sync-status-box connected';
    updateSyncButton();
  } catch (err) {
    syncStatusBox.textContent = 'Error: ' + err.message;
    syncStatusBox.className = 'sync-status-box error';
    clearSyncConfig();
    updateSyncButton();
  }
});

syncDisconnectBtn.addEventListener('click', () => {
  clearSyncConfig();
  syncStatusBox.textContent = 'Disconnected. Data remains in this browser.';
  syncStatusBox.className = 'sync-status-box';
  updateSyncButton();
});

// Init
async function init() {
  state = loadState();
  await loadPokemonData();

  // Try loading from Gist if sync is configured
  if (isSyncConfigured()) {
    try {
      const data = await loadFromGist();
      if (data && Array.isArray(data.caught)) {
        const remote = loadStateFromData(data);
        if (remote) {
          state = remote;
          saveState(state);
        }
      }
    } catch {
      // Fall back to local state silently
    }
  }

  binderLayoutSelect.value = state.binderLayout;
  binderFlowCheck.checked = state.binderFlow === 'row';
  updateSyncButton();
  rebuildCollection();
}

init();
