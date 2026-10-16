# ONUE TABLE panel-flow template

Template key: `restaurant_onue_a`; catalog group: 레스토랑·다이닝 (restaurant).
Shell: `brand_panel_flow`, independent from left-rail, top-band and center-column shells.

- Six categories, 17 dishes/drinks; exactly three signature item images. Korean, English, Chinese and Japanese starter copy included.
- Fixed 1:1 representative photograph, recommended 1600×1600px; editor guidance uses the same exported constant.
- Identity/notices overlay above, linked featured product below; shared menu role sizes. Brand/logo replacement uses existing saved controls.
- Cover OFF collapses the photograph reservation and uses readable saved brand/category ink on white; logo aspect ratio is preserved.
- First-panel intro is an internal measured order barrier, never a saved widget. Categories continue below. Panel count remains content-driven, including a safe one-panel layout.
- Candidate grids retain full-height rows while temporarily measuring another column count. Committed panels share equal widths, outer inset and gutter tokens.
- Panel padding and Call footer are included in height budgets; final crop also checks footer against the column content edge and intro identity against featured copy.
- The shared reference-fit fallback repacks actual copy if the three-field estimate overflowed while actual text is safe; final DOM validation remains authoritative.

Verification (2026-10-16):

- 637 unit/contract tests; TypeScript, ESLint, production build and whitespace checks.
- `node scripts/qa-panel-flow.mjs`: 13 new-template browser cases, including 1516×844 PC, 1024×768 and 768×1024 tablets, 320/390/430px phones, localized copy, cover OFF, logo and sparse-menu panel changes. Exact DOM viewport sizes and crop results are asserted.
- `node scripts/qa-panel-regressions.mjs`: 21 existing-template PC/mobile views, all seven starters. No horizontal overflow or canvas scrolling; no browser runtime errors.

Preview: `/templates/restaurant_onue_a/preview`.
