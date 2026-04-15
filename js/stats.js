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

function formatPercent(caught, total) {
  if (total === 0) return '0%';
  return Math.round((caught / total) * 1000) / 10 + '%';
}

function renderStats(overallTextEl, overallBarEl, genContainer, stats) {
  const { overall, byGen } = stats;
  const pct = overall.total > 0 ? (overall.caught / overall.total) * 100 : 0;
  overallTextEl.textContent = `${overall.caught} / ${overall.total} (${formatPercent(overall.caught, overall.total)})`;
  overallBarEl.style.width = pct + '%';

  genContainer.innerHTML = '';
  for (let g = 1; g <= 9; g++) {
    const s = byGen[g];
    if (s.total === 0) continue;
    const genPct = (s.caught / s.total) * 100;

    const row = document.createElement('div');
    row.className = 'stats-gen-row';
    row.innerHTML = `
      <span class="stats-gen-label">${GENERATION_NAMES[g]}</span>
      <div class="stats-gen-bar">
        <div class="progress-bar"><div class="progress-fill" style="width:${genPct}%"></div></div>
        <span class="stats-gen-pct">${formatPercent(s.caught, s.total)}</span>
      </div>
    `;
    genContainer.appendChild(row);
  }
}

export { computeStats, renderStats };
