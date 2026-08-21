## 1. Scanner UI and picker state

- [x] 1.1 Add an accessible `#card-picker-camera` button to the card-search row and show it only for Freestyle picker sessions.
- [x] 1.2 Add scanner-mode markup inside the existing picker: live `<video playsinline muted>`, card-ratio guide, hidden capture canvas, status live region, Capture, Choose photo, Retry, and Cancel controls.
- [x] 1.3 Add responsive scanner/result/error styles, visible keyboard focus, safe-area spacing, and a reduced-motion override.
- [x] 1.4 Extend the picker state machine with scanner and scan-results states while preserving the current Pokemon-search/cards behavior.

## 2. Camera lifecycle

- [x] 2.1 Implement camera startup with rear-camera preference and user-facing handling for insecure context, denied permission, missing device, and unreadable device errors.
- [x] 2.2 Capture with `ImageCapture.takePhoto()` when supported and a video-to-canvas snapshot fallback otherwise; feed photo-upload blobs into the same path.
- [x] 2.3 Centralize stream cleanup and call it after capture, Retry, Cancel, Back, picker close, collection switch, `pagehide`, and hidden-page transitions.
- [x] 2.4 Guard camera and recognition callbacks with a scan-session token so stale async results cannot mutate a later picker session.

## 3. Local OCR and hint extraction

- [x] 3.1 Add `js/card-scanner.js` with pure image-region helpers, OCR hint parsing, normalization, and candidate-ranking exports.
- [x] 3.2 Integrate a pinned Tesseract.js browser build through a lazy dynamic import, run it in a worker, report model/recognition progress, and reuse one worker per page session.
- [x] 3.3 Preprocess bounded top/bottom card regions for contrast and scale; run a full-card OCR fallback only when focused regions do not yield usable hints.
- [x] 3.4 Parse common collector-number formats and OCR confusions; normalize punctuation, case, whitespace, and Pokemon gender symbols.
- [x] 3.5 Decide during implementation whether the small Apache-2.0 Fuse.js dependency materially improves scoring; otherwise keep a focused local similarity function and document the decision.

## 4. Pokemon TCG candidate search

- [x] 4.1 Add `searchCardsByScanHints()` to `js/tcg-api.js`, building the narrowest safe Lucene query from collector-number and name hints.
- [x] 4.2 Return standard picker card objects, deduplicate by `cardId`, cap results before rendering, and do not write partial scan queries into the Pokemon-name cache.
- [x] 4.3 Rank exact collector-number matches first, followed by normalized name similarity and set-name token overlap; return score/reason metadata only to the scanner UI.
- [x] 4.4 Handle API errors and unauthenticated rate limits with a recoverable Retry/manual-search state.

## 5. Result confirmation and privacy

- [x] 5.1 Render at most 12 ranked scan results through the existing card-grid selection behavior, with an ambiguity prompt when no candidate is clearly ahead.
- [x] 5.2 Default a newly selected scan result to Owned, keep the Owned/Placeholder radios editable, and commit only through the existing Save handler.
- [x] 5.3 Restore the exact prior picker mode and in-progress selection on scanner Cancel; keep the persisted slot unchanged until Save.
- [x] 5.4 Revoke temporary object URLs, clear captured blobs/canvases/OCR text on exit, and verify images never enter IndexedDB, exports, sync, URLs, analytics, or logs.
- [x] 5.5 Update `README.md` with camera HTTPS requirements, local-processing privacy behavior, supported scope, and scanning tips.

## 6. Automated tests

- [x] 6.1 Add table-driven tests for clean/noisy collector numbers including slash spacing, prefixes, Unicode, and common OCR substitutions.
- [x] 6.2 Add ranking tests proving exact number + name outranks name-only candidates, duplicates collapse, and results cap at 12.
- [x] 6.3 Add tests for ambiguous/no-match outcomes and for Trainer/Energy candidates.
- [x] 6.4 Run all existing tests and the new scanner tests.
- [x] 6.5 Add and run a desktop Chrome smoke test that feeds a known card image through a synthetic camera stream, captures via the production UI, and verifies the first rendered match and stream cleanup.

## 7. Real-device validation

- [ ] 7.1 Test empty-slot and Change-card scans on iOS Safari, Android Chrome, and desktop Chrome/Firefox.
- [ ] 7.2 Test permission denial, no camera, insecure origin, photo upload, OCR dependency failure, API failure, and closing during recognition.
- [ ] 7.3 Test representative modern, vintage, full-art, holo/sleeved, rotated, and low-light cards; tune preprocessing and ranking from recorded OCR text fixtures without retaining user photos.
- [ ] 7.4 Verify every exit path stops the camera indicator and that keyboard focus/announcements behave as specified.

## 8. Visual-first recognition pivot

- [x] 8.1 Vendor the CollectorVision browser worker/catalog client with AGPL license and modification notices.
- [x] 8.2 Configure Pokemon Catalog v2 and expose card name, collector number, set name, and TCGplayer product ID from visual hits.
- [x] 8.3 Scan camera frames automatically, require two consecutive matches above 0.65, and stop the stream after confirmation.
- [x] 8.4 Convert visual metadata into Pokemon TCG API lookup/ranking hints while retaining OCR for uncertain uploaded photos.
- [x] 8.5 Add clean and glare browser matrices covering representative cards from Generations I–IX.

## 9. Scanner performance

- [x] 9.1 Load detector, embedder, and Catalog v2 assets concurrently and overlap model-session creation with catalog reconstruction.
- [x] 9.2 Skip the 180-degree embedding when the upright result is already at or above the guarded 0.75 fast-path threshold, while retaining rotated fallback below it.
- [x] 9.3 Reduce the two-frame confirmation interval from 650 ms to 300 ms without weakening the consecutive-match requirement.
- [x] 9.4 Run unit tests plus clean, glare, and upside-down browser recognition checks after the optimization changes.

## 10. Apostrophe-name lookup regression

- [x] 10.1 Normalize typographic apostrophes and use API-safe prefix clauses for Farfetch'd and Sirfetch'd in manual and scanner lookups.
- [x] 10.2 Ignore and stop persisting empty Pokemon-name cache entries so previously failed lookups recover immediately.
- [x] 10.3 Add Farfetch'd query regression coverage and run the full automated test suite.
