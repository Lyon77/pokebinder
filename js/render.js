import { getVariantLabel } from './tcg-api.js';

function renderListView(container, collection, caughtSet, onToggle, collectionType) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();

  if (collectionType === 'master') {
    renderMasterListView(frag, collection, caughtSet, onToggle);
  } else {
    renderPokedexListView(frag, collection, caughtSet, onToggle);
  }

  container.appendChild(frag);
}

function renderPokedexListView(frag, collection, caughtSet, onToggle) {
  for (const p of collection) {
    const row = document.createElement('div');
    row.className = 'pokemon-row' + (caughtSet.has(p.formId) ? ' caught' : '');
    row.dataset.formId = p.formId;

    const dot = document.createElement('div');
    dot.className = 'pokemon-dot';

    const nums = document.createElement('div');
    nums.className = 'pokemon-nums';
    nums.innerHTML = `<span class="col-badge">#${p.collectionNum}</span><span class="dex-badge">${p.id}</span>`;

    const nameEl = document.createElement('div');
    nameEl.className = 'pokemon-name';
    let nameText = p.name;
    if (p.formName) nameText += ` <span class="form-label">(${p.formName})</span>`;
    nameEl.innerHTML = nameText;

    row.appendChild(dot);
    row.appendChild(nums);
    row.appendChild(nameEl);

    row.tabIndex = 0;
    row.addEventListener('click', () => onToggle(p.formId));
    frag.appendChild(row);
  }
}

function renderMasterListView(frag, collection, caughtSet, onToggle) {
  let currentSetId = null;

  for (const p of collection) {
    // Set header when set changes
    if (p.setId !== currentSetId) {
      currentSetId = p.setId;
      const header = document.createElement('div');
      header.className = 'list-set-header';
      header.textContent = p.setName || currentSetId;
      frag.appendChild(header);
    }

    const isCaught = caughtSet.has(p.formId);
    const row = document.createElement('div');
    row.className = 'pokemon-row' + (isCaught ? ' caught' : ' want');
    row.dataset.formId = p.formId;

    const dot = document.createElement('div');
    dot.className = 'pokemon-dot';

    const nums = document.createElement('div');
    nums.className = 'pokemon-nums';
    nums.innerHTML = `<span class="col-badge">#${p.number}</span>`;

    const nameEl = document.createElement('div');
    nameEl.className = 'pokemon-name';
    const variantLabel = getVariantLabel(p.variant);
    let nameText = p.name || '';
    if (variantLabel) nameText += ` <span class="form-label">(${variantLabel})</span>`;
    nameEl.innerHTML = nameText;

    row.appendChild(dot);
    row.appendChild(nums);
    row.appendChild(nameEl);

    row.tabIndex = 0;
    row.addEventListener('click', () => onToggle(p.formId));
    frag.appendChild(row);
  }
}

function updateListCaughtState(container, caughtSet) {
  for (const row of container.querySelectorAll('.pokemon-row')) {
    const formId = row.dataset.formId;
    const isCaught = caughtSet.has(formId);
    row.classList.toggle('caught', isCaught);
    row.classList.toggle('want', !isCaught);
  }
}

export { renderListView, updateListCaughtState };
