function renderListView(container, collection, caughtSet, onToggle) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();

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

  container.appendChild(frag);
}

function updateListCaughtState(container, caughtSet) {
  for (const row of container.querySelectorAll('.pokemon-row')) {
    const formId = row.dataset.formId;
    const isCaught = caughtSet.has(formId);
    row.classList.toggle('caught', isCaught);
  }
}

export { renderListView, updateListCaughtState };
