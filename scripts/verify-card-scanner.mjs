#!/usr/bin/env node

const DEBUG_ENDPOINT = process.env.POKEBINDER_CDP_URL || 'http://127.0.0.1:9222';
const APP_ORIGIN = process.env.POKEBINDER_APP_URL || 'http://127.0.0.1:8123';
const RUN_ID = Date.now().toString(36);
const LOG_PREFIX = `[scanner-smoke:${RUN_ID}]`;

const FIXTURES = [
  { generation: 1, id: 'base1-4', name: 'Charizard', number: '4', total: 102, setId: 'base1', setName: 'Base', releaseDate: '1999/01/09', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/base1/4_hires.png' },
  { generation: 2, id: 'neo1-9', name: 'Lugia', number: '9', total: 111, setId: 'neo1', setName: 'Neo Genesis', releaseDate: '2000/12/16', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/neo1/9_hires.png' },
  { generation: 3, id: 'ex1-3', name: 'Blaziken', number: '3', total: 109, setId: 'ex1', setName: 'Ruby & Sapphire', releaseDate: '2003/07/01', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/ex1/3_hires.png' },
  { generation: 4, id: 'dp1-6', name: 'Lucario', number: '6', total: 130, setId: 'dp1', setName: 'Diamond & Pearl', releaseDate: '2007/05/01', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/dp1/6_hires.png' },
  { generation: 5, id: 'bw1-71', name: 'Zoroark', number: '71', total: 114, setId: 'bw1', setName: 'Black & White', releaseDate: '2011/04/25', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/bw1/71_hires.png' },
  { generation: 6, id: 'xy1-41', name: 'Greninja', number: '41', total: 146, setId: 'xy1', setName: 'XY', releaseDate: '2014/02/05', rarity: 'Rare Holo', image: 'https://images.pokemontcg.io/xy1/41_hires.png' },
  { generation: 7, id: 'smp-SM29', name: 'Mimikyu', number: 'SM29', total: 248, setId: 'smp', setName: 'SM Black Star Promos', releaseDate: '2017/02/03', rarity: 'Promo', image: 'https://images.pokemontcg.io/smp/SM29_hires.png' },
  { generation: 8, id: 'swsh1-138', name: 'Zacian V', number: '138', total: 202, setId: 'swsh1', setName: 'Sword & Shield', releaseDate: '2020/02/07', rarity: 'Rare Holo V', image: 'https://images.pokemontcg.io/swsh1/138_hires.png' },
  { generation: 9, id: 'sv1-13', name: 'Sprigatito', number: '13', total: 198, setId: 'sv1', setName: 'Scarlet & Violet', releaseDate: '2023/03/31', rarity: 'Common', image: 'https://images.pokemontcg.io/sv1/13_hires.png' },
];
const requestedFixtureId = process.argv[2] || '';
const CAPTURE_SCENARIO = process.argv[3] || 'clean';
if (!['clean', 'rotated', 'upside-down', 'dim', 'glare'].includes(CAPTURE_SCENARIO)) {
  throw new Error(`Unknown capture scenario: ${CAPTURE_SCENARIO}`);
}
const ACTIVE_FIXTURES = requestedFixtureId
  ? FIXTURES.filter(fixture => fixture.id === requestedFixtureId)
  : FIXTURES;
if (ACTIVE_FIXTURES.length === 0) throw new Error(`Unknown scanner fixture: ${requestedFixtureId}`);

async function connectToPage() {
  const response = await fetch(`${DEBUG_ENDPOINT}/json/list`);
  if (!response.ok) throw new Error(`Could not reach Chrome DevTools (${response.status})`);
  const targets = await response.json();
  const target = targets.find(item => item.type === 'page' && item.url.startsWith(APP_ORIGIN));
  if (!target) throw new Error(`No Chrome page is open at ${APP_ORIGIN}`);

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const values = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ');
      if (values.startsWith(LOG_PREFIX)) {
        process.stdout.write(`${values.replace(LOG_PREFIX, '[scanner-smoke]')}\n`);
      } else if (message.params.type === 'error') {
        process.stderr.write(`[browser] ${values}\n`);
      }
    }
  });

  function command(method, params = {}, timeoutMs = 600_000) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { socket, command };
}

const { socket, command } = await connectToPage();

try {
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Page.reload', { ignoreCache: true });
  await new Promise(resolve => setTimeout(resolve, 2_000));

  const expression = `
    (async () => {
      const fixtures = ${JSON.stringify(ACTIVE_FIXTURES)};
      const captureScenario = ${JSON.stringify(CAPTURE_SCENARIO)};
      const log = message => console.log(${JSON.stringify(LOG_PREFIX)} + ' ' + message);
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      async function waitFor(check, label, timeoutMs = 60_000) {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
          const value = check();
          if (value) return value;
          await sleep(100);
        }
        throw new Error('Timed out waiting for ' + label);
      }
      function click(selector) {
        const element = document.querySelector(selector);
        if (!element) throw new Error('Missing element: ' + selector);
        element.click();
        return element;
      }
      function rawCard(fixture) {
        return {
          id: fixture.id,
          name: fixture.name,
          number: fixture.number,
          rarity: fixture.rarity,
          images: { small: fixture.image.replace('_hires', '') },
          set: {
            id: fixture.setId,
            name: fixture.setName,
            printedTotal: fixture.total,
            releaseDate: fixture.releaseDate,
          },
        };
      }
      function catalogMatches(url, fixture) {
        const query = decodeURIComponent(new URL(url).searchParams.get('q') || '');
        const numberTerms = [...query.matchAll(/number:"([^"]+)"/g)].map(match => match[1]);
        const nameTerms = [...query.matchAll(/name:"([^"]+)"/g)].map(match => match[1]);
        const normalizeNumber = value => String(value).toUpperCase().replace(/^0+(?=\\d)/, '');
        return numberTerms.some(term => normalizeNumber(term) === normalizeNumber(fixture.number))
          || nameTerms.some(term => term.toLowerCase() === fixture.name.toLowerCase());
      }

      log('creating one Freestyle collection for ' + fixtures.length + ' scans');
      click('#collection-title');
      await waitFor(() => document.querySelector('.collection-dd-add'), 'collection menu');
      click('.collection-dd-add');
      const name = document.querySelector('#create-name');
      name.value = 'Scanner Batch ' + Date.now();
      name.dispatchEvent(new Event('input', { bubbles: true }));
      click('.type-card[data-type="freestyle"]');
      const create = document.querySelector('#create-confirm-btn');
      if (create.disabled) throw new Error('Freestyle Create button stayed disabled');
      create.click();
      await waitFor(() => document.querySelector('#create-collection-modal').hidden, 'collection creation');
      await waitFor(() => document.querySelector('.binder-slot.freestyle-empty'), 'empty Freestyle slot');

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.startsWith('https://api.pokemontcg.io/v2/cards')) {
          window.__pokebinderScannerLookupUrl = url;
          const fixture = window.__pokebinderScannerFixture;
          const data = catalogMatches(url, fixture) ? [rawCard(fixture)] : [];
          return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => {
          const stream = window.__pokebinderScannerCamera.captureStream(0);
          const videoTrack = stream.getVideoTracks()[0];
          const frameTimer = setInterval(() => videoTrack.requestFrame?.(), 100);
          videoTrack.addEventListener('ended', () => clearInterval(frameTimer), { once: true });
          window.__pokebinderScannerStream = stream;
          return stream;
        },
      });
      const nativeMediaPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function playScannerFixture() {
        if (this.classList.contains('cv-applet__video')) return Promise.resolve();
        return nativeMediaPlay.call(this);
      };

      const results = [];
      let sharedScanner = null;
      for (const fixture of fixtures) {
        log('Gen ' + fixture.generation + ': loading ' + fixture.id + ' ' + fixture.name);
        const imageResponse = await originalFetch(fixture.image, { cache: 'no-store' });
        if (!imageResponse.ok) throw new Error('Card fixture download failed: ' + imageResponse.status);
        const cardBitmap = await createImageBitmap(await imageResponse.blob());
        const fakeCamera = document.createElement('canvas');
        // A real camera frame includes background around the card; the corner
        // detector is not intended for an image cropped exactly to card edges.
        const transformed = true;
        fakeCamera.width = transformed ? 900 : cardBitmap.width;
        fakeCamera.height = transformed ? 1260 : cardBitmap.height;
        const cameraContext = fakeCamera.getContext('2d');
        if (transformed) {
          cameraContext.fillStyle = '#606060';
          cameraContext.fillRect(0, 0, fakeCamera.width, fakeCamera.height);
          cameraContext.translate(fakeCamera.width / 2, fakeCamera.height / 2);
          if (captureScenario === 'rotated') cameraContext.rotate(6 * Math.PI / 180);
          if (captureScenario === 'upside-down') cameraContext.rotate(Math.PI);
          if (captureScenario === 'dim') cameraContext.filter = 'brightness(0.55) contrast(0.9)';
          const scale = 0.86 * Math.min(
            fakeCamera.width / cardBitmap.width,
            fakeCamera.height / cardBitmap.height,
          );
          cameraContext.drawImage(
            cardBitmap,
            -cardBitmap.width * scale / 2,
            -cardBitmap.height * scale / 2,
            cardBitmap.width * scale,
            cardBitmap.height * scale,
          );
          if (captureScenario === 'glare') {
            cameraContext.setTransform(1, 0, 0, 1, 0, 0);
            const glare = cameraContext.createLinearGradient(250, 0, 650, 1260);
            glare.addColorStop(0, 'rgba(255,255,255,0)');
            glare.addColorStop(0.42, 'rgba(255,255,255,0.72)');
            glare.addColorStop(0.58, 'rgba(255,255,255,0.72)');
            glare.addColorStop(1, 'rgba(255,255,255,0)');
            cameraContext.fillStyle = glare;
            cameraContext.fillRect(0, 0, fakeCamera.width, fakeCamera.height);
          }
        } else {
          cameraContext.drawImage(cardBitmap, 0, 0);
        }
        cardBitmap.close();
        window.__pokebinderScannerCamera = fakeCamera;
        window.__pokebinderScannerFixture = fixture;
        window.__pokebinderScannerLookupUrl = '';
        let hints = null;
        let visualFrames = 0;
        let lastVisualResult = null;
        window.__pokebinderScannerTest = {
          onRecognition(value) { hints = value; },
          onVisualResult(value) {
            lastVisualResult = value;
            visualFrames++;
            if (visualFrames <= 4 || value.cardPresent) {
              log('visual frame ' + visualFrames + ': ' + JSON.stringify(value));
            }
          },
          onVisualError(message) { log('visual error: ' + message); },
        };
        sharedScanner?.updateConfig({ scanIntervalMs: 300 });

        click('.binder-slot.freestyle-empty');
        await waitFor(() => !document.querySelector('#card-picker-modal').hidden, 'card picker');
        click('#card-picker-camera');
        let lastPreviewStatus = '';
        const scannerDebug = await waitFor(
          () => {
            const currentStatus = document.querySelector('#card-scanner-status')?.textContent || '';
            if (currentStatus && currentStatus !== lastPreviewStatus) {
              lastPreviewStatus = currentStatus;
              log('scanner status: ' + currentStatus);
            }
            const scanner = window.__pokebinderScannerTest.visualScanner;
            return scanner?.ready && scanner?.started ? scanner : null;
          },
          'visual card reader',
          240_000,
        );
        sharedScanner = scannerDebug;
        const configuredScanIntervalMs = scannerDebug.config.scanIntervalMs;
        log('visual runtime: ' + JSON.stringify({
          ready: scannerDebug?.ready,
          started: scannerDebug?.started,
          workerBusy: scannerDebug?.workerBusy,
          hasTimer: Boolean(scannerDebug?.timer),
        }));
        // Headless captureStream video elements do not expose their canvas
        // pixels through videoWidth/videoHeight reliably.  Record the real
        // interval above, then park automatic ticks and let any startup frame
        // finish before injecting fixture-backed ImageBitmaps.
        scannerDebug.updateConfig({ scanIntervalMs: 60_000 });
        await waitFor(() => !scannerDebug.workerBusy, 'startup scanner frame');
        scannerDebug.bucket.reset();
        const capturedFrame = [fakeCamera.width, fakeCamera.height];
        for (let frame = 0; frame < 2; frame++) {
          if (document.querySelector('#card-picker-name').textContent === 'Scan matches') break;
          await scannerDebug.scanImage(fakeCamera);
        }

        const status = document.querySelector('#card-scanner-status');
        const deadline = performance.now() + 60_000;
        let lastScanStatus = status.textContent;
        while (performance.now() < deadline) {
          const resultsReady = document.querySelector('#card-picker-name').textContent === 'Scan matches';
          if (resultsReady || (status.classList.contains('error') && !hints)) break;
          if (status.textContent !== lastScanStatus) {
            lastScanStatus = status.textContent;
            log('scanner status: ' + lastScanStatus);
          }
          await sleep(250);
        }
        const cards = [...document.querySelectorAll('#card-picker-grid .card-picker-item')]
          .slice(0, 3)
          .map(item => ({
            text: item.textContent.replace(/\\s+/g, ' ').trim(),
            selected: item.classList.contains('selected'),
          }));
        const expected = fixture.number + '/' + fixture.total + ' ' + fixture.name;
        const rotationPolicyPassed = captureScenario === 'upside-down'
          ? lastVisualResult?.rotationChecked === true
            && lastVisualResult?.orientation === 'rotated_180'
          : !lastVisualResult
            || (lastVisualResult.uprightScore < 0.75) === lastVisualResult.rotationChecked;
        const passed = !status.classList.contains('error')
          && document.querySelector('#card-picker-name').textContent === 'Scan matches'
          && cards[0]?.text.startsWith(expected)
          && window.__pokebinderScannerStream.getTracks().every(track => track.readyState === 'ended')
          && configuredScanIntervalMs === 300
          && rotationPolicyPassed;
        results.push({
          generation: fixture.generation,
          id: fixture.id,
          scenario: captureScenario,
          expected,
          passed,
          frame: capturedFrame,
          scanIntervalMs: configuredScanIntervalMs,
          visualResult: lastVisualResult,
          hints,
          lookupQuery: window.__pokebinderScannerLookupUrl,
          status: status.textContent,
          cards,
        });
        log('Gen ' + fixture.generation + ': ' + (passed ? 'PASS' : 'FAIL')
          + ' hints=' + JSON.stringify(hints));
        click('#card-picker-close');
        await waitFor(() => document.querySelector('#card-picker-modal').hidden, 'picker close');
        fakeCamera.width = 0;
        fakeCamera.height = 0;
      }
      delete window.__pokebinderScannerTest;
      return {
        secureContext: window.isSecureContext,
        passed: results.filter(result => result.passed).length,
        total: results.length,
        results,
      };
    })()
  `;

  const evaluated = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluated.exceptionDetails) {
    const description = evaluated.exceptionDetails.exception?.description
      || evaluated.exceptionDetails.text
      || 'Browser evaluation failed';
    throw new Error(description);
  }
  const result = evaluated.result.value;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.passed !== result.total) process.exitCode = 1;
} finally {
  socket.close();
}
