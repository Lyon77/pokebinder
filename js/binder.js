function parseLayout(layout) {
  const [cols, rows] = layout.split('x').map(Number);
  return { cols, rows, perPage: cols * rows };
}

function getTotalPages(collectionLength, layout) {
  const { perPage } = parseLayout(layout);
  return Math.max(1, Math.ceil(collectionLength / perPage));
}

// Build the list of views from total pages.
// View 0: page 0 (single). Then pairs: [1,2], [3,4], ...
// Last view is single if total pages is even.
function buildViews(totalPages) {
  if (totalPages === 0) return [{ pages: [0] }];
  const views = [{ pages: [0] }]; // first page is always single
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

function buildSlot(p, caughtSet, cardSelections, onToggle, onPickCard) {
  const slot = document.createElement('div');
  const isCaught = caughtSet.has(p.formId);
  const card = cardSelections[p.formId];

  slot.dataset.formId = p.formId;
  slot.dataset.name = p.name;
  slot.dataset.formName = p.formName || '';
  slot.dataset.bookNum = p.bookNum;
  slot.dataset.dexNum = p.id;
  slot.dataset.caught = isCaught ? '1' : '0';
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
    slot.className = 'binder-slot' + (isCaught ? ' caught' : '');
    slot.innerHTML = `
      <div class="slot-nums">
        <span class="col-num">#${p.bookNum}</span>
        <span class="dex-num">${p.id}</span>
      </div>
      <div class="slot-name">${nameHtml}</div>
      <div class="slot-caught">${isCaught ? '&#10003;' : ''}</div>
    `;
  }

  slot.tabIndex = 0;
  slot.addEventListener('click', () => onPickCard(p.formId, p.name));
  slot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onPickCard(p.formId, p.name);
    }
  });
  return slot;
}

function gridMaxWidth(cols) {
  return cols >= 4 ? '520px' : '400px';
}

function renderSinglePage(container, collection, pageIndex, layout, caughtSet, onToggle, cardSelections, onPickCard) {
  const { cols, perPage } = parseLayout(layout);
  const grid = document.createElement('div');
  grid.className = 'binder-grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.maxWidth = gridMaxWidth(cols);

  const start = pageIndex * perPage;
  const pageItems = collection.slice(start, start + perPage);

  for (let i = 0; i < perPage; i++) {
    if (i < pageItems.length) {
      grid.appendChild(buildSlot(pageItems[i], caughtSet, cardSelections, onToggle, onPickCard));
    } else {
      const slot = document.createElement('div');
      slot.className = 'binder-slot empty';
      grid.appendChild(slot);
    }
  }

  container.appendChild(grid);
}

function renderSpreadRowAcross(container, collection, pages, layout, caughtSet, onToggle, cardSelections, onPickCard) {
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
      appendSlot(leftGrid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard);
    }
    for (let c = 0; c < cols; c++) {
      const idx = start + r * colsPerRow + cols + c;
      appendSlot(rightGrid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard);
    }
  }

  spread.appendChild(leftGrid);
  spread.appendChild(rightGrid);
  container.appendChild(spread);
}

function appendSlot(grid, collection, idx, caughtSet, onToggle, cardSelections, onPickCard) {
  if (idx < collection.length) {
    grid.appendChild(buildSlot(collection[idx], caughtSet, cardSelections, onToggle, onPickCard));
  } else {
    const slot = document.createElement('div');
    slot.className = 'binder-slot empty';
    grid.appendChild(slot);
  }
}

function renderBinderView(container, collection, viewIndex, layout, caughtSet, onToggle, flow, cardSelections, onPickCard) {
  const totalPages = getTotalPages(collection.length, layout);
  const views = buildViews(totalPages);
  const view = views[Math.min(viewIndex, views.length - 1)];

  container.innerHTML = '';

  if (view.pages.length === 2) {
    if (flow === 'row') {
      renderSpreadRowAcross(container, collection, view.pages, layout, caughtSet, onToggle, cardSelections, onPickCard);
    } else {
      const spread = document.createElement('div');
      spread.className = 'binder-spread';
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard);
      renderSinglePage(spread, collection, view.pages[1], layout, caughtSet, onToggle, cardSelections, onPickCard);
      container.appendChild(spread);
    }
  } else {
    const isFirstView = viewIndex === 0;
    const isLastView = viewIndex === views.length - 1;

    const spread = document.createElement('div');
    spread.className = 'binder-spread';

    if (isFirstView && !isLastView) {
      // First page — show on the right (like opening a book cover)
      const placeholder = document.createElement('div');
      placeholder.className = 'binder-grid binder-page-blank';
      spread.appendChild(placeholder);
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard);
    } else if (isLastView && !isFirstView) {
      // Last page — show on the left (like the back of a book)
      renderSinglePage(spread, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard);
      const placeholder = document.createElement('div');
      placeholder.className = 'binder-grid binder-page-blank';
      spread.appendChild(placeholder);
    } else {
      // Only one view total — center it
      const single = document.createElement('div');
      single.className = 'binder-single';
      renderSinglePage(single, collection, view.pages[0], layout, caughtSet, onToggle, cardSelections, onPickCard);
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
