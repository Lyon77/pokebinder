const TESSERACT_MODULE_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js';
const CARD_ASPECT_RATIO = 2.5 / 3.5;
const MAX_OCR_WIDTH = 1200;

let ocrWorkerPromise = null;
let ocrProgressHandler = null;

function resolveCreateWorker(module) {
  const createWorker = module?.createWorker || module?.default?.createWorker;
  if (typeof createWorker !== 'function') {
    throw new TypeError('The OCR library did not provide createWorker');
  }
  return createWorker;
}

function normalizeScanText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[’‘`]/g, "'")
    .replace(/[♀]/g, ' female ')
    .replace(/[♂]/g, ' male ')
    .replace(/[^a-zA-Z0-9'\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeCollectorNumber(value) {
  const compact = String(value || '')
    .toUpperCase()
    .replace(/[|IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9/]/g, '');
  if (!compact) return '';
  return compact;
}

function collectorNumerator(value) {
  return normalizeCollectorNumber(value).split('/')[0] || '';
}

function collectorNumberForms(value) {
  const normalized = normalizeCollectorNumber(value);
  if (!normalized) return [];
  const [numerator, total] = normalized.split('/');
  const withoutZeros = (part) => String(part || '').replace(/^([A-Z]*?)0+(\d)/, '$1$2');
  const compact = total ? `${withoutZeros(numerator)}/${withoutZeros(total)}` : withoutZeros(numerator);
  const numericSuffix = numerator.match(/(\d+[A-Z]?)$/)?.[1] || '';
  const numeric = numericSuffix && total ? `${numericSuffix}/${total}` : numericSuffix;
  const compactNumeric = numericSuffix && total
    ? `${withoutZeros(numericSuffix)}/${withoutZeros(total)}`
    : withoutZeros(numericSuffix);
  return [...new Set([normalized, compact, numeric, compactNumeric].filter(Boolean))];
}

function extractCollectorNumbers(text) {
  const prepared = String(text || '')
    .toUpperCase()
    .replace(/[|IL]/g, '1')
    .replace(/O(?=\s*\d|\s*\/)/g, '0');
  const patterns = [
    /\b[A-Z]{0,3}\s*\d{1,3}[A-Z]?\s*\/\s*[A-Z]{0,3}\s*\d{1,3}\b/g,
    /\b\d{1,3}[A-Z]?\s+OF\s+\d{1,3}\b/g,
    /\b(?:SWSH|SVP|SM|XY|DP|BW)\s*-?\s*\d{1,3}\b/g,
  ];
  const found = [];
  for (const pattern of patterns) {
    for (const match of prepared.matchAll(pattern)) {
      const normalized = normalizeCollectorNumber(match[0].replace(/\s+OF\s+/, '/'));
      if (normalized && !found.includes(normalized)) found.push(normalized);
    }
  }
  return found;
}

function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function textSimilarity(a, b) {
  const left = normalizeScanText(a);
  const right = normalizeScanText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }
  return 1 - (levenshteinDistance(left, right) / Math.max(left.length, right.length));
}

function usableOcrLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => {
      if (line.length < 2 || line.length > 42) return false;
      const letters = (line.match(/[A-Za-z]/g) || []).length;
      return letters >= 2 && letters >= line.length * 0.35;
    });
}

function nameSimilarityInLine(name, line) {
  let best = textSimilarity(name, line.replace(/\b\d{2,3}\s*HP\b/i, '').trim());
  const normalizedName = normalizeScanText(name);
  const nameWordCount = normalizedName.split(' ').length;
  const words = normalizeScanText(line).split(' ').filter(Boolean);
  for (let start = 0; start < words.length; start++) {
    for (const width of [nameWordCount, nameWordCount + 1]) {
      const candidate = words.slice(start, start + width).join(' ');
      if (candidate.length < Math.max(3, normalizedName.length - 3)) continue;
      const score = textSimilarity(name, candidate);
      if (score >= 0.82) best = Math.max(best, score);
    }
  }
  return best;
}

function extractScanHints(text, { pokemonNames = [] } = {}) {
  const normalizedText = normalizeScanText(text);
  const lines = usableOcrLines(text);
  const collectorNumbers = extractCollectorNumbers(text);
  const nameScores = new Map();

  for (const rawName of pokemonNames) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    const normalizedName = normalizeScanText(name);
    let score = normalizedText.includes(normalizedName) ? 1 : 0;
    for (const line of lines.slice(0, 10)) {
      score = Math.max(score, nameSimilarityInLine(name, line));
    }
    if (score >= 0.72) nameScores.set(name, score);
  }

  const likelyLines = lines
    .map(line => line
      .replace(/\b(?:BASIC|STAGE\s*[12]|TRAINER|ENERGY)\b/gi, ' ')
      .replace(/\b\d{2,3}\s*HP\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(line => line.length >= 2 && line.length <= 32 && !/\d+\s*\//.test(line));

  const names = [
    ...[...nameScores.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    ...likelyLines,
  ].filter((name, index, all) => {
    const normalized = normalizeScanText(name);
    return normalized && all.findIndex(other => normalizeScanText(other) === normalized) === index;
  }).slice(0, 8);

  const setTokens = normalizedText
    .split(' ')
    .filter(token => token.length >= 4 && !/^\d+$/.test(token));

  return { names, collectorNumbers, setTokens, normalizedText };
}

function visualResultToScanHints(result) {
  const rawName = String(result?.cardName || '').replace(/\s+/g, ' ').trim();
  const collectorNumber = normalizeCollectorNumber(result?.collectorNumber);
  const numberToken = collectorNumerator(collectorNumber).replace(/^0+(?=\d)/, '');
  let name = rawName;
  const dashIndex = name.indexOf(' - ');
  if (dashIndex > 0) {
    const suffix = normalizeCollectorNumber(name.slice(dashIndex + 3));
    if (!numberToken || suffix.includes(numberToken)) name = name.slice(0, dashIndex);
  }
  name = name.replace(/\s+\([^)]*(?:holo|error|promo|staff|stamped|reverse)[^)]*\)\s*$/i, '').trim();

  const setName = String(result?.setName || '').replace(/\s+/g, ' ').trim();
  const normalizedText = normalizeScanText(`${name} ${setName} ${collectorNumber}`);
  return {
    names: name ? [name] : [],
    collectorNumbers: collectorNumber ? [collectorNumber] : [],
    setTokens: normalizeScanText(setName).split(' ').filter(token => token.length >= 3),
    normalizedText,
    visualScore: Number(result?.score) || 0,
    visualProductId: String(result?.tcgplayerProductId || result?.cardId || ''),
  };
}

function rankCardCandidates(hints, cards, { limit = 12 } = {}) {
  const names = Array.isArray(hints?.names) ? hints.names : [];
  const numbers = Array.isArray(hints?.collectorNumbers) ? hints.collectorNumbers : [];
  const normalizedText = hints?.normalizedText || normalizeScanText(hints?.text || '');
  const scanNumerators = new Set(numbers.flatMap(collectorNumberForms).map(collectorNumerator).filter(Boolean));
  const scanFullNumbers = new Set(numbers.flatMap(collectorNumberForms));
  const setTokens = new Set(Array.isArray(hints?.setTokens) ? hints.setTokens : []);
  const deduped = new Map();

  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card || !card.cardId) continue;
    const reasons = [];
    let score = 0;
    const cardNumberForms = collectorNumberForms(card.number);
    const cardNumerators = cardNumberForms.map(collectorNumerator);

    if (cardNumberForms.some(number => scanFullNumbers.has(number))) {
      score += 0.62;
      reasons.push('collector number');
    } else if (cardNumerators.some(number => scanNumerators.has(number))) {
      score += 0.52;
      reasons.push('collector number');
    }

    const nameSimilarity = names.reduce(
      (best, name) => Math.max(best, textSimilarity(card.name, name)),
      normalizedText.includes(normalizeScanText(card.name)) ? 1 : 0,
    );
    if (nameSimilarity > 0) {
      score += nameSimilarity * (numbers.length ? 0.3 : 0.72);
      if (nameSimilarity >= 0.7) reasons.push('card name');
    }

    const normalizedSet = normalizeScanText(card.setName);
    const cardSetTokens = normalizedSet.split(' ').filter(token => token.length >= 4);
    const overlap = cardSetTokens.filter(token => setTokens.has(token)).length;
    if (overlap > 0) {
      score += Math.min(0.14, overlap * 0.07);
      reasons.push('set text');
    }

    const ranked = { card, score: Math.min(1, score), reasons };
    const previous = deduped.get(card.cardId);
    if (!previous || ranked.score > previous.score) deduped.set(card.cardId, ranked);
  }

  return [...deduped.values()]
    .filter(result => result.score >= 0.15)
    .sort((a, b) => b.score - a.score
      || String(a.card.setYear || '').localeCompare(String(b.card.setYear || '')) * -1
      || String(a.card.cardId).localeCompare(String(b.card.cardId)))
    .slice(0, limit);
}

function hasClearScanLeader(ranked, { minScore = 0.78, minMargin = 0.12 } = {}) {
  if (!Array.isArray(ranked) || ranked.length === 0) return false;
  const leader = Number(ranked[0]?.score) || 0;
  const runnerUp = Number(ranked[1]?.score) || 0;
  return leader >= minScore && (ranked.length === 1 || leader - runnerUp >= minMargin);
}

async function getOcrWorker(onProgress) {
  ocrProgressHandler = onProgress;
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import(TESSERACT_MODULE_URL)
      .then(module => {
        // The CDN ESM bundle wraps Tesseract's CommonJS API as its default export.
        // Keep the named-export fallback so this also works with native ESM builds.
        const createWorker = resolveCreateWorker(module);
        return createWorker('eng', 1, {
          logger(message) {
            if (ocrProgressHandler) ocrProgressHandler(message);
          },
        });
      })
      .catch(error => {
        ocrWorkerPromise = null;
        throw error;
      });
  }
  return ocrWorkerPromise;
}

async function blobToCanvas(blob) {
  let image;
  let releaseImage = () => {};
  if ('createImageBitmap' in globalThis) {
    try {
      image = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      image = await createImageBitmap(blob);
    }
    releaseImage = () => image.close();
  } else {
    const objectUrl = URL.createObjectURL(blob);
    image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('The selected image could not be decoded'));
        image.src = objectUrl;
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
    releaseImage = () => URL.revokeObjectURL(objectUrl);
  }

  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > CARD_ASPECT_RATIO) {
    cropWidth = sourceHeight * CARD_ASPECT_RATIO;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / CARD_ASPECT_RATIO;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  const width = Math.min(MAX_OCR_WIDTH, Math.round(cropWidth));
  const height = Math.round(width / CARD_ASPECT_RATIO);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
  releaseImage();
  return canvas;
}

function cropForOcr(source, topRatio, heightRatio, {
  filter = 'grayscale(1) contrast(1.65)',
  leftRatio = 0,
  widthRatio = 1,
  upscale = false,
} = {}) {
  const canvas = document.createElement('canvas');
  const sourceWidth = Math.round(source.width * widthRatio);
  const scale = upscale ? Math.max(1, Math.min(2.5, MAX_OCR_WIDTH / sourceWidth)) : 1;
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.max(1, Math.round(source.height * heightRatio * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.filter = filter;
  context.drawImage(
    source,
    Math.round(source.width * leftRatio),
    Math.round(source.height * topRatio),
    sourceWidth,
    Math.round(source.height * heightRatio),
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

async function recognizeCardImage(blob, { onProgress, pokemonNames = [] } = {}) {
  if (!(blob instanceof Blob)) throw new TypeError('A card image Blob is required');
  const worker = await getOcrWorker(onProgress);
  const cardCanvas = await blobToCanvas(blob);
  const topCanvas = cropForOcr(cardCanvas, 0, 0.28);
  const bottomCanvas = cropForOcr(cardCanvas, 0.7, 0.3);
  let titleCanvas = null;
  let numberCanvas = null;

  if (onProgress) onProgress({ status: 'recognizing card text', progress: 0 });
  await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
  const topResult = await worker.recognize(topCanvas);
  const bottomResult = await worker.recognize(bottomCanvas);
  let text = `${topResult.data.text || ''}\n${bottomResult.data.text || ''}`;
  let hints = extractScanHints(text, { pokemonNames });

  const knownNames = new Set(pokemonNames.map(normalizeScanText));
  const hasKnownName = () => hints.names.some(name => knownNames.has(normalizeScanText(name)));
  if (pokemonNames.length > 0 && !hasKnownName()) {
    titleCanvas = cropForOcr(cardCanvas, 0.02, 0.09, {
      filter: 'grayscale(1) contrast(1.25)',
      upscale: true,
    });
    if (onProgress) onProgress({ status: 'checking the card title', progress: 0.72 });
    await worker.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '1' });
    const titleResult = await worker.recognize(titleCanvas);
    text = `${titleResult.data.text || ''}\n${text}`;
    hints = extractScanHints(text, { pokemonNames });
  }

  if (hints.collectorNumbers.length === 0) {
    numberCanvas = cropForOcr(cardCanvas, 0.78, 0.21, {
      filter: 'none',
      leftRatio: 0.02,
      widthRatio: 0.62,
      upscale: true,
    });
    if (onProgress) onProgress({ status: 'checking the card number', progress: 0.8 });
    await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
    const numberResult = await worker.recognize(numberCanvas);
    text += `\n${numberResult.data.text || ''}`;
    hints = extractScanHints(text, { pokemonNames });
  }

  if (hints.names.length === 0 || hints.collectorNumbers.length === 0) {
    if (onProgress) onProgress({ status: 'checking the full card', progress: 0.85 });
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    const fullResult = await worker.recognize(cardCanvas);
    text += `\n${fullResult.data.text || ''}`;
    hints = extractScanHints(text, { pokemonNames });
  }

  cardCanvas.width = 0;
  cardCanvas.height = 0;
  topCanvas.width = 0;
  topCanvas.height = 0;
  bottomCanvas.width = 0;
  bottomCanvas.height = 0;
  if (titleCanvas) {
    titleCanvas.width = 0;
    titleCanvas.height = 0;
  }
  if (numberCanvas) {
    numberCanvas.width = 0;
    numberCanvas.height = 0;
  }
  ocrProgressHandler = null;
  return { text, hints };
}

export {
  collectorNumerator,
  extractCollectorNumbers,
  extractScanHints,
  hasClearScanLeader,
  normalizeCollectorNumber,
  normalizeScanText,
  rankCardCandidates,
  recognizeCardImage,
  resolveCreateWorker,
  textSimilarity,
  visualResultToScanHints,
};
