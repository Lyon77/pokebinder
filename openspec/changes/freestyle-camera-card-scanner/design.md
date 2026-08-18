# Design: Freestyle camera card scanner

## Context

Pokebinder is a vanilla HTML/CSS/JavaScript static site deployed on GitHub Pages. It has no backend and stores collection data in IndexedDB. The Freestyle picker currently moves between `pokemon-search` and `cards` modes, loads card metadata from the Pokemon TCG API, and only mutates a slot after the user clicks Save.

The camera feature must preserve those traits: it should work from a static HTTPS origin, avoid shipping a secret API key, avoid uploading user photos, and reuse the existing card-selection and persistence paths.

## Goals

- Let a user point a phone camera at one English-language Pokemon TCG card and reach the most likely exact printings with minimal typing.
- Keep the final selection explicit and recover cleanly from uncertain recognition.
- Keep camera images on-device and preserve the backend-free deployment.
- Support scanning both an empty slot and a replacement card for a filled slot.

## Non-goals

- Automatic saving without user confirmation.
- Recognizing multiple cards in one frame, card backs, graded slab labels, condition, language, or foil/reverse-holo state.
- Guaranteed exact identification from blurred, heavily angled, obscured, or glare-covered photos.
- Adding a hosted recognition service or changing collection storage/sync schemas.
- Replacing manual Pokemon search.

## Research and library choice

Research was checked on 2026-08-17.

- Browser camera access needs no library. `navigator.mediaDevices.getUserMedia()` is broadly available, requires HTTPS/localhost, and prompts for permission. The MediaStream Image Capture API can produce a higher-resolution still where supported, with a canvas snapshot as the compatibility fallback: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Image_Capture_API.
- CollectorVision finds card corners, dewarps the image, computes a compact visual embedding, and searches a Pokemon catalog in a browser worker: https://github.com/HanClinto/CollectorVision. Its browser scanner and Pokemon catalog are experimental and AGPL-3.0, but it is the best fit for this personal, backend-free project because it does not depend on readable text.
- Tesseract.js runs OCR in browser WebAssembly and a Web Worker and is Apache-2.0 licensed: https://github.com/naptha/tesseract.js. It remains the fallback for uploaded photos when visual confidence is insufficient.
- OpenCV.js can detect contours and correct perspective in-browser: https://docs.opencv.org/4.13.0/d0/d84/tutorial_js_usage.html. It is not included in the first version because its payload and tuning cost are unnecessary with a guided card-shaped capture region. Add it only if real-device testing shows perspective is the main failure mode.
- Fuse.js is a small Apache-2.0 client-side fuzzy-search library: https://www.fusejs.io/. The implementation uses a focused local scorer instead because only a few OCR lines and at most 250 catalog candidates are compared, avoiding another runtime download without losing needed behavior.
- CollectorVision's browser files are isolated under `vendor/collectorvision/` with their AGPL license and modification notices. Redistributors must review the AGPL terms; the original Pokebinder files retain their MIT notice.
- Hosted services such as GiblTCG, CardVault, and Ximilar can identify an exact card from a photo, but require a secret API key and upload the photo. They would require a backend proxy, recurring service dependency, and a different privacy model. They remain a possible later accuracy upgrade behind the recognizer interface.

## Decision 1: Add a scanner mode inside the existing picker

Add `scanner` as a temporary picker mode rather than nesting another modal. The camera button is visible whenever `state.type === 'freestyle'`; it is hidden for Pokedex and Master Set flows.

State transitions:

```text
pokemon-search or cards
        | camera
        v
     scanner -- cancel/back --> previous mode
        | capture
        v
    processing -- failure --> scanner error (retry/manual search)
        | matches
        v
   scan-results -- select --> existing intent + Save flow
```

Opening scanner mode records the prior picker mode and current selection. Cancel restores both without mutation. A successful scan replaces the in-progress picker candidates but does not touch `state.slots` or `state.caught` until Save.

## Decision 2: Scan several guided frames and clean up eagerly

On an explicit camera-button click:

1. Request `{ audio: false, video: { facingMode: { ideal: 'environment' } } }`.
2. Render the stream into a `<video playsinline muted>` element with a corner overlay.
3. Submit a frame to the visual worker every 300 ms and require the same catalog product in two consecutive frames.
4. Stop every `MediaStreamTrack` immediately after confirmation, cancel, picker close, collection switch, or page hide.

If streaming capture is unavailable or permission is denied, keep a visible "Choose photo" control using `accept="image/*"` and `capture="environment"`. Unsupported camera access must not disable manual card search.

## Decision 3: Use visual embeddings first and OCR as fallback

CollectorVision's worker performs:

1. neural four-corner detection;
2. perspective correction to a canonical crop;
3. a 128-dimensional Milo visual embedding;
4. nearest-neighbor search of Pokemon Catalog v2; and
5. upright/180-degree comparison.

To keep the common upright path fast, the worker accepts an upright match at or
above 0.75 without computing a second embedding. Lower-scoring upright matches
still receive the 180-degree comparison, preserving support for upside-down and
uncertain captures.

The detector model, embedder model, and Catalog v2 snapshot begin loading in
parallel. Model session creation also overlaps catalog reconstruction so the
first scan is not delayed by three independent sequential startup paths.

Results below 0.65 are not accepted. A visual result provides TCGplayer product ID, card name, collector number, and set name. `visualResultToScanHints()` converts that metadata into the same ranking input used by the existing picker. The Pokemon TCG query combines name and collector number for visual results, then uses set-name token overlap to order any remaining alternatives.

For an uploaded photo whose visual result is below threshold, `js/card-scanner.js` falls back to:

```js
recognizeCardImage(blob) -> {
  text,
  hints: { names, collectorNumbers, setTokens },
}

rankCardCandidates(hints, cards) -> [
  { card, score, reasons },
]
```

Tesseract.js is loaded only when the visual fallback is needed. One worker is reused for later scans in the page session. OCR runs on preprocessed top and bottom regions, with a full-card pass only when the focused regions do not produce enough hints.

Hint extraction is deliberately tolerant:

- collector numbers accept forms such as `25/102`, `025 / 198`, `TG05/TG30`, `H12/H32`, and noisy spacing;
- OCR lines and tokens are normalized for punctuation, Unicode gender symbols, case, and common digit/letter confusions;
- likely names come from high-position OCR lines plus recognizable Pokemon names, but the API path is not restricted to Pokemon-only cards;
- set/name words are retained for candidate scoring.

`searchCardsByScanHints()` in `js/tcg-api.js` issues the smallest useful Pokemon TCG API query, using exact collector-number variants when available and falling back to usable name terms otherwise. It returns the same `cardId`, `name`, `number`, `setName`, `setId`, `setYear`, `rarity`, and `imageSmall` shape used by the picker. Scan queries are not written to the Pokemon-name cache because they are partial result sets.

Candidate ranking weights exact collector-number agreement most heavily, then normalized card-name similarity, then OCR overlap with set name. Results are deduplicated by `cardId` and capped at 12. Ranking constants stay inside the pure module so they can be calibrated with fixtures.

## Decision 4: Confirm every result

After recognition, the picker title becomes "Scan matches" and the existing grid renders ranked candidates, best first.

- A clearly leading candidate may be pre-selected but is never saved automatically.
- Ambiguous results have no pre-selection and tell the user to choose the matching printing.
- A newly scanned selection defaults the Freestyle intent to Owned; the user can switch it to Placeholder.
- Save continues through the existing `setFreestyleSlot` path, so IndexedDB and sync behavior do not change.
- Back returns to Pokemon search; Retry reopens scanner mode; manual typing remains available.

## Decision 5: Privacy and failure behavior are part of the feature

Camera frames, captured blobs, and OCR text live only in memory and are discarded on scanner/picker close. Images are never sent to CollectorVision, the Pokemon TCG API, IndexedDB, sync bundles, logs, URLs, or analytics. Model and catalog assets are downloaded independently and cached in IndexedDB. Only recognized text metadata is interpolated into the existing Pokemon TCG catalog query.

Expected failures receive specific messages:

- permission denied: explain how to retry and offer Choose photo/manual search;
- no camera: offer Choose photo/manual search;
- insecure context: explain that live camera requires HTTPS or localhost;
- OCR dependency/network failure: keep manual search available;
- no useful text or candidates: suggest better lighting/alignment and offer Retry/manual search;
- stale async result after picker close or collection switch: discard it via a scan-session token.

## Accessibility

The camera button has visible tooltip text and `aria-label="Scan a card"`. Status changes use a polite live region. Focus moves into scanner controls on open, to results on success, and back to the invoking button on cancel. Escape closes the scanner back to the previous picker state before a second Escape closes the picker. Reduced-motion preferences disable any scanning animation.

## Risks and mitigations

- **Glare or unreadable text:** visual artwork/layout matching is primary and combines two frames; ask the user to tilt the card when confidence is low.
- **Large first-use download:** show detector/embedder/catalog progress and cache assets in IndexedDB; lazy-load OCR only for fallback.
- **Experimental Pokemon catalog:** keep explicit user confirmation and preserve manual search.
- **AGPL licensing:** isolate vendored files and include their license and third-party notice.
- **API rate limits:** make one catalog query per capture where possible, cap fallbacks, and never query per video frame.
- **Async camera leaks:** centralize `stopScanner()` and call it from every exit path plus `pagehide`/`visibilitychange`.
- **Future provider lock-in:** keep capture UI and recognizer behind the narrow result interface so a backend recognition provider can replace OCR later.

## Validation strategy

- Unit-test visual-result conversion, OCR parsing, and candidate ranking.
- Run clean and fixed-glare browser matrices across representative cards from Generations I–IX.
- Unit-test that exact collector-number matches outrank name-only matches and that ambiguous candidates remain unselected.
- Manually test iOS Safari, Android Chrome, and desktop Chrome/Firefox using rear/front cameras, permission denial, photo upload, glare, rotation, and offline/dependency failure.
- Verify no image bytes appear in IndexedDB, exported bundles, sync payloads, query strings, or console output.
