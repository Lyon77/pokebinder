## ADDED Requirements

### Requirement: First paint from local state precedes remote sync
On page load, the system SHALL render the active collection from IndexedDB as the first meaningful paint, before initiating the gist fetch or any card-hydration work. The render MUST occur immediately after the steps needed to establish local state: any legacy-storage cleanup, the one-shot TCG cache reset, `loadState()`, and `loadPokemonData()`.

#### Scenario: Same-device refresh with sync configured
- **WHEN** a returning user with sync configured refreshes the page
- **THEN** the title, list/binder view, book selector, stats, and control buttons reflect the active collection within approximately 100ms of script execution, with no gist request having completed

#### Scenario: Refresh without sync configured
- **WHEN** a user without sync configured refreshes the page
- **THEN** the first paint uses the same local-state render path — no gist work is attempted

#### Scenario: Fresh install with no local collections
- **WHEN** a user loads the app for the first time on a device and no collections exist in IndexedDB
- **THEN** the default Living Dex collection is created and rendered from local state before any gist fetch is initiated

### Requirement: Gist reconciliation runs after first paint as a background task
When sync is configured, the system SHALL initiate `loadFromGist()` and the subsequent `handleRemoteData` reconcile after the first paint has completed. The init function SHALL NOT await the reconcile; errors SHALL be contained within the background task and surfaced only via the existing sync-status channel.

#### Scenario: Background reconcile does not block paint
- **WHEN** the gist fetch takes multiple seconds to return
- **THEN** the first paint has already occurred and the UI is interactive while the fetch is in flight

#### Scenario: Reconcile error does not crash init
- **WHEN** the background gist fetch throws (network error, bad token, 404)
- **THEN** init completes normally, the UI remains on the local-state render, and the sync status reflects the error

#### Scenario: Polling begins after reconcile is scheduled
- **WHEN** the reconcile background task starts
- **THEN** `startPolling(30000)` is invoked as part of that task's setup, not as part of the synchronous init path

### Requirement: Re-render occurs when reconcile produces handled changes
After a background reconcile, the system SHALL re-run the full render sequence (controls, `rebuildCollection`, `switchView`) when `handleRemoteData` reports `handled: true`. The re-render SHALL use the reconciled in-memory `state`. When reconcile returns no handled changes, the UI SHALL remain on the first-paint render.

#### Scenario: Reconcile brings new remote data
- **WHEN** the gist bundle differs from what local state represented at first paint
- **THEN** a second render executes using the reconciled state and the user sees the updated view

#### Scenario: Reconcile finds no new data
- **WHEN** the gist bundle matches what local state already represented
- **THEN** no second render is performed and the UI remains on the first paint

#### Scenario: User switched collection during the reconcile window
- **WHEN** the user manually switches to a different collection via the dropdown before the reconcile completes
- **THEN** the reconcile's re-render (if any) uses the user's new active collection as the basis, not the original pre-switch collection
