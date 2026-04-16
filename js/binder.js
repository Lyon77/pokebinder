import { getVariantLabel } from './tcg-api.js';

function parseLayout(layout) {
  const [cols, rows] = layout.split('x').map(Number);
  return { cols, rows, perPage: cols * rows };
}

function getTotalPages(collectionLength, layout) {
  const { perPage } = parseLayout(layout);
  return Math.max(1, Math.ceil(collectionLength / perPage));
}

function buildViews(totalPages) {
  if (totalPages === 0) return [{ pages: [0] }];
  const views = [{ pages: [0] }];
  let p = 1;
  while (p < totalPages) {
    if (p + 1 < totalPages) {
      views.push({ pages: [p, p + 1] });
      p += 2;
    } else {
      views.push({ pages: [p] });
      p++;
    }
  }
  return views;
}

function buildSlot(p, caughtSet, cardSelections, onToggle, onPickCard, collectionType) {
  const slot = document.createElement('div');
  const slotId = p.formId;
  const isCaught = caughtSet.has(slotId);

  slot.dataset.formId = slotId;
  slot.dataset.name = p.name || '';
  slot.dataset.bookNum = p.bookNum;
  slot.dataset.dexNum = p.id;
  slot.dataset.caught = isCaught ? '1' : '0';
  slot.tabIndex = 0;
  slot.style.position = 'relative';

  if (collectionType === 'master') {
    return buildMasterSlot(slot, p, isCaught, onToggle);
  }
  if (collectionType === 'freestyle') {
    return buildFreestyleSlot(slot, p, isCaught, cardSelections, onPickCard);
  }
  return buildPokedexSlot(slot, p, isCaught, cardSelections, onPickCard);
}

function buildPokedexSlot(slot, p, isCaught, cardSelections, onPickCard) {
  const card = cardSelections[p.formId];
  if (card) {
    slot.dataset.cardSet = card.setName || '';
    slot.dataset.cardNumber = card.number || '';
  }

  let nameHtml = p.name;
  if (p.formName) nameHtml += `<br><span class="form-label">(${p.formName})</span>`;

  if (isCaught && card && card.imageSmall) {
    slot.className = 'binder-slot has-card caught';
    slot.innerHTML = `
      <div class="slot-nums">
        <span class="col-num">#${p.bookNum}</span>
        <span class="dex-num">${p.id}</span>
        <span class="slot-card-label">${card.setName} ${card.number}</span>
      </div>
      <img class="slot-card-img" src="${card.imageSmall}" alt="${card.name}" loading="lazy">
    `;
    const img = slot.querySelector('.slot-card-img');
    img.onerror = () => {
      slot.className = 'binder-slot' + (isCaught ? ' caught' : '');
      slot.innerHTML = `
        <div class="slot-name">${nameHtml}</div>
        <div class="slot-caught">${isCaught ? '&#10003;' : ''}</div>
      `;
    };
  } else {
    // Empty pokedex slot
    slot.className = 'binder-slot';
    slot.innerHTML = `
      <div class="slot-nums">
        <span class="col-num">#${p.bookNum}</span>
        <span class="dex-num">${p.id}</span>
      </div>
      <div class="slot-name">${nameHtml}</div>
      <div class="slot-caught"></div>
    `;
  }

  slot.addEventListener('click', () => onPickCard(p.formId, p.name));
  slot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onPickCard(p.formId, p.name); }
  });
  return slot;
}

function buildMasterSlot(slot, p, isCaught, onToggle) {
  const variantLabel = getVariantLabel(p.variant);
  const showBadge = variantLabel && variantLabel !== 'Normal' && variantLabel !== '';

  if (isCaught) {
    slot.className = 'binder-slot has-card caught';
  } else {
    slot.className = 'binder-slot has-card want';
  }

  slot.innerHTML = `
    <div class="slot-nums">
      <span class="col-num">#${p.number}</span>
      <span class="dex-num">${isCaught ? '&#10003;' : ''}</span>
    </div>
    ${showBadge ? `<div class="slot-variant-badge">${variantLabel.toUpperCase()}</div>` : ''}
    <img class="slot-card-img" src="${p.imageSmall}" alt="${p.name}" loading="lazy"${!isCaught ? ' style="filter:grayscale(1);opacity:0.4;"' : ''}>
  `;

  slot.addEventListener('click', () => onToggle(p.formId));
  slot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onToggle(p.formId); }
  });
  return slot;
}

function buildFreestyleSlot(slot, p, isCaught, cardSelections, onPickCard) {
  if (p.isEmpty) {
    slot.className = 'binder-slot freestyle-empty';
    slot.innerHTML = `
      <div class="freestyle-empty-content">
        <div class="freestyle-empty-icon">+</div>
        <div>Add card</div>
      </div>
    `;
    slot.addEventListener('click', () => onPickCard(p.formId, ''));
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onPickCard(p.formId, ''); }
    });
    return slot;
  }

  // Filled freestyle slot
  if (isCaught) {
    slot.className = 'binder-slot has-card caught';
  } else {
    slot.className = 'binder-slot has-card want';
  }

  slot.innerHTML = `
    <div class="slot-nums">
      <span class="col-num">#${p.collectionNum}</span>
      <span class="dex-num">${isCaught ? '&#10003;' : ''}</span>
    </div>
    <img class="slot-card-img" src="${p.imageSmall}" alt="${p.name}" loading="lazy"${!isCaught ? ' style="filter:grayscale(1);opacity:0.4;"' : ''}>
  `;

  // Filled freestyle slot triggers context menu via onPickCard
  slot.addEventListener('click', (e) => onPickCard(p.formId, p.name, e));
  slot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onPickCard(p.formId, p.name, e); }
  });
  return slot;
}

function gridMaxWidth(cols) {
  return cols >= 4 ? '520px' : '400px';
}

function renderSinglePage(container, collection, pageIndex, layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType) {
  const { cols, perPage } = parseLayout(layout);
  const grid = document.createElement('div');
  grid.className = 'binder-grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.maxWidth = gridMaxWidth(cols);

  const start = pageIndex * perPage;
  const pageItems = collection.slice(start, start + perPage);

  for (let i = 0; i < perPage; i++) {
    if (i < pageItems.length) {
      grid.appendChild(buildSlot(pageItems[i], caughtSet, cardSelections, onToggle, onPickCard, collectionType));
    } else {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'binder-slot empty';
      grid.appendChild(emptySlot);
    }
  }

  container.appendChild(grid);
}

function renderSpreadRowAcross(container, collection, pages, layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType) {
  const { cols, rows, perPage } = parseLayout(layout);
  const colsPerRow = cols * 2;

  const spread = document.createElement('div');
  spread.className = 'binder-spread';

  const leftGrid = document.createElement('div');
  leftGrid.className = 'binder-grid';
  leftGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  leftGrid.style.maxWidth = gridMaxWidth(cols);

  const rightGrid = document.createElement('div');
  rightGrid.className = 'binder-grid';
  rightGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  rightGrid.style.maxWidth = gridMaxWidth(cols);

  const start = pages[0] * perPage;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = start + r * colsPerRow + c;
      appendSlot(leftGrid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
    }
    for (let c = 0; c < cols; c++) {
      const idx = start + r * colsPerRow + cols + c;
      appendSlot(rightGrid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
    }
  }

  spread.appendChild(leftGrid);
  spread.appendChild(rightGrid);
  container.appendChild(spread);
}

function appendSlot(grid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard, collectionType) {
  if (idx < collection.length) {
    grid.appendChild(buildSlot(collection[idx], caughtSet, cardSelections, onToggle, onPickCard, collectionType));
  } else {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'binder-slot empty';
    grid.appendChild(emptySlot);
  }
}

function renderBinderView(container, collection, viewIndex, layout, caughtSet, onToggle, flow, cardSelections, onPickCard, collectionType) {
  const totalPages = getTotalPages(collection.length, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(viewIndex, views.length - 1)];

  container.innerHTML = '';

  if (view.pages.length === 2) {
    if (flow === 'row') {
      renderSpreadRowAcross(container, collection, view.pages, layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
    } else {
      const spread = document.createElement('div');
      spread.className = 'binder-spread';
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
      renderSinglePage(spread, collection, view.pages[1], layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
      container.appendChild(spread);
    }
  } else {
    const isFirstView = viewIndex === 0;
    const isLastView = viewIndex === views.length - 1;

    const spread = document.createElement('div');
    spread.className = 'binder-spread';

    if (isFirstView && !isLastView) {
      const placeholder = document.createElement('div');
      placeholder.className = 'binder-grid binder-page-blank';
      spread.appendChild(placeholder);
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
    } else if (isLastView && !isFirstView) {
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
      const placeholder = document.createElement('div');
      placeholder.className = 'binder-grid binder-page-blank';
      spread.appendChild(placeholder);
    } else {
      const single = document.createElement('div');
      single.className = 'binder-single';
      renderSinglePage(single, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard, collectionType);
      container.appendChild(single);
      return;
    }

    container.appendChild(spread);
  }
}

function getTotalViews(collectionLength, layout) {
  const totalPages = getTotalPages(collectionLength, layout);
  return buildViews(totalPages).length;
}

function getViewPageInfo(viewIndex, collectionLength, layout) {
  const totalPages = getTotalPages(collectionLength, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(viewIndex, views.length - 1)];
  if (view.pages.length === 2) {
    return `Pages ${view.pages[0] + 1}–${view.pages[1] + 1} of ${totalPages}`;
  }
  return `Page ${view.pages[0] + 1} of ${totalPages}`;
}

export { renderBinderView, getTotalViews, getViewPageInfo, parseLayout, getTotalPages, buildViews };
