## ADDED Requirements

### Requirement: Freestyle camera scan entry point
The card picker SHALL display a "Scan a card" camera button whenever the active collection is Freestyle. The button SHALL be available for both empty-slot selection and replacement of a filled slot, and SHALL NOT appear for Pokedex or Master Set picker flows.

#### Scenario: Scan an empty Freestyle slot
- **WHEN** the user opens an empty Freestyle slot and activates "Scan a card"
- **THEN** the picker enters scanner mode without modifying the slot or caught set

#### Scenario: Scan a replacement card
- **WHEN** the user opens Change card for a filled Freestyle slot and activates "Scan a card"
- **THEN** the picker enters scanner mode while preserving the existing saved slot until the user confirms and saves a replacement

#### Scenario: Camera button hidden outside Freestyle
- **WHEN** the card picker is opened for a Pokedex collection
- **THEN** the camera button is not visible

### Requirement: Guided camera and photo capture
Scanner mode SHALL request a rear-facing camera only after explicit user action, show card-corner feedback, automatically compare multiple frames, and provide a photo-file fallback. The system SHALL stop all active camera tracks whenever recognition completes or scanner/picker mode exits.

#### Scenario: Capture from a supported rear camera
- **WHEN** the user grants camera permission and holds one card fully in view
- **THEN** the system visually compares frames until the same confident card is seen twice, stops the live stream, and begins candidate lookup

#### Scenario: Camera permission denied
- **WHEN** the browser rejects the camera request with a permission error
- **THEN** scanner mode explains the problem and keeps Choose photo, Retry, and manual search available

#### Scenario: Choose an existing photo
- **WHEN** the user selects a supported card image through Choose photo
- **THEN** the selected image enters the same recognition pipeline as a camera capture

#### Scenario: Close scanner while camera is active
- **WHEN** the user cancels scanner mode, closes the picker, switches collections, or leaves the page
- **THEN** every video track started by the scanner is stopped and no scan result is committed

### Requirement: Local scan recognition and candidate lookup
The system SHALL process camera frames locally using card-corner detection, perspective correction, and visual-embedding catalog search. It SHALL convert a confident visual result into card-name, collector-number, and set-text hints, use those hints to query the Pokemon TCG API, and rank at most 12 unique card candidates. OCR SHALL be used only as a fallback for an uncertain uploaded photo. Captured image bytes SHALL NOT be uploaded or persisted.

#### Scenario: Exact visual card recognized
- **WHEN** two camera frames produce the same visual catalog product above the confidence threshold
- **THEN** that card appears first in scan results

#### Scenario: Ambiguous printing
- **WHEN** visual metadata or fallback OCR hints map to multiple plausible printings
- **THEN** the picker displays the ranked alternatives and requires the user to choose the matching card

#### Scenario: Trainer or Energy card recognized
- **WHEN** OCR produces usable name or collector-number hints for a non-Pokemon Pokemon TCG card
- **THEN** the catalog lookup may return that card even though manual Freestyle search begins from Pokemon names

#### Scenario: No useful match
- **WHEN** neither visual recognition nor fallback OCR produces usable hints, or the catalog returns no candidates
- **THEN** the picker displays a recoverable no-match state with Retry and manual-search actions and leaves the slot unchanged

#### Scenario: Picker closes during recognition
- **WHEN** the user closes the picker or switches collections before an asynchronous recognition request completes
- **THEN** the stale result is discarded and no card or caught state changes

### Requirement: Explicit scan-result confirmation
Recognition SHALL NOT save a card automatically. Scan candidates SHALL use the existing card-grid selection and Freestyle Save flow. A newly selected scan result SHALL default to Owned, and the user SHALL be able to change it to Placeholder before saving.

#### Scenario: Confirm a scanned owned card
- **WHEN** the user selects a scan result and clicks Save with Owned selected
- **THEN** the card is stored in the target Freestyle slot and the slot is added to the caught set

#### Scenario: Save scanned card as placeholder
- **WHEN** the user selects a scan result, changes the intent to Placeholder, and clicks Save
- **THEN** the card is stored in the target slot and the slot is not in the caught set

#### Scenario: Cancel scan results
- **WHEN** scan results are displayed and the user closes the picker without Save
- **THEN** the target slot and caught set remain unchanged

### Requirement: Scanner accessibility and fallback
The scanner SHALL be keyboard-operable, announce loading/error/result status through a live region, restore focus on exit, and preserve manual picker operation when visual or OCR capabilities are unavailable.

#### Scenario: Escape from scanner mode
- **WHEN** scanner mode is active and the user presses Escape
- **THEN** the camera stops and focus returns to the camera button in the prior picker mode without closing the picker

#### Scenario: OCR dependency fails to load
- **WHEN** the browser cannot load or initialize the OCR dependency
- **THEN** the picker reports that scanning is unavailable for now and manual card search remains usable
