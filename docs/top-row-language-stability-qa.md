# Top-row language popup stability and starter defaults

Date: 2026-11-10. Scope: the centered and left-logo standard Basic list designs (`basic-top-row`, `basic-top-row-left-logo`).

## Cause and fix

Before the fix, opening the language menu changed the centered header from 68px to 206px and the left-logo header from 63.671875px to 206px at 1440x900. Header sizing read `scrollHeight` from the combined description/language-control ancestor, which included the absolutely positioned popup.

`measureMenuHeaderContentHeight` now measures actual copy leaves (including their full scroll height) and the language trigger's own rendered height. The description/control wrapper is no longer marked as header copy. Both text-brand fitting and logo-header sizing use this shared measurement. The popup remains visible and interactive; real long descriptions can still grow and subsequently release header space. `AGENTS.md` and `template-spacing-contract.md` require this boundary and interaction regression checks.

## Starter defaults

Both standard top-row lists start with the representative image area OFF. The viewing-options control still supports explicit ON/OFF. Every SIGNATURE and NON-COFFEE item receives HOT/ICE columns, alongside the existing COFFEE columns. Every ADE item uses one price and the `ICE ONLY` price note, with no size options. Existing merchant data is not rewritten.

Provisioning tests exposed two same-name sample items sharing one inserted ID. Matching now includes the existing category-local sort order, so price values, translations and stable starter keys bind to their own rows. Catalog preview receives the same explicit starter-key map for featured links. No schema or Production data migration is involved.

## Verification

- Related starter, provisioning, preview, header-fit and measurement tests: 109 passed.
- Required `check:site-ui`: system checks and 134 tests passed.
- TypeScript, changed-file ESLint and whitespace checks passed.
- `scripts/qa-top-row-language-stability.mjs`: 24 combinations of both list designs, PC 1440x900, tablet 1180x820/820x1180, text/logo identity and representative area ON/OFF. Repeated pointer/keyboard open, Escape, outside click and trigger close preserve header height, menu bounds, title size, reserved copy height and column count. Popup choices remain in the viewport and clickable. Actual long copy still expands and restores the header; locale navigation is checked against its own settled translated baseline.
- Additional checks cover both viewing-options toggles and mobile OFF defaults, plus Sunday, Van Gogh and MELLOW native header regressions. Catalog thumbnails are captured from the updated OFF defaults.

Release checks and final Production revision are recorded in the pull request.
