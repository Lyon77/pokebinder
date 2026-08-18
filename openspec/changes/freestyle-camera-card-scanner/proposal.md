# Change: Add camera-assisted card selection to Freestyle binders

## Why

Freestyle users commonly have the physical card in hand while filling a binder, but the current picker makes them type a Pokemon name and manually distinguish the exact printing. On mobile, that is slow and error-prone. A camera action can turn the card itself into a short list of likely matches while preserving the existing manual picker as a fallback.

## What Changes

- Add an accessible camera button to the card picker whenever the active collection is Freestyle, including when replacing an existing card.
- Add a guided capture view that prefers the rear camera, accepts an uploaded/taken photo as a fallback, and always stops the camera when the view closes.
- Recognize the card locally with corner detection and visual embeddings across multiple camera frames, then use OCR only as a fallback for uncertain uploaded photos.
- Convert visual catalog metadata into card-name, collector-number, and set hints, query the existing Pokemon TCG API, and rank returned cards.
- Show recognition results in the existing card grid. A scan never saves automatically; the user confirms a card and can still choose Placeholder or Owned before Save.
- Default the intent to Owned for a newly scanned card because the user is presenting a physical card, while leaving the radio editable.
- Provide retry and manual-search paths for denied camera permission, unsupported browsers, OCR failures, and scans with no useful matches.
- Do not persist or upload captured photos. Runtime/model/catalog downloads are cacheable; the only request derived from card content contains recognized text metadata sent to the Pokemon TCG API.

## Capabilities

### Modified Capabilities

- `freestyle-slots`: The Freestyle picker gains camera capture, local recognition, ranked candidate results, and scanner-specific fallback behavior.

## Impact

- **`index.html`**: camera button and scanner capture/processing controls within the card-picker modal.
- **`css/styles.css`**: responsive scanner preview, card guide, status, and error states.
- **`js/app.js`**: scanner state transitions, focus management, stream cleanup, and scan-result integration with the existing Save flow.
- **`vendor/collectorvision/`** (new): AGPL-3.0 browser detector, dewarper, embedder, and Pokemon Catalog v2 client.
- **`js/card-scanner.js`** (new): visual-result conversion, OCR fallback, and deterministic candidate ranking.
- **`js/tcg-api.js`**: a scan-hint search that returns normal picker card objects without polluting the Pokemon-name cache.
- **`test/card-scanner.test.mjs`** (new): parsing and ranking tests using representative OCR noise.
- **Runtime dependencies**: CollectorVision, ONNX Runtime Web, and its published Pokemon catalog for primary recognition; pinned Tesseract.js for browser OCR fallback. No server component or secret API key is introduced.
