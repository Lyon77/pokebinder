## 1. CSS Changes

- [x] 1.1 Change `.pokemon-list` from `flex-direction: column` to `display: grid; grid-template-columns: repeat(3, 1fr)`
- [x] 1.2 Replace `.pokemon-row` grid layout with flex row: dot + pills + name
- [x] 1.3 Add `.dot` styles (10px circle, hollow border, filled green when `.caught`)
- [x] 1.4 Add `.col-badge` pill style (accent background, white text, small rounded)
- [x] 1.5 Add `.dex-badge` pill style (muted surface background, muted text, small rounded)
- [x] 1.6 Add `border-right` to rows for column separation in multi-column layout
- [x] 1.7 Remove `.pokemon-checkbox`, `.pokemon-types`, `.type-badge` CSS rules
- [x] 1.8 Add responsive breakpoints: 1 column below 600px, 2 columns at 600-900px, 3 columns above 900px
- [x] 1.9 Ensure `.pokemon-row.caught` background and dot styles work together

## 2. Render.js Changes

- [x] 2.1 Remove checkbox element from row rendering
- [x] 2.2 Add dot element (`<div class="dot">`) as first child of each row
- [x] 2.3 Replace stacked numbers with inline pill badges: `<span class="col-badge">#N</span>` and `<span class="dex-badge">N</span>`
- [x] 2.4 Remove type badge rendering (remove the types div and TYPE_COLORS usage)
- [x] 2.5 Move click handler from checkbox `change` event to row `click` event
- [x] 2.6 Update `updateListCaughtState()` to toggle dot class instead of checkbox checked state

## 3. Verification

- [x] 3.1 Verify 3-column layout renders correctly on desktop (1440px)
- [x] 3.2 Verify 1-column layout on mobile (375px)
- [x] 3.3 Verify row click toggles caught state and dot fills/empties
- [x] 3.4 Verify pill badges display correctly for 1-4 digit numbers
- [x] 3.5 Verify long names with form labels truncate with ellipsis
- [x] 3.6 Verify all JS files pass syntax check
