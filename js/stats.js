import { GENERATION_NAMES } from './data.js';

function computeStats(collection, caughtSet) {
  const overall = { total: collection.length, caught: 0 };
  const byGen = {};

  for (let g = 1; g <= 9; g++) {
    byGen[g] = { total: 0, caught: 0 };
  }

  for (const p of collection) {
    if (byGen[p.generation]) {
      byGen[p.generation].total++;
      if (caughtSet.has(p.formId)) {
        byGen[p.generation].caught++;
        overall.caught++;
      }
    }
  }

  return { overall, byGen };
}

function computeMasterStats(collection, caughtSet, setOrder) {
  const overall = { total: collection.length, caught: 0 };
  const bySetMap = new Map();

  for (const slot of collection) {
    const isCaught = caughtSet.has(slot.formId);
    if (isCaught) overall.caught++;
    const setId = slot.setId;
    if (!setId) continue;
    let s = bySetMap.get(setId);
    if (!s) {
      s = { setId, setName: slot.setName || setId, total: 0, caught: 0 };
      bySetMap.set(setId, s);
    }
    s.total++;
    if (isCaught) s.caught++;
  }

  const orderIndex = new Map((setOrder || []).map((id, i) => [id, i]));
  const bySet = [...bySetMap.values()].sort((a, b) => {
    const ai = orderIndex.has(a.setId) ? orderIndex.get(a.setId) : Infinity;
    const bi = orderIndex.has(b.setId) ? orderIndex.get(b.setId) : Infinity;
    return ai - bi;
  });

  return { overall, bySet };
}

function formatPercent(caught, total) {
  if (total === 0) return '0%';
  return Math.round((caught / total) * 1000) / 10 + '%';
}

function setOverall(overallTextEl, overallBarEl, overall) {
  const pct = overall.total > 0 ? (overall.caught / overall.total) * 100 : 0;
  overallTextEl.textContent = `${overall.caught} / ${overall.total} (${formatPercent(overall.caught, overall.total)})`;
  overallBarEl.style.width = pct + '%';
}

function renderBreakdownRow(label, caught, total) {
  const pct = total > 0 ? (caught / total) * 100 : 0;
  const row = document.createElement('div');
  row.className = 'stats-gen-row';
  row.innerHTML = `
    <span class="stats-gen-label">${label}</span>
    <div class="stats-gen-bar">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="stats-gen-pct">${formatPercent(caught, total)}</span>
    </div>
  `;
  return row;
}

function renderStats(overallTextEl, overallBarEl, genContainer, stats) {
  const { overall, byGen } = stats;
  setOverall(overallTextEl, overallBarEl, overall);

  genContainer.innerHTML = '';
  for (let g = 1; g <= 9; g++) {
    const s = byGen[g];
    if (s.total === 0) continue;
    genContainer.appendChild(renderBreakdownRow(GENERATION_NAMES[g], s.caught, s.total));
  }
}

function renderMasterStats(overallTextEl, overallBarEl, breakdownContainer, stats) {
  const { overall, bySet } = stats;
  setOverall(overallTextEl, overallBarEl, overall);

  breakdownContainer.innerHTML = '';
  for (const s of bySet) {
    breakdownContainer.appendChild(renderBreakdownRow(s.setName, s.caught, s.total));
  }
}

export { computeStats, computeMasterStats, renderStats, renderMasterStats };
