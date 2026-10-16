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

- 638 unit/contract tests; TypeScript, ESLint, production build and whitespace checks.
- `node scripts/qa-panel-flow.mjs`: 13 new-template browser cases, including 1516×844 PC, 1024×768 and 768×1024 tablets, 320/390/430px phones, localized copy, cover OFF, logo and sparse-menu panel changes. Exact DOM viewport sizes and crop results are asserted.
- `node scripts/qa-panel-regressions.mjs`: 21 existing-template PC/mobile views, all seven starters. No horizontal overflow or canvas scrolling; no browser runtime errors.

Preview: `/templates/restaurant_onue_a/preview`.

Follow-up: PC/tablet menu insets enlarged to 28–44px (bounded viewport units). Default is registered-order fill (`orderedFit`), including editor and provisioning; saved grouped choices remain usable. Representative image stays flush. Physical-column measurement normalizes the flush image and inset copy so it cannot invent an extra empty panel.

Follow-up verification: all 13 ONUE browser cases passed again with ordered fill; 1516×844 PC and 1024×768 landscape tablet use three panels with 28px menu insets, while sparse fixtures select one/two panels. The shared ordered engine considers a fourth column only after preferred safe layouts fail. All 638 unit/contract tests, TypeScript, ESLint and production build passed. The 21-view existing-template run above belongs to the initial implementation; it was not repeated for this follow-up.


Representative alignment follow-up (2026-10-16):

- PC/tablet notices moved to the rightmost lower footer; optional Call stays above notices. The image's language control is top-right. Centered brand/description has equal measured gaps above and below it, before the featured item.
- Removed the separate 22%-of-image brand cap; common 75% column-width target and one/two-line selection are bounded by actual neighboring content. Menu insets now use 36–52px; hero insets and the square image remain unchanged.
- Mobile Call ON uses the existing 56px bar inside the representative frame. OFF uses a top-right language row inside it. Cover OFF and logo cases remain supported. No mobile body typography or reading-gap changes.
- 16 ONUE browser cases passed, including both tablet orientations, PC, phone widths, four-language content coverage, Call OFF, cover OFF, logo and sparse panel counts. Equal-gap difference was under 0.02px in the main PC/tablet cases. PC 1516×844 and landscape tablet 1024×768 selected three readable panels after actual-copy rescue.

- Final mobile 320px Call ON/OFF geometry checks confirmed that the controls and featured copy remain within the square photograph. Existing-template ordered-mode regressions passed all 21 views (six templates in the main run, Loop Bagel retried separately after a page `load` timeout; subsequent checks use `domcontentloaded`). All 639 tests, TypeScript, ESLint and the final production build passed.


Mobile notice footer follow-up (2026-10-16): notices 1/2/3 now render once in the common right-aligned mobile footer after all menu items, separated by the shared 48px section gap. The representative identity no longer contains notices. PC/tablet footer anchors and the in-image mobile Call/language row are unchanged. Browser checks cover 320/390/430px, Call ON/OFF, Japanese/English copy, cover OFF and logo.
